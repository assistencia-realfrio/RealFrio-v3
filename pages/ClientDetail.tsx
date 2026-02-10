import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, Phone, Mail, User, HardDrive, History as HistoryIcon, 
  Edit2, X, Save, ArrowLeft, ChevronRight, ChevronDown,
  Plus, Building2, FileText, ExternalLink, Filter, Trash2, Eye,
  Cloud, AlertTriangle, ShieldAlert, Calculator, Coins
} from 'lucide-react';
import { mockData } from '../services/mockData';
import { Client, Establishment, Equipment, ServiceOrder, Quote, QuoteStatus } from '../types';
import OSStatusBadge from '../components/OSStatusBadge';
import FloatingEditBar from '../components/FloatingEditBar';

// Componente de Diálogo de Confirmação Interno para evitar bloqueios de Sandbox
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, title, message, confirmLabel, variant, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-200">
        <div className="p-8 text-center">
          <div className={`w-16 h-16 ${isDanger ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'} dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner`}>
            {isDanger ? <ShieldAlert size={32} /> : <AlertTriangle size={32} />}
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8 uppercase px-4">{message}</p>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={onCancel}
              className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase rounded-2xl active:scale-95 transition-all"
            >
              CANCELAR
            </button>
            <button 
              onClick={onConfirm}
              className={`py-4 ${isDanger ? 'bg-red-600' : 'bg-orange-500'} text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [history, setHistory] = useState<ServiceOrder[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'establishments' | 'equipments' | 'history' | 'quotes'>('info');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para controle do modal de confirmação
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning';
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: '',
    variant: 'warning',
    action: () => {}
  });

  const closeConfirm = () => setConfirmConfig(prev => ({ ...prev, isOpen: false }));

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
      const [c, ests, eqs, allOs, allQuotes] = await Promise.all([
        mockData.getClientById(id),
        mockData.getEstablishmentsByClient(id),
        mockData.getEquipments(),
        mockData.getServiceOrders(),
        mockData.getQuotes()
      ]);

      if (c) {
          setClient(c);
          setEditForm(JSON.parse(JSON.stringify(c)));
          setEstablishments(ests);
          setEquipments(eqs.filter(e => e.client_id === id));
          setHistory(allOs.filter(o => o.client_id === id));
          setQuotes(allQuotes.filter(q => q.client_id === id));
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
      const { id: clientID, ...updates } = editForm;
      const payload: Partial<Client> = {
        ...updates,
        google_drive_link: editForm.google_drive_link?.trim() || undefined
      };
      await mockData.updateClient(id, payload);
      setClient(JSON.parse(JSON.stringify({ ...payload, id: clientID })));
      setIsEditing(false);
    } catch (error: any) {
      alert("ERRO AO ATUALIZAR CLIENTE: " + (error.message || String(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditForm(JSON.parse(JSON.stringify(client)));
    setIsEditing(false);
  };

  const executeDeleteClient = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await mockData.deleteClient(id);
      navigate('/clients');
    } catch (error: any) {
      alert("ERRO AO ELIMINAR CLIENTE: " + (error.message || "Tente novamente."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClient = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar Cliente',
      message: 'Esta operação é IRREVERSÍVEL e apagará todos os dados, locais e equipamentos vinculados. Deseja continuar?',
      confirmLabel: 'ELIMINAR TUDO',
      variant: 'danger',
      action: executeDeleteClient
    });
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
    <div className="max-w-4xl mx-auto pb-44 relative px-1 sm:px-0">
      <ConfirmDialog 
        {...confirmConfig}
        onCancel={closeConfirm}
        onConfirm={() => { closeConfirm(); confirmConfig.action(); }}
      />

      <FloatingEditBar 
        isVisible={isDirty && isEditing}
        isSubmitting={isSubmitting}
        onSave={handleSave}
        onCancel={handleCancelEdit}
      />

      {(activeTab === 'establishments' || activeTab === 'equipments') && !isEditing && (
        <div className="fixed bottom-24 right-6 flex flex-col gap-3 z-40">
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
        <div className="flex items-center gap-2 mb-2 px-1">
          <button onClick={() => navigate(-1)} className="p-3 text-slate-500 dark:text-slate-400 hover:text-blue-600 rounded-2xl transition-all bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm active:scale-95">
            <ArrowLeft size={22} />
          </button>
        </div>

        {!isEditing && (
          <div className="bg-white dark:bg-slate-900 shadow-xl rounded-[2rem] p-6 border border-gray-100 dark:border-slate-800 text-center animate-in fade-in duration-300 relative group transition-colors">
            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">
              {client.name}
            </h1>
            <p className="text-[8px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.4em] mt-1.5">
              Sede Social | Loja: {client.store}
            </p>
          </div>
        )}

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {activeTab === 'info' && !isEditing && (
            <div className="space-y-4 px-1">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
                <div className="flex items-center gap-4 p-4.5 sm:p-5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 flex-shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Nome de Faturação / Firma</p>
                    <p className="text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase truncate leading-none">{client.billing_name || '---'}</p>
                  </div>
                </div>

                <a href={`tel:${client.phone}`} className="flex items-center gap-4 p-4.5 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Phone size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Telefone Sede</p>
                    <p className="text-[13px] font-black text-blue-600 uppercase truncate leading-none">{client.phone || '---'}</p>
                  </div>
                </a>

                <a href={`mailto:${client.email}`} className="flex items-center gap-4 p-4.5 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
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
                  className="flex items-center gap-4 p-4.5 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
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
                    className="flex items-center gap-4 p-4.5 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all">
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
                  className="w-full bg-[#0f172a] dark:bg-blue-600 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95"
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
                   <div key={est.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative">
                      <div className="absolute top-6 right-6">
                        <button 
                          onClick={() => handleOpenEstModal(est)}
                          className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl shadow-sm transition-all"
                          title="Editar Local"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                      <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center flex-shrink-0">
                               <Building2 size={20} />
                            </div>
                            <div className="min-w-0 pr-16">
                               <h4 className="font-black text-slate-900 dark:text-white uppercase text-lg leading-tight truncate">{est.name}</h4>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Responsável: {est.contact_person}</p>
                            </div>
                         </div>
                      </div>
                      <div className="space-y-2">
                         <a href={getMapLink(est.address)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600">
                           <MapPin size={14} className="text-slate-300" />
                           <span className="font-bold underline decoration-slate-200">
                             {est.address?.toLowerCase().startsWith('http') ? 'VER LOCALIZAÇÃO NO MAPA' : est.address}
                           </span>
                         </a>
                         <a href={`tel:${est.phone}`} className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 hover:text-green-600">
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
              <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4 mx-1 mb-4 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} />
                </div>
                <div className="flex-1 relative">
                  <select 
                    value={selectedEstIdEq}
                    onChange={(e) => setSelectedEstIdEq(e.target.value)}
                    className="w-full bg-transparent border-none px-0 py-1 text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight outline-none appearance-none cursor-pointer"
                  >
                    <option value="all">TODOS OS LOCAIS</option>
                    {establishments.map(est => (
                      <option key={est.id} value={est.id}>{est.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mx-1 pb-10">
                {filteredEquipments.length === 0 ? (
                  <div className="sm:col-span-2 text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-gray-100 dark:border-slate-800">
                    <p className="text-gray-400 font-black text-[9px] uppercase tracking-widest">Nenhum ativo encontrado para este local</p>
                  </div>
                ) : (
                  filteredEquipments.map(eq => (
                    <div 
                      key={eq.id} 
                      onClick={() => navigate(`/equipments/${eq.id}`)}
                      className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all group relative overflow-hidden cursor-pointer active:scale-[0.98]"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-baseline text-slate-900 dark:text-white uppercase gap-2">
                          <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 w-11 flex-shrink-0">EQUIP.:</span> 
                          <span className="text-base font-black tracking-tight leading-tight group-hover:text-blue-600 transition-colors">{eq.type}</span>
                        </div>
                        <div className="flex items-baseline text-slate-900 dark:text-white uppercase gap-2">
                          <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 w-11 flex-shrink-0">MARCA:</span> 
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{eq.brand}</span>
                        </div>
                        <div className="flex items-baseline text-slate-900 dark:text-white uppercase gap-2">
                          <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 w-11 flex-shrink-0">MODELO:</span> 
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{eq.model || '---'}</span>
                        </div>
                        <div className="flex items-baseline text-slate-900 dark:text-white uppercase gap-2">
                          <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 w-11 flex-shrink-0">S/N:</span> 
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono tracking-tighter">{eq.serial_number}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && !isEditing && (
            <div className="space-y-4 pb-10">
              <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4 mx-1 mb-4 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center flex-shrink-0">
                  <Filter size={18} />
                </div>
                <div className="flex-1 relative">
                  <select 
                    value={selectedEstIdHist}
                    onChange={(e) => setSelectedEstIdHist(e.target.value)}
                    className="w-full bg-transparent border-none px-0 py-1 text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight outline-none appearance-none cursor-pointer"
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
                  <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-800 transition-colors">
                    <HistoryIcon size={32} className="mx-auto text-gray-200 dark:text-slate-700 mb-4" />
                    <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Sem histórico registado</p>
                  </div>
                ) : (
                  filteredHistory.map(os => (
                    <Link key={os.id} to={`/os/${os.id}`} className="flex items-center justify-between p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl hover:border-blue-100 hover:shadow-lg transition-all group">
                      <div className="flex items-center gap-5 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center font-black group-hover:bg-blue-600 group-hover:text-white transition-all flex-shrink-0 shadow-inner">
                          <span className="text-[10px] text-slate-400 group-hover:text-blue-100 font-bold uppercase tracking-tighter leading-none">OS</span>
                          <span className="text-[8px] text-slate-300 group-hover:text-blue-200 uppercase mt-0.5">{new Date(os.created_at).toLocaleDateString('pt-PT', {day: '2-digit', month: '2-digit'})}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{os.code}</p>
                            <span className="text-[8px] font-black text-slate-300 uppercase">|</span>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{os.type}</p>
                          </div>
                          <h4 className="text-base font-black text-slate-900 dark:text-white uppercase truncate mb-1">{os.description}</h4>
                        </div>
                      </div>
                      <OSStatusBadge status={os.status} className="scale-90 flex-shrink-0" />
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'quotes' && !isEditing && (
            <div className="space-y-4 pb-10 px-1">
               <div className="flex items-center justify-between px-2 mb-2">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Orçamentos & Cotações ({quotes.length})</h3>
               </div>
               {quotes.length === 0 ? (
                 <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-800 transition-colors">
                    <Calculator size={32} className="mx-auto text-gray-200 dark:text-slate-700 mb-4" />
                    <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Sem orçamentos para este cliente</p>
                 </div>
               ) : (
                 <div className="space-y-3">
                   {quotes.map(q => {
                     const netValue = q.total_amount / 1.23;
                     return (
                       <Link key={q.id} to={`/quotes/${q.id}`} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all group flex flex-col gap-4">
                          <div className="flex justify-between items-start">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center flex-shrink-0">
                                   <Coins size={20} />
                                </div>
                                <div className="min-w-0">
                                   <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-[10px] font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">{q.code}</span>
                                      <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{new Date(q.created_at).toLocaleDateString('pt-PT')}</span>
                                   </div>
                                   <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">{q.description}</h4>
                                </div>
                             </div>
                             <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border transition-colors ${
                                q.status === QuoteStatus.ACEITE ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                q.status === QuoteStatus.PENDENTE ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                'bg-rose-50 text-rose-600 border-rose-100'
                             }`}>
                                {q.status}
                             </div>
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t border-slate-50 dark:border-slate-800">
                             <div>
                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Valor Líquido</p>
                                <p className="text-lg font-black text-slate-900 dark:text-white">{netValue.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</p>
                             </div>
                             <ChevronRight className="text-slate-200 dark:text-slate-700 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" size={20} />
                          </div>
                       </Link>
                     );
                   })}
                 </div>
               )}
            </div>
          )}

          {isEditing && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-blue-100 dark:border-slate-800 space-y-6 relative animate-in zoom-in-95 duration-200 transition-colors mb-20">
              <button onClick={handleCancelEdit} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 transition-colors" title="Cancelar Edição">
                <X size={24} />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 shadow-inner"><Edit2 size={18}/></div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Editar Ficha Cliente</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1 mb-1 block">Entidade Comercial (Nome Público)</label>
                  <input className="w-full bg-blue-50/50 dark:bg-slate-950 border-none rounded-2xl px-6 py-4 text-lg font-black text-slate-900 dark:text-white uppercase outline-none" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Nome de Faturação / Firma</label>
                  <input className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-5 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none" value={editForm.billing_name} onChange={e => setEditForm({...editForm, billing_name: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Telefone Sede</label>
                  <input className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-5 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Email Faturação</label>
                  <input className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-5 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none lowercase-container" style={{textTransform: 'none'}} value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Morada Sede / Link Maps</label>
                  <input className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-5 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Loja de Atendimento</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-5 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none appearance-none"
                    value={editForm.store}
                    onChange={e => setEditForm({...editForm, store: e.target.value})}
                  >
                    <option value="Caldas da Rainha">CALDAS DA RAINHA</option>
                    <option value="Porto de Mós">PORTO DE MÓS</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Link Google Drive</label>
                  <input className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-5 py-3 text-sm font-medium text-slate-800 dark:text-slate-200 outline-none" value={editForm.google_drive_link || ''} onChange={e => setEditForm({...editForm, google_drive_link: e.target.value})} placeholder="https://drive.google.com/..." />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Notas Gerais</label>
                  <textarea className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300 min-h-[120px] outline-none" value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} />
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-50 dark:border-slate-800">
                <button 
                  onClick={handleDeleteClient}
                  className="flex items-center gap-2 text-red-500 hover:text-red-700 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                >
                  <Trash2 size={16} /> Eliminar Cliente Definitivamente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isEditing && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-[#9d1c24] dark:border-[#9d1c24]/60 shadow-[0_12px_40px_rgba(157,28,36,0.15)] rounded-full p-1.5 flex items-center justify-around transition-all animate-in slide-in-from-bottom-10 duration-500">
          {[
            { id: 'info', icon: User, label: 'DADOS' },
            { id: 'establishments', icon: Building2, label: 'LOCAIS' },
            { id: 'equipments', icon: HardDrive, label: 'ATIVOS' },
            { id: 'history', icon: HistoryIcon, label: 'HIST.' },
            { id: 'quotes', icon: Calculator, label: 'ORÇAM.' }
          ].map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => { setActiveTab(tab.id as any); setIsEditing(false); }} 
              className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-full transition-all gap-1 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
              <tab.icon size={18} />
              <span className="text-[7px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {showEstModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 transition-colors">
              <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                 <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                   {editingEstId ? 'Editar Local de Intervenção' : 'Novo Local de Intervenção'}
                 </h3>
                 <button onClick={() => setShowModalEst(false)} className="text-gray-400 hover:text-gray-600 p-2"><X size={24}/></button>
              </div>
              <form onSubmit={handleSubmitEstablishment} className="p-8 space-y-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Nome do Local (Ex: Loja Porto)</label>
                    <input required className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-5 py-3 text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10" value={estForm.name} onChange={e => setEditFormEst({...estForm, name: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Morada Completa (Texto ou Link Maps)</label>
                    <input required className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-5 py-3 text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10" value={estForm.address} onChange={e => setEditFormEst({...estForm, address: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Telefone</label>
                      <input className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-5 py-3 text-sm font-bold dark:text-white outline-none" value={estForm.phone} onChange={e => setEditFormEst({...estForm, phone: e.target.value})} />
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Responsável Local</label>
                      <input className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-5 py-3 text-sm font-bold dark:text-white outline-none" value={estForm.contact_person} onChange={e => setEditFormEst({...estForm, contact_person: e.target.value})} />
                   </div>
                 </div>
                 <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-95 transition-all">
                   {isSubmitting ? 'A GUARDAR...' : editingEstId ? 'GUARDAR ALTERAÇÕES' : 'CONFIRMAR NOVO LOCAL'}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetail;