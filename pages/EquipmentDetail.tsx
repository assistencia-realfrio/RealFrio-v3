import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, HardDrive, Edit2, History, Image as ImageIcon, 
  Paperclip, Plus, Trash2, Camera, MapPin, Building2, ExternalLink,
  ChevronRight, Download, FileText, X, Eye, Activity, Tag
} from 'lucide-react';
import { mockData } from '../services/mockData';
import { Equipment, ServiceOrder, EquipmentAttachment, OSStatus } from '../types';
import OSStatusBadge from '../components/OSStatusBadge';

const EquipmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [clientName, setClientName] = useState('');
  const [establishmentName, setEstablishmentName] = useState('');
  const [history, setHistory] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'chapa' | 'history' | 'attachments'>('info');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [eq, allOs] = await Promise.all([
        mockData.getEquipmentById(id),
        mockData.getServiceOrders()
      ]);

      if (eq) {
        setEquipment(eq);
        const [client, establishments] = await Promise.all([
          mockData.getClientById(eq.client_id),
          mockData.getEstablishmentsByClient(eq.client_id)
        ]);
        setClientName(client?.name || 'Cliente Desconhecido');
        setEstablishmentName(establishments.find(e => e.id === eq.establishment_id)?.name || 'Localização Desconhecida');
        
        const eqOs = allOs
          .filter(o => o.equipment_id === id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
        setHistory(eqOs);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadNameplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && equipment) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await mockData.updateEquipment(equipment.id, { nameplate_url: base64 });
        setEquipment(prev => prev ? { ...prev, nameplate_url: base64 } : null);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && equipment) {
      const fileName = prompt("Nome amigável para este anexo:", file.name) || file.name;
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const newAttachment: EquipmentAttachment = {
          id: Math.random().toString(36).substr(2, 9),
          name: fileName,
          url: base64,
          created_at: new Date().toISOString()
        };
        const updatedAttachments = [...(equipment.attachments || []), newAttachment];
        await mockData.updateEquipment(equipment.id, { attachments: updatedAttachments });
        setEquipment(prev => prev ? { ...prev, attachments: updatedAttachments } : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (equipment && confirm("Eliminar este anexo definitivamente?")) {
      const updated = (equipment.attachments || []).filter(a => a.id !== attachmentId);
      await mockData.updateEquipment(equipment.id, { attachments: updated });
      setEquipment(prev => prev ? { ...prev, attachments: updated } : null);
    }
  };

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center p-20">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!equipment) return <div className="p-8 text-center uppercase font-black text-slate-400">Ativo não encontrado.</div>;

  return (
    <div className="max-w-4xl mx-auto pb-44 relative px-1 sm:px-0">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2 px-1">
          <button onClick={() => navigate(-1)} className="p-3 text-slate-500 dark:text-slate-400 hover:text-blue-600 rounded-2xl transition-all bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm active:scale-95">
            <ArrowLeft size={22} />
          </button>
        </div>

        {/* Quadro Superior Compactado */}
        <div className="bg-white dark:bg-slate-900 shadow-xl rounded-[2rem] p-6 border border-gray-100 dark:border-slate-800 text-center animate-in fade-in duration-300 relative transition-colors">
          <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">
            {equipment.type}
          </h1>
          <p className="text-[8px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.4em] mt-1.5">Ficha de Identificação do Ativo</p>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
                <div className="p-6 flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center flex-shrink-0">
                      <Building2 size={22} />
                   </div>
                   <div className="min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Proprietário / Cliente</p>
                      <button onClick={() => navigate(`/clients/${equipment.client_id}`)} className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase truncate hover:text-blue-600 text-left transition-colors">
                        {clientName}
                      </button>
                   </div>
                </div>
                <div className="p-6 flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center flex-shrink-0">
                      <MapPin size={22} />
                   </div>
                   <div className="min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Localização de Instalação</p>
                      <p className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase truncate">{establishmentName}</p>
                   </div>
                </div>
                <div className="p-6 flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <Tag size={22} />
                   </div>
                   <div className="min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Marca / Modelo</p>
                      <p className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase truncate">{equipment.brand} <span className="text-slate-300 dark:text-slate-700 mx-1">|</span> {equipment.model || '---'}</p>
                   </div>
                </div>
                <div className="p-6 flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center flex-shrink-0">
                      <FileText size={22} />
                   </div>
                   <div className="min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Número de Série (S/N)</p>
                      <p className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono uppercase">{equipment.serial_number || '---'}</p>
                   </div>
                </div>
              </div>

              <div className="pt-6">
                <Link 
                  to={`/equipments/${equipment.id}/edit`}
                  className="w-full bg-slate-900 dark:bg-blue-600 text-white py-5 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <Edit2 size={16} /> EDITAR FICHA DO ATIVO
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'chapa' && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 space-y-6 text-center transition-colors">
               <div className="flex flex-col items-center">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Chapa de Características</h3>
                  {equipment.nameplate_url ? (
                    <div className="relative group w-full max-w-md mx-auto aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800 mb-8">
                       <img src={equipment.nameplate_url} className="w-full h-full object-contain bg-slate-50 dark:bg-slate-950" alt="Chapa de Características" />
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <button onClick={() => window.open(equipment.nameplate_url)} className="p-4 bg-white text-slate-900 rounded-full hover:bg-blue-50 transition-colors shadow-xl">
                            <Eye size={24} />
                          </button>
                          <label className="p-4 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-xl cursor-pointer">
                            <Camera size={24} />
                            <input type="file" accept="image/*" className="hidden" onChange={handleUploadNameplate} />
                          </label>
                       </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full max-w-md mx-auto aspect-[4/3] bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-[3rem] cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-200 transition-all group mb-8">
                       <Camera size={48} className="text-gray-300 group-hover:text-blue-400 mb-4 transition-colors" />
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-blue-500">Adicionar Foto da Chapa</p>
                       <input type="file" accept="image/*" className="hidden" onChange={handleUploadNameplate} />
                    </label>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3 pb-10">
               <div className="flex items-center justify-between px-4 mb-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intervenções (Ativas e Histórico)</h3>
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black px-2 py-0.5 rounded-full">{history.length}</span>
               </div>
               
               {history.length === 0 ? (
                 <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-800 mx-1">
                    <History size={32} className="mx-auto text-gray-200 dark:text-slate-700 mb-4" />
                    <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Sem registos para este ativo</p>
                 </div>
               ) : (
                 <div className="space-y-3 px-1">
                   {history.map(os => (
                     <Link 
                       key={os.id} 
                       to={`/os/${os.id}`} 
                       className="flex items-center justify-between p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl hover:border-blue-100 hover:shadow-lg transition-all group"
                     >
                       <div className="flex items-center gap-5 min-w-0 flex-1">
                         <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center font-black group-hover:bg-blue-600 group-hover:text-white transition-all flex-shrink-0 shadow-inner">
                           <span className="text-[10px] font-mono text-slate-400 group-hover:text-blue-100 leading-none">OS</span>
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
                   ))}
                 </div>
               )}
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 space-y-6 transition-colors pb-10">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Anexos & Documentação</h3>
                 <label className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-blue-700 shadow-lg active:scale-95 transition-all">
                    <Plus size={14} /> ADICIONAR
                    <input type="file" className="hidden" onChange={handleAddAttachment} />
                 </label>
              </div>
              {(equipment.attachments || []).length === 0 ? (
                <div className="text-center py-16 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-slate-800 transition-colors">
                   <Paperclip size={32} className="mx-auto text-slate-200 dark:text-slate-800 mb-3" />
                   <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest px-8">Nenhum esquema ou manual anexado</p>
                </div>
              ) : (
                <div className="space-y-3">
                   {equipment.attachments?.map(att => (
                     <div key={att.id} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 transition-all group">
                        <div className="flex items-center gap-4 min-w-0">
                           <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-slate-400 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:text-blue-500">
                              <FileText size={18} />
                           </div>
                           <div className="min-w-0">
                              <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase truncate mb-0.5">{att.name}</p>
                              <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{new Date(att.created_at).toLocaleDateString()}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <button onClick={() => window.open(att.url)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all" title="Ver Anexo">
                              <ExternalLink size={16} />
                           </button>
                           <button onClick={() => handleRemoveAttachment(att.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all" title="Remover">
                              <Trash2 size={16} />
                           </button>
                        </div>
                     </div>
                   ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BARRA DE NAVEGAÇÃO FLUTUANTE INFERIOR COM BORDA INSTITUCIONAL FINA */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-[#9d1c24] dark:border-[#9d1c24]/60 shadow-[0_12px_40px_rgba(157,28,36,0.15)] rounded-full p-1.5 flex items-center justify-around transition-all animate-in slide-in-from-bottom-10 duration-500">
        {[
          { id: 'info', icon: HardDrive, label: 'GERAL' },
          { id: 'chapa', icon: ImageIcon, label: 'CHAPA' },
          { id: 'history', icon: History, label: 'HIST.' },
          { id: 'attachments', icon: Paperclip, label: 'ANEXOS' }
        ].map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-full transition-all gap-1 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
          >
            <tab.icon size={18} />
            <span className="text-[7px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default EquipmentDetail;