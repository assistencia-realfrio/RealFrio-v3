
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, Phone, Mail, User, HardDrive, History as HistoryIcon, 
  Edit2, X, Save, ArrowLeft, ChevronRight, ChevronDown,
  Plus, Building2, FileText, ExternalLink, Filter, Trash2, Eye,
  Cloud
} from 'lucide-react';
import { mockData } from '../services/mockData';
import { Client, Establishment, Equipment, ServiceOrder } from '../types';
import OSStatusBadge from '../components/OSStatusBadge';
import FloatingEditBar from '../components/FloatingEditBar';

const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [history, setHistory] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'establishments' | 'equipments' | 'history'>('info');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para filtros
  const [selectedEstIdEq, setSelectedEstIdEq] = useState<string>('all');
  const [selectedEstIdHist, setSelectedEstIdHist] = useState<string>('all');

  // Estabelecimento Modal
  const [showEstModal, setShowModalEst] = useState(false);
  const [editingEstId, setEditingEstId] = useState<string | null>(null);
  const [estForm, setEditFormEst] = useState({ name: '', address: '', phone: '', contact_person: '' });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [c, ests, eqs, allOs] = await Promise.all([
        mockData.getClientById(id),
        mockData.getEstablishmentsByClient(id),
        mockData.getEquipments(),
        mockData.getServiceOrders()
      ]);

      if (c) {
          setClient(c);
          setEditForm(JSON.parse(JSON.stringify(c)));
          setEstablishments(ests);
          setEquipments(eqs.filter(e => e.client_id === id));
          setHistory(allOs.filter(o => o.client_id === id));
      }
    } catch (err: any) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const isDirty = useMemo(() => {
    if (!client || !editForm) return false;
    return JSON.stringify(client) !== JSON.stringify(editForm);
  }, [client, editForm]);

  const handleSave = async () => {
    if (!id || !editForm) return;
    setIsSubmitting(true);
    try {
      // Limpar o payload para evitar conflitos com a chave primária
      const { id: clientID, ...updates } = editForm;
      
      const payload = {
        ...updates,
        google_drive_link: editForm.google_drive_link?.trim() || null
      };
      
      await mockData.updateClient(id, payload);
      setClient(JSON.parse(JSON.stringify({ ...payload, id: clientID })));
      setIsEditing(false);
    } catch (error: any) {
      // O erro agora virá formatado corretamente pela handleError do mockData
      alert("ERRO AO ATUALIZAR CLIENTE: " + (error.message || String(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditForm(JSON.parse(JSON.stringify(client)));
    setIsEditing(false);
  };

  const handleDeleteClient = async () => {
    if (!id) return;
    if (confirm("ATENÇÃO: Deseja eliminar este cliente definitivamente?")) {
      setIsSubmitting(true);
      try {
        await mockData.deleteClient(id);
        navigate('/clients');
      } catch (error: any) {
        alert("ERRO AO ELIMINAR CLIENTE: " + (error.message || "Tente novamente."));
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleOpenEstModal = (est?: Establishment) => {
    if (est) {
      setEditingEstId(est.id);
      setEditFormEst({
        name: est.name,
        address: est.address,
        phone: est.phone,
        contact_person: est.contact_person
      });
    } else {
      setEditingEstId(null);
      setEditFormEst({ name: '', address: '', phone: '', contact_person: '' });
    }
    setShowModalEst(true);
  };

  const handleSubmitEstablishment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSubmitting(true);
    try {
      if (editingEstId) {
        await mockData.updateEstablishment(editingEstId, estForm);
      } else {
        await mockData.createEstablishment({ ...estForm, client_id: id });
      }
      setShowModalEst(false);
      fetchData();
    } catch (error: any) {
      alert("ERRO AO GERIR LOCAL: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMapLink = (address: string) => {
    if (!address) return '#';
    if (address.toLowerCase().startsWith('http')) return address;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const filteredEquipments = useMemo(() => {
    let list = selectedEstIdEq === 'all' ? equipments : equipments.filter(e => e.establishment_id === selectedEstIdEq);
    return [...list].sort((a, b) => a.type.localeCompare(b.type, 'pt-PT'));
  }, [equipments, selectedEstIdEq]);

  const filteredHistory = useMemo(() => {
    if (selectedEstIdHist === 'all') return history;
    return history.filter(h => h.establishment_id === selectedEstIdHist);
  }, [history, selectedEstIdHist]);

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center p-20">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">A carregar ficha...</p>
    </div>
  );
  
  if (!client || !editForm) return <div className="p-8 text-center uppercase font-black text-slate-400">Cliente não encontrado.</div>;

  return (
    <div className="max-w-4xl mx-auto pb-24 relative px-1 sm:px-0">
      
      <FloatingEditBar 
        isVisible={isDirty && isEditing}
        isSubmitting={isSubmitting}
        onSave={handleSave}
        onCancel={handleCancelEdit}
      />

      {(activeTab === 'establishments' || activeTab === 'equipments') && !isEditing && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
           {activeTab === 'establishments' ? (
              <button 
                onClick={() => handleOpenEstModal()}
                className="p-5 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 hover:bg-blue-700 hover:scale-110 transition-all transform flex items-center justify-center active:scale-95"
              >
                <Plus size={28} />
              </button>
           ) : (
              <Link 
                to={`/clients/${id}/equipments/new`}
                className="p-5 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 hover:bg-blue-700 hover:scale-110 transition-all transform flex items-center justify-center active:scale-95"
              >
                <Plus size={28} />
              </Link>
           )}
        </div>
      )}

      <div className="space-y-4">
        <div className="sticky top-0 z-10 pb-2">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-3 text-slate-500 hover:text-blue-600 rounded-2xl transition-all bg-white border border-gray-200 shadow-sm active:scale-95 flex-shrink-0">
              <ArrowLeft size={22} />
            </button>
            <div className="flex-1 flex overflow-x-auto bg-white border border-gray-200 rounded-2xl shadow-sm no-scrollbar">
              {[
                { id: 'info', icon: User, label: 'Dados' },
                { id: 'establishments', icon: Building2, label: 'Locais' },
                { id: 'equipments', icon: HardDrive, label: 'Ativos' },
                { id: 'history', icon: HistoryIcon, label: 'Hist.' }
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id as any); setIsEditing(false); }}
                  className={`flex-1 flex items-center justify-center py-4 px-3 transition-all border-b-2 gap-2 ${activeTab === tab.id && !isEditing ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-400'}`}
                >
                  <tab.icon size={20} />
                  <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {!isEditing && (
          <div className="bg-white shadow-xl rounded-[2.5rem] p-8 border border-gray-100 text-center animate-in fade-in duration-300 relative group">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tighter leading-tight mb-2">
              {client.name}
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Sede Social | Loja: {client.store}</p>
          </div>
        )}

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {activeTab === 'info' && !isEditing && (
            <div className="space-y-4 px-1">
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden divide-y divide-slate-50">
                <div className="flex items-center gap-4 p-4.5 sm:p-5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50/50 flex items-center justify-center text-blue-500 flex-shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Nome de Faturação / Firma</p>
                    <p className="text-[13px] font-black text-slate-900 uppercase truncate leading-none">{client.billing_name || '---'}</p>
                  </div>
                </div>

                <a href={`tel:${client.phone}`} className="flex items-center gap-4 p-4.5 sm:p-5 hover:bg-slate-50 transition-all group">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50/50 flex items-center justify-center text-blue-500 flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Phone size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Telefone Sede</p>
                    <p className="text-[13px] font-black text-blue-600 uppercase truncate leading-none">{client.phone || '---'}</p>
                  </div>
                </a>

                <a href={`mailto:${client.email}`} className="flex items-center gap-4 p-4.5 sm:p-5 hover:bg-slate-50 transition-all group">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50/50 flex items-center justify-center text-blue-500 flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Mail size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Email Faturação</p>
                    <p className="text-[13px] font-black text-blue-600 truncate leading-none uppercase tracking-tight">{client.email || '---'}</p>
                  </div>
                </a>

                <a 
                  href={getMapLink(client.address)} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-4 p-4.5 sm:p-5 hover:bg-slate-50 transition-all group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-blue-50/50 flex items-center justify-center text-blue-500 flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <MapPin size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Morada de Sede</p>
                    <p className="text-[13px] font-black text-blue-600 uppercase truncate leading-none">
                      {client.address?.toLowerCase().startsWith('http') ? 'VER NO GOOGLE MAPS ➜' : (client.address || 'MORADA NÃO REGISTADA')}
                    </p>
                  </div>
                </a>

                {client.google_drive_link && (
                  <a 
                    href={client.google_drive_link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-4 p-4.5 sm:p-5 hover:bg-slate-50 transition-all group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <Cloud size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Google Drive Cliente</p>
                      <p className="text-[13px] font-black text-emerald-600 uppercase truncate leading-none">ABRIR PASTA DE DOCUMENTOS ➜</p>
                    </div>
                  </a>
                )}
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => setIsEditing(true)}
                  className="w-full bg-[#0f172a] text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <Edit2 size={16} /> EDITAR FICHA DO CLIENTE
                </button>
              </div>
            </div>
          )}

          {activeTab === 'establishments' && !isEditing && (
            <div className="space-y-4">
               <div className="flex items-center justify-between px-2">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Locais de Intervenção ({establishments.length})</h3>
               </div>
               <div className="grid grid-cols-1 gap-3">
                 {establishments.map(est => (
                   <div key={est.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
                      <div className="absolute top-6 right-6">
                        <button 
                          onClick={() => handleOpenEstModal(est)}
                          className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl shadow-sm transition-all"
                          title="Editar Local"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                      <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0">
                               <Building2 size={20} />
                            </div>
                            <div className="min-w-0 pr-16">
                               <h4 className="font-black text-slate-900 uppercase text-lg leading-tight truncate">{est.name}</h4>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Responsável: {est.contact_person}</p>
                            </div>
                         </div>
                      </div>
                      <div className="space-y-2">
                         <a href={getMapLink(est.address)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-xs text-slate-600 hover:text-blue-600">
                           <MapPin size={14} className="text-slate-300" />
                           <span className="font-bold underline decoration-slate-200">
                             {est.address?.toLowerCase().startsWith('http') ? 'VER LOCALIZAÇÃO NO MAPA' : est.address}
                           </span>
                         </a>
                         <a href={`tel:${est.phone}`} className="flex items-center gap-3 text-xs text-slate-600 hover:text-green-600">
                           <Phone size={14} className="text-slate-300" />
                           <span className="font-black">{est.phone}</span>
                         </a>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'equipments' && !isEditing && (
            <div className="space-y-3">
              <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 mx-1 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} />
                </div>
                <div className="flex-1 relative">
                  <select 
                    value={selectedEstIdEq}
                    onChange={(e) => setSelectedEstIdEq(e.target.value)}
                    className="w-full bg-transparent border-none px-0 py-1 text-[11px] font-black text-slate-900 uppercase tracking-tight outline-none appearance-none cursor-pointer"
                  >
                    <option value="all">TODOS OS LOCAIS</option>
                    {establishments.map(est => (
                      <option key={est.id} value={est.id}>{est.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {establishments.length === 0 && equipments.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-100 mx-1">
                  <MapPin size={24} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 font-black text-[9px] uppercase tracking-widest px-8">Nenhum equipamento registado</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mx-1">
                  {filteredEquipments.length === 0 ? (
                    <div className="sm:col-span-2 text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                      <p className="text-gray-400 font-black text-[9px] uppercase tracking-widest">Nenhum ativo encontrado para este local</p>
                    </div>
                  ) : (
                    filteredEquipments.map(eq => (
                      <div 
                        key={eq.id} 
                        onClick={() => navigate(`/equipments/${eq.id}`)}
                        className="bg-white border border-gray-200 rounded-3xl p-5 hover:shadow-md hover:border-blue-200 transition-all group relative overflow-hidden cursor-pointer active:scale-[0.98]"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-baseline text-slate-900 uppercase gap-2">
                            <span className="text-[9px] font-bold text-slate-300 w-11 flex-shrink-0">EQUIP.:</span> 
                            <span className="text-base font-black tracking-tight leading-tight group-hover:text-blue-600 transition-colors">{eq.type}</span>
                          </div>
                          
                          <div className="flex items-baseline text-slate-900 uppercase gap-2">
                            <span className="text-[9px] font-bold text-slate-300 w-11 flex-shrink-0">MARCA:</span> 
                            <span className="text-xs font-bold text-slate-600">{eq.brand}</span>
                          </div>

                          <div className="flex items-baseline text-slate-900 uppercase gap-2">
                            <span className="text-[9px] font-bold text-slate-300 w-11 flex-shrink-0">MODELO:</span> 
                            <span className="text-xs font-bold text-slate-600">{eq.model || '---'}</span>
                          </div>

                          <div className="flex items-baseline text-slate-900 uppercase gap-2">
                            <span className="text-[9px] font-bold text-slate-300 w-11 flex-shrink-0">S/N:</span> 
                            <span className="text-xs font-bold text-slate-600 font-mono tracking-tighter">{eq.serial_number}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && !isEditing && (
            <div className="space-y-4">
              <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 mx-1 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0">
                  <Filter size={18} />
                </div>
                <div className="flex-1 relative">
                  <select 
                    value={selectedEstIdHist}
                    onChange={(e) => setSelectedEstIdHist(e.target.value)}
                    className="w-full bg-transparent border-none px-0 py-1 text-[11px] font-black text-slate-900 uppercase tracking-tight outline-none appearance-none cursor-pointer"
                  >
                    <option value="all">TODOS OS LOCAIS</option>
                    {establishments.map(est => (
                      <option key={est.id} value={est.id}>{est.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-3 mx-1">
                {filteredHistory.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
                    <HistoryIcon size={32} className="mx-auto text-gray-200 mb-4" />
                    <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Sem histórico registado</p>
                  </div>
                ) : (
                  filteredHistory.map(os => (
                    <Link key={os.id} to={`/os/${os.id}`} className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-3xl hover:border-blue-100 hover:shadow-lg transition-all group">
                      <div className="flex items-center gap-5 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex flex-col items-center justify-center font-black group-hover:bg-blue-600 group-hover:text-white transition-all flex-shrink-0 shadow-inner">
                          <span className="text-[10px] text-slate-400 group-hover:text-blue-100 font-bold uppercase tracking-tighter leading-none">OS</span>
                          <span className="text-[8px] text-slate-300 group-hover:text-blue-200 uppercase mt-0.5">{new Date(os.created_at).toLocaleDateString('pt-PT', {day: '2-digit', month: '2-digit'})}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{os.code}</p>
                            <span className="text-[8px] font-black text-slate-300 uppercase">|</span>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{os.type}</p>
                          </div>
                          <h4 className="text-base font-black text-slate-900 uppercase truncate mb-1">{os.description}</h4>
                        </div>
                      </div>
                      <OSStatusBadge status={os.status} className="scale-90 flex-shrink-0" />
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}

          {isEditing && (
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-blue-100 space-y-6 relative animate-in zoom-in-95 duration-200">
              <button onClick={handleCancelEdit} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 transition-colors" title="Cancelar Edição">
                <X size={24} />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner"><Edit2 size={18}/></div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Editar Ficha Cliente</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1 mb-1 block">Entidade Comercial (Nome Público)</label>
                  <input className="w-full bg-blue-50/50 border-none rounded-2xl px-6 py-4 text-lg font-black text-slate-900 uppercase outline-none" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Nome de Faturação / Firma</label>
                  <input className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-bold text-slate-800 outline-none" value={editForm.billing_name} onChange={e => setEditForm({...editForm, billing_name: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Telefone Principal</label>
                  <input className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-bold text-slate-800 outline-none" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Email Sede</label>
                  <input className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-bold text-slate-800 outline-none" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Google Drive Link (Pasta de Documentos)</label>
                  <div className="relative">
                    <Cloud className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input 
                      className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-5 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20" 
                      placeholder="https://drive.google.com/..." 
                      value={editForm.google_drive_link || ''} 
                      onChange={e => setEditForm({...editForm, google_drive_link: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Loja de Atendimento</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-bold text-slate-800 outline-none appearance-none"
                    value={editForm.store}
                    onChange={e => setEditForm({...editForm, store: e.target.value})}
                  >
                    <option value="Caldas da Rainha">CALDAS DA RAINHA</option>
                    <option value="Porto de Mós">PORTO DE MÓS</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Morada Sede (Texto ou Link Google Maps)</label>
                  <input className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-bold text-slate-800 outline-none" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Notas Gerais</label>
                  <textarea className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-medium text-slate-700 min-h-[120px] outline-none" value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} />
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-50">
                <button 
                  onClick={handleDeleteClient}
                  className="flex items-center gap-2 text-red-500 hover:text-red-700 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-red-50 transition-all"
                >
                  <Trash2 size={16} /> Eliminar Cliente Definitivamente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL GESTÃO ESTABELECIMENTO */}
      {showEstModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                   {editingEstId ? 'Editar Local de Intervenção' : 'Novo Local de Intervenção'}
                 </h3>
                 <button onClick={() => setShowModalEst(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
              </div>
              <form onSubmit={handleSubmitEstablishment} className="p-8 space-y-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Nome do Local (Ex: Loja Porto)</label>
                    <input required className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10" value={estForm.name} onChange={e => setEditFormEst({...estForm, name: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Morada Completa (Texto ou Link Maps)</label>
                    <input required className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10" value={estForm.address} onChange={e => setEditFormEst({...estForm, address: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Telefone</label>
                      <input className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-bold outline-none" value={estForm.phone} onChange={e => setEditFormEst({...estForm, phone: e.target.value})} />
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Responsável Local</label>
                      <input className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-bold outline-none" value={estForm.contact_person} onChange={e => setEditFormEst({...estForm, contact_person: e.target.value})} />
                   </div>
                 </div>
                 
                 <div className="pt-4 flex flex-col gap-3">
                   <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-95 transition-all">
                     {isSubmitting ? 'A GUARDAR...' : editingEstId ? 'GUARDAR ALTERAÇÕES' : 'CONFIRMAR NOVO LOCAL'}
                   </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetail;
