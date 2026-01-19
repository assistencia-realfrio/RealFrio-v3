
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Added missing AlertCircle to the imports from lucide-react
import { Calendar, ClipboardList, ArrowRight, MapPin, ChevronDown, Palmtree, Database, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { mockData } from '../services/mockData';
import { OSStatus } from '../types';
import { useStore } from '../contexts/StoreContext';

const Dashboard: React.FC = () => {
  const [scheduledCount, setScheduledCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [vacationCount, setVacationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const { currentStore, setStore } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, [currentStore]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [allOS, allVacations, clients] = await Promise.all([
        mockData.getServiceOrders(),
        mockData.getVacations(),
        mockData.getClients() // Usamos isto apenas para validar a ligação
      ]);
      
      setDbStatus('connected');

      const storeOS = currentStore === 'Todas' 
        ? allOS 
        : allOS.filter(os => os.store === currentStore);
      
      // Lógica de OS Ativas: Tudo o que não está concluído ou cancelado
      const active = storeOS.filter(os => 
        os.status !== OSStatus.CONCLUIDA && 
        os.status !== OSStatus.CANCELADA
      ).length;
      setActiveCount(active);

      const scheduled = storeOS.filter(os => 
        os.scheduled_date && 
        os.status !== OSStatus.CONCLUIDA && 
        os.status !== OSStatus.CANCELADA
      ).length;
      
      setScheduledCount(scheduled);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const limit = new Date();
      limit.setDate(today.getDate() + 21);
      limit.setHours(23, 59, 59, 999);

      const todayStr = today.toISOString().split('T')[0];
      const limitStr = limit.toISOString().split('T')[0];

      const storeVacations = currentStore === 'Todas'
        ? allVacations
        : allVacations.filter(v => v.store === currentStore);

      const ongoingOrUpcomingVacations = storeVacations.filter(v => {
        return v.start_date <= limitStr && v.end_date >= todayStr;
      });

      const uniqueCollaborators = new Set(ongoingOrUpcomingVacations.map(v => v.user_name));
      setVacationCount(uniqueCollaborators.size);

    } catch (e) {
      console.error("Erro ao carregar dados do dashboard", e);
      setDbStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const stores: ('Todas' | 'Caldas da Rainha' | 'Porto de Mós')[] = ['Todas', 'Caldas da Rainha', 'Porto de Mós'];

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-2">
      <div className="px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Dashboard</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.3em]">
                Resumo Operacional
              </p>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${
                dbStatus === 'connected' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                dbStatus === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 
                'bg-slate-50 text-slate-400 border-slate-100'
              }`}>
                {dbStatus === 'connected' ? <Wifi size={8} /> : dbStatus === 'error' ? <WifiOff size={8} /> : <Database size={8} className="animate-pulse" />}
                {dbStatus === 'connected' ? 'Sincronizado' : dbStatus === 'error' ? 'Erro DB' : 'A Verificar...'}
              </div>
            </div>
          </div>
        </div>

        <div className="relative w-full sm:w-60">
          <select
            value={currentStore}
            onChange={(e) => setStore(e.target.value as any)}
            className="w-full bg-white border border-gray-200 shadow-sm rounded-xl pl-9 pr-9 py-2.5 text-[10px] font-black text-slate-700 appearance-none cursor-pointer focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none uppercase tracking-widest"
          >
            {stores.map((s) => (
              <option key={s} value={s}>
                {s === 'Todas' ? 'TODAS AS LOJAS' : s.toUpperCase()}
              </option>
            ))}
          </select>
          <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-1">
          {/* O Cartão de OS Ativas agora é o primeiro (Troca de ordem conforme pedido) */}
          <button 
            onClick={() => navigate('/os')}
            className="group bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 text-left relative overflow-hidden active:scale-95"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-200 flex-shrink-0">
                  <ClipboardList size={18} />
                </div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tighter">OS Ativas</h2>
              </div>
              
              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-black text-slate-900 leading-none">{activeCount}</span>
                <div className="flex items-center gap-1 text-orange-600">
                  <span className="text-[8px] font-black uppercase tracking-widest">Ver Listagem</span>
                  <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </button>

          {/* O Cartão de Agendamentos agora é o segundo */}
          <button 
            onClick={() => navigate('/appointments')}
            className="group bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 text-left relative overflow-hidden active:scale-95"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 flex-shrink-0">
                  <Calendar size={18} />
                </div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tighter">Agendamentos</h2>
              </div>
              
              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-black text-slate-900 leading-none">{scheduledCount}</span>
                <div className="flex items-center gap-1 text-blue-600">
                  <span className="text-[8px] font-black uppercase tracking-widest">Ver Todos</span>
                  <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/vacations')}
            className="group bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 text-left relative overflow-hidden active:scale-95 sm:col-span-2 lg:col-span-1"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 flex-shrink-0">
                  <Palmtree size={18} />
                </div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tighter leading-tight">Ausências <br/><span className="text-[9px] text-slate-400 lowercase tracking-normal font-bold">(próx. 3 semanas)</span></h2>
              </div>
              
              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-black text-slate-900 leading-none">{vacationCount}</span>
                <div className="flex items-center gap-1 text-emerald-600">
                  <span className="text-[8px] font-black uppercase tracking-widest">Ver Escala</span>
                  <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </button>
        </div>
      )}

      {dbStatus === 'error' && (
        <div className="mx-1 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
           <AlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
           <div>
              <p className="text-[10px] font-black text-red-900 uppercase tracking-widest">Erro de Ligação ao Supabase</p>
              <p className="text-[9px] font-bold text-red-600 uppercase mt-1 leading-relaxed">
                 Não foi possível comunicar com o servidor. Verifica se criaste as tabelas no SQL Editor do Supabase conforme as instruções.
              </p>
           </div>
        </div>
      )}

      <div className="pt-4 px-2 flex flex-col items-center gap-3">
        <button 
          onClick={() => navigate('/os/new')}
          className="w-full sm:w-auto bg-slate-900 text-white px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-95"
        >
          Nova Ordem de Serviço
        </button>
        
        <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">Real Frio Tech v1.2</p>
      </div>
    </div>
  );
};

export default Dashboard;
