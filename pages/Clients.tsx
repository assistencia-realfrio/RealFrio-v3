
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users as UsersIcon, Search, Plus, Building2, ChevronRight, MapPin, ChevronDown } from 'lucide-react';
import { mockData } from '../services/mockData';
import { Client } from '../types';
import { useStore } from '../contexts/StoreContext';
import { normalizeString } from '../utils';

const Clients: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { currentStore, setStore } = useStore();

  useEffect(() => { fetchData(); }, [currentStore]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const allClients = await mockData.getClients();
      const filteredByStore = currentStore === 'Todas' ? allClients : allClients.filter(c => c.store === currentStore);
      setClients(filteredByStore);
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = useMemo(() => {
    const term = normalizeString(searchTerm);
    return clients.filter(c => normalizeString(c.name).includes(term) || normalizeString(c.billing_name).includes(term)).sort((a, b) => a.name.localeCompare(b.name, 'pt-PT'));
  }, [clients, searchTerm]);

  const stores: ('Todas' | 'Caldas da Rainha' | 'Porto de Mós')[] = ['Todas', 'Caldas da Rainha', 'Porto de Mós'];

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-24 relative min-h-[calc(100vh-160px)]">
      {/* Cabeçalho com Título e Seletor de Loja */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-2">
         <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Clientes</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">
              {currentStore === 'Todas' ? 'TODAS AS LOJAS' : currentStore.toUpperCase()} | {filteredClients.length} Registos
            </p>
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

      {/* Barra de Pesquisa */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-slate-800 mx-2 transition-colors">
        <div className="relative">
           <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
           <input 
            type="text" 
            placeholder="Pesquisar cliente por nome ou firma..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-xs font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase" 
           />
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <div className="space-y-2 px-2">
          {filteredClients.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-800 mx-2">
               <UsersIcon size={32} className="mx-auto text-gray-200 dark:text-slate-700 mb-4" />
               <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Nenhum cliente encontrado</p>
            </div>
          ) : (
            filteredClients.map((client) => (
              <Link key={client.id} to={`/clients/${client.id}`} className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all active:scale-[0.98] group">
                 <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors">
                       <Building2 size={18} />
                    </div>
                    <div className="flex flex-col min-w-0">
                       <span className="text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight truncate group-hover:text-blue-600 transition-colors">{client.name}</span>
                       <span className="text-[9px] font-bold text-slate-400 truncate uppercase">{client.billing_name || client.address}</span>
                    </div>
                 </div>
                 <ChevronRight size={16} className="text-slate-200 dark:text-slate-700 group-hover:text-blue-500 transition-all flex-shrink-0" />
              </Link>
            ))
          )}
        </div>
      )}

      {/* Botão Flutuante para Novo Cliente */}
      <button 
        onClick={() => navigate('/clients/new')}
        className="fixed bottom-6 right-6 p-5 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 hover:bg-blue-700 hover:scale-110 transition-all transform flex items-center justify-center active:scale-95 z-40"
        title="Novo Cliente"
      >
        <Plus size={28} />
      </button>
    </div>
  );
};

export default Clients;
