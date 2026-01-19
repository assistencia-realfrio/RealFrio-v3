
import React, { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Edit2, Search, Tag, X, Trash2, ChevronRight, AlertCircle, Layers, Sparkles, Hash } from 'lucide-react';
import { mockData } from '../services/mockData';
import { PartCatalogItem } from '../types';
import { normalizeString } from '../utils';

const Inventory: React.FC = () => {
  const [items, setItems] = useState<PartCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PartCatalogItem | null>(null);
  const [formData, setFormData] = useState({ name: '', reference: '', stock: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchCatalog(); }, []);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const data = await mockData.getCatalog();
      setItems(data.sort((a, b) => a.name.localeCompare(b.name, 'pt-PT')));
    } finally { setLoading(false); }
  };

  const filteredItems = useMemo(() => {
    const term = normalizeString(searchTerm);
    return items.filter(item => normalizeString(item.name).includes(term) || normalizeString(item.reference).includes(term));
  }, [items, searchTerm]);

  const handleOpenModal = (item?: PartCatalogItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({ name: item.name, reference: item.reference, stock: item.stock.toString() });
    } else {
      setEditingItem(null);
      setFormData({ name: '', reference: '', stock: '0' });
    }
    setShowModal(true);
  };

  const getStockStatus = (stock: number) => {
    if (stock <= 0) return { label: 'Esgotado', color: 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-100 dark:border-red-900/30' };
    if (stock <= 5) return { label: 'Stock Baixo', color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 border-orange-100 dark:border-orange-900/30' };
    return { label: 'Disponível', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-100 dark:border-emerald-900/30' };
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 relative px-1 sm:px-0">
      <div className="flex flex-col mb-8 px-2">
         <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Artigos & Peças</h1>
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">{items.length} Referências</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-3 rounded-[1.8rem] shadow-sm border border-gray-100 dark:border-slate-800 mx-1 mb-6 transition-colors">
        <div className="relative">
           <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
           <input type="text" placeholder="Pesquisar catálogo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-[11px] font-black dark:text-white uppercase tracking-tight focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <div className="space-y-2.5 mx-1">
          {filteredItems.map((item) => {
            const status = getStockStatus(item.stock);
            return (
              <div key={item.id} onClick={() => handleOpenModal(item)} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[1.8rem] shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 group-hover:bg-blue-600 transition-all shadow-inner"><Layers size={20} /></div>
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-0.5">
                       <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest font-mono bg-blue-50/50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">{item.reference}</span>
                       <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${status.color}`}>{status.label}</span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase truncate leading-tight group-hover:text-blue-600 transition-colors">{item.name}</h3>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4 flex-shrink-0">
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100">{item.stock} UN</p>
                  <ChevronRight size={18} className="text-slate-200 dark:text-slate-700" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Inventory;
