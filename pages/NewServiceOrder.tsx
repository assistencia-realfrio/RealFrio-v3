
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Save, ArrowLeft, Calendar, AlertTriangle, FileText, 
  MapPin, User, HardDrive, Activity, Tag, ChevronDown, Clock,
  Search, Plus, X, Building2, Phone, Mail, CheckCircle2, Loader2
} from 'lucide-react';
import { mockData } from '../services/mockData';
import { Client, Equipment, Establishment, OSType, OSStatus } from '../types';
import { useStore } from '../contexts/StoreContext';
import { normalizeString } from '../utils';

const NewServiceOrder: React.FC = () => {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [allEstablishments, setAllEstablishments] = useState<(Establishment & { client_name?: string })[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [mainSearch, setMainSearch] = useState('');
  const [isMainListOpen, setIsMainListOpen] = useState(false);
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [isEqListOpen, setIsEqListOpen] = useState(false);

  const [showClientModal, setShowClientModal] = useState(false);
  const [showEqModal, setShowEqModal] = useState(false);

  const [formData, setFormData] = useState({
    client_id: '',
    establishment_id: '',
    equipment_id: '',
    type: OSType.AVARIA,
    priority: 'media',
    description: '',
    scheduled_date: '',
    scheduled_time: ''
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
      setFormData(prev => ({ ...prev, equipment_id: '' }));
      setEquipmentSearch('');
    } else {
      setEquipments([]);
    }
  }, [formData.establishment_id]);

  const fetchBaseData = async () => {
    setLoading(true);
    try {
      const [allClients, allEsts] = await Promise.all([
        mockData.getClients(),
        mockData.getAllEstablishments()
      ]);
      
      const filteredClients = currentStore === 'Todas' 
        ? allClients 
        : allClients.filter(c => c.store === currentStore);
      
      setClients(filteredClients.sort((a, b) => a.name.localeCompare(b.name)));
      setAllEstablishments(allEsts);
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
        store: selectedClient?.store || currentStore === 'Todas' ? 'Caldas da Rainha' : currentStore
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

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

           <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Descrição do Pedido *</label>
              <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-3xl text-sm font-medium dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none uppercase" placeholder="DESCREVA O PROBLEMA OU PEDIDO DO CLIENTE..." />
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
    </div>
  );
};

export default NewServiceOrder;
