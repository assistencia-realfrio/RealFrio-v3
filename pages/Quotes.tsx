
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calculator, ChevronRight, Plus, Search, Building2, MapPin, 
  HardDrive, Coins, Loader2, Filter, ChevronDown, 
  LayoutList, StretchHorizontal, RefreshCw 
} from 'lucide-react';
import { mockData } from '../services/mockData';
import { Quote, QuoteStatus } from '../types';
import { useStore } from '../contexts/StoreContext';
import { normalizeString } from '../utils';

const getStatusLabelText = (status: string) => {
  switch (status) {
    case QuoteStatus.PENDENTE: return 'Pendente';
    case QuoteStatus.ACEITE: return 'Aceite';
    case QuoteStatus.REJEITADO: return 'Rejeitado';
    default: return status;
  }
};

const Quotes: React.FC = () => {
  const navigate = useNavigate();
  const { currentStore, setStore } = useStore();
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'compact' | 'complete'>('compact');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const all = await mockData.getQuotes();
      setAllQuotes(all);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, quoteId: string) => {
    e.stopPropagation();
    const newStatus = e.target.value as QuoteStatus;
    setUpdatingId(quoteId);
    try {
      await mockData.updateQuoteStatus(quoteId, newStatus);
      setAllQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: newStatus } : q));
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    const term = normalizeString(searchTerm);
    return allQuotes.filter(q => {
      // Prioridade para a loja do cliente conforme solicitado
      const clientStore = q.client?.store || q.store;
      const matchesStore = currentStore === 'Todas' || clientStore === currentStore;
      const matchesStatus = statusFilter === 'all' ? true : q.status === statusFilter;
      const matchesSearch = normalizeString(q.code).includes(term) || 
                            normalizeString(q.client?.name || '').includes(term) ||
                            normalizeString(q.description || '').includes(term);
      
      return matchesStore && matchesStatus && matchesSearch;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [allQuotes, searchTerm, currentStore, statusFilter]);

  const getStoreColorClass = (store: string) => {
    if (store === 'Caldas da Rainha') return 'border-l-blue-600';
    if (store === 'Porto de Mós') return 'border-l-red-600';
    return 'border-l-slate-300';
  };

  const getStoreTextColorClass = (store: string) => {
    if (store === 'Caldas da Rainha') return 'text-blue-600 dark:text-blue-400';
    if (store === 'Porto de Mós') return 'text-red-600 dark:text-red-400';
    return 'text-slate-500 dark:text-slate-400';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 h-[calc(100vh-140px)] flex flex-col px-1 sm:px-0">
      {/* CABEÇALHO E FILTROS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0 px-1">
        <div className="w-full sm:w-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Orçamentos</h1>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Cotações Comerciais</p>
          </div>

          <div className="flex items-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-full p-1 shadow-sm transition-colors">
             <button 
               onClick={() => setViewMode('complete')}
               className={`p-2 rounded-full transition-all ${viewMode === 'complete' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
             >
               <LayoutList size={16} />
             </button>
             <button 
               onClick={() => setViewMode('compact')}
               className={`p-2 rounded-full transition-all ${viewMode === 'compact' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
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
              onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | 'all')}
              className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm rounded-full pl-8 pr-8 py-2 text-[10px] font-black text-gray-600 dark:text-slate-300 appearance-none cursor-pointer focus:ring-4 focus:ring-blue-500/10 transition-all outline-none uppercase tracking-tight"
            >
              <option value="all">ESTADO: TODOS</option>
              {Object.values(QuoteStatus).map((status) => (
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

      {/* BARRA DE PESQUISA */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-slate-800 mx-1 transition-colors">
        <div className="relative">
           <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
           <input 
            type="text" 
            placeholder="Pesquisar por Código, Cliente ou Serviço..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-[10px] font-black dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase" 
           />
        </div>
      </div>

      {/* LISTAGEM */}
      {loading ? (
        <div className="flex-1 flex flex-col justify-center items-center">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto pb-10 px-1 flex-1 no-scrollbar animate-in fade-in duration-500">
          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-gray-100 dark:border-slate-800">
               <Calculator size={32} className="mx-auto text-gray-300 dark:text-slate-700 mb-2" />
               <p className="text-gray-400 dark:text-slate-600 font-black italic text-[10px] px-4 uppercase tracking-widest">
                 Nenhum orçamento encontrado.
               </p>
            </div>
          ) : (
            filtered.map((q) => {
              const netValue = q.total_amount / 1.23;
              const quoteStore = q.client?.store || q.store;
              
              return (
                <div 
                  key={q.id} 
                  onClick={() => navigate(`/quotes/${q.id}`)}
                  className={`group bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 border-l-4 hover:shadow-lg transition-all duration-200 block cursor-pointer relative overflow-hidden ${getStoreColorClass(quoteStore)} ${viewMode === 'compact' ? 'p-3' : 'p-5'}`}
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-black uppercase tracking-tighter ${getStoreTextColorClass(quoteStore)}`}>
                          {q.code}
                        </span>
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                          {new Date(q.created_at).toLocaleDateString('pt-PT')}
                        </span>
                      </div>
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        {updatingId === q.id ? (
                          <RefreshCw size={12} className="animate-spin text-blue-600" />
                        ) : (
                          <div className="relative">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border inline-block whitespace-nowrap ${
                              q.status === QuoteStatus.ACEITE ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                              q.status === QuoteStatus.PENDENTE ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                              'bg-rose-50 text-rose-600 border-rose-100'
                            }`}>
                               {getStatusLabelText(q.status)}
                            </span>
                            <select
                              value={q.status}
                              onChange={(e) => handleQuickStatusChange(e, q.id)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full bg-white dark:bg-slate-900"
                            >
                              {Object.values(QuoteStatus).map((status) => (
                                <option key={status} value={status} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                  {getStatusLabelText(status).toUpperCase()}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase truncate group-hover:text-blue-600 transition-colors">
                        {q.client?.name}
                      </h3>
                      
                      {/* Nome do Ativo/Equipamento (Visual idêntico ao módulo OS) */}
                      <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight truncate mt-0.5 flex items-center gap-1.5">
                        {q.equipment ? (
                          <>
                            <HardDrive size={10} className="text-slate-300" />
                            <span>{q.equipment.type}</span>
                            {q.equipment.brand && (
                              <>
                                <span className="opacity-20">|</span>
                                <span>{q.equipment.brand}</span>
                              </>
                            )}
                          </>
                        ) : (
                          <span className="italic opacity-40">Sem ativo vinculado</span>
                        )}
                      </div>

                      {viewMode === 'complete' && (
                        <p className="text-[10px] text-slate-500 italic mt-2 line-clamp-1 border-t border-slate-50 dark:border-slate-800 pt-2">"{q.description}"</p>
                      )}

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                            <MapPin size={10} />
                            <span className="truncate max-w-[120px]">{q.establishment?.name || 'Sede'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                           <span className="text-xs font-black text-slate-900 dark:text-100">
                             {netValue.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                           </span>
                           <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest leading-none">Líquido</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* BOTÃO FLUTUANTE (FAB) */}
      <button 
        onClick={() => navigate('/quotes/new')}
        className="fixed bottom-6 right-6 p-5 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 hover:bg-blue-700 hover:scale-110 transition-all transform flex items-center justify-center active:scale-95 z-40"
        title="Novo Orçamento"
      >
        <Plus size={28} />
      </button>
    </div>
  );
};

export default Quotes;
