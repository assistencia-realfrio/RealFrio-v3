
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Camera, Save, Plus, Trash2, X, Package, 
  Download, ArrowLeft, CheckCircle2, 
  MapPin, Phone, Building2, HardDrive, 
  ImageIcon, Search, CheckCircle,
  Minus, Info, Hammer, MessageSquare,
  Send, AlertCircle, Sparkles, ShieldAlert, Loader2, Eye, History, Clock,
  User, ChevronRight, ChevronDown, ChevronUp, Calendar, RotateCcw,
  RefreshCw, Sparkle, Maximize2, ZoomIn, ZoomOut, AlertTriangle, FileText,
  RotateCw, Cloud, Edit2
} from 'lucide-react';
import SignatureCanvas from '../components/SignatureCanvas';
import OSStatusBadge from '../components/OSStatusBadge';
import { OSStatus, ServiceOrder, PartUsed, PartCatalogItem, OSPhoto, OSNote, OSActivity } from '../types';
import { generateOSReportSummary } from '../services/geminiService';
import { mockData } from '../services/mockData';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import FloatingEditBar from '../components/FloatingEditBar';

const ZoomableImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ dist: number; x: number; y: number; scale: number; pos: { x: number; y: number } } | null>(null);
  const lastTapRef = useRef<number>(0);

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY * -0.01;
    const newScale = Math.min(Math.max(1, scale + delta), 5);
    setScale(newScale);
    if (newScale === 1) setPosition({ x: 0, y: 0 });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (e.touches.length === 1 && (now - lastTapRef.current) < DOUBLE_TAP_DELAY) {
      if (scale > 1) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      } else {
        setScale(2.5);
      }
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      touchStartRef.current = { dist, x: 0, y: 0, scale, pos: { ...position } };
    } else if (e.touches.length === 1 && scale > 1) {
      touchStartRef.current = { dist: 0, x: e.touches[0].pageX, y: e.touches[0].pageY, scale, pos: { ...position } };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    if (e.touches.length === 2 && touchStartRef.current.dist > 0) {
      const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      const ratio = dist / touchStartRef.current.dist;
      const newScale = Math.min(Math.max(1, touchStartRef.current.scale * ratio), 6);
      setScale(newScale);
    } else if (e.touches.length === 1 && scale > 1) {
      touchStartRef.current.x = touchStartRef.current.x || 0; // Fallback
      const dx = e.touches[0].pageX - touchStartRef.current.x;
      const dy = e.touches[0].pageY - touchStartRef.current.y;
      const limit = (scale - 1) * 200;
      setPosition({
        x: Math.min(Math.max(touchStartRef.current.pos.x + dx, -limit), limit),
        y: Math.min(Math.max(touchStartRef.current.pos.y + dy, -limit), limit)
      });
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none bg-slate-950"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => { touchStartRef.current = null; }}
    >
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
         <span className="bg-white/10 backdrop-blur-md text-white/50 text-[8px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full border border-white/5">
           {scale > 1 ? `ZOOM: ${Math.round(scale * 100)}%` : 'PINCH PARA ZOOM / DUPLO TOQUE'}
         </span>
      </div>
      <img src={src} alt={alt} className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-75 ease-out select-none pointer-events-none" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, willChange: 'transform' }} />
      {scale > 1 && (
        <button onClick={(e) => { e.stopPropagation(); setScale(1); setPosition({x:0,y:0}); }} className="absolute bottom-10 bg-white text-slate-900 px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all shadow-2xl border border-slate-200 z-30 active:scale-90">Repor Vista (1:1)</button>
      )}
    </div>
  );
};

const getStatusLabelText = (status: string) => {
  switch (status) {
    case OSStatus.POR_INICIAR: return 'POR INICIAR';
    case OSStatus.INICIADA: return 'INICIADA';
    case OSStatus.PARA_ORCAMENTO: return 'PARA ORÇAMENTO';
    case OSStatus.ORCAMENTO_ENVIADO: return 'ORÇAMENTO ENVIADO';
    case OSStatus.AGUARDA_PECAS: return 'AGUARDA PEÇAS';
    case OSStatus.PECAS_RECEBIDAS: return 'PEÇAS RECEBIDAS';
    case OSStatus.CONCLUIDA: return 'CONCLUÍDA';
    case OSStatus.CANCELADA: return 'CANCELADA';
    default: return status;
  }
};

