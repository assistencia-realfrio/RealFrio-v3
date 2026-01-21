
import React, { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Edit2, Search, Tag, X, Trash2, ChevronRight, AlertCircle, Layers, Sparkles, Hash, Loader2, Check, RefreshCw } from 'lucide-react';
import { mockData } from '../services/mockData';
import { PartCatalogItem } from '../types';
import { normalizeString } from '../utils';

const Inventory: React.FC = () => {
  const [items, setItems] = useState<PartCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PartCatalogItem | null>(null);
  const [formData, setFormData] = useState({ name: '', reference: '', stock: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchCatalog(); }, []);

  const fetchCatalog = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await mockData.getCatalog();
      setItems(data.sort((a, b) => a.name.localeCompare(b.name, 'pt-PT')));
    } catch (err: any) {
      console.error("Erro ao carregar catálogo:", err);
      setError("Não foi possível carregar os artigos. Verifique a conexão ou as permissões da base de dados.");
    } finally { setLoading(false); }
  };

  const filteredItems = useMemo(() => {
    const term = normalizeString(searchTerm);
    return items.filter(item => normalizeString(item.name).includes(term) || normalizeString(item.reference).includes(term));
  }, [items, searchTerm]);

  const handleOpenModal = (item?: PartCatalogItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({ name: item.name, reference: item.reference, stock: item.stock.toString().replace('.', ',') });
    } else {
      setEditingItem(null);
      setFormData({ name: '', reference: '', stock: '0' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.reference) return;
    setIsSubmitting(true);
    try {
      const numericStock = parseFloat(formData.stock.replace(',', '.'));
      if (editingItem) {
        await mockData.updateCatalogItem(editingItem.id, {
          name: formData.name.toUpperCase(),
          reference: formData.reference.toUpperCase(),
          stock: numericStock || 0
        });
      } else {
        await mockData.addCatalogItem({
          name: formData.name.toUpperCase(),
          reference: formData.reference.toUpperCase(),
          stock: numericStock || 0
        });
      }
      setShowModal(false);
      fetchCatalog();
    } catch (error) {
      console.error(error);
      alert("ERRO AO GUARDAR ARTIGO.");
    } finally {
      setIsSubmitting(false);
    }
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
      ) : error ? (
        <div className="mx-1 p-8 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-[2rem] text-center">
           <AlertCircle size={32} className="mx-auto text-red-500 mb-4" />
           <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-6">{error}</p>
           <button 
            onClick={fetchCatalog}
            className="px-6 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 mx-auto active:scale-95 transition-all"
           >
             <RefreshCw size={14} /> Tentar Novamente
           </button>
        </div>
      ) : (
        <div className="space-y-2.5 mx-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-800 mx-1">
               <Package size={32} className="mx-auto text-gray-200 dark:text-slate-700 mb-4" />
               <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Nenhum artigo encontrado no catálogo</p>
            </div>
          ) : (
            filteredItems.map((item) => {
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
                    <p className="text-sm font-black text-slate-900 dark:text-slate-100">{item.stock.toLocaleString('pt-PT', { maximumFractionDigits: 3 })} UN</p>
                    <ChevronRight size={18} className="text-slate-200 dark:text-slate-700" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Botão Flutuante para Novo Artigo */}
      <button 
        onClick={() => handleOpenModal()}
        className="fixed bottom-6 right-6 p-5 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 hover:bg-blue-700 hover:scale-110 transition-all transform flex items-center justify-center active:scale-95 z-40"
        title="Novo Artigo"
      >
        <Plus size={28} />
      </button>

      {/* Modal de Gestão de Artigo */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col transition-colors">
            <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                {editingItem ? 'Editar Artigo' : 'Novo Artigo'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-2"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Designação do Artigo *</label>
                <div className="relative">
                  <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    required type="text" 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="EX: FILTRO DESIDRATADOR"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Referência / Código *</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    required type="text" 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-mono font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase"
                    value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})}
                    placeholder="EX: 102030"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Stock em Armazém</label>
                <input 
                  type="text" 
                  inputMode="decimal"
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  value={formData.stock} 
                  onChange={e => {
                    const val = e.target.value.replace(',', '.');
                    if (/^\d*[.]?\d*$/.test(val) || val === '') {
                      setFormData({...formData, stock: e.target.value});
                    }
                  }}
                />
              </div>

              <button 
                type="submit" disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                {editingItem ? 'GUARDAR ALTERAÇÕES' : 'CRIAR ARTIGO NO CATÁLOGO'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
