
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Save, ArrowLeft, Calendar, AlertTriangle, FileText, 
  MapPin, User, HardDrive, Activity, Tag, ChevronDown, Clock,
  Search, Plus, X, Building2, Phone, Mail, CheckCircle2
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
        // Se só houver um local e o utilizador ainda não escolheu um explicitamente, selecionamos por defeito
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
    
    // Caso 1: Campo Vazio - Mostramos apenas a lista de Clientes para uma seleção rápida
    if (!term) {
      return clients.map(c => ({ 
        type: 'client' as const, 
        data: c 
      })).sort((a, b) => a.data.name.localeCompare(b.data.name));
    }

    // Caso 2: Pesquisa Ativa - Filtramos Clientes E Locais de Intervenção
    const clientMatches = clients.filter(c => 
      normalizeString(c.name).includes(term) || 
      normalizeString(c.billing_name || '').includes(term)
    ).map(c => ({ type: 'client' as const, data: c }));

    const establishmentMatches = allEstablishments.filter(e => 
      (normalizeString(e.name).includes(term) || 
      normalizeString(e.client_name || '').includes(term)) &&
      clients.some(c => c.id === e.client_id) // Respeitar filtro de loja ativa
    ).map(e => ({ type: 'establishment' as const, data: e }));

    return [...clientMatches, ...establishmentMatches].sort((a, b) => {
        const nameA = a.type === 'client' ? a.data.name : a.data.name;
        const nameB = b.type === 'client' ? b.data.name : b.data.name;
        return nameA.localeCompare(nameB);
    });
  }, [clients, allEstablishments, mainSearch]);

  const filteredEquipments = useMemo(() => {
    const term = normalizeString(equipmentSearch);
    if (!term) return equipments;
    return equipments.filter(e => 
      normalizeString(e.type).includes(term) || 
      normalizeString(e.brand).includes(term) ||
      normalizeString(e.serial_number).includes(term)
    );
  }, [equipments, equipmentSearch]);

  const handleSelectClient = (client: Client) => {
    setFormData({ ...formData, client_id: client.id, establishment_id: '', equipment_id: '' });
    setMainSearch(client.name);
    setIsMainListOpen(false);
  };

  const handleSelectEstablishment = (est: Establishment & { client_name?: string }) => {
    const client = clients.find(c => c.id === est.client_id);
    if (client) {
      setFormData({ 
        ...formData, 
        client_id: client.id, 
        establishment_id: est.id, 
        equipment_id: '' 
      });
      setMainSearch(`${est.name} (${client.name})`);
      setIsMainListOpen(false);
    } else {
      alert("Este local pertence a um cliente registado noutra loja.");
    }
  };

  const handleSelectEquipment = (eq: Equipment) => {
    setFormData({ ...formData, equipment_id: eq.id });
    setEquipmentSearch(`${eq.type} - ${eq.brand} (${eq.serial_number})`);
    setIsEqListOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (!formData.client_id || !formData.description) throw new Error("Preencha os campos obrigatórios.");
      const selectedClient = clients.find(c => c.id === formData.client_id);
      if (!selectedClient) throw new Error("Cliente inválido.");

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
        description: formData.description,
        status: OSStatus.POR_INICIAR,
        scheduled_date: finalScheduledDate || undefined,
        store: selectedClient.store
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
        name: data.get('name') as string,
        billing_name: data.get('billing_name') as string || data.get('name') as string,
        phone: (data.get('phone') as string) || '',
        email: (data.get('email') as string) || '',
        address: (data.get('address') as string) || '',
        type: 'Empresa',
        store: currentStore === 'Todas' ? 'Caldas da Rainha' : currentStore as string
      });
      setClients([newClient, ...clients].sort((a, b) => a.name.localeCompare(b.name)));
      handleSelectClient(newClient);
      setShowClientModal(false);
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
      const newEq = await mockData.createEquipment({
        client_id: formData.client_id,
        establishment_id: formData.establishment_id,
        type: data.get('type') as string,
        brand: data.get('brand') as string,
        model: data.get('model') as string || '',
        serial_number: data.get('serial_number') as string,
        install_date: new Date().toISOString().split('T')[0]
      });
      setEquipments([newEq, ...equipments]);
      handleSelectEquipment(newEq);
      setShowEqModal(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4 px-2">
        <button onClick={() => navigate(-1)} className="p-3 bg-white dark:bg-slate-900 text-slate-500 hover:text-blue-600 rounded-2xl shadow-sm transition-all active:scale-95 border border-transparent dark:border-slate-800">
          <ArrowLeft size={22} />
        </button>
        <div>
           <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Abertura OS</h1>
           <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{currentStore === 'Todas' ? 'Todas as Lojas' : `Loja: ${currentStore}`}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* PESQUISA OMNI: CLIENTE OU LOCAL */}
            <div className="md:col-span-2 relative" ref={mainContainerRef}>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Selecionar Cliente ou Pesquisar Local *</label>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  type="text"
                  placeholder="Pesquisar cliente ou morada..."
                  value={mainSearch}
                  onChange={(e) => { setMainSearch(e.target.value); setIsMainListOpen(true); }}
                  onFocus={() => setIsMainListOpen(true)}
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                   {mainSearch && (
                     <button type="button" onClick={() => { setMainSearch(''); setFormData({...formData, client_id: '', establishment_id: ''}); }} className="text-slate-300 hover:text-slate-500 p-1">
                       <X size={16} />
                     </button>
                   )}
                   <ChevronDown size={16} className={`text-slate-300 transition-transform duration-200 ${isMainListOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
              
              {isMainListOpen && (
                <div className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 no-scrollbar">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                       {mainSearch ? 'Resultados da Pesquisa' : 'Listagem de Clientes'}
                     </span>
                     <button type="button" onClick={() => setShowClientModal(true)} className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded-lg transition-all">
                       <Plus size={10}/> Novo Cliente
                     </button>
                  </div>
                  {filteredResults.length > 0 ? (
                    filteredResults.map((res, idx) => (
                      <button 
                        key={idx} type="button" 
                        onClick={() => res.type === 'client' ? handleSelectClient(res.data as Client) : handleSelectEstablishment(res.data as Establishment & { client_name?: string })}
                        className="w-full text-left px-5 py-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-slate-50 dark:border-slate-800/50 last:border-0 transition-colors group flex items-center gap-4"
                      >
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${res.type === 'client' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500'}`}>
                            {res.type === 'client' ? <User size={18} /> : <Building2 size={18} />}
                         </div>
                         <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                               {res.type === 'client' ? (res.data as Client).name : (res.data as Establishment).name}
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight truncate">
                               {res.type === 'client' ? (res.data as Client).address : `Proprietário: ${(res.data as Establishment & { client_name?: string }).client_name}`}
                            </p>
                         </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-10 text-center">
                       <Search size={32} className="mx-auto mb-4 text-slate-200 dark:text-slate-800" />
                       <p className="text-xs text-slate-400 font-black uppercase mb-4 tracking-widest leading-relaxed">Nenhum resultado para "{mainSearch}"</p>
                       <button 
                        type="button" 
                        onClick={() => setShowClientModal(true)}
                        className="flex items-center justify-center gap-2 mx-auto bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                       >
                         <Plus size={14} /> REGISTAR ESTE NOVO CLIENTE
                       </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SELEÇÃO DO LOCAL (CONFIRMAÇÃO) */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Confirmar Local de Intervenção</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <select
                  name="establishment_id" value={formData.establishment_id} 
                  onChange={(e) => setFormData({...formData, establishment_id: e.target.value})}
                  disabled={!formData.client_id}
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none disabled:opacity-50 transition-all"
                >
                  <option value="">Escolher Local...</option>
                  {establishments.map(est => <option key={est.id} value={est.id}>{est.name}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
              </div>
            </div>

            {/* PESQUISA DE ATIVO / EQUIPAMENTO */}
            <div className="md:col-span-2 relative" ref={eqContainerRef}>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Ativo / Equipamento</label>
              <div className="relative">
                <HardDrive className={`absolute left-4 top-1/2 -translate-y-1/2 ${!formData.establishment_id ? 'text-slate-200' : 'text-slate-300'}`} size={18} />
                <input 
                  type="text"
                  placeholder={!formData.establishment_id ? "Selecione primeiro o local..." : "Pesquisar ativo (Tipo, Marca ou SN)..."}
                  disabled={!formData.establishment_id}
                  value={equipmentSearch}
                  onChange={(e) => { setEquipmentSearch(e.target.value); setIsEqListOpen(true); }}
                  onFocus={() => setIsEqListOpen(true)}
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-50"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {equipmentSearch && (
                    <button type="button" onClick={() => { setEquipmentSearch(''); setFormData({...formData, equipment_id: ''}); }} className="text-slate-300 hover:text-slate-500 p-1">
                      <X size={16} />
                    </button>
                  )}
                   <ChevronDown size={16} className={`text-slate-300 transition-transform duration-200 ${isEqListOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {isEqListOpen && formData.establishment_id && (
                <div className="absolute z-40 left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 no-scrollbar">
                  {filteredEquipments.length > 0 ? (
                    filteredEquipments.map(e => (
                      <button 
                        key={e.id} type="button" onClick={() => handleSelectEquipment(e)}
                        className="w-full text-left px-5 py-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-b border-slate-50 dark:border-slate-800/50 last:border-0 transition-colors group"
                      >
                         <p className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{e.type} - {e.brand}</p>
                         <p className="text-[10px] text-slate-400 font-black font-mono uppercase tracking-widest">SN: {e.serial_number}</p>
                      </button>
                    ))
                  ) : (
                    <div className="p-10 text-center">
                       <p className="text-xs text-slate-400 font-black uppercase mb-4 tracking-widest">Nenhum ativo registado neste local</p>
                       <button 
                        type="button" 
                        onClick={() => setShowEqModal(true)}
                        className="flex items-center justify-center gap-2 mx-auto bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                       >
                         <Plus size={14} /> ADICIONAR NOVO ATIVO
                       </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipo de Serviço</label>
              <select
                name="type" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white outline-none appearance-none"
              >
                <option value="avaria">AVARIA / REPARAÇÃO</option>
                <option value="manutencao">MANUTENÇÃO PREVENTIVA</option>
                <option value="instalacao">INSTALAÇÃO</option>
                <option value="revisao">REVISÃO GERAL</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Prioridade</label>
              <select
                name="priority" value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white outline-none appearance-none"
              >
                <option value="baixa">BAIXA</option>
                <option value="media">MÉDIA</option>
                <option value="alta">ALTA</option>
                <option value="urgente">URGENTE</option>
              </select>
            </div>

            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data Agendamento</label>
                <input type="date" name="scheduled_date" value={formData.scheduled_date} onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-black dark:text-white outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Hora</label>
                <input type="time" name="scheduled_time" value={formData.scheduled_time} onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white outline-none" />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Descrição do Pedido *</label>
              <textarea
                name="description" rows={4} required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-950 border-none rounded-[2rem] text-sm font-medium dark:text-white outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                placeholder="Descreva o problema ou pedido..."
              />
            </div>
          </div>

          <button
            type="submit" disabled={isSubmitting || !formData.client_id}
            className="w-full bg-blue-600 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'A PROCESSAR...' : 'CRIAR ORDEM DE SERVIÇO'}
          </button>
        </form>
      </div>

      {/* MODAL REGISTO RÁPIDO CLIENTE */}
      {showClientModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                 <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Registo Rápido: Novo Cliente</h3>
                 <button onClick={() => setShowClientModal(false)} className="text-gray-400 hover:text-gray-600 p-2"><X size={24}/></button>
              </div>
              <form onSubmit={handleQuickCreateClient} className="p-8 space-y-4">
                 <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Nome Comercial *</label>
                      <input required name="name" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-5 py-3 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Ex: Café Central" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Morada Sede</label>
                      <input name="address" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-5 py-3 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Rua..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Telefone</label>
                        <input name="phone" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-5 py-3 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Email</label>
                        <input name="email" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-5 py-3 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20" />
                      </div>
                    </div>
                 </div>
                 <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-95 transition-all mt-4">
                   CONFIRMAR E USAR NESTA OS
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL REGISTO RÁPIDO EQUIPAMENTO */}
      {showEqModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                 <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Registo Rápido: Novo Ativo</h3>
                 <button onClick={() => setShowEqModal(false)} className="text-gray-400 hover:text-gray-600 p-2"><X size={24}/></button>
              </div>
              <form onSubmit={handleQuickCreateEq} className="p-8 space-y-4">
                 <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Tipo de Máquina</label>
                      <input required name="type" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-5 py-3 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Ex: Máquina Gelo" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Marca</label>
                        <input required name="brand" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-5 py-3 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Modelo</label>
                        <input name="model" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-5 py-3 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Número de Série (S/N)</label>
                      <input required name="serial_number" className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-5 py-3 text-sm font-mono font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="SN-XXXX" />
                    </div>
                 </div>
                 <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 active:scale-95 transition-all mt-4">
                   CONFIRMAR E USAR NESTA OS
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default NewServiceOrder;
