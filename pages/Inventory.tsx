
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
  const [isManualRef, setIsManualRef] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await mockData.getCatalog();
      setItems(data.sort((a, b) => a.name.localeCompare(b.name, 'pt-PT')));
    } catch (err: any) {
      setErrorMsg(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    const term = normalizeString(searchTerm);
    return items.filter(item => 
      normalizeString(item.name).includes(term) || 
      normalizeString(item.reference).includes(term)
    );
  }, [items, searchTerm]);

  const generateUniqueNumericRef = () => {
    const existingRefs = items.map(i => i.reference);
    let newRef = '';
    let isUnique = false;
    
    while (!isUnique) {
      newRef = '';
      for (let i = 0; i < 10; i++) {
        newRef += Math.floor(Math.random() * 10).toString();
      }
      if (!existingRefs.includes(newRef)) {
        isUnique = true;
      }
    }
    return newRef;
  };

  const handleNameChange = (newName: string) => {
    setFormData(prev => {
      const updated = { ...prev, name: newName };
      if (!isManualRef && !editingItem && updated.reference === '' && newName.trim() !== '') {
        updated.reference = generateUniqueNumericRef();
      }
      return updated;
    });
  };

  const handleOpenModal = (item?: PartCatalogItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        reference: item.reference,
        stock: item.stock.toString()
      });
      setIsManualRef(true);
    } else {
      setEditingItem(null);
      setFormData({ name: '', reference: '', stock: '0' });
      setIsManualRef(false);
    }
    setShowModal(true);
  };

  const handleDeleteItem = async () => {
    if (!editingItem) return;
    if (confirm(`Remover "${editingItem.name}" do catálogo permanentemente?`)) {
      setIsSubmitting(true);
      try {
        await mockData.deleteCatalogItem(editingItem.id);
        setShowModal(false);
        fetchCatalog();
      } catch (err: any) {
        alert(err.message || "Erro ao eliminar artigo.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const stock = parseInt(formData.stock);

    if (isNaN(stock)) {
      alert("O Stock deve ser um número válido.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingItem) {
        await mockData.updateCatalogItem(editingItem.id, {
          name: formData.name,
          reference: formData.reference,
          stock
        });
      } else {
        await mockData.addCatalogItem({
          name: formData.name,
          reference: formData.reference,
          stock
        });
      }
      setShowModal(false);
      fetchCatalog();
    } catch (err: any) {
      alert(err.message || "Erro ao gravar artigo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock <= 0) return { label: 'Esgotado', color: 'bg-red-50 text-red-600 border-red-100', dot: 'bg-red-500' };
    if (stock <= 5) return { label: 'Stock Baixo', color: 'bg-orange-50 text-orange-600 border-orange-100', dot: 'bg-orange-500' };
    return { label: 'Disponível', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-500' };
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 relative px-1 sm:px-0">
      
      <div className="flex flex-col mb-8 px-2">
         <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-tight">Artigos & Peças</h1>
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">
           {items.length} Referências no Catálogo
         </p>
      </div>

      {errorMsg && (
        <div className="mx-2 mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-in fade-in">
           <AlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
           <div>
              <p className="text-[10px] font-black text-red-900 uppercase tracking-widest">Erro de Sincronização</p>
              <p className="text-[11px] font-bold text-red-600 uppercase mt-1 leading-relaxed">
                 {errorMsg}
              </p>
              <button 
                onClick={fetchCatalog}
                className="mt-3 text-[9px] font-black uppercase bg-red-600 text-white px-3 py-1.5 rounded-lg shadow-sm"
              >
                Tentar Novamente
              </button>
           </div>
        </div>
      )}

      <div className="bg-white p-3 rounded-[1.8rem] shadow-sm border border-gray-100 mx-1 mb-6">
        <div className="relative">
           <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
           <input 
             type="text" 
             placeholder="Pesquisar por nome ou referência..." 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-[11px] font-black uppercase tracking-tight focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
           />
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
           <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : items.length === 0 && !errorMsg ? (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 mx-1">
           <Package size={32} className="mx-auto text-gray-100 mb-4" />
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-8 leading-relaxed">O catálogo está vazio</p>
        </div>
      ) : filteredItems.length === 0 && !errorMsg ? (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 mx-1">
           <Search size={32} className="mx-auto text-gray-100 mb-4" />
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-8 leading-relaxed">Nenhum artigo encontrado para esta pesquisa</p>
        </div>
      ) : (
        <div className="space-y-2.5 mx-1">
          {filteredItems.map((item) => {
            const status = getStockStatus(item.stock);
            return (
              <div 
                key={item.id} 
                onClick={() => handleOpenModal(item)}
                className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-[1.8rem] shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group active:scale-[0.98]"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all flex-shrink-0 shadow-inner">
                    <Layers size={20} />
                  </div>
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-0.5">
                       <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest font-mono bg-blue-50/50 px-1.5 py-0.5 rounded leading-none">{item.reference}</span>
                       <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${status.color}`}>
                          <span className={`w-1 h-1 rounded-full ${status.dot}`}></span>
                          {status.label}
                       </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 uppercase truncate leading-tight group-hover:text-blue-600 transition-colors">
                      {item.name}
                    </h3>
                  </div>
                </div>
                
                <div className="text-right flex items-center gap-4 flex-shrink-0">
                  <div className="hidden sm:block">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Stock</p>
                    <p className="text-sm font-black text-slate-900">{item.stock} UN</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-blue-500 group-hover:bg-blue-50 transition-all">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button 
        onClick={() => handleOpenModal()}
        className="fixed bottom-6 right-6 p-5 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 hover:bg-blue-700 hover:scale-110 transition-all transform flex items-center justify-center active:scale-95 z-40"
        title="Novo Artigo"
      >
        <Plus size={28} />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                {editingItem ? 'Editar Artigo Catálogo' : 'Novo Registo Artigo'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-2">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Comercial do Artigo *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ex: Parafuso Autoperfurante 3x28" 
                    value={formData.name} 
                    onChange={e => handleNameChange(e.target.value)} 
                    className="w-full bg-slate-50 border-none rounded-xl px-5 py-4 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1.5 ml-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Referência (10 dígitos) *</label>
                    {!editingItem && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsManualRef(false);
                          setFormData(prev => ({ ...prev, reference: generateUniqueNumericRef() }));
                        }}
                        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <Sparkles size={10} />
                        <span className="text-[8px] font-black uppercase tracking-widest">Nova Aleatória</span>
                      </button>
                    )}
                  </div>
                  <input 
                    type="text" 
                    required 
                    maxLength={10}
                    placeholder="Ex: 8273940122" 
                    value={formData.reference} 
                    onChange={e => {
                      setIsManualRef(true);
                      setFormData({...formData, reference: e.target.value.replace(/\D/g, '')});
                    }} 
                    className="w-full bg-slate-50 border-none rounded-xl px-5 py-4 text-sm font-black font-mono outline-none lowercase tracking-widest focus:ring-4 focus:ring-blue-500/10 transition-all" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Stock Atual (UN)</label>
                  <div className="relative">
                    <Tag size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="number" 
                      required 
                      value={formData.stock} 
                      onChange={e => setFormData({...formData, stock: e.target.value})} 
                      className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-5 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex flex-col gap-3">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'A GUARDAR...' : editingItem ? 'GUARDAR ALTERAÇÕES' : 'CONFIRMAR NOVO ARTIGO'}
                </button>
                
                {editingItem && (
                  <button 
                    type="button" 
                    onClick={handleDeleteItem}
                    className="w-full text-red-500 font-black text-[9px] uppercase tracking-widest py-3 rounded-xl hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} /> ELIMINAR ARTIGO DO CATÁLOGO
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
