
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Save, ArrowLeft, Calculator, Search, Plus, X, Building2, Trash2, Coins, Loader2,
  HardDrive, ChevronDown, User, MapPin, Info, Check, AlertCircle, Edit2
} from 'lucide-react';
import { mockData } from '../services/mockData';
import { Client, Equipment, Establishment, QuoteItem, PartCatalogItem, Quote } from '../types';
import { useStore } from '../contexts/StoreContext';
import { normalizeString } from '../utils';

const NewQuote: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const isEditMode = !!id;
  
  // Data
  const [clients, setClients] = useState<Client[]>([]);
  const [allEstablishments, setAllEstablishments] = useState<(Establishment & { client_name?: string })[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [catalog, setCatalog] = useState<PartCatalogItem[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search/Select States
  const [mainSearch, setMainSearch] = useState('');
  const [isMainListOpen, setIsMainListOpen] = useState(false);
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [isEqListOpen, setIsEqListOpen] = useState(false);

  // Quote Items
  const [items, setItems] = useState<Partial<QuoteItem>[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  
  const [itemForm, setItemForm] = useState({
    name: '',
    reference: '',
    quantity: '1',
    price: '',
    isLabor: false
  });

  const [formData, setFormData] = useState({
    client_id: '',
    establishment_id: '',
    equipment_id: '',
    description: '',
  });

  const mainRef = useRef<HTMLDivElement>(null);
  const eqRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBaseData();
    if (isEditMode) loadQuoteData();
    
    const handleClick = (e: MouseEvent) => {
      if (mainRef.current && !mainRef.current.contains(e.target as Node)) setIsMainListOpen(false);
      if (eqRef.current && !eqRef.current.contains(e.target as Node)) setIsEqListOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [id]);

  useEffect(() => {
    if (formData.client_id) {
      mockData.getEstablishmentsByClient(formData.client_id)
        .then(setEstablishments)
        .catch(() => setErrorMessage("Erro ao carregar locais do cliente."));
    }
  }, [formData.client_id]);

  useEffect(() => {
    if (formData.establishment_id) {
      mockData.getEquipments()
        .then(all => {
          setEquipments(all.filter(e => e.establishment_id === formData.establishment_id));
        })
        .catch(() => setErrorMessage("Erro ao carregar ativos."));
      if (!loading) { // Apenas limpa se não estiver no carregamento inicial da edição
        setFormData(prev => ({ ...prev, equipment_id: '' }));
        setEquipmentSearch('');
      }
    }
  }, [formData.establishment_id]);

  const fetchBaseData = async () => {
    setLoading(true);
    try {
      const [allClients, allEsts, cat] = await Promise.all([
        mockData.getClients(),
        mockData.getAllEstablishments(),
        mockData.getCatalog()
      ]);
      const filteredClients = currentStore === 'Todas' ? allClients : allClients.filter(c => c.store === currentStore);
      setClients(filteredClients);
      setAllEstablishments(allEsts);
      setCatalog(cat);
    } catch (e) {
      setErrorMessage("Erro de ligação ao servidor.");
    } finally {
      if (!isEditMode) setLoading(false);
    }
  };

  const loadQuoteData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const quote = await mockData.getQuoteById(id);
      if (quote) {
        setFormData({
          client_id: quote.client_id,
          establishment_id: quote.establishment_id || '',
          equipment_id: quote.equipment_id || '',
          description: quote.description,
        });
        setItems(quote.items || []);
        setMainSearch(quote.client?.name || '');
        if (quote.equipment) setEquipmentSearch(`${quote.equipment.type} (${quote.equipment.serial_number})`);
      }
    } catch (e) {
      setErrorMessage("Erro ao carregar orçamento para edição.");
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = useMemo(() => {
    const term = normalizeString(mainSearch);
    if (!term) return clients.map(c => ({ type: 'client' as const, data: c })).slice(0, 10);
    const cMatch = clients.filter(c => normalizeString(c.name).includes(term)).map(c => ({ type: 'client' as const, data: c }));
    const eMatch = allEstablishments.filter(e => normalizeString(e.name).includes(term) || normalizeString(e.client_name || '').includes(term)).map(e => ({ type: 'establishment' as const, data: e }));
    return [...cMatch, ...eMatch].slice(0, 10);
  }, [clients, allEstablishments, mainSearch]);

  const filteredEquipments = useMemo(() => {
    const term = normalizeString(equipmentSearch);
    if (!term) return equipments;
    return equipments.filter(e => normalizeString(e.type).includes(term) || (e.serial_number && normalizeString(e.serial_number).includes(term)));
  }, [equipments, equipmentSearch]);

  const totals = useMemo(() => {
    const sub = items.reduce((acc, i) => acc + ((i.quantity || 0) * (i.unit_price || 0)), 0);
    return { sub, iva: sub * 0.23, total: sub * 1.23 };
  }, [items]);

  const addItem = () => {
    if (!itemForm.name || !itemForm.price) return;
    setItems([...items, {
      id: Math.random().toString(36).substr(2, 9),
      name: itemForm.name.toUpperCase(),
      reference: itemForm.reference.toUpperCase() || '---',
      quantity: parseFloat(itemForm.quantity.replace(',', '.')),
      unit_price: parseFloat(itemForm.price.replace(',', '.')),
      is_labor: itemForm.isLabor
    }]);
    setShowItemModal(false);
    setItemForm({ name: '', reference: '', quantity: '1', price: '', isLabor: false });
  };

  const handleSave = async () => {
    if (!formData.client_id || !formData.description || items.length === 0) {
      alert("Preencha cliente, descrição e adicione itens.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const quotePayload = {
        ...formData,
        total_amount: totals.total,
        store: currentStore === 'Todas' ? 'Caldas da Rainha' : currentStore
      };

      if (isEditMode && id) {
        await mockData.updateQuote(id, quotePayload, items as QuoteItem[]);
        navigate(`/quotes/${id}`);
      } else {
        await mockData.createQuote(quotePayload, items as QuoteItem[]);
        navigate('/quotes');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erro ao gravar orçamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="h-full flex justify-center items-center py-40"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-2 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-3 bg-white dark:bg-slate-900 text-slate-500 rounded-2xl shadow-sm border dark:border-slate-800"><ArrowLeft size={22} /></button>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
          {isEditMode ? 'Editar Orçamento' : 'Novo Orçamento'}
        </h1>
      </div>

      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400 animate-shake">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Erro de Operação</p>
            <p className="text-[9px] font-bold uppercase">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-black/5 rounded-full"><X size={16}/></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Formulário Base */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 p-8 space-y-6">
             <div className="relative" ref={mainRef}>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cliente / Local *</label>
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" placeholder="Pesquisar Cliente ou Morada..."
                    value={mainSearch} onChange={(e) => { setMainSearch(e.target.value); setIsMainListOpen(true); }}
                    onFocus={() => setIsMainListOpen(true)}
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase"
                  />
                </div>
                {isMainListOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden max-h-60 overflow-y-auto no-scrollbar">
                    {filteredResults.map((res, idx) => (
                      <button key={idx} type="button" onClick={() => { 
                        if (res.type === 'client') { setFormData({...formData, client_id: res.data.id, establishment_id: ''}); setMainSearch(res.data.name); }
                        else { setFormData({...formData, client_id: res.data.client_id, establishment_id: res.data.id}); setMainSearch(`${res.data.name} (${res.data.client_name})`); }
                        setIsMainListOpen(false);
                      }} className="w-full text-left px-5 py-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b dark:border-slate-800 last:border-0 flex items-center gap-4">
                         <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-500">{res.type === 'client' ? <User size={14} /> : <Building2 size={14} />}</div>
                         <div className="min-w-0">
                            <p className="text-xs font-black dark:text-white uppercase truncate">{res.type === 'client' ? res.data.name : res.data.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase truncate">{res.type === 'client' ? res.data.address : res.data.client_name}</p>
                         </div>
                      </button>
                    ))}
                  </div>
                )}
             </div>

             <div className="relative" ref={eqRef}>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Equipamento (Opcional)</label>
                <div className="relative">
                  <HardDrive className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" placeholder={!formData.establishment_id ? "Selecione local..." : "Pesquisar ativo..."} disabled={!formData.establishment_id} value={equipmentSearch} onChange={(e) => { setEquipmentSearch(e.target.value); setIsEqListOpen(true); }} onFocus={() => setIsEqListOpen(true)} className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-60 uppercase" />
                </div>
                {isEqListOpen && formData.establishment_id && (
                  <div className="absolute z-40 left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden max-h-48 overflow-y-auto no-scrollbar">
                    {filteredEquipments.map(e => (<button key={e.id} type="button" onClick={() => { setFormData({...formData, equipment_id: e.id}); setEquipmentSearch(e.type); setIsEqListOpen(false); }} className="w-full text-left px-5 py-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-b dark:border-slate-800 last:border-0"><p className="text-xs font-black dark:text-white uppercase">{e.type}</p><p className="text-[9px] text-slate-400 font-mono font-bold">{e.serial_number}</p></button>))}
                  </div>
                )}
             </div>

             <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Descrição do Pedido *</label>
                <textarea rows={3} required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-950 border-none rounded-[2rem] text-sm font-medium dark:text-white outline-none focus:ring-4 focus:ring-blue-500/5 transition-all resize-none" placeholder="Descreva o serviço..." />
             </div>
          </div>

          {/* Itens do Orçamento */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 p-8">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2"><Calculator size={16} className="text-blue-500"/> Artigos & Mão de Obra</h3>
                <button type="button" onClick={() => setShowItemModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition-all flex items-center gap-2"><Plus size={14} /> Adicionar</button>
             </div>
             <div className="space-y-3">
                 {items.length === 0 ? <p className="text-center py-8 text-[10px] font-black text-slate-300 uppercase tracking-widest border-2 border-dashed rounded-3xl dark:border-slate-800">Vazio</p> : items.map((item, idx) => (
                   <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border dark:border-slate-800 group transition-all hover:border-blue-100">
                      <div className="flex-1 min-w-0 mr-4">
                         <div className="flex items-center gap-2"><span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase border ${item.is_labor ? 'text-blue-600 border-blue-100 dark:border-blue-900' : 'text-slate-600 dark:text-slate-400 dark:border-slate-800'}`}>{item.is_labor ? 'MO' : 'Material'}</span><p className="text-xs font-black dark:text-white uppercase truncate">{item.name}</p></div>
                         <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{item.quantity} UN x {item.unit_price?.toFixed(2)}€</p>
                      </div>
                      <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button>
                   </div>
                 ))}
             </div>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="space-y-6">
           <div className="bg-slate-900 dark:bg-slate-950 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10"><Coins size={80} /></div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-6">Resumo Estimado</h3>
              <div className="space-y-3 mb-8 relative z-10">
                 <div className="flex justify-between text-sm font-medium text-slate-300"><span>Subtotal</span><span>{totals.sub.toFixed(2)}€</span></div>
                 <div className="flex justify-between text-sm font-medium text-slate-300"><span>IVA (23%)</span><span>{totals.iva.toFixed(2)}€</span></div>
                 <div className="h-px bg-slate-700 my-2"></div>
                 <div className="flex justify-between text-2xl font-black text-white"><span>Total</span><span>{totals.total.toFixed(2)}€</span></div>
              </div>
              <button 
                onClick={handleSave} 
                disabled={isSubmitting || items.length === 0}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg active:scale-95"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : isEditMode ? <Edit2 size={16} /> : <Save size={16} />} 
                {isEditMode ? 'GUARDAR ALTERAÇÕES' : 'CRIAR ORÇAMENTO'}
              </button>
           </div>
        </div>
      </div>

      {/* Modal de Item */}
      {showItemModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border dark:border-white/5">
              <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                 <h3 className="text-sm font-black dark:text-white uppercase tracking-widest">Adicionar Item</h3>
                 <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-red-500 p-2 transition-colors"><X size={24}/></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-4">
                    <button type="button" onClick={() => setItemForm({...itemForm, isLabor: false})} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${!itemForm.isLabor ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400'}`}>Material</button>
                    <button type="button" onClick={() => setItemForm({...itemForm, isLabor: true, name: 'MÃO DE OBRA TÉCNICA', reference: 'MO-GERAL'})} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${itemForm.isLabor ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400'}`}>Mão de Obra</button>
                 </div>
                 <div className="space-y-4">
                    <input type="text" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-sm font-bold dark:text-white uppercase outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Designação..." />
                    <div className="grid grid-cols-2 gap-4">
                       <input type="text" inputMode="decimal" value={itemForm.quantity} onChange={e => setItemForm({...itemForm, quantity: e.target.value})} className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-sm font-bold dark:text-white text-center outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Qtd" />
                       <input type="text" inputMode="decimal" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-sm font-bold dark:text-white text-center outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Preço (€)" />
                    </div>
                 </div>
                 <button onClick={addItem} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all">ADICIONAR ITEM</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default NewQuote;
