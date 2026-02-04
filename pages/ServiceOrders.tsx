
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HardDrive, Filter, MapPin, ChevronDown, RefreshCw, Calendar, LayoutList, StretchHorizontal, ShieldAlert, X, Timer } from 'lucide-react';
import { mockData } from '../services/mockData';
import { ServiceOrder, OSStatus } from '../types';
import { useStore } from '../contexts/StoreContext';
import OSStatusBadge from '../components/OSStatusBadge';

const STATUS_ORDER_WEIGHT: Record<string, number> = {
  [OSStatus.POR_INICIAR]: 0,
  [OSStatus.INICIADA]: 1,
  [OSStatus.PARA_ORCAMENTO]: 2,
  [OSStatus.ORCAMENTO_ENVIADO]: 3,
  [OSStatus.AGUARDA_PECAS]: 4,
  [OSStatus.PECAS_RECEBIDAS]: 5,
  [OSStatus.CONCLUIDA]: 6,
  [OSStatus.CANCELADA]: 7,
};

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

const ServiceOrders: React.FC = () => {
  const [allOrders, setAllOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OSStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'compact' | 'complete'>('compact');
  
  // Estados para validação de fecho na lista
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [osIdToValidate, setOsIdToValidate] = useState<string | null>(null);

  const navigate = useNavigate();
  const { currentStore, setStore } = useStore();
  
  useEffect(() => {
    fetchOrders();
    // Sincronização periódica opcional para atualizar estados de cronómetros vindos de outros técnicos
    const interval = setInterval(fetchOrdersSilently, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await mockData.getServiceOrders();
      setAllOrders(data || []);
    } catch (error) {
      console.error('Erro ao carregar OS:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrdersSilently = async () => {
    try {
      const data = await mockData.getServiceOrders();
      setAllOrders(data || []);
    } catch (error) {
      console.warn('Erro na atualização silenciosa');
    }
  };

  const handleQuickStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, osId: string) => {
    e.stopPropagation();
    const newStatus = e.target.value as OSStatus;
    
    if (newStatus === OSStatus.CONCLUIDA) {
      const osToUpdate = allOrders.find(o => o.id === osId);
      const fields = [];
      const hasAnomaly = osToUpdate?.anomaly_detected && osToUpdate.anomaly_detected.trim().length > 0;
      const hasClientSig = osToUpdate?.client_signature && osToUpdate.client_signature.trim().length > 0;
      const hasTechSig = osToUpdate?.technician_signature && osToUpdate.technician_signature.trim().length > 0;

      if (!hasAnomaly) fields.push("ANOMALIA DETETADA");
      if (!hasClientSig) fields.push("ASSINATURA DO CLIENTE");
      if (!hasTechSig) fields.push("ASSINATURA DO TÉCNICO");

      if (fields.length > 0) {
        setMissingFields(fields);
        setOsIdToValidate(osId);
        setShowValidationErrorModal(true);
        return;
      }
    }

    setUpdatingId(osId);
    try {
      await mockData.updateServiceOrder(osId, { status: newStatus });
      await mockData.addOSActivity(osId, {
        description: `ALTEROU ESTADO DA OS PARA ${getStatusLabelText(newStatus).toUpperCase()} (VIA LISTAGEM GERAL)`
      });
      setAllOrders(prev => prev.map(os => os.id === osId ? { ...os, status: newStatus } : os));
    } catch (error) {
      console.error('Erro ao atualizar estado:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr.split('T')[0] === today;
  };

  const ordersInStore = useMemo(() => {
    return currentStore === 'Todas' 
      ? allOrders 
      : allOrders.filter(os => os.store === currentStore);
  }, [allOrders, currentStore]);

  const sortedAndFilteredOrders = useMemo(() => {
    return ordersInStore
      .filter(os => {
        const matchesStatus = statusFilter === 'all' 
          ? (os.status !== OSStatus.CONCLUIDA && os.status !== OSStatus.CANCELADA)
          : os.status === statusFilter;
        return matchesStatus;
      })
      .sort((a, b) => {
        // Prioridade para cronómetros ativos
        if (a.timer_is_active && !b.timer_is_active) return -1;
        if (!a.timer_is_active && b.timer_is_active) return 1;

        const weightA = STATUS_ORDER_WEIGHT[a.status] ?? 99;
        const weightB = STATUS_ORDER_WEIGHT[b.status] ?? 99;
        if (weightA !== weightB) return weightA - weightB;
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeB - timeA;
      });
  }, [ordersInStore, statusFilter]);

  const getStoreColorClass = (store: string) => {
    if (store === 'Caldas da Rainha') return 'border-l-blue-600';
    if (store === 'Porto de Mós') return 'border-l-red-600';
    return 'border-l-slate-300';
  };

  const getStoreTextColorClass = (store: string) => {
    if (store === 'Caldas da Rainha') return 'text-blue-600';
    if (store === 'Porto de Mós') return 'text-red-600';
    return 'text-slate-600 dark:text-slate-400';
  };

  const formatScheduledInfo = (scheduledStr: string) => {
    const [date, time] = scheduledStr.split('T');
    const displayDate = isToday(date) ? 'Hoje' : new Date(date).toLocaleDateString();
    return time ? `${displayDate} às ${time}` : displayDate;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0 px-1">
        <div className="w-full sm:w-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Ordens de Serviço</h1>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Gestão de Intervenções</p>
          </div>

          <div className="flex items-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-full p-1 shadow-sm transition-colors">
             <button 
               onClick={() => setViewMode('complete')}
               className={`p-2 rounded-full transition-all ${viewMode === 'complete' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
             >
               <LayoutList size={16} />
             </button>
             <button 
               onClick={() => setViewMode('compact')}
               className={`p-2 rounded-full transition-all ${viewMode === 'compact' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
             >
               <StretchHorizontal size={16} />
             </button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none min-w-[140px]">
            <select
              value={currentStore}
              onChange={(e) => setStore(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm rounded-full pl-8 pr-8 py-2 text-[10px] font-black text-gray-600 dark:text-slate-300 appearance-none cursor-pointer focus:ring-4 focus:ring-blue-500/10 transition-all outline-none uppercase tracking-tight"
            >
              <option value="Todas">LOJA: TODAS</option>
              <option value="Caldas da Rainha">CALDAS DA RAINHA</option>
              <option value="Porto de Mós">PORTO DE MÓS</option>
            </select>
            <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
            <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative flex-1 sm:flex-none min-w-[140px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OSStatus | 'all')}
              className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm rounded-full pl-8 pr-8 py-2 text-[10px] font-black text-gray-600 dark:text-slate-300 appearance-none cursor-pointer focus:ring-4 focus:ring-blue-500/10 transition-all outline-none uppercase tracking-tight"
            >
              <option value="all">ESTADO: ATIVAS</option>
              {Object.values(OSStatus).map((status) => (
                <option key={status} value={status}>
                  {getStatusLabelText(status).toUpperCase()}
                </option>
              ))}
            </select>
            <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500 pointer-events-none" />
            <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto pb-10 px-1 flex-1 no-scrollbar">
          {sortedAndFilteredOrders.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-gray-100 dark:border-slate-800">
               <Filter size={32} className="mx-auto text-gray-300 dark:text-slate-700 mb-2" />
               <p className="text-gray-400 dark:text-slate-600 font-black italic text-xs px-4 uppercase tracking-widest">
                 Nenhuma OS encontrada.
               </p>
            </div>
          ) : (
            sortedAndFilteredOrders.map((os) => {
              const isTimerActive = !!os.timer_is_active;
              
              return (
                <div 
                  key={os.id} 
                  onClick={() => navigate(`/os/${os.id}`)}
                  className={`group bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 border-l-4 hover:shadow-lg transition-all duration-200 block cursor-pointer relative overflow-hidden ${getStoreColorClass(os.store)} ${viewMode === 'compact' ? 'p-3' : 'p-5'} ${isTimerActive ? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-slate-950 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.2)] z-10 scale-[1.01]' : ''}`}
                >
                  {isTimerActive && (
                    <div className="absolute top-0 right-0 p-1.5 bg-red-500 text-white rounded-bl-xl z-20 shadow-md">
                      <Timer size={12} className="animate-spin" />
                    </div>
                  )}

                  {viewMode === 'compact' ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono font-black uppercase tracking-tighter ${isTimerActive ? 'text-red-600' : getStoreTextColorClass(os.store)}`}>
                            {os.code}
                          </span>
                          {isTimerActive && <span className="text-[7px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full uppercase tracking-widest animate-bounce">Live</span>}
                        </div>
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          {updatingId === os.id ? (
                            <RefreshCw size={12} className="animate-spin text-blue-600" />
                          ) : (
                            <>
                              <OSStatusBadge status={os.status} className="cursor-pointer hover:opacity-80 transition-opacity" />
                              <select
                                value={os.status}
                                onChange={(e) => handleQuickStatusChange(e, os.id)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full bg-white dark:bg-slate-900"
                              >
                                {Object.values(OSStatus).map((status) => (
                                  <option key={status} value={status} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                    {getStatusLabelText(status).toUpperCase()}
                                  </option>
                                ))}
                              </select>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-black uppercase truncate ${isTimerActive ? 'text-red-700 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                          {os.client?.name}
                        </h3>
                        <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight truncate mt-0.5 flex items-center gap-1.5">
                          <span>{os.equipment?.type}</span>
                          <span className="opacity-20">|</span>
                          <span>{os.equipment?.brand}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-1 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[10px] font-black uppercase tracking-widest truncate ${isTimerActive ? 'text-red-600' : getStoreTextColorClass(os.store)}`}>
                            {os.code}
                          </span>
                          {isTimerActive && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-full">
                               <Timer size={10} className="text-red-600" />
                               <span className="text-[7px] font-black text-red-600 uppercase tracking-widest">Cronómetro Ativo</span>
                            </div>
                          )}
                        </div>
                        <div className="relative flex-shrink-0 mr-1" onClick={(e) => e.stopPropagation()}>
                          {updatingId === os.id ? (
                            <div className="bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full flex items-center gap-2">
                              <RefreshCw size={12} className="animate-spin text-blue-600" />
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">...</span>
                            </div>
                          ) : (
                            <>
                              <OSStatusBadge status={os.status} className="cursor-pointer hover:opacity-80 transition-opacity" />
                              <select
                                value={os.status}
                                onChange={(e) => handleQuickStatusChange(e, os.id)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full bg-white dark:bg-slate-900"
                              >
                                {Object.values(OSStatus).map((status) => (
                                  <option key={status} value={status} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                    {getStatusLabelText(status).toUpperCase()}
                                  </option>
                                ))}
                              </select>
                            </>
                          )}
                        </div>
                      </div>

                      <h3 className={`text-xl font-black leading-tight uppercase transition-colors truncate mb-2 ${isTimerActive ? 'text-red-700 dark:text-red-400' : 'text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
                        {os.client?.name}
                      </h3>

                      <div className="text-base font-black text-slate-900 dark:text-slate-200 uppercase tracking-tight mb-2">
                         {os.equipment?.type} <span className="mx-1 opacity-20">|</span> {os.equipment?.brand}
                      </div>

                      <div className="pt-3 border-t border-gray-50 dark:border-slate-800 space-y-2">
                        <p className={`text-sm font-normal uppercase leading-relaxed ${isTimerActive ? 'text-red-900/70 dark:text-red-300/70' : 'text-slate-900 dark:text-slate-300'}`}>
                          "{os.description}"
                        </p>
                        
                        {os.scheduled_date && (
                          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-400 mt-1">
                            <Calendar size={12} className={isTimerActive ? "text-red-500" : "text-blue-500"} />
                            <span className="text-[10px] font-normal uppercase tracking-widest">
                              Agendamento: {formatScheduledInfo(os.scheduled_date)}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL ERRO DE VALIDAÇÃO (MESMO QUE NO DETALHE) */}
      {showValidationErrorModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 transition-colors">
              <div className="p-8 text-center">
                 <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <ShieldAlert size={32}/>
                 </div>
                 <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Dados em Falta</h3>
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6 uppercase">
                    Para concluir a OS, deve preencher os seguintes campos obrigatórios:
                 </p>
                 <div className="space-y-2 mb-8">
                   {missingFields.map((field, idx) => (
                     <div key={idx} className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-3 rounded-xl text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">
                       {field}
                     </div>
                   ))}
                 </div>
                 <button 
                  onClick={() => {
                    setShowValidationErrorModal(false);
                    if (osIdToValidate) navigate(`/os/${osIdToValidate}?tab=finalizar`);
                  }}
                  className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all"
                 >
                    ENTENDIDO, VOU PREENCHER
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
