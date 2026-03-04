import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Plus, Search, ChevronRight, FileText, CheckCircle2, XCircle, Clock, MapPin } from 'lucide-react';
import { mockData } from '../services/mockData';
import { MaterialDelivery } from '../types';
import { useStore } from '../contexts/StoreContext';
import { normalizeString } from '../utils';

const Deliveries: React.FC = () => {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const [deliveries, setDeliveries] = useState<MaterialDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDeliveries();
  }, [currentStore]);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const data = await mockData.getMaterialDeliveries();
      setDeliveries(data);
    } catch (error) {
      console.error("Erro ao carregar entregas:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDeliveries = React.useMemo(() => {
    const term = normalizeString(searchTerm);
    const termNoSpaces = term.replace(/\s+/g, '');
    
    return deliveries.filter(d => {
      if (!term) return true;
      
      const nameMatch = normalizeString(d.client_name).includes(term) || 
                        normalizeString(d.client_name).replace(/\s+/g, '').includes(termNoSpaces);
      const nifMatch = d.client_nif && normalizeString(d.client_nif).replace(/\s+/g, '').includes(termNoSpaces);
      const atMatch = d.at_code && normalizeString(d.at_code).replace(/\s+/g, '').includes(termNoSpaces);
      
      return nameMatch || nifMatch || atMatch;
    });
  }, [deliveries, searchTerm]);

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'delivered': return { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle2, label: 'Entregue' };
      case 'canceled': return { color: 'bg-red-50 text-red-600 border-red-100', icon: XCircle, label: 'Cancelada' };
      default: return { color: 'bg-amber-50 text-amber-600 border-amber-100', icon: Clock, label: 'Pendente' };
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 px-2">
      <div className="flex flex-col mb-8">
         <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Entregas de Material</h1>
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">{deliveries.length} Registos</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-3 rounded-[1.8rem] shadow-sm border border-gray-100 dark:border-slate-800 mb-6">
        <div className="relative">
           <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
           <input 
             type="text" 
             placeholder="Pesquisar por cliente, NIF ou código AT..." 
             value={searchTerm} 
             onChange={(e) => setSearchTerm(e.target.value)} 
             className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-[11px] font-black dark:text-white uppercase tracking-tight focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" 
           />
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <div className="space-y-3">
          {filteredDeliveries.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-800">
               <Box size={32} className="mx-auto text-gray-200 dark:text-slate-700 mb-4" />
               <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Nenhuma entrega encontrada</p>
            </div>
          ) : (
            filteredDeliveries.map((delivery) => {
              const status = getStatusConfig(delivery.status);
              const StatusIcon = status.icon;
              return (
                <button 
                  key={delivery.id} 
                  onClick={() => navigate(`/deliveries/${delivery.id}`)} 
                  className="w-full text-left flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[1.8rem] shadow-sm hover:shadow-md transition-all group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${status.color}`}>
                      <StatusIcon size={20} />
                    </div>
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                         <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${status.color}`}>{status.label}</span>
                         {delivery.at_code && (
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">AT: {delivery.at_code}</span>
                         )}
                      </div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase truncate leading-tight group-hover:text-blue-600 transition-colors">
                        {delivery.client_name}
                        {delivery.client_nif && <span className="text-[10px] text-slate-400 font-medium ml-2">NIF: {delivery.client_nif}</span>}
                      </h3>
                      {delivery.unloading_address && (
                        <div className="flex items-center gap-1 mt-1 text-slate-500">
                          <MapPin size={10} className="flex-shrink-0" />
                          <p className="text-[9px] font-bold uppercase truncate">{delivery.unloading_address}</p>
                        </div>
                      )}
                      <p className="text-[10px] font-bold text-slate-400 uppercase truncate mt-0.5">{delivery.items.length} Artigos • {new Date(delivery.created_at).toLocaleDateString('pt-PT')}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-200 dark:text-slate-700 flex-shrink-0" />
                </button>
              );
            })
          )}
        </div>
      )}

      <button 
        onClick={() => navigate('/deliveries/new')}
        className="fixed bottom-6 right-6 p-5 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 hover:bg-blue-700 hover:scale-110 transition-all transform flex items-center justify-center active:scale-95 z-40"
        title="Nova Entrega"
      >
        <Plus size={28} />
      </button>
    </div>
  );
};

export default Deliveries;
