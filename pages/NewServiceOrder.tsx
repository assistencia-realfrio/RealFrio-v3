
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Save, ArrowLeft, Calendar, AlertTriangle, FileText, 
  MapPin, User, HardDrive, Activity, Tag, ChevronDown, Clock,
  Search, Plus, X, Building2, Phone, Mail, CheckCircle2, Loader2
} from 'lucide-react';
import { mockData } from '../services/mockData';
import { Client, Equipment, Establishment, OSType, OSStatus, ServiceOrder } from '../types';
import { useStore } from '../contexts/StoreContext';
import { normalizeString } from '../utils';

const NewServiceOrder: React.FC = () => {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [allEstablishments, setAllEstablishments] = useState<(Establishment & { client_name?: string })[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [allServiceOrders, setAllServiceOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [mainSearch, setMainSearch] = useState('');
  const [isMainListOpen, setIsMainListOpen] = useState(false);
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [isEqListOpen, setIsEqListOpen] = useState(false);

  const [showClientModal, setShowClientModal] = useState(false);
  const [showEqModal, setShowEqModal] = useState(false);
  const [showExistingOSModal, setShowExistingOSModal] = useState(false);
  const [existingOS, setExistingOS] = useState<ServiceOrder | null>(null);

  const [formData, setFormData] = useState({
    client_id: '',
    establishment_id: '',
    equipment_id: '',
    type: OSType.AVARIA,
    priority: 'media',
    description: '',
    scheduled_date: '',
    scheduled_time: '',
    is_warranty: false,
    call_before_going: false,
    contact_name: '',
    contact_phone: '',
    store: currentStore === 'Todas' ? 'Caldas da Rainha' : currentStore
  });

  const mainContainerRef = useRef<HTMLDivElement>(null);
  const eqContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBaseData();
    const handleClickOutside = (event: MouseEvent) => {
      if (mainContainerRef.current && !mainContainerRef.current.contains(event.target as Node)) {
        setIsMainListOpen(false);
      }
      if (eqContainerRef.current && !eqContainerRef.current.contains(event.target as Node)) {
        setIsEqListOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [currentStore]);

  useEffect(() => {
    if (formData.client_id) {
      mockData.getEstablishmentsByClient(formData.client_id).then(ests => {
        setEstablishments(ests);
        if (ests.length === 1) {
           setFormData(prev => ({ ...prev, establishment_id: ests[0].id }));
        } else {
           setFormData(prev => ({ ...prev, establishment_id: '' }));
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
      setFormData(prev => ({ ...prev, equipment_id: '' }));
      setEquipmentSearch('');
    } else {
      setEquipments([]);
    }
  }, [formData.establishment_id]);

  const fetchBaseData = async () => {
    setLoading(true);
    try {
      const [allClients, allEsts, allOS] = await Promise.all([
        mockData.getClients(),
        mockData.getAllEstablishments(),
        mockData.getServiceOrders()
      ]);
      
      const filteredClients = currentStore === 'Todas' 
        ? allClients 
        : allClients.filter(c => c.store === currentStore);
      
      setClients(filteredClients.sort((a, b) => a.name.localeCompare(b.name)));
      setAllEstablishments(allEsts);
      setAllServiceOrders(allOS);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = useMemo(() => {
    const term = normalizeString(mainSearch);
    if (!term) {
      return clients.map(c => ({ 
        type: 'client' as const, 
        data: c 
      })).slice(0, 15);
    }

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

  const handleSelectClient = (client: Client) => {
    setFormData({ ...formData, client_id: client.id, establishment_id: '', equipment_id: '' });
    setMainSearch(client.name);
    setIsMainListOpen(false);
  };

  const handleSelectEstablishment = (est: Establishment & { client_name?: string }) => {
    setFormData({ 
      ...formData, 
      client_id: est.client_id, 
      establishment_id: est.id, 
      equipment_id: '' 
    });
    setMainSearch(`${est.name} (${est.client_name})`);
    setIsMainListOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (!formData.client_id || !formData.description) throw new Error("Preencha os campos obrigatórios.");
      const selectedClient = clients.find(c => c.id === formData.client_id);
      
      let finalScheduledDate = formData.scheduled_date;
      if (formData.scheduled_date && formData.scheduled_time) {
        finalScheduledDate = `${formData.scheduled_date}T${formData.scheduled_time}`;
      }

      await mockData.createServiceOrder({
        client_id: formData.client_id,
        establishment_id: formData.establishment_id || undefined,
        equipment_id: formData.equipment_id || undefined,
        type: formData.type,
        priority: formData.priority as any,
        description: formData.description.toUpperCase(),
        status: OSStatus.POR_INICIAR,
        scheduled_date: finalScheduledDate || undefined,
        is_warranty: formData.is_warranty,
        call_before_going: formData.call_before_going,
        contact_name: formData.contact_name.toUpperCase(),
        contact_phone: formData.contact_phone,
        store: formData.store
      });
      navigate('/os');
    } catch (err: any) {
      alert(err.message);
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
        nif: (data.get('nif') as string) || '',
        phone: (data.get('phone') as string) || '',
        email: (data.get('email') as string) || '',
        address: (data.get('address') as string).toUpperCase() || '',
        type: 'Empresa',
        store: currentStore === 'Todas' ? 'Caldas da Rainha' : currentStore as string
      });
      setClients([newClient, ...clients].sort((a, b) => a.name.localeCompare(b.name)));
      handleSelectClient(newClient);
      setShowClientModal(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 px-2 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-3 bg-white dark:bg-slate-900 text-slate-500 rounded-2xl shadow-sm border dark:border-slate-800 active:scale-95 transition-all"><ArrowLeft size={22} /></button>
        <div>
           <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Nova OS</h1>
           <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Abertura de Chamado</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 p-8 space-y-6">
           {/* PESQUISA DE CLIENTE */}
           <div className="relative" ref={mainContainerRef}>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cliente ou Local *</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" placeholder="Pesquisar..." 
                  value={mainSearch} onChange={(e) => { setMainSearch(e.target.value); setIsMainListOpen(true); }}
                  onFocus={() => setIsMainListOpen(true)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase"
                />
              </div>

               {isMainListOpen && (
                <div className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden max-h-80 overflow-y-auto no-scrollbar animate-in slide-in-from-top-2">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800 flex items-center justify-between">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Sugestões</span>
                     <button type="button" onClick={() => setShowClientModal(true)} className="text-[9px] font-black text-blue-600 uppercase px-2 py-1">+ Novo Cliente</button>
                  </div>
                  {filteredResults.map((res, idx) => (
                    <button key={idx} type="button" onClick={() => res.type === 'client' ? handleSelectClient(res.data) : handleSelectEstablishment(res.data)} className="w-full text-left px-5 py-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b dark:border-slate-800 last:border-0 flex items-center gap-4 group">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${res.type === 'client' ? 'bg-blue-50 text-blue-500' : 'bg-indigo-50 text-indigo-500'}`}>{res.type === 'client' ? <User size={18} /> : <Building2 size={18} />}</div>
                       <div className="min-w-0">
                          <p className="text-sm font-black dark:text-white uppercase truncate group-hover:text-blue-600 transition-colors">{res.type === 'client' ? res.data.name : res.data.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase truncate">{res.type === 'client' ? res.data.address : `Proprietário: ${res.data.client_name}`}</p>
                       </div>
                    </button>
                  ))}
                </div>
              )}
           </div>

           {/* LOCAL E EQUIPAMENTO */}
           {formData.client_id && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-300">
               <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Local / Estabelecimento</label>
                 <div className="relative">
                   <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                   <select 
                     value={formData.establishment_id} 
                     onChange={e => setFormData({...formData, establishment_id: e.target.value})}
                     className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white appearance-none outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase"
                   >
                     <option value="" disabled={establishments.length > 0}>{establishments.length === 0 ? 'SEDE / PRINCIPAL' : 'SELECCIONE UM LOCAL...'}</option>
                     {establishments.map(est => (
                       <option key={est.id} value={est.id}>{est.name.toUpperCase()}</option>
                     ))}
                   </select>
                   <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                 </div>
               </div>

               <div className="relative" ref={eqContainerRef}>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Equipamento</label>
                 <div className="relative">
                   <HardDrive className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                   <input 
                     type="text" placeholder="Pesquisar equipamento..." 
                     value={equipmentSearch} onChange={(e) => { setEquipmentSearch(e.target.value); setIsEqListOpen(true); }}
                     onFocus={() => setIsEqListOpen(true)}
                     className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase"
                   />
                 </div>

                 {isEqListOpen && equipments.length > 0 && (
                   <div className="absolute z-40 left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden max-h-60 overflow-y-auto no-scrollbar animate-in slide-in-from-top-2">
                     {filteredEquipments.map((eq) => (
                       <button 
                         key={eq.id} type="button" 
                         onClick={() => {
                           const openOS = allServiceOrders.find(os => 
                             os.equipment_id === eq.id && 
                             os.status !== OSStatus.CONCLUIDA && 
                             os.status !== OSStatus.CANCELADA
                           );

                           if (openOS) {
                             setExistingOS(openOS);
                             setShowExistingOSModal(true);
                           }

                           setFormData({...formData, equipment_id: eq.id});
                           setEquipmentSearch(`${eq.type} - ${eq.brand || ''} (${eq.serial_number || 'S/N'})`);
                           setIsEqListOpen(false);
                         }} 
                         className="w-full text-left px-5 py-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b dark:border-slate-800 last:border-0 flex items-center gap-4 group"
                       >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"><HardDrive size={14} /></div>
                          <div className="min-w-0">
                             <p className="text-xs font-black dark:text-white uppercase truncate">{eq.type} {eq.brand}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase truncate">S/N: {eq.serial_number || 'NÃO REGISTADO'}</p>
                          </div>
                       </button>
                     ))}
                   </div>
                 )}
               </div>
             </div>
           )}

           <div className={`grid grid-cols-1 ${currentStore === 'Todas' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
              {currentStore === 'Todas' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Loja / Delegação</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <select 
                      value={formData.store} 
                      onChange={e => setFormData({...formData, store: e.target.value as 'Caldas da Rainha' | 'Porto de Mós'})}
                      className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white appearance-none outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase"
                    >
                      <option value="Caldas da Rainha">CALDAS DA RAINHA</option>
                      <option value="Porto de Mós">PORTO DE MÓS</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipo de Serviço</label>
                <div className="relative">
                  <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as OSType})} className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white appearance-none outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase">
                    {Object.values(OSType).map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Prioridade</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white appearance-none outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase">
                    <option value="baixa">BAIXA</option>
                    <option value="media">MÉDIA</option>
                    <option value="alta">ALTA</option>
                    <option value="urgente">URGENTE</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Agendamento (Data)</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="date" value={formData.scheduled_date} 
                    onChange={e => setFormData({...formData, scheduled_date: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Hora</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="time" value={formData.scheduled_time} 
                    onChange={e => setFormData({...formData, scheduled_time: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase"
                  />
                </div>
              </div>
           </div>

           <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Descrição do Pedido *</label>
              <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-3xl text-sm font-medium dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none uppercase" placeholder="DESCREVA O PROBLEMA OU PEDIDO DO CLIENTE..." />
           </div>

           <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-transparent hover:border-blue-500/20 transition-all cursor-pointer" onClick={() => setFormData({...formData, is_warranty: !formData.is_warranty})}>
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${formData.is_warranty ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-transparent'}`}>
                <CheckCircle2 size={14} />
              </div>
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Equipamento em Garantia</span>
           </div>

           <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-transparent hover:border-blue-500/20 transition-all cursor-pointer" onClick={() => setFormData({...formData, call_before_going: !formData.call_before_going})}>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${formData.call_before_going ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-transparent'}`}>
                  <CheckCircle2 size={14} />
                </div>
                <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Ligar antes de ir ao local</span>
              </div>

              {formData.call_before_going && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome do Contacto</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="text" value={formData.contact_name} 
                        onChange={e => setFormData({...formData, contact_name: e.target.value})}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase"
                        placeholder="NOME DA PESSOA..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Telefone / Telemóvel</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="tel" value={formData.contact_phone} 
                        onChange={e => setFormData({...formData, contact_phone: e.target.value})}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase"
                        placeholder="912 345 678..."
                      />
                    </div>
                  </div>
                </div>
              )}
           </div>

           <div className="pt-4">
              <button type="submit" disabled={isSubmitting || !formData.client_id} className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                {isSubmitting ? 'A CRIAR...' : 'CRIAR ORDEM DE SERVIÇO'}
              </button>
           </div>
        </div>
      </form>

      {showClientModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border dark:border-white/5">
              <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                 <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Registo Rápido: Novo Cliente</h3>
                 <button onClick={() => setShowClientModal(false)} className="text-gray-400 hover:text-red-500 p-2"><X size={24}/></button>
              </div>
              <form onSubmit={handleQuickCreateClient} className="p-8 space-y-4">
                 <div className="space-y-4">
                    <input required name="name" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-4 text-sm font-black dark:text-white uppercase outline-none" placeholder="NOME COMERCIAL *" />
                    <div className="grid grid-cols-2 gap-4">
                      <input name="billing_name" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-4 text-sm font-black dark:text-white uppercase outline-none" placeholder="FIRMA DE FATURAÇÃO" />
                      <input name="nif" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-4 text-sm font-black dark:text-white uppercase outline-none" placeholder="NIF" />
                    </div>
                    <input name="address" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-4 text-sm font-black dark:text-white uppercase outline-none" placeholder="MORADA SEDE" />
                    <div className="grid grid-cols-2 gap-4">
                      <input name="phone" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-4 text-sm font-black dark:text-white outline-none" placeholder="TELEFONE" />
                      <input name="email" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-4 text-sm font-black dark:text-white outline-none lowercase" style={{textTransform: 'none'}} placeholder="EMAIL" />
                    </div>
                 </div>
                 <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-95 transition-all mt-4">CONFIRMAR E USAR NESTA OS</button>
              </form>
           </div>
        </div>
      )}

      {showExistingOSModal && existingOS && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border dark:border-white/5 p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={40} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">OS já aberta para este ativo</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Este equipamento já possui uma Ordem de Serviço ativa (<span className="font-black text-blue-600">{existingOS.code}</span>).
                Deseja continuar com a criação de uma nova OS ou prefere ver a OS existente?
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => navigate(`/os/${existingOS.id}`)}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all"
              >
                Ver OS Existente
              </button>
              <button 
                onClick={() => setShowExistingOSModal(false)}
                className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Continuar com Nova OS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewServiceOrder;
