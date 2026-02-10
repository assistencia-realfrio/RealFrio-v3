
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

  // Search/Select States (Identical to NewServiceOrder)
  const [mainSearch, setMainSearch] = useState('');
  const [isMainListOpen, setIsMainListOpen] = useState(false);
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [isEqListOpen, setIsEqListOpen] = useState(false);

  // Modals for quick creation
  const [showClientModal, setShowClientModal] = useState(false);
  const [showEqModal, setShowEqModal] = useState(false);

  // Quote Items
  const [items, setItems] = useState<Partial<QuoteItem>[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  
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
  }, [id, currentStore]);

  useEffect(() => {
    if (formData.client_id) {
      mockData.getEstablishmentsByClient(formData.client_id).then(ests => {
        setEstablishments(ests);
        if (ests.length === 1 && !formData.establishment_id) {
          setFormData(prev => ({ ...prev, establishment_id: ests[0].id }));
        }
      });
    } else {
      setEstablishments([]);
      setEquipments([]);
    }
  }, [formData.client_id]);

  useEffect(() => {
    if (formData.establishment_id) {
      mockData.getEquipments().then(all => {
        setEquipments(all.filter(e => e.establishment_id === formData.establishment_id));
      });
      if (!loading) {
        setFormData(prev => ({ ...prev, equipment_id: '' }));
        setEquipmentSearch('');
      }
    } else {
      setEquipments([]);
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
      setClients(filteredClients.sort((a, b) => a.name.localeCompare(b.name)));
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
    if (!term) return clients.map(c => ({ type: 'client' as const, data: c })).slice(0, 15);

    const clientMatches = clients.filter(c => 
      normalizeString(c.name).includes(term) || 
      normalizeString(c.billing_name || '').includes(term)
    ).map(c => ({ type: 'client' as const, data: c }));

    const establishmentMatches = allEstablishments.filter(e => 
      (normalizeString(e.name).includes(term) || 
      normalizeString(e.client_name || '').includes(term)) &&
      clients.some(c => c.id === e.client_id)
    ).map(e => ({ type: 'establishment' as const, data: e }));

    return [...clientMatches, ...establishmentMatches].slice(0, 15);
  }, [clients, allEstablishments, mainSearch]);

  const filteredEquipments = useMemo(() => {
    const term = normalizeString(equipmentSearch);
    if (!term) return equipments;
    return equipments.filter(e => 
      normalizeString(e.type).includes(term) || 
      normalizeString(e.brand || '').includes(term) ||
      normalizeString(e.serial_number || '').includes(term)
    );
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
    if (!formData.client_id || items.length === 0) {
      alert("Selecione um cliente e adicione pelo menos um item ao orçamento.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const selectedClient = clients.find(c => c.id === formData.client_id);
      const quotePayload = {
        ...formData,
        total_amount: totals.total,
        store: selectedClient?.store || currentStore === 'Todas' ? 'Caldas da Rainha' : currentStore
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

  const handleQuickCreateClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    try {
      const newClient = await mockData.createClient({
        name: (data.get('name') as string).toUpperCase(),
        billing_name: (data.get('billing_name') as string || data.get('name') as string).toUpperCase(),
        phone: (data.get('phone') as string) || '',
        email: (data.get('email') as string) || '',
        address: (data.get('address') as string).toUpperCase() || '',
        type: 'Empresa',
        store: currentStore === 'Todas' ? 'Caldas da Rainha' : currentStore as string
      });
      setClients([newClient, ...clients].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData({ ...formData, client_id: newClient.id, establishment_id: '', equipment_id: '' });
      setMainSearch(newClient.name);
      setShowClientModal(false);
      setIsMainListOpen(false);
      const allEsts = await mockData.getAllEstablishments();
      setAllEstablishments(allEsts);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleQuickCreateEq = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.establishment_id) return;
    const data = new FormData(e.currentTarget);
    try {
      const payload: Partial<Equipment> = {
        client_id: formData.client_id,
        establishment_id: formData.establishment_id,
        type: (data.get('type') as string).toUpperCase(),
        brand: (data.get('brand') as string || '').toUpperCase() || null,
        model: (data.get('model') as string || '').toUpperCase() || null,
        serial_number: (data.get('serial_number') as string || '').toUpperCase() || null,
      };
      const newEq = await mockData.createEquipment(payload);
      setEquipments([newEq, ...equipments]);
      setFormData({ ...formData, equipment_id: newEq.id });
      setEquipmentSearch(`${newEq.type} (${newEq.serial_number || 'S/N'})`);
      setShowEqModal(false);
      setIsEqListOpen(false);
    } catch (err: any) {
      alert("Erro ao criar ativo: " + err.message);
    }
  };

  if (loading) return <div className="h-full flex justify-center items-center py-40"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-2 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-3 bg-white dark:bg-slate-900 text-slate-500 rounded-2xl shadow-sm border dark:border-slate-800 active:scale-95 transition-all"><ArrowLeft size={22} /></button>
        <div>
           <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">
             {isEditMode ? 'Editar Orçamento' : 'Novo Orçamento'}
           </h1>
           <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
             {currentStore === 'Todas' ? 'Todas as Lojas' : `Loja: ${currentStore}`}
           </p>
        </div>
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
          {/* IDENTIFICAÇÃO (IGUAL À OS) */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 p-8 space-y-6">
             <div className="relative" ref={mainRef}>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Selecionar Cliente ou Pesquisar Local *</label>
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" placeholder="Pesquisar cliente ou morada..."
                    value={mainSearch} onChange={(e) => { setMainSearch(e.target.value); setIsMainListOpen(true); }}
                    onFocus={() => setIsMainListOpen(true)}
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {mainSearch && <button type="button" onClick={() => { setMainSearch(''); setFormData({...formData, client_id: '', establishment_id: ''}); }} className="text-slate-300 hover:text-slate-500"><X size={16} /></button>}
                    <ChevronDown size={16} className={`text-slate-300 transition-transform ${isMainListOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                {isMainListOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden max-h-80 overflow-y-auto no-scrollbar animate-in slide-in-from-top-2">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800 flex items-center justify-between">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Resultados</span>
                       <button type="button" onClick={() => setShowClientModal(true)} className="text-[9px] font-black text-blue-600 uppercase px-2 py-1">+ Novo Cliente</button>
                    </div>
                    {filteredResults.map((res, idx) => (
                      <button key={idx} type="button" onClick={() => { 
                        if (res.type === 'client') { setFormData({...formData, client_id: res.data.id, establishment_id: ''}); setMainSearch(res.data.name); }
                        else { setFormData({...formData, client_id: res.data.client_id, establishment_id: res.data.id}); setMainSearch(`${res.data.name} (${res.data.client_name})`); }
                        setIsMainListOpen(false);
                      }} className="w-full text-left px-5 py-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b dark:border-slate-800 last:border-0 flex items-center gap-4 group">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${res.type === 'client' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500'}`}>{res.type === 'client' ? <User size={18} /> : <Building2 size={18} />}</div>
                         <div className="min-w-0">
                            <p className="text-sm font-black dark:text-white uppercase truncate group-hover:text-blue-600 transition-colors">{res.type === 'client' ? res.data.name : res.data.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase truncate">{res.type === 'client' ? res.data.address : `Proprietário: ${res.data.client_name}`}</p>
                         </div>
                      </button>
                    ))}
                  </div>
                )}
             </div>

             <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Confirmar Local de Intervenção</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <select
                    value={formData.establishment_id} 
                    onChange={(e) => setFormData({...formData, establishment_id: e.target.value})}
                    disabled={!formData.client_id}
                    className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none disabled:opacity-50 transition-all uppercase"
                  >
                    <option value="">Escolher Local...</option>
                    {establishments.map(est => <option key={est.id} value={est.id}>{est.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                </div>
             </div>

             <div className="relative" ref={eqRef}>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Ativo / Equipamento</label>
                <div className="relative">
                  <HardDrive className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" placeholder={!formData.establishment_id ? "Selecione primeiro o local..." : "Pesquisar ativo..."} 
                    disabled={!formData.establishment_id} 
                    value={equipmentSearch} 
                    onChange={(e) => { setEquipmentSearch(e.target.value); setIsEqListOpen(true); }} 
                    onFocus={() => setIsEqListOpen(true)} 
                    className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-50 uppercase" 
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {equipmentSearch && <button type="button" onClick={() => { setEquipmentSearch(''); setFormData({...formData, equipment_id: ''}); }} className="text-slate-300 hover:text-slate-500"><X size={16} /></button>}
                    <ChevronDown size={16} className={`text-slate-300 transition-transform ${isEqListOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                {isEqListOpen && formData.establishment_id && (
                  <div className="absolute z-40 left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden max-h-64 overflow-y-auto no-scrollbar animate-in slide-in-from-top-2">
                    {filteredEquipments.length > 0 ? (
                      filteredEquipments.map(e => (<button key={e.id} type="button" onClick={() => { setFormData({...formData, equipment_id: e.id}); setEquipmentSearch(`${e.type} (${e.serial_number || 'S/N'})`); setIsEqListOpen(false); }} className="w-full text-left px-5 py-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-b dark:border-slate-800 last:border-0 group"><p className="text-xs font-black dark:text-white uppercase group-hover:text-indigo-600 transition-colors">{e.type} - {e.brand}</p><p className="text-[9px] text-slate-400 font-mono font-bold">SN: {e.serial_number}</p></button>))
                    ) : (
                      <div className="p-8 text-center">
                         <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Nenhum ativo neste local</p>
                         <button type="button" onClick={() => setShowEqModal(true)} className="text-[10px] font-black text-indigo-600 uppercase border border-indigo-100 px-4 py-2 rounded-xl">+ Registar Ativo</button>
                      </div>
                    )}
                  </div>
                )}
             </div>

             <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Descrição do Pedido (Opcional)</label>
                <textarea rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-950 border-none rounded-[2rem] text-sm font-medium dark:text-white outline-none focus:ring-4 focus:ring-blue-500/5 transition-all resize-none" placeholder="O que o cliente solicitou?" />
             </div>
          </div>

          {/* ITENS DO ORÇAMENTO */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 p-8">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2"><Calculator size={16} className="text-blue-500"/> Artigos & Mão de Obra</h3>
                <button type="button" onClick={() => setShowItemModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95"><Plus size={14} /> Adicionar</button>
             </div>
             <div className="space-y-3">
                 {items.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-[2rem] dark:border-slate-800">
                       <Calculator size={32} className="mx-auto mb-2 text-slate-200" />
                       <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">A proposta ainda não tem itens</p>
                    </div>
                 ) : items.map((item, idx) => (
                   <div key={idx} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-transparent dark:border-slate-800 group transition-all hover:border-blue-100">
                      <div className="flex-1 min-w-0 mr-4">
                         <div className="flex items-center gap-2 mb-1"><span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase border ${item.is_labor ? 'text-blue-600 border-blue-100 dark:border-blue-900' : 'text-slate-600 border-slate-200 dark:text-slate-400 dark:border-slate-800'}`}>{item.is_labor ? 'MO' : 'Mat'}</span><p className="text-xs font-black dark:text-white uppercase truncate">{item.name}</p></div>
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.quantity} UN x {item.unit_price?.toFixed(2)}€</p>
                      </div>
                      <div className="flex items-center gap-4">
                         <p className="text-sm font-black text-slate-900 dark:text-white">{( (item.quantity || 0) * (item.unit_price || 0) ).toFixed(2)}€</p>
                         <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 transition-colors p-2 hover:bg-white dark:hover:bg-slate-900 rounded-xl"><Trash2 size={16}/></button>
                      </div>
                   </div>
                 ))}
             </div>
          </div>
        </div>

        {/* COLUNA RESUMO FINANCEIRO */}
        <div className="space-y-6">
           <div className="bg-[#0f172a] dark:bg-slate-950 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 p-6 opacity-10"><Coins size={80} /></div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-8">Resumo da Proposta</h3>
              
              <div className="space-y-4 mb-10 relative z-10">
                 <div className="flex justify-between text-sm font-bold text-slate-400 uppercase tracking-tight"><span>Subtotal Líquido</span><span>{totals.sub.toFixed(2)}€</span></div>
                 <div className="flex justify-between text-sm font-bold text-slate-400 uppercase tracking-tight"><span>IVA Estimado (23%)</span><span>{totals.iva.toFixed(2)}€</span></div>
                 <div className="h-px bg-slate-800 my-4"></div>
                 <div className="flex justify-between items-baseline">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Total com IVA</span>
                    <span className="text-4xl font-black text-white">{totals.total.toFixed(2)}€</span>
                 </div>
              </div>

              <button 
                onClick={handleSave} 
                disabled={isSubmitting || items.length === 0}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-blue-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl active:scale-95"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : isEditMode ? <Edit2 size={18} /> : <Check size={18} />} 
                {isSubmitting ? 'A GUARDAR...' : isEditMode ? 'GRAVAR ALTERAÇÕES' : 'CONFIRMAR PROPOSTA'}
              </button>
           </div>
           
           <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-3 text-slate-400 mb-4">
                <Info size={16} />
                <p className="text-[9px] font-black uppercase tracking-widest">Informações Adicionais</p>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium uppercase italic">
                O orçamento gerado será exportado em formato PDF com QR Code de aprovação digital para o cliente.
              </p>
           </div>
        </div>
      </div>

      {/* MODAL ADICIONAR ITEM (MATERIAL / MO) */}
      {showItemModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border dark:border-white/5">
              <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                 <h3 className="text-sm font-black dark:text-white uppercase tracking-widest">Adicionar Artigo / Serviço</h3>
                 <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-red-500 p-2 transition-colors"><X size={24}/></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 mb-4">
                    <button type="button" onClick={() => setItemForm({...itemForm, isLabor: false})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${!itemForm.isLabor ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400'}`}>Material</button>
                    <button type="button" onClick={() => setItemForm({...itemForm, isLabor: true, name: 'MÃO DE OBRA TÉCNICA', reference: 'MO-GERAL'})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${itemForm.isLabor ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400'}`}>Mão de Obra</button>
                 </div>
                 <div className="space-y-4">
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase ml-1 mb-1 block">Designação *</label>
                      <input type="text" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-black dark:text-white uppercase outline-none focus:ring-4 focus:ring-blue-500/5" placeholder="..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[8px] font-black text-slate-400 uppercase ml-1 mb-1 block">Quantidade</label>
                          <input type="text" inputMode="decimal" value={itemForm.quantity} onChange={e => setItemForm({...itemForm, quantity: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-black dark:text-white text-center outline-none focus:ring-4 focus:ring-blue-500/5" />
                       </div>
                       <div>
                          <label className="text-[8px] font-black text-slate-400 uppercase ml-1 mb-1 block">Preço Unitário (€)</label>
                          <input type="text" inputMode="decimal" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-black dark:text-white text-center outline-none focus:ring-4 focus:ring-blue-500/5" />
                       </div>
                    </div>
                 </div>
                 <button onClick={addItem} disabled={!itemForm.name || !itemForm.price} className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all disabled:opacity-50">CONFIRMAR ADIÇÃO</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL REGISTO RÁPIDO CLIENTE */}
      {showClientModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border dark:border-white/5">
              <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                 <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Registo Rápido Cliente</h3>
                 <button onClick={() => setShowClientModal(false)} className="text-gray-400 hover:text-red-500 p-2"><X size={24}/></button>
              </div>
              <form onSubmit={handleQuickCreateClient} className="p-8 space-y-4">
                 <div className="space-y-4">
                    <input required name="name" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-4 text-sm font-black dark:text-white uppercase outline-none" placeholder="NOME COMERCIAL *" />
                    <input name="address" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-4 text-sm font-black dark:text-white uppercase outline-none" placeholder="MORADA SEDE" />
                    <div className="grid grid-cols-2 gap-4">
                      <input name="phone" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-4 text-sm font-black dark:text-white outline-none" placeholder="TELEFONE" />
                      <input name="email" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-4 text-sm font-black dark:text-white outline-none lowercase" style={{textTransform: 'none'}} placeholder="EMAIL" />
                    </div>
                 </div>
                 <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-95 transition-all mt-4">CONFIRMAR E USAR NO ORÇAMENTO</button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL REGISTO RÁPIDO ATIVO */}
      {showEqModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border dark:border-white/5">
              <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                 <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Registo Rápido Ativo</h3>
                 <button onClick={() => setShowEqModal(false)} className="text-gray-400 hover:text-red-500 p-2"><X size={24}/></button>
              </div>
              <form onSubmit={handleQuickCreateEq} className="p-8 space-y-4">
                 <div className="space-y-4">
                    <input required name="type" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-4 text-sm font-black dark:text-white uppercase outline-none" placeholder="TIPO DE MÁQUINA *" />
                    <div className="grid grid-cols-2 gap-4">
                      <input name="brand" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-4 text-sm font-black dark:text-white uppercase outline-none" placeholder="MARCA" />
                      <input name="model" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-4 text-sm font-black dark:text-white uppercase outline-none" placeholder="MODELO" />
                    </div>
                    <input name="serial_number" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-4 text-sm font-black dark:text-white uppercase outline-none font-mono" placeholder="NÚMERO DE SÉRIE (S/N)" />
                 </div>
                 <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 active:scale-95 transition-all mt-4">CONFIRMAR E VINCULAR AO ORÇAMENTO</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default NewQuote;
