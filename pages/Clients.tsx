
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users as UsersIcon, Search, Plus, Building2, ChevronRight } from 'lucide-react';
import { mockData } from '../services/mockData';
import { Client } from '../types';
import { useStore } from '../contexts/StoreContext';
import { normalizeString } from '../utils';

const Clients: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { currentStore } = useStore();

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

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-24 relative min-h-[calc(100vh-160px)]">
      <div className="flex flex-col justify-center mb-6 px-2">
         <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Clientes</h1>
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">{currentStore.toUpperCase()} | {filteredClients.length} Registos</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-3 rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-slate-800 mx-2 transition-colors">
        <div className="relative">
           <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
           <input type="text" placeholder="Pesquisar cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-xs font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <div className="space-y-2 px-2">
          {filteredClients.map((client) => (
            <Link key={client.id} to={`/clients/${client.id}`} className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all active:scale-[0.98] group">
               <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors">
                     <Building2 size={18} />
                  </div>
                  <span className="text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight truncate group-hover:text-blue-600 transition-colors">{client.name}</span>
               </div>
               <ChevronRight size={16} className="text-slate-200 dark:text-slate-700 group-hover:text-blue-500 transition-all" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Clients;