const getMapLink = (address: string) => {
  if (!address) return '#';
  if (address.toLowerCase().startsWith('http')) return address;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
};

type TabType = 'info' | 'notas' | 'tecnico' | 'fotos' | 'finalizar';

export const ServiceOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [os, setOs] = useState<ServiceOrder | null>(null);
  const [partsUsed, setPartsUsed] = useState<PartUsed[]>([]);
  const [photos, setPhotos] = useState<OSPhoto[]>([]);
  const [notesList, setNotesList] = useState<OSNote[]>([]);
  const [activities, setActivities] = useState<OSActivity[]>([]);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [description, setDescription] = useState('');
  const [anomaly, setAnomaly] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [observations, setObservations] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [technicianSignature, setTechnicianSignature] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDeletePartModal, setShowDeletePartModal] = useState(false);
  const [showDeletePhotoModal, setShowDeletePhotoModal] = useState(false);
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [partToDelete, setPartToDelete] = useState<PartUsed | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<OSPhoto | null>(null);
  const [selectedPhotoForView, setSelectedPhotoForView] = useState<OSPhoto | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPartModal, setShowPartModal] = useState(false);

  useEffect(() => {
    fetchOSDetails();
  }, [id]);

  const missingFields = useMemo(() => {
    const list = [];
    if (!anomaly || !anomaly.trim()) list.push("ANOMALIA DETETADA");
    if (!clientSignature) list.push("ASSINATURA DO CLIENTE");
    if (!technicianSignature) list.push("ASSINATURA DO TÉCNICO");
    return list;
  }, [anomaly, clientSignature, technicianSignature]);

  const isDirty = useMemo(() => {
    if (!os) return false;
    let origDate = '';
    let origTime = '';
    if (os.scheduled_date) {
      const parts = os.scheduled_date.split(/[T ]/);
      origDate = parts[0] || '';
      origTime = (parts[1] || '').substring(0, 5);
    }
    const currentClientSig = clientSignature || '';
    const originalClientSig = os.client_signature || '';
    const currentTechSig = technicianSignature || '';
    const originalTechSig = os.technician_signature || '';
    return (
      description !== (os.description || '') ||
      anomaly !== (os.anomaly_detected || '') ||
      resolutionNotes !== (os.resolution_notes || '') ||
      observations !== (os.observations || '') ||
      scheduledDate !== origDate ||
      scheduledTime !== origTime ||
      currentClientSig !== originalClientSig ||
      currentTechSig !== originalTechSig
    );
  }, [os, description, anomaly, resolutionNotes, observations, scheduledDate, scheduledTime, clientSignature, technicianSignature]);

  const fetchOSDetails = async (showLoader = true) => {
    if (!id) return;
    if (showLoader) setLoading(true);
    try {
      const osData = await mockData.getServiceOrderById(id);
      if (osData) {
        setOs(osData);
        setDescription(osData.description || '');
        setAnomaly(osData.anomaly_detected || '');
        setResolutionNotes(osData.resolution_notes || '');
        setObservations(osData.observations || '');
        setClientSignature(osData.client_signature && osData.client_signature.trim() !== '' ? osData.client_signature : null);
        setTechnicianSignature(osData.technician_signature && osData.technician_signature.trim() !== '' ? osData.technician_signature : null);
        if (osData.scheduled_date) {
          const parts = osData.scheduled_date.split(/[T ]/);
          setScheduledDate(parts[0] || '');
          setScheduledTime((parts[1] || '').substring(0, 5));
        } else {
          setScheduledDate('');
          setScheduledTime('');
        }
        const [p, ph, n, act] = await Promise.all([
          mockData.getOSParts(id),
          mockData.getOSPhotos(id),
          mockData.getOSNotes(id),
          mockData.getOSActivity(id)
        ]);
        setPartsUsed(p);
        setPhotos(ph);
        setNotesList(n);
        setActivities(act);
      }
    } catch (error: any) {
      console.error("ERRO AO CARREGAR OS:", error.message || error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: OSStatus) => {
    if (!id || !os) return;
    if (newStatus === OSStatus.CONCLUIDA && missingFields.length > 0) {
      setShowValidationErrorModal(true);
      setShowValidationErrors(true);
      setActiveTab('finalizar');
      return;
    }
    setActionLoading(true);
    try {
      const updates: Partial<ServiceOrder> = { status: newStatus };
      await mockData.updateServiceOrder(id, updates);
      await mockData.addOSActivity(id, {
        description: `ESTADO DA OS ALTERADO PARA ${getStatusLabelText(newStatus)}`
      });
      fetchOSDetails(false);
    } catch (e: any) {
      setErrorMessage("ERRO AO ATUALIZAR ESTADO.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveData = async () => {
    if (!id || !os) return;
    setActionLoading(true);
    try {
      const finalScheduled = scheduledDate ? `${scheduledDate}T${scheduledTime || '00:00'}:00` : undefined;
      await mockData.updateServiceOrder(id, {
        description: description,
        anomaly_detected: anomaly,
        resolution_notes: resolutionNotes,
        observations: observations,
        client_signature: clientSignature || undefined,
        technician_signature: technicianSignature || undefined,
        scheduled_date: finalScheduled
      });
      await mockData.addOSActivity(id, {
        description: 'GUARDOU ALTERAÇÕES NA ORDEM DE SERVIÇO'
      });
      setShowValidationErrors(false);
      fetchOSDetails(false);
    } catch (e: any) {
      setErrorMessage("ERRO AO GUARDAR DADOS.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>, type: 'antes' | 'depois' | 'peca' | 'geral') => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    
    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        await mockData.addOSPhoto(id, {
          url: base64,
          type: type
        });
        await mockData.addOSActivity(id, {
          description: `ADICIONOU FOTO (${type.toUpperCase()})`
        });
        fetchOSDetails(false);
      } catch (err: any) {
        setErrorMessage("ERRO AO CARREGAR FOTO.");
      } finally {
        setIsUploadingPhoto(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAISummary = async () => {
    if (!anomaly || !anomaly.trim()) {
      setErrorMessage("DESCREVA A ANOMALIA PRIMEIRO.");
      return;
    }
    setIsGenerating(true);
    try {
      const summary = await generateOSReportSummary(description, anomaly, resolutionNotes, partsUsed.map(p => `${p.quantity}x ${p.name}`), "INTERVENÇÃO TÉCNICA");
      if (summary) {
        setResolutionNotes(summary.toUpperCase());
        await mockData.addOSActivity(id!, { description: "GEROU RESUMO VIA IA" });
      }
    } catch (e: any) {
      setErrorMessage("ERRO AO COMUNICAR COM A IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center p-20">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">A CARREGAR OS...</p>
    </div>
  );

  const displayedActivities = showAllActivities ? activities : activities.slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto pb-32 relative px-1 sm:px-0 space-y-4">
      <FloatingEditBar isVisible={isDirty} isSubmitting={actionLoading} onSave={handleSaveData} onCancel={fetchOSDetails} />

      <div className="space-y-2 mb-4">
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-gray-200 dark:border-slate-800 p-3 grid grid-cols-3 items-center transition-colors">
          <div className="flex justify-start">
            <button onClick={() => navigate('/os')} className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 rounded-2xl transition-all bg-slate-50 dark:bg-slate-800 border border-transparent hover:border-blue-100">
              <ArrowLeft size={20} />
            </button>
          </div>
          <div className="flex justify-center">
            <span className="text-[12px] font-black text-blue-600 uppercase tracking-[0.2em] font-mono leading-none">{os?.code}</span>
          </div>
          <div className="flex justify-end">
             {actionLoading ? (
               <RefreshCw size={14} className="animate-spin text-blue-600" />
             ) : (
               <div className="relative">
                 <OSStatusBadge status={os?.status || ''} className="cursor-pointer hover:ring-2 hover:ring-blue-100 transition-all scale-90 sm:scale-100 origin-right" />
                 <select 
                    value={os?.status} 
                    onChange={(e) => handleUpdateStatus(e.target.value as OSStatus)} 
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                 >
                    {Object.values(OSStatus).map((status) => (
                      <option key={status} value={status} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {getStatusLabelText(status).toUpperCase()}
                      </option>
                    ))}
                 </select>
               </div>
             )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-1 flex overflow-x-auto no-scrollbar transition-colors">
          {[
            { id: 'info', icon: Info, label: 'INFO' },
            { id: 'notas', icon: MessageSquare, label: 'NOTAS' },
            { id: 'tecnico', icon: Package, label: 'MATERIAL' },
            { id: 'fotos', icon: ImageIcon, label: 'FOTOS' },
            { id: 'finalizar', icon: CheckCircle, label: 'FECHO' }
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`flex-1 flex items-center justify-center py-4 px-2 sm:px-4 rounded-xl gap-0 sm:gap-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
              <tab.icon size={16} />
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest ml-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
              <div className="flex items-center gap-3 mb-4">
                 <AlertCircle size={18} className="text-orange-500" />
                 <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">PEDIDO DO CLIENTE / AVARIA</h3>
              </div>
              <textarea 
                className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-3xl px-5 py-4 text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed outline-none focus:ring-4 focus:ring-blue-500/5 transition-all min-h-[100px] resize-none"
                value={description}
                onChange={e => setDescription(e.target.value)}
                readOnly={os?.status === OSStatus.CONCLUIDA}
                placeholder="..."
              />
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
               <div className="flex items-center gap-3 mb-2">
                  <Building2 size={18} className="text-blue-500" />
                  <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Cliente & Contactos</h3>
               </div>
               <div className="flex flex-col gap-3">
                  <button onClick={() => navigate(`/clients/${os?.client_id}`)} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 px-4 py-2.5 rounded-full transition-all hover:bg-blue-100 dark:hover:bg-blue-900/40 w-full">
                    <User size={14} />
                    <span className="text-xs font-black uppercase tracking-tight truncate">{os?.client?.name}</span>
                  </button>
                  <a href={getMapLink(os?.client?.address || '')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800 px-4 py-2.5 rounded-full transition-all hover:border-blue-200 dark:hover:border-blue-700 w-full">
                    <MapPin size={14} className="text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-tight truncate">{os?.client?.address}</span>
                  </a>
                  <a href={`tel:${os?.client?.phone}`} className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 px-4 py-2.5 rounded-full transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/40 w-full">
                    <Phone size={14} />
                    <span className="text-xs font-black uppercase tracking-tight">{os?.client?.phone}</span>
                  </a>
               </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
               <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-emerald-500" />
                  <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Planeamento & Agendamento</h3>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-4 py-2.5 text-xs font-black dark:text-white outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" />
                 <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-4 py-2.5 text-xs font-black dark:text-white outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" />
               </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
               <div className="flex items-center gap-3">
                  <HardDrive size={18} className="text-slate-400" />
                  <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Equipamento Vinculado</h3>
               </div>
               {os?.equipment ? (
                 <button onClick={() => navigate(`/equipments/${os.equipment_id}`)} className="w-full text-left p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 transition-all group">
                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase group-hover:text-blue-600 transition-colors">{os.equipment.type} - {os.equipment.brand}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">S/N: {os.equipment.serial_number}</p>
                 </button>
               ) : (
                 <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">Sem equipamento registado</div>
               )}
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3 text-slate-400">
                    <History size={18} />
                    <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Auditoria & Log</h3>
                 </div>
                 <button onClick={() => setShowAllActivities(!showAllActivities)} className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{showAllActivities ? 'VER MENOS' : 'VER TUDO'}</button>
               </div>
               <div className="space-y-4 relative ml-2">
                  <div className="absolute left-0 top-2 bottom-2 w-px bg-slate-100 dark:bg-slate-800"></div>
                  {displayedActivities.map((act) => (
                    <div key={act.id} className="relative pl-6">
                       <div className="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900 shadow-sm"></div>
                       <div className="flex justify-between items-start">
                          <p className="text-[10px] font-black text-slate-900 dark:text-slate-200 uppercase">{act.user_name}</p>
                          <span className="text-[8px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-tighter ml-4">{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       </div>
                       <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight mt-1 leading-relaxed">{act.description}</p>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'notas' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm min-h-[400px] flex flex-col transition-colors">
                <div className="flex items-center gap-3 mb-6">
                   <MessageSquare size={18} className="text-blue-500" />
                   <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Mensagens & Notas Internas</h3>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] no-scrollbar mb-6">
                   {notesList.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center opacity-30 py-20 text-slate-400">
                        <MessageSquare size={32} className="mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Sem mensagens.</p>
                     </div>
                   ) : (
                     notesList.map((note) => (
                       <div key={note.id} className={`flex flex-col ${note.user_id === 'current' ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium ${note.user_id === 'current' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none'}`}>
                             <p className="leading-relaxed">{note.content}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 px-2 text-[8px] font-black text-slate-400 uppercase">
                             <span>{note.user_name}</span>
                             <span className="text-[7px] text-slate-300 dark:text-slate-600">•</span>
                             <span>{new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                       </div>
                     ))
                   )}
                </div>
                <div className="relative">
                   <textarea value={newNoteContent} onChange={e => setNewNoteContent(e.target.value)} placeholder="ESCREVA UMA NOTA..." className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-3xl pl-5 pr-14 py-4 text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none h-20" />
                   <button onClick={async () => { await mockData.addOSNote(id!, { content: newNoteContent }); setNewNoteContent(''); fetchOSDetails(false); }} disabled={!newNoteContent.trim() || actionLoading} className="absolute right-3 bottom-3 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:scale-90 transition-all disabled:opacity-30"><Send size={18} /></button>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'tecnico' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                     <Package size={18} className="text-slate-400" />
                     <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Material Aplicado</h3>
                  </div>
                  <button onClick={() => setShowPartModal(true)} disabled={os?.status === OSStatus.CONCLUIDA} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 active:scale-95 disabled:opacity-50">
                    <Plus size={14} /> ADICIONAR
                  </button>
               </div>
               <div className="space-y-3">
                  {partsUsed.map((part) => (
                    <div key={part.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 group transition-all">
                       <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-slate-400 flex items-center justify-center flex-shrink-0 group-hover:text-blue-500 transition-all">
                             <Package size={18} />
                          </div>
                          <div className="min-w-0">
                             <p className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">{part.name}</p>
                             <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono leading-none mt-0.5">REF: {part.reference}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <p className="text-xs font-black text-slate-900 dark:text-white">{part.quantity} UN</p>
                          <button onClick={() => { setPartToDelete(part); setShowDeletePartModal(true); }} disabled={os?.status === OSStatus.CONCLUIDA} className="p-2 text-slate-300 hover:text-red-500 disabled:opacity-30"><Trash2 size={16} /></button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'fotos' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-3">
                      <ImageIcon size={18} className="text-slate-400" />
                      <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Evidências Fotográficas</h3>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   {['antes', 'depois', 'peca', 'geral'].map((type) => (
                     <label key={type} className="flex flex-col items-center justify-center py-6 bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-200 transition-all group">
                        <Camera size={24} className="text-slate-300 group-hover:text-blue-500 mb-2" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{type.toUpperCase()}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadPhoto(e, type as any)} disabled={os?.status === OSStatus.CONCLUIDA} />
                     </label>
                   ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-8">
                   {photos.map(photo => (
                     <div key={photo.id} className="relative aspect-square animate-in zoom-in-95 duration-200 group">
                        <img src={photo.url} onClick={() => setSelectedPhotoForView(photo)} className="w-full h-full object-cover rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 group-hover:ring-4 group-hover:ring-blue-100 cursor-zoom-in" alt="Evidência" />
                        <button onClick={() => { setPhotoToDelete(photo); setShowDeletePhotoModal(true); }} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'finalizar' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
                <div className="flex items-center gap-3 mb-6">
                   <AlertTriangle size={18} className="text-orange-500" />
                   <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Anomalia Detetada *</h3>
                </div>
                <input type="text" placeholder="EX: COMPRESSOR BLOQUEADO..." className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-4 text-xs font-black uppercase dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" value={anomaly} onChange={e => setAnomaly(e.target.value)} readOnly={os?.status === OSStatus.CONCLUIDA} />
             </div>

             <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-3 text-blue-500">
                      <Sparkles size={18} />
                      <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Resumo da Intervenção (IA)</h3>
                   </div>
                   <button onClick={handleGenerateAISummary} disabled={isGenerating || os?.status === OSStatus.CONCLUIDA} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-blue-100 transition-all disabled:opacity-50">
                     {isGenerating ? <RefreshCw size={12} className="animate-spin" /> : <Sparkle size={12} />} GERAR IA
                   </button>
                </div>
                <textarea className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-[2rem] px-6 py-5 text-sm text-slate-800 dark:text-slate-200 leading-relaxed outline-none focus:ring-4 focus:ring-blue-500/10 transition-all min-h-[160px] resize-none" value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} readOnly={os?.status === OSStatus.CONCLUIDA} placeholder="DESCREVA O TRABALHO EFETUADO..." />
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <SignatureCanvas label="Assinatura Cliente" onSave={setClientSignature} onClear={() => setClientSignature(null)} initialValue={clientSignature} readOnly={os?.status === OSStatus.CONCLUIDA} error={showValidationErrors && !clientSignature} />
               <SignatureCanvas label="Assinatura Técnico" onSave={setTechnicianSignature} onClear={() => setTechnicianSignature(null)} initialValue={technicianSignature} readOnly={os?.status === OSStatus.CONCLUIDA} error={showValidationErrors && !technicianSignature} />
             </div>

             <div className="pt-6">
               <button onClick={async () => { if (missingFields.length > 0) { setShowValidationErrors(true); setShowValidationErrorModal(true); return; } setShowFinalizeModal(true); }} disabled={os?.status === OSStatus.CONCLUIDA || actionLoading} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-95 disabled:opacity-50">CONCLUIR ORDEM DE SERVIÇO</button>
             </div>
          </div>
        )}
      </div>

      {/* MODAL FINALIZE CONFIRMATION */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm text-center transition-colors">
              <div className="p-8">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><CheckCircle size={32}/></div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Finalizar Intervenção?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8 uppercase">TODOS OS DADOS SERÃO BLOQUEADOS E O RELATÓRIO SERÁ GERADO.</p>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setShowFinalizeModal(false)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase rounded-2xl active:scale-95">CANCELAR</button>
                  <button onClick={async () => { await mockData.updateServiceOrder(id!, { status: OSStatus.CONCLUIDA, anomaly_detected: anomaly, resolution_notes: resolutionNotes, client_signature: clientSignature || undefined, technician_signature: technicianSignature || undefined }); navigate('/os'); }} className="py-4 bg-emerald-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">CONFIRMAR</button>
                </div>
              </div>
           </div>
        </div>
      )}
      
      {/* MODAL VIEW PHOTO */}
      {selectedPhotoForView && (
        <div className="fixed inset-0 z-[300] bg-slate-950 flex flex-col animate-in fade-in duration-300">
           <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-6 z-[310] bg-gradient-to-b from-black/80 to-transparent">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">{selectedPhotoForView.type}</span>
              <button onClick={() => setSelectedPhotoForView(null)} className="p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all active:scale-90 backdrop-blur-lg"><X size={24} /></button>
           </div>
           <div className="flex-1 w-full h-full"><ZoomableImage src={selectedPhotoForView.url} alt="Evidência" /></div>
        </div>
      )}

      {/* ERROR TOAST-LIKE BANNER */}
      {errorMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[400] w-full max-w-xs animate-in slide-in-from-top-10 duration-300">
           <div className="bg-red-600 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3">
              <AlertCircle size={20} className="flex-shrink-0" />
              <div className="flex-1">
                 <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Erro de Operação</p>
                 <p className="text-[9px] font-bold uppercase">{errorMessage}</p>
              </div>
              <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X size={16} /></button>
           </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrderDetail;
