
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Building2, HardDrive, Filter, RefreshCw, ChevronDown, LayoutList, StretchHorizontal } from 'lucide-react';
import { mockData } from '../services/mockData';
import { ServiceOrder, OSStatus } from '../types';
import { useStore } from '../contexts/StoreContext';
import OSStatusBadge from '../components/OSStatusBadge';

const getStatusLabelText = (status: string) => {
  switch (status) {
    case OSStatus.POR_INICIAR: return 'Por Iniciar';
    case OSStatus.INICIADA: return 'Iniciada';
    case OSStatus.PARA_ORCAMENTO: return 'Para Orçamento';
    case OSStatus.ORCAMENTO_ENVIADO: return 'Orçamento Enviado';
    case OSStatus.AGUARDA_PECAS: return 'Aguarda Peças';
    case OSStatus.PECAS_RECEBIDAS: return 'Peças Recebidas';
    case OSStatus.CONCLUIDA: return 'Concluída';
    case OSStatus.CANCELADA: return 'Cancelada';
    default: return status;
  }
};

const Appointments: React.FC = () => {
  const [scheduledOrders, setScheduledOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'compact' | 'complete'>('compact');
  const navigate = useNavigate();
  const { currentStore, setStore } = useStore();
  const stores: ('Todas' | 'Caldas da Rainha' | 'Porto de Mós')[] = ['Todas', 'Caldas da Rainha', 'Porto de Mós'];

  useEffect(() => {
    fetchAppointments();
  }, [currentStore]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const allOS = await mockData.getServiceOrders();
      const filtered = allOS.filter(os => 
        os.scheduled_date && 
        os.status !== OSStatus.CONCLUIDA && 
        os.status !== OSStatus.CANCELADA &&
        (currentStore === 'Todas' || os.store === currentStore)
      );
      const sorted = filtered.sort((a, b) => {
        const dateA = new Date(a.scheduled_date!).getTime();
        const dateB = new Date(b.scheduled_date!).getTime();
        return dateA - dateB;
      });
      setScheduledOrders(sorted);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, osId: string) => {
    e.stopPropagation();
    const newStatus = e.target.value as OSStatus;
    setUpdatingId(osId);
    try {
      await mockData.updateServiceOrder(osId, { status: newStatus });
      setScheduledOrders(prev => prev.map(os => os.id === osId ? { ...os, status: newStatus } : os));
      if (newStatus === OSStatus.CONCLUIDA || newStatus === OSStatus.CANCELADA) {
        setScheduledOrders(prev => prev.filter(os => os.id !== osId));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStoreColorClass = (store: string) => {
    if (store === 'Caldas da Rainha') return 'border-l-blue-600';
    if (store === 'Porto de Mós') return 'border-l-red-600';
    return 'border-l-slate-300';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 flex flex-col h-[calc(100vh-140px)]">
      <div className="px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Agendamentos</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Intervenções Planeadas</p>
          </div>
          <div className="flex items-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-full p-1 shadow-sm transition-colors">
             <button onClick={() => setViewMode('complete')} className={`p-2 rounded-full transition-all ${viewMode === 'complete' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}><LayoutList size={16} /></button>
             <button onClick={() => setViewMode('compact')} className={`p-2 rounded-full transition-all ${viewMode === 'compact' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}><StretchHorizontal size={16} /></button>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <select value={currentStore} onChange={(e) => setStore(e.target.value as any)} className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm rounded-2xl pl-10 pr-10 py-3 text-[11px] font-black text-slate-700 dark:text-slate-300 appearance-none outline-none transition-colors uppercase tracking-widest">
            {stores.map((s) => (<option key={s} value={s} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{s === 'Todas' ? 'TODAS AS LOJAS' : s.toUpperCase()}</option>))}
          </select>
          <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
          <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col justify-center items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="space-y-3 overflow-y-auto pb-10 px-1 flex-1 no-scrollbar">
          {scheduledOrders.map((os) => (
            <div key={os.id} onClick={() => navigate(`/os/${os.id}`)} className={`bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 border-l-4 hover:shadow-lg transition-all duration-200 block cursor-pointer ${getStoreColorClass(os.store)} ${viewMode === 'compact' ? 'p-3' : 'p-5'}`}>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] font-mono font-black uppercase tracking-tighter text-blue-600`}>{os.code}</span>
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    {updatingId === os.id ? (<RefreshCw size={12} className="animate-spin text-blue-600" />) : (<><OSStatusBadge status={os.status} /><select value={os.status} onChange={(e) => handleQuickStatusChange(e, os.id)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full bg-white dark:bg-slate-900">{Object.values(OSStatus).map((status) => (<option key={status} value={status} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{getStatusLabelText(status).toUpperCase()}</option>))}</select></>)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">{os.client?.name}</h3>
                  <div className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-tight truncate mt-0.5 flex items-center gap-1.5"><Calendar size={10} /><span>{new Date(os.scheduled_date!).toLocaleDateString()} às {os.scheduled_date!.split('T')[1]?.substring(0,5)}</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Appointments;