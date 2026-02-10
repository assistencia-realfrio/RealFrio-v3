
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ClipboardList, ArrowRight, MapPin, ChevronDown, Palmtree, Database, Wifi, WifiOff, Calculator, Sparkles, ShieldCheck } from 'lucide-react';
import { mockData } from '../services/mockData';
import { OSStatus, QuoteStatus } from '../types';
import { useStore } from '../contexts/StoreContext';

const Dashboard: React.FC = () => {
  const [scheduledCount, setScheduledCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [vacationCount, setVacationCount] = useState(0);
  const [unverifiedQuotesCount, setUnverifiedQuotesCount] = useState(0);
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
      const [allOS, allVacations, allQuotes] = await Promise.all([
        mockData.getServiceOrders(),
        mockData.getVacations(),
        mockData.getQuotes()
      ]);
      
      setDbStatus('connected');

      const storeOS = currentStore === 'Todas' 
        ? allOS 
        : allOS.filter(os => os.store === currentStore);
      
      // Contagem de OS Ativas (exclui concluídas e canceladas)
      const active = storeOS.filter(os => 
        os.status !== OSStatus.CONCLUIDA && 
        os.status !== OSStatus.CANCELADA
      ).length;
      setActiveCount(active);

      // Contagem de Agendamentos (com data e não concluídas)
      const scheduled = storeOS.filter(os => 
        os.scheduled_date && 
        os.status !== OSStatus.CONCLUIDA && 
        os.status !== OSStatus.CANCELADA
      ).length;
      setScheduledCount(scheduled);

      // Contagem de Orçamentos que Aguardam Validação
      const unverified = allQuotes.filter(q => 
        q.status === QuoteStatus.AGUARDA_VALIDACAO &&
        (currentStore === 'Todas' || q.store === currentStore)
      ).length;
      setUnverifiedQuotesCount(unverified);

      // Contagem de férias (colaboradores ausentes hoje ou nos próximos 21 dias)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const limit = new Date();
      limit.setDate(today.getDate() + 21);
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
      console.error("Erro dashboard", e);
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
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Dashboard</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.3em]">
                Resumo Operacional
              </p>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${
                dbStatus === 'connected' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' : 
                dbStatus === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30' : 
                'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700'
              }`}>
                {dbStatus === 'connected' ? <Wifi size={8} /> : dbStatus === 'error' ? <WifiOff size={8} /> : <Database size={8} className="animate-pulse" />}
                {dbStatus === 'connected' ? 'Sincronizado' : dbStatus === 'error' ? 'Erro DB' : 'Verificar...'}
              </div>
            </div>
          </div>
        </div>

        <div className="relative w-full sm:w-60">
          <select
            value={currentStore}
            onChange={(e) => setStore(e.target.value as any)}
            className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm rounded-xl pl-9 pr-9 py-2.5 text-[10px] font-black text-slate-700 dark:text-slate-300 appearance-none cursor-pointer focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none uppercase tracking-widest"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-1">
          {/* OS ATIVAS */}
          <button 
            onClick={() => navigate('/os')}
            className="group bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 text-left relative overflow-hidden active:scale-95"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-200 dark:shadow-orange-900/20 flex-shrink-0">
                  <ClipboardList size={18} />
                </div>
                <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter">OS Ativas</h2>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">{activeCount}</span>
                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                  <span className="text-[8px] font-black uppercase tracking-widest">Ver Listagem</span>
                  <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </button>

          {/* AGENDAMENTOS */}
          <button 
            onClick={() => navigate('/appointments')}
            className="group bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 text-left relative overflow-hidden active:scale-95"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900/20 flex-shrink-0">
                  <Calendar size={18} />
                </div>
                <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter">Agendamentos</h2>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">{scheduledCount}</span>
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <span className="text-[8px] font-black uppercase tracking-widest">Ver Todos</span>
                  <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </button>

          {/* APROVAÇÕES (Propostas que aguardam validação interna) */}
          <button 
            onClick={() => navigate('/quotes?status=aguarda_validacao')}
            className={`group p-5 rounded-[2rem] border shadow-sm transition-all duration-300 text-left relative overflow-hidden active:scale-95 ${
              unverifiedQuotesCount > 0 
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-200 dark:shadow-indigo-900/20' 
              : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 text-slate-900 dark:text-white'
            }`}
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                  unverifiedQuotesCount > 0 ? 'bg-white text-indigo-600' : 'bg-indigo-50 text-white shadow-indigo-200'
                }`}>
                  <Calculator size={18} />
                </div>
                <h2 className="text-base font-black uppercase tracking-tighter">Aprovações</h2>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-black leading-none">{unverifiedQuotesCount}</span>
                <div className={`flex items-center gap-1 ${unverifiedQuotesCount > 0 ? 'text-indigo-100' : 'text-indigo-600'}`}>
                  <span className="text-[8px] font-black uppercase tracking-widest">Novos Aceites</span>
                  <Sparkles size={10} className={unverifiedQuotesCount > 0 ? 'animate-pulse' : ''} />
                </div>
              </div>
            </div>
          </button>

          {/* AUSÊNCIAS */}
          <button 
            onClick={() => navigate('/vacations')}
            className="group bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 text-left relative overflow-hidden active:scale-95"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 flex-shrink-0">
                  <Palmtree size={18} />
                </div>
                <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">Ausências</h2>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">{vacationCount}</span>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <span className="text-[8px] font-black uppercase tracking-widest">Equipa</span>
                  <ArrowRight size={10} />
                </div>
              </div>
            </div>
          </button>
        </div>
      )}

      <div className="pt-4 px-2 flex flex-col items-center gap-3">
        <button 
          onClick={() => navigate('/os/new')}
          className="w-full sm:w-auto bg-slate-900 dark:bg-blue-600 text-white px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 dark:hover:bg-blue-700 transition-all active:scale-95"
        >
          Nova Ordem de Serviço
        </button>
        <p className="text-[8px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.4em]">Real Frio Tech v1.2</p>
      </div>
    </div>
  );
};

export default Dashboard;
