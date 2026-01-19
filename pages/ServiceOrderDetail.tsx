
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

/**
 * Componente avançado para gerir o Zoom e Pan da imagem com suporte a Gestos (Pinch-to-zoom e Double Tap)
 */
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

    // Lógica de Duplo Toque para Zoom Rápido
    if (e.touches.length === 1 && (now - lastTapRef.current) < DOUBLE_TAP_DELAY) {
      if (scale > 1) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      } else {
        setScale(2.5);
      }
      lastTapRef.current = 0; // Reset para evitar múltiplos gatilhos
      return;
    }
    lastTapRef.current = now;

    if (e.touches.length === 2) {
      // Início de Pinch
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      touchStartRef.current = { dist, x: 0, y: 0, scale, pos: { ...position } };
    } else if (e.touches.length === 1 && scale > 1) {
      // Início de Pan
      touchStartRef.current = { 
        dist: 0, 
        x: e.touches[0].pageX, 
        y: e.touches[0].pageY, 
        scale, 
        pos: { ...position } 
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    if (e.touches.length === 2 && touchStartRef.current.dist > 0) {
      // Movimento de Pinch
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const ratio = dist / touchStartRef.current.dist;
      const newScale = Math.min(Math.max(1, touchStartRef.current.scale * ratio), 6);
      setScale(newScale);
    } else if (e.touches.length === 1 && scale > 1) {
      // Movimento de Pan
      const dx = e.touches[0].pageX - touchStartRef.current.x;
      const dy = e.touches[0].pageY - touchStartRef.current.y;
      
      // Limitar o pan para não "perder" a imagem
      const limit = (scale - 1) * 200;
      setPosition({
        x: Math.min(Math.max(touchStartRef.current.pos.x + dx, -limit), limit),
        y: Math.min(Math.max(touchStartRef.current.pos.y + dy, -limit), limit)
      });
    }
  };

  const resetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
    setPosition({ x: 0, y: 0 });
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

      <img 
        src={src} 
        alt={alt}
        className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-75 ease-out select-none pointer-events-none"
        style={{ 
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          willChange: 'transform'
        }}
      />
      
      {scale > 1 && (
        <button 
          onClick={resetZoom}
          className="absolute bottom-10 bg-white text-slate-900 px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all shadow-2xl border border-slate-200 z-30 active:scale-90"
        >
          Repor Vista (1:1)
        </button>
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
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [os, setOs] = useState<ServiceOrder | null>(null);
  const [partsUsed, setPartsUsed] = useState<PartUsed[]>([]);
  const [photos, setPhotos] = useState<OSPhoto[]>([]);
  const [notesList, setNotesList] = useState<OSNote[]>([]);
  const [catalog, setCatalog] = useState<PartCatalogItem[]>([]);
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
  const [showPartModal, setShowPartModal] = useState(false);
  const [showEditPartModal, setShowEditPartModal] = useState(false);
  const [showDeletePartModal, setShowDeletePartModal] = useState(false);
  const [showDeletePhotoModal, setShowDeletePhotoModal] = useState(false);
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  
  const [partToDelete, setPartToDelete] = useState<PartUsed | null>(null);
  const [partToEdit, setPartToEdit] = useState<PartUsed | null>(null);
  const [editPartQty, setEditPartQty] = useState(1);
  const [photoToDelete, setPhotoToDelete] = useState<OSPhoto | null>(null);
  const [selectedPhotoForView, setSelectedPhotoForView] = useState<OSPhoto | null>(null);
  
  const [catalogSearch, setCatalogSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [pendingPart, setPendingPart] = useState<{ item: PartCatalogItem, qty: number } | null>(null);

  const [isCreatingNewPart, setIsCreatingNewPart] = useState(false);
  const [newPartName, setNewPartName] = useState('');
  const [newPartRef, setNewPartRef] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchOSDetails();
    fetchCatalog();
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('validate') === 'true' && !loading && os) {
      setActiveTab('finalizar');
      setShowValidationErrors(true);
      if (!anomaly || !anomaly.trim() || !clientSignature || !technicianSignature) {
        setShowValidationErrorModal(true);
      }
    }
  }, [location.search, loading, !!os]);

  const fetchCatalog = async () => {
    try {
      const data = await mockData.getCatalog();
      setCatalog(data);
    } catch (error: any) {
      console.error("ERRO AO CARREGAR CATÁLOGO:", error.message || error);
    }
  };

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
          const timePart = parts[1] || '';
          setScheduledTime(timePart.substring(0, 5));
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
    
    if (newStatus === OSStatus.CONCLUIDA) {
      if (missingFields.length > 0) {
        setShowValidationErrorModal(true);
        setShowValidationErrors(true);
        setActiveTab('finalizar');
        return;
      }
    }

    setActionLoading(true);
    try {
      const updates: Partial<ServiceOrder> = { status: newStatus };
      if (newStatus === OSStatus.CONCLUIDA) {
        updates.anomaly_detected = anomaly;
        updates.resolution_notes = resolutionNotes;
        updates.client_signature = clientSignature || null as any;
        updates.technician_signature = technicianSignature || null as any;
      }

      await mockData.updateServiceOrder(id, updates);
      await mockData.addOSActivity(id, {
        user_id: 'current',
        user_name: 'TÉCNICO',
        description: `ESTADO DA OS ALTERADO PARA ${getStatusLabelText(newStatus)}`
      });
      
      if (newStatus === OSStatus.CONCLUIDA) {
        navigate('/os');
      } else {
        fetchOSDetails(false);
      }
    } catch (e: any) {
      setErrorMessage("ERRO AO ATUALIZAR ESTADO: " + (e.message || String(e)));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelEdits = () => {
    setShowValidationErrors(false);
    if (os) {
      setDescription(os.description || '');
      setAnomaly(os.anomaly_detected || '');
      setResolutionNotes(os.resolution_notes || '');
      setObservations(os.observations || '');
      setClientSignature(os.client_signature && os.client_signature.trim() !== '' ? os.client_signature : null);
      setTechnicianSignature(os.technician_signature && os.technician_signature.trim() !== '' ? os.technician_signature : null);
      
      if (os.scheduled_date) {
        const parts = os.scheduled_date.split(/[T ]/);
        setScheduledDate(parts[0] || '');
        setScheduledTime((parts[1] || '').substring(0, 5));
      } else {
        setScheduledDate('');
        setScheduledTime('');
      }
    }
  };

  const handleResetSchedule = () => {
    setScheduledDate('');
    setScheduledTime('');
  };

  const handleAddPart = async () => {
    if (!pendingPart || !id) return;
    setActionLoading(true);
    try {
      await mockData.addOSPart(id, {
        part_id: pendingPart.item.id,
        name: pendingPart.item.name,
        reference: pendingPart.item.reference,
        quantity: pendingPart.qty
      });
      await mockData.addOSActivity(id, {
        description: `ADICIONOU MATERIAL: ${pendingPart.qty}x ${pendingPart.item.name}`
      });
      setPendingPart(null);
      setShowPartModal(false);
      fetchOSDetails(false);
    } catch (e: any) {
      setErrorMessage("ERRO AO ADICIONAR PEÇA.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePartQuantity = async () => {
    if (!partToEdit || !id) return;
    setActionLoading(true);
    try {
      const oldQty = partToEdit.quantity;
      await mockData.updateOSPart(partToEdit.id, { quantity: editPartQty });
      await mockData.addOSActivity(id, {
        description: `ALTEROU QUANTIDADE DE ${partToEdit.name}: ${oldQty} UN -> ${editPartQty} UN`
      });
      setPartToEdit(null);
      setShowEditPartModal(false);
      fetchOSDetails(false);
    } catch (e: any) {
      setErrorMessage("ERRO AO ATUALIZAR QUANTIDADE.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAndAddPart = async () => {
    if (!newPartName.trim() || !id) return;
    setActionLoading(true);
    try {
      const reference = newPartRef.trim() || Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const newCatalogItem = await mockData.addCatalogItem({
        name: newPartName.trim().toUpperCase(),
        reference: reference,
        stock: 0
      });
      if (!newCatalogItem || !newCatalogItem.id) throw new Error("FALHA AO REGISTAR NO CATÁLOGO.");
      await mockData.addOSPart(id, {
        part_id: newCatalogItem.id,
        name: newCatalogItem.name,
        reference: newCatalogItem.reference,
        quantity: 1
      });
      setNewPartName('');
      setNewPartRef('');
      setIsCreatingNewPart(false);
      setShowPartModal(false);
      await mockData.addOSActivity(id, {
        user_id: 'current',
        user_name: 'TÉCNICO',
        description: `ADICIONOU NOVA PEÇA CRIADA MANUALMENTE: ${newCatalogItem.name}`
      });
      fetchOSDetails(false);
      fetchCatalog();
    } catch (e: any) {
      setErrorMessage(e.message || "ERRO INESPERADO AO CRIAR E VINCULAR PEÇA.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemovePart = async () => {
    if (!partToDelete) return;
    setActionLoading(true);
    try {
      await mockData.removeOSPart(partToDelete.id);
      await mockData.addOSActivity(id!, {
        description: `REMOVEU MATERIAL: ${partToDelete.name}`
      });
      setPartToDelete(null);
      setShowDeletePartModal(false);
      fetchOSDetails(false);
    } catch (e: any) {
      setErrorMessage("ERRO AO REMOVER PEÇA.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim() || !id) return;
    setActionLoading(true);
    try {
      await mockData.addOSNote(id, {
        user_id: 'current',
        user_name: 'TÉCNICO',
        content: newNoteContent
      });
      setNewNoteContent('');
      fetchOSDetails(false);
    } catch (e: any) {
      setErrorMessage("ERRO AO ADICIONAR NOTA.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>, type: any) => {
    const file = e.target.files?.[0];
    if (file && id) {
      setIsUploadingPhoto(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          await mockData.addOSPhoto(id, { url: base64, type });
          await mockData.addOSActivity(id, {
            description: `CARREGOU NOVA FOTO (${type.toUpperCase()})`
          });
          fetchOSDetails(false);
        } catch (err: any) {
          setErrorMessage("ERRO AO CARREGAR FOTO.");
        } finally {
          setIsUploadingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeletePhoto = async () => {
    if (!photoToDelete) return;
    setActionLoading(true);
    try {
      await mockData.deleteOSPhoto(photoToDelete.id);
      await mockData.addOSActivity(id!, {
        description: `ELIMINOU FOTO (${photoToDelete.type.toUpperCase()})`
      });
      setPhotoToDelete(null);
      setShowDeletePhotoModal(false);
      fetchOSDetails(false);
    } catch (e: any) {
      setErrorMessage("ERRO AO REMOVER FOTO.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateAISummary = async () => {
    if (!anomaly || !anomaly.trim()) {
      setErrorMessage("POR FAVOR, DESCREVA A ANOMALIA PRIMEIRO PARA QUE A IA POSSA GERAR O RESUMO.");
      return;
    }
    setIsGenerating(true);
    try {
      const summary = await generateOSReportSummary(
        description,
        anomaly,
        resolutionNotes,
        partsUsed.map(p => `${p.quantity}x ${p.name}`),
        "INTERVENÇÃO TÉCNICA"
      );
      if (summary) {
        setResolutionNotes(summary.toUpperCase());
        await mockData.addOSActivity(id!, {
          description: "GEROU RESUMO DA INTERVENÇÃO VIA INTELIGÊNCIA ARTIFICIAL"
        });
      }
    } catch (e: any) {
      setErrorMessage("ERRO AO COMUNICAR COM A IA. VERIFIQUE A LIGAÇÃO.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveData = async () => {
    if (!id || !os) return;
    setActionLoading(true);
    try {
      const finalScheduled = scheduledDate 
        ? `${scheduledDate}T${scheduledTime || '00:00'}:00` 
        : null;
      
      // Detetar alterações para o Log
      const changedFields = [];
      if (description !== (os.description || '')) changedFields.push("PEDIDO DO CLIENTE");
      if (anomaly !== (os.anomaly_detected || '')) changedFields.push("ANOMALIA DETETADA");
      if (resolutionNotes !== (os.resolution_notes || '')) changedFields.push("TRABALHO EFETUADO");
      if (observations !== (os.observations || '')) changedFields.push("OBSERVAÇÕES");
      if (clientSignature !== (os.client_signature || null)) changedFields.push("ASSINATURA CLIENTE");
      if (technicianSignature !== (os.technician_signature || null)) changedFields.push("ASSINATURA TÉCNICO");
      
      let origDate = '';
      if (os.scheduled_date) origDate = os.scheduled_date.split(/[T ]/)[0];
      if (scheduledDate !== origDate) changedFields.push("DATA AGENDAMENTO");

      await mockData.updateServiceOrder(id, {
        description: description,
        anomaly_detected: anomaly,
        resolution_notes: resolutionNotes,
        observations: observations,
        client_signature: clientSignature || null as any,
        technician_signature: technicianSignature || null as any,
        scheduled_date: finalScheduled
      });
      
      const logMessage = changedFields.length > 0 
        ? `GUARDOU ALTERAÇÕES EM: ${changedFields.join(', ')}`
        : 'GUARDOU DADOS (SEM ALTERAÇÕES DETETADAS)';

      await mockData.addOSActivity(id, {
        user_id: 'current',
        user_name: 'TÉCNICO',
        description: logMessage
      });

      setShowValidationErrors(false);
      fetchOSDetails(false);
    } catch (e: any) {
      setErrorMessage("ERRO AO GUARDAR DADOS.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizeOS = async () => {
    if (!id || !os) return;
    
    if (missingFields.length > 0) {
      setActiveTab('finalizar');
      setShowValidationErrors(true);
      setShowValidationErrorModal(true);
      return;
    }

    setShowFinalizeModal(true);
  };

  const executeFinalize = async () => {
    if (!id) return;
    setShowFinalizeModal(false);
    setActionLoading(true);
    try {
      const finalScheduled = scheduledDate 
        ? `${scheduledDate}T${scheduledTime || '00:00'}:00` 
        : null;
      
      await mockData.updateServiceOrder(id, {
        description: description,
        anomaly_detected: anomaly,
        resolution_notes: resolutionNotes,
        observations: observations,
        client_signature: clientSignature || null as any,
        technician_signature: technicianSignature || null as any,
        scheduled_date: finalScheduled,
        status: OSStatus.CONCLUIDA
      });

      await mockData.addOSActivity(id, {
        user_id: 'current',
        user_name: 'TÉCNICO',
        description: 'INTERVENÇÃO FINALIZADA E ORDEM DE SERVIÇO CONCLUÍDA.'
      });

      navigate('/os');
    } catch (err: any) {
      setErrorMessage("ERRO FATAL AO FINALIZAR OS: " + (err.message || "TENTE NOVAMENTE."));
    } finally {
      setActionLoading(false);
    }
  };

  const executeReopen = async (newStatus: OSStatus) => {
    if (!id || !os) return;
    setShowReopenModal(false);
    setActionLoading(true);
    try {
      await mockData.updateServiceOrder(id, { 
        status: newStatus,
        anomaly_detected: '',
        resolution_notes: '',
        client_signature: null as any,
        technician_signature: null as any
      });

      await mockData.addOSActivity(id, {
        user_id: 'current',
        user_name: 'TÉCNICO',
        description: `ORDEM DE SERVIÇO REABERTA COM NOVO ESTADO: ${getStatusLabelText(newStatus)}. AS ASSINATURAS E RELATÓRIO FORAM LIMPOS.`
      });

      setShowValidationErrors(false);
      await fetchOSDetails(false);
      setActiveTab('info');
    } catch (err: any) {
      console.error(err);
      setErrorMessage("ERRO AO REABRIR OS.");
    } finally {
      setActionLoading(false);
    }
  };

  const generatePDF = () => {
    if (!os) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const conclusionDate = new Date().toLocaleDateString('pt-PT');

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('REAL FRIO'.toUpperCase(), 20, 25);
    doc.setFontSize(10);
    doc.text('EQUIPAMENTOS HOTELEIROS'.toUpperCase(), 20, 32);
    doc.text(`RELATÓRIO TÉCNICO: ${os.code}`.toUpperCase(), pageWidth - 20, 25, { align: 'right' });
    doc.text(`DATA DA CONCLUSÃO: ${conclusionDate}`.toUpperCase(), pageWidth - 20, 32, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('DADOS DO CLIENTE'.toUpperCase(), 20, 55);
    doc.line(20, 57, pageWidth - 20, 57);
    doc.setFontSize(10);
    doc.text(`CLIENTE: ${os.client?.name || '---'}`.toUpperCase(), 20, 65);
    doc.text(`LOCAL: ${os.establishment?.name || 'SEDE'}`.toUpperCase(), 20, 72);
    doc.text(`MORADA: ${os.establishment?.address.startsWith('http') ? 'LOCALIZAÇÃO GOOGLE MAPS' : (os.establishment?.address || os.client?.address || '---')}`.toUpperCase(), 20, 79);

    doc.setFontSize(12);
    doc.text('EQUIPAMENTO INTERVENCIONADO'.toUpperCase(), 20, 95);
    doc.line(20, 97, pageWidth - 20, 97);
    doc.setFontSize(10);
    doc.text(`TIPO: ${os.equipment?.type || '---'}`.toUpperCase(), 20, 105);
    doc.text(`MARCA/MODELO: ${os.equipment?.brand || '---'} / ${os.equipment?.model || '---'}`.toUpperCase(), 20, 112);
    doc.text(`S/N: ${os.equipment?.serial_number || '---'}`.toUpperCase(), 20, 119);

    doc.setFontSize(12);
    doc.text('DETALHES DA INTERVENÇÃO'.toUpperCase(), 20, 135);
    doc.line(20, 137, pageWidth - 20, 137);
    doc.setFontSize(10);
    doc.text('ANOMALIA DETETADA:'.toUpperCase(), 20, 145);
    doc.text(doc.splitTextToSize((os.anomaly_detected || '---').toUpperCase(), pageWidth - 40), 20, 152);
    doc.text('TRABALHO EFETUADO:'.toUpperCase(), 20, 170);
    doc.text(doc.splitTextToSize((os.resolution_notes || '---').toUpperCase(), pageWidth - 40), 20, 177);

    if (partsUsed.length > 0) {
      autoTable(doc, {
        startY: 205,
        head: [['REF', 'PEÇA', 'QTD']],
        body: partsUsed.map(p => [
          p.reference.toUpperCase(), 
          p.name.toUpperCase(), 
          p.quantity.toString().toUpperCase()
        ]),
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 9, textTransform: 'uppercase' }
      });
    }

    const finalY = (doc as any).lastAutoTable?.finalY || 205;
    if (clientSignature) doc.addImage(clientSignature, 'PNG', 20, finalY + 20, 50, 25);
    if (technicianSignature) doc.addImage(technicianSignature, 'PNG', pageWidth - 70, finalY + 20, 50, 25);
    doc.text('ASSINATURA CLIENTE'.toUpperCase(), 20, finalY + 50);
    doc.text('ASSINATURA TÉCNICO'.toUpperCase(), pageWidth - 70, finalY + 50);

    doc.save(`RELATORIO_${os.code}.pdf`.toUpperCase());
  };

  const filteredCatalog = catalog.filter(item => 
    item.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
    item.reference.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center p-20">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">A CARREGAR OS...</p>
    </div>
  );

  const isInterventionDifferent = os.establishment_id && os.establishment?.address && os.client?.address && os.establishment.address.trim().toUpperCase() !== os.client.address.trim().toUpperCase();
  const displayedActivities = showAllActivities ? activities : activities.slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto pb-32 relative px-1 sm:px-0 space-y-4">
      
      <FloatingEditBar 
        isVisible={isDirty}
        isSubmitting={actionLoading}
        onSave={handleSaveData}
        onCancel={handleCancelEdits}
      />

      <div className="space-y-2 mb-4">
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-200 p-3 grid grid-cols-3 items-center">
          <div className="flex justify-start">
            <button onClick={() => navigate('/os')} className="p-2.5 text-slate-500 hover:text-blue-600 rounded-2xl transition-all bg-slate-50 active:scale-95 border border-transparent hover:border-blue-100">
              <ArrowLeft size={20} />
            </button>
          </div>
          <div className="flex justify-center">
            <span className="text-[12px] font-black text-blue-600 uppercase tracking-[0.2em] font-mono leading-none">{os.code}</span>
          </div>
          <div className="flex justify-end">
             <div className="relative group">
                {actionLoading ? (
                  <div className="bg-slate-50 px-3 py-1.5 rounded-full flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-blue-600" />
                  </div>
                ) : (
                  <>
                    <OSStatusBadge status={os.status} className="cursor-pointer hover:ring-2 hover:ring-blue-100 transition-all scale-90 sm:scale-100 origin-right" />
                    <select value={os.status} onChange={(e) => handleUpdateStatus(e.target.value as OSStatus)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full">
                      {Object.values(OSStatus).map((status) => (
                        <option key={status} value={status}>{getStatusLabelText(status).toUpperCase()}</option>
                      ))}
                    </select>
                  </>
                )}
             </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-1 flex overflow-x-auto no-scrollbar">
          {[
            { id: 'info', icon: Info, label: 'INFO' },
            { id: 'notas', icon: MessageSquare, label: 'NOTAS' },
            { id: 'tecnico', icon: Package, label: 'MATERIAL' },
            { id: 'fotos', icon: ImageIcon, label: 'FOTOS' },
            { id: 'finalizar', icon: CheckCircle, label: 'FECHO' }
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`flex-1 flex items-center justify-center py-4 px-2 sm:px-4 rounded-xl gap-0 sm:gap-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
              <tab.icon size={16} />
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest ml-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'info' && (
          <div className="space-y-4">
            {os.status === OSStatus.CONCLUIDA && (
              <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-emerald-900 uppercase tracking-tighter">INTERVENÇÃO FINALIZADA</h3>
                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">DADOS BLOQUEADOS PARA EDIÇÃO DIRETA.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   <button onClick={generatePDF} className="flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-lg active:scale-95">
                     <FileText size={18} /> VER RELATÓRIO PDF
                   </button>
                   <button onClick={() => setShowReopenModal(true)} className="flex items-center justify-center gap-3 py-4 bg-white text-emerald-700 border border-emerald-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 shadow-sm active:scale-95">
                     <RotateCw size={18} /> REABRIR ORDEM SERVIÇO
                   </button>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                 <AlertCircle size={18} className="text-orange-500" />
                 <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">PEDIDO DO CLIENTE / AVARIA</h3>
              </div>
              <textarea 
                className={`w-full bg-slate-50 border-none rounded-3xl px-5 py-4 text-xs text-slate-700 italic leading-relaxed outline-none focus:ring-4 focus:ring-blue-500/5 transition-all min-h-[100px] resize-none ${os.status === OSStatus.CONCLUIDA ? 'opacity-60 cursor-not-allowed' : ''}`}
                value={description}
                onChange={e => setDescription(e.target.value)}
                readOnly={os.status === OSStatus.CONCLUIDA}
                placeholder="DESCRIÇÃO DO PEDIDO DO CLIENTE..."
              />
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
               <div className="flex items-center gap-3 mb-2">
                  <Building2 size={18} className="text-blue-500" />
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Cliente & Contactos</h3>
               </div>
               <div className="flex flex-col gap-3">
                  <button onClick={() => navigate(`/clients/${os.client_id}`)} className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-100 px-4 py-2.5 rounded-full transition-all hover:bg-blue-100 w-full">
                    <User size={14} />
                    <span className="text-xs font-black uppercase tracking-tight truncate">{os.client?.name}</span>
                  </button>

                  <a href={getMapLink(os.client?.address || '')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-50 text-slate-700 border border-slate-100 px-4 py-2.5 rounded-full transition-all hover:bg-white hover:border-blue-200 hover:text-blue-600 w-full">
                    <MapPin size={14} className="text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-tight truncate">
                      {os.client?.address.toLowerCase().startsWith('http') ? 'ABRIR LOCALIZAÇÃO SEDE ➜' : os.client?.address}
                    </span>
                  </a>

                  {os.client?.google_drive_link && (
                    <a href={os.client.google_drive_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-2.5 rounded-full transition-all hover:bg-emerald-100 w-full">
                      <Cloud size={14} />
                      <span className="text-[10px] font-black uppercase tracking-tight truncate">GOOGLE DRIVE CLIENTE ➜</span>
                    </a>
                  )}

                  <a href={`tel:${os.client?.phone}`} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-2.5 rounded-full transition-all hover:bg-emerald-100 w-full">
                    <Phone size={14} />
                    <span className="text-xs font-black uppercase tracking-tight">{os.client?.phone}</span>
                  </a>
               </div>
            </div>

            {isInterventionDifferent && (
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                 <div className="flex items-center gap-3">
                    <MapPin size={18} className="text-indigo-500" />
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">LOCAL INTERVENÇÃO</h3>
                 </div>
                 <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-100 px-4 py-2.5 rounded-full w-full">
                      <Building2 size={14} />
                      <span className="text-xs font-black uppercase tracking-tight truncate">{os.establishment?.name}</span>
                    </div>

                    <a href={getMapLink(os.establishment?.address || '')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-50 text-slate-700 border border-slate-100 px-4 py-2.5 rounded-full transition-all hover:bg-white hover:border-indigo-200 hover:text-indigo-600 w-full">
                      <MapPin size={14} className="text-slate-400" />
                      <span className="text-[10px] font-black uppercase tracking-tight truncate">
                         {os.establishment?.address.toLowerCase().startsWith('http') ? 'ABRIR LOCALIZAÇÃO NO MAPA ➜' : os.establishment?.address}
                      </span>
                    </a>

                    <a href={`tel:${os.establishment?.phone}`} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-2.5 rounded-full transition-all hover:bg-emerald-100 w-full">
                      <Phone size={14} />
                      <span className="text-xs font-black uppercase tracking-tight">{os.establishment?.phone}</span>
                    </a>
                 </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
               <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-emerald-500" />
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Planeamento & Agendamento</h3>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Data</label>
                    <input 
                      type="date" 
                      value={scheduledDate} 
                      onChange={e => setScheduledDate(e.target.value)}
                      readOnly={os.status === OSStatus.CONCLUIDA}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-xs font-black outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" 
                    />
                 </div>
                 <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Hora</label>
                    <div className="flex gap-2">
                      <input 
                        type="time" 
                        value={scheduledTime} 
                        onChange={e => setScheduledTime(e.target.value)}
                        readOnly={os.status === OSStatus.CONCLUIDA}
                        className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2.5 text-xs font-black outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" 
                      />
                      {scheduledDate && os.status !== OSStatus.CONCLUIDA && (
                        <button onClick={handleResetSchedule} className="p-2.5 text-slate-300 hover:text-red-500 transition-colors">
                           <RotateCcw size={16} />
                        </button>
                      )}
                    </div>
                 </div>
               </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
               <div className="flex items-center gap-3">
                  <HardDrive size={18} className="text-slate-400" />
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Equipamento Vinculado</h3>
               </div>
               {os.equipment ? (
                 <button onClick={() => navigate(`/equipments/${os.equipment_id}`)} className="w-full text-left p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all group">
                    <div className="flex justify-between items-center">
                       <div>
                          <p className="text-sm font-black text-slate-900 uppercase group-hover:text-blue-600 transition-colors">{os.equipment.type} - {os.equipment.brand}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">S/N: {os.equipment.serial_number}</p>
                       </div>
                       <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-600 transition-all group-hover:translate-x-1" />
                    </div>
                 </button>
               ) : (
                 <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sem equipamento registado</p>
                 </div>
               )}
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <History size={18} className="text-slate-400" />
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Auditoria & Log</h3>
                 </div>
                 <button onClick={() => setShowAllActivities(!showAllActivities)} className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                   {showAllActivities ? 'VER MENOS' : 'VER TUDO'}
                 </button>
               </div>
               <div className="space-y-4 relative">
                  <div className="absolute left-2.5 top-2 bottom-2 w-px bg-slate-100"></div>
                  {displayedActivities.length === 0 ? (
                    <p className="text-[10px] text-slate-300 italic py-2 pl-8">Sem atividades registadas.</p>
                  ) : (
                    displayedActivities.map((act) => (
                      <div key={act.id} className="relative pl-8 animate-in fade-in slide-in-from-left-2 duration-300">
                         <div className="absolute left-1.5 top-1.5 w-2 h-2 rounded-full bg-blue-500 border-2 border-white shadow-sm"></div>
                         <div className="flex justify-between items-start">
                            <p className="text-[10px] font-black text-slate-900 uppercase">{act.user_name}</p>
                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter ml-4">{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(act.created_at).toLocaleDateString()}</span>
                         </div>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-1 leading-relaxed break-words">{act.description}</p>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'notas' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm min-h-[400px] flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                   <MessageSquare size={18} className="text-blue-500" />
                   <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Mensagens & Notas Internas</h3>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] no-scrollbar mb-6">
                   {notesList.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center opacity-30 py-20">
                        <MessageSquare size={32} className="mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Sem mensagens.</p>
                     </div>
                   ) : (
                     notesList.map((note) => (
                       <div key={note.id} className={`flex flex-col ${note.user_id === 'current' ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium ${note.user_id === 'current' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-700 rounded-tl-none'}`}>
                             <p className="leading-relaxed">{note.content}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 px-2">
                             <span className="text-[8px] font-black text-slate-400 uppercase">{note.user_name}</span>
                             <span className="text-[7px] text-slate-300">•</span>
                             <span className="text-[8px] font-bold text-slate-400">{new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                       </div>
                     ))
                   )}
                </div>

                <div className="relative">
                   <textarea 
                     value={newNoteContent}
                     onChange={e => setNewNoteContent(e.target.value)}
                     placeholder="ESCREVA UMA NOTA OU AVISO..."
                     className="w-full bg-slate-50 border-none rounded-3xl pl-5 pr-14 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none h-20"
                   />
                   <button 
                    onClick={handleAddNote}
                    disabled={!newNoteContent.trim() || actionLoading}
                    className="absolute right-3 bottom-3 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:scale-90 transition-all disabled:opacity-30"
                   >
                     <Send size={18} />
                   </button>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'tecnico' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                     <Package size={18} className="text-slate-400" />
                     <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Material Aplicado</h3>
                  </div>
                  <button 
                    onClick={() => setShowPartModal(true)}
                    disabled={os.status === OSStatus.CONCLUIDA}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    <Plus size={14} /> ADICIONAR
                  </button>
               </div>

               <div className="space-y-3">
                  {partsUsed.length === 0 ? (
                    <div className="py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
                       <Package size={32} className="mb-2 opacity-20" />
                       <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma peça registada.</p>
                    </div>
                  ) : (
                    partsUsed.map((part) => (
                      <div key={part.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group transition-all">
                         <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-white text-slate-400 flex items-center justify-center flex-shrink-0 group-hover:text-blue-500 transition-all shadow-inner">
                               <Package size={18} />
                            </div>
                            <div className="min-w-0">
                               <p className="text-sm font-black text-slate-900 uppercase truncate">{part.name}</p>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono leading-none mt-0.5">REF: {part.reference}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="text-right">
                               <p className="text-xs font-black text-slate-900">{part.quantity} UN</p>
                            </div>
                            <div className="flex gap-1">
                                <button 
                                  onClick={() => { setPartToEdit(part); setEditPartQty(part.quantity); setShowEditPartModal(true); }}
                                  disabled={os.status === OSStatus.CONCLUIDA}
                                  className="p-2 text-slate-300 hover:text-blue-600 transition-colors disabled:opacity-30"
                                >
                                   <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => { setPartToDelete(part); setShowDeletePartModal(true); }}
                                  disabled={os.status === OSStatus.CONCLUIDA}
                                  className="p-2 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30"
                                >
                                   <Trash2 size={16} />
                                </button>
                            </div>
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'fotos' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-3">
                      <ImageIcon size={18} className="text-slate-400" />
                      <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Evidências Fotográficas</h3>
                </div>
                   {isUploadingPhoto && (
                     <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full animate-pulse">
                        <RefreshCw size={12} className="animate-spin" />
                        <span className="text-[9px] font-black uppercase tracking-widest">A Carregar...</span>
                     </div>
                   )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                   {[
                     { label: 'ANTES', type: 'antes', icon: Clock },
                     { label: 'DEPOIS', type: 'depois', icon: CheckCircle2 },
                     { label: 'PEÇA', type: 'peca', icon: Hammer },
                     { label: 'GERAL', type: 'geral', icon: Camera }
                   ].map((cat) => (
                     <label key={cat.type} className={`flex flex-col items-center justify-center py-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all group ${os.status === OSStatus.CONCLUIDA ? 'opacity-50 pointer-events-none' : ''}`}>
                        <cat.icon size={24} className="text-slate-300 group-hover:text-blue-500 mb-2 transition-colors" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-600">{cat.label}</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleUploadPhoto(e, cat.type)} disabled={os.status === OSStatus.CONCLUIDA} />
                     </label>
                   ))}
                </div>

                <div className="mt-8 space-y-6">
                   {['antes', 'depois', 'peca', 'geral'].map(type => {
                     const typePhotos = photos.filter(p => p.type === type);
                     if (typePhotos.length === 0) return null;
                     return (
                       <div key={type}>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> {type === 'antes' ? 'ESTADO INICIAL' : type === 'depois' ? 'FINALIZADO' : type === 'peca' ? 'PEÇAS / COMPONENTES' : 'FOTOS GERAIS'}
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                             {typePhotos.map(photo => (
                               <div key={photo.id} className="relative aspect-square group animate-in zoom-in-95 duration-200">
                                  <img 
                                    src={photo.url} 
                                    onClick={() => setSelectedPhotoForView(photo)}
                                    className="w-full h-full object-cover rounded-2xl shadow-sm border border-slate-100 group-hover:ring-4 group-hover:ring-blue-100 transition-all cursor-zoom-in" 
                                  />
                                  <button 
                                    onClick={() => { setPhotoToDelete(photo); setShowDeletePhotoModal(true); setSelectedPhotoForView(null); }}
                                    className={`absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity active:scale-90 ${os.status === OSStatus.CONCLUIDA ? 'hidden' : ''}`}
                                  >
                                     <Trash2 size={12} />
                                  </button>
                               </div>
                             ))}
                          </div>
                       </div>
                     );
                   })}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'finalizar' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             
             {missingFields.length > 0 && showValidationErrors && (
               <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                     <AlertCircle className="text-red-500" size={20} />
                     <h4 className="text-[10px] font-black text-red-900 uppercase tracking-widest">Campos Obrigatórios em falta</h4>
                  </div>
                  <ul className="space-y-1 ml-8">
                     {missingFields.map((f, i) => (
                       <li key={i} className="text-[10px] font-bold text-red-600 uppercase list-disc">{f}</li>
                     ))}
                  </ul>
               </div>
             )}

             <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                   <AlertTriangle size={18} className="text-orange-500" />
                   <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Anomalia Detetada *</h3>
                </div>
                <input 
                  type="text"
                  placeholder="EX: COMPRESSOR BLOQUEADO / FUGA GÁS..."
                  className={`w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10 transition-all ${os.status === OSStatus.CONCLUIDA ? 'opacity-60 cursor-not-allowed' : ''}`}
                  value={anomaly}
                  onChange={e => setAnomaly(e.target.value)}
                  readOnly={os.status === OSStatus.CONCLUIDA}
                />
             </div>

             <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-3">
                      <Sparkles size={18} className="text-blue-500" />
                      <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Resumo da Intervenção (IA)</h3>
                   </div>
                   <button 
                    onClick={handleGenerateAISummary}
                    disabled={isGenerating || os.status === OSStatus.CONCLUIDA}
                    className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all disabled:opacity-50"
                   >
                     {isGenerating ? <RefreshCw size={12} className="animate-spin" /> : <Sparkle size={12} />}
                     GERAR COM GEMINI
                   </button>
                </div>
                <textarea 
                  className={`w-full bg-slate-50 border-none rounded-[2rem] px-6 py-5 text-sm text-slate-800 leading-relaxed outline-none focus:ring-4 focus:ring-blue-500/10 transition-all min-h-[160px] resize-none ${os.status === OSStatus.CONCLUIDA ? 'opacity-60 cursor-not-allowed' : ''}`}
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  readOnly={os.status === OSStatus.CONCLUIDA}
                  placeholder="DESCREVA O TRABALHO EFETUADO E A RESOLUÇÃO DA ANOMALIA..."
                />
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <SignatureCanvas 
                label="Assinatura Cliente" 
                onSave={setClientSignature} 
                onClear={() => setClientSignature(null)} 
                initialValue={clientSignature}
                readOnly={os.status === OSStatus.CONCLUIDA}
                error={showValidationErrors && !clientSignature}
               />
               <SignatureCanvas 
                label="Assinatura Técnico" 
                onSave={setTechnicianSignature} 
                onClear={() => setTechnicianSignature(null)} 
                initialValue={technicianSignature}
                readOnly={os.status === OSStatus.CONCLUIDA}
                error={showValidationErrors && !technicianSignature}
               />
             </div>

             <div className="pt-6">
               <button 
                onClick={handleFinalizeOS}
                disabled={os.status === OSStatus.CONCLUIDA || actionLoading}
                className="w-full py-5 bg-blue-600 text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
               >
                 {actionLoading ? 'A PROCESSAR...' : 'FINALIZAR E CONCLUIR OS'}
               </button>
             </div>
          </div>
        )}
      </div>

      {/* MODAL ADIÇÃO DE PEÇA */}
      {showPartModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50">
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Adicionar Material Aplicado</h3>
                 <button onClick={() => { setShowPartModal(false); setIsCreatingNewPart(false); }} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
              </div>

              <div className="p-8 space-y-4 overflow-y-auto no-scrollbar">
                 <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl mb-4">
                    <button onClick={() => setIsCreatingNewPart(false)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${!isCreatingNewPart ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>CATÁLOGO</button>
                    <button onClick={() => setIsCreatingNewPart(true)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${isCreatingNewPart ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>NOVA PEÇA</button>
                 </div>

                 {isCreatingNewPart ? (
                    <div className="space-y-4 animate-in fade-in duration-300">
                       <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Nome do Artigo *</label>
                          <input className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-bold uppercase outline-none focus:ring-4 focus:ring-blue-500/10" value={newPartName} onChange={e => setNewPartName(e.target.value)} placeholder="EX: VÁLVULA EXPANSÃO" />
                       </div>
                       <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Referência / Part Number (Opcional)</label>
                          <input className="w-full bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-black uppercase font-mono outline-none focus:ring-4 focus:ring-blue-500/10" value={newPartRef} onChange={e => setNewPartRef(e.target.value)} placeholder="DEIXE VAZIO PARA GERAR AUTO" />
                       </div>
                       <button onClick={handleCreateAndAddPart} className="w-full bg-blue-600 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-95 transition-all mt-4">CONFIRMAR E ADICIONAR</button>
                    </div>
                 ) : (
                    <div className="space-y-4 animate-in fade-in duration-300">
                       <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input 
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-xl text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                            placeholder="PROCURAR NO CATÁLOGO..." 
                            value={catalogSearch}
                            onChange={e => setCatalogSearch(e.target.value)}
                          />
                       </div>

                       <div className="max-h-60 overflow-y-auto space-y-2 no-scrollbar border border-slate-50 rounded-2xl p-2">
                          {filteredCatalog.length === 0 ? (
                            <p className="text-center py-6 text-[10px] font-black text-slate-300 uppercase italic">Nenhum artigo encontrado.</p>
                          ) : (
                            filteredCatalog.map(item => (
                              <button 
                                key={item.id} 
                                onClick={() => setPendingPart({ item, qty: 1 })}
                                className={`w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center group ${pendingPart?.item.id === item.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white border-slate-50 hover:bg-slate-50 hover:border-slate-200'}`}
                              >
                                 <div className="min-w-0 pr-4">
                                    <p className={`text-xs font-black uppercase truncate ${pendingPart?.item.id === item.id ? 'text-white' : 'text-slate-900'}`}>{item.name}</p>
                                    <p className={`text-[9px] font-black uppercase font-mono mt-0.5 ${pendingPart?.item.id === item.id ? 'text-blue-100' : 'text-slate-300'}`}>REF: {item.reference}</p>
                                 </div>
                                 <div className={`px-2 py-1 rounded-lg text-[10px] font-black ${pendingPart?.item.id === item.id ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>STOCK: {item.stock}</div>
                              </button>
                            ))
                          )}
                       </div>

                       {pendingPart && (
                         <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex items-center justify-between animate-in slide-in-from-bottom-2">
                            <div>
                               <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Quantidade</p>
                               <div className="flex items-center gap-4">
                                  <button onClick={() => setPendingPart({ ...pendingPart, qty: Math.max(1, pendingPart.qty - 1) })} className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-sm active:scale-90 transition-all"><Minus size={18}/></button>
                                  <span className="text-xl font-black text-blue-700 w-8 text-center">{pendingPart.qty}</span>
                                  <button onClick={() => setPendingPart({ ...pendingPart, qty: pendingPart.qty + 1 })} className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-sm active:scale-90 transition-all"><Plus size={18}/></button>
                               </div>
                            </div>
                            <button onClick={handleAddPart} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-blue-700 active:scale-95 transition-all">CONFIRMAR</button>
                         </div>
                       )}
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* MODAL EDIÇÃO DE PEÇA */}
      {showEditPartModal && partToEdit && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50">
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Alterar Quantidade</h3>
                 <button onClick={() => setShowEditPartModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="text-center">
                    <p className="text-xs font-black text-slate-900 uppercase mb-1">{partToEdit.name}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">REF: {partToEdit.reference}</p>
                 </div>
                 <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex flex-col items-center gap-4">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Nova Quantidade</p>
                    <div className="flex items-center gap-6">
                       <button onClick={() => setEditPartQty(Math.max(1, editPartQty - 1))} className="w-12 h-12 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-sm active:scale-90 transition-all border border-blue-100"><Minus size={22}/></button>
                       <span className="text-3xl font-black text-blue-700 w-12 text-center">{editPartQty}</span>
                       <button onClick={() => setEditPartQty(editPartQty + 1)} className="w-12 h-12 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-sm active:scale-90 transition-all border border-blue-100"><Plus size={22}/></button>
                    </div>
                 </div>
                 <button 
                  onClick={handleUpdatePartQuantity}
                  disabled={actionLoading}
                  className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                 >
                    {actionLoading ? 'A ATUALIZAR...' : 'GRAVAR ALTERAÇÃO'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL DELETE PART */}
      {showDeletePartModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Trash2 size={28}/></div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Remover Artigo?</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8 uppercase">DESEJA REMOVER "{partToDelete?.name}" DESTA INTERVENÇÃO?</p>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setShowDeletePartModal(false)} className="py-4 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-2xl active:scale-95 transition-all">CANCELAR</button>
                 <button onClick={handleRemovePart} className="py-4 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 active:scale-95 transition-all">ELIMINAR</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL VIEW PHOTO */}
      {selectedPhotoForView && (
        <div className="fixed inset-0 z-[300] bg-slate-950 backdrop-blur-xl flex flex-col p-0 animate-in fade-in duration-300 overflow-hidden">
           <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-6 z-[310] bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex flex-col">
                 <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">{selectedPhotoForView.type}</span>
                 <span className="text-[9px] font-black text-white/50 uppercase tracking-tighter">{new Date(selectedPhotoForView.created_at).toLocaleString()}</span>
              </div>
              <button 
                onClick={() => setSelectedPhotoForView(null)}
                className="p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all active:scale-90 backdrop-blur-lg"
              >
                 <X size={24} />
              </button>
           </div>
           
           <div className="flex-1 w-full h-full">
              <ZoomableImage 
                src={selectedPhotoForView.url} 
                alt="Evidência fotográfica expandida" 
              />
           </div>

           <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center items-center gap-6 z-[310] bg-gradient-to-t from-black/60 to-transparent">
              <button 
                onClick={() => { setPhotoToDelete(selectedPhotoForView); setShowDeletePhotoModal(true); setSelectedPhotoForView(null); }}
                className="flex items-center gap-3 px-8 py-4 bg-red-600/20 text-red-500 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all border border-red-500/20 backdrop-blur-md"
              >
                 <Trash2 size={16} /> ELIMINAR EVIDÊNCIA
              </button>
           </div>
        </div>
      )}

      {/* MODAL DELETE PHOTO */}
      {showDeletePhotoModal && (
        <div className="fixed inset-0 z-[310] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={28}/></div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Eliminar Foto?</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8 uppercase">ESTA AÇÃO É IRREVERSÍVEL. CONFIRMA?</p>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setShowDeletePhotoModal(false)} className="py-4 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-2xl active:scale-95">CANCELAR</button>
                 <button onClick={handleDeletePhoto} className="py-4 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl active:scale-95">ELIMINAR</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL VALIDATION ERROR */}
      {showValidationErrorModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl text-center">
              <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse"><ShieldAlert size={32}/></div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4">Intervenção Incompleta</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8 uppercase">A ORDEM DE SERVIÇO SÓ PODE SER CONCLUÍDA SE DESCREVER A ANOMALIA E RECOLHER TODAS AS ASSINATURAS.</p>
              <button 
                onClick={() => { setShowValidationErrorModal(false); setActiveTab('finalizar'); }} 
                className="w-full py-5 bg-[#0f172a] text-white font-black text-[10px] uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-xl"
              >
                IR PARA FECHO E CORRIGIR
              </button>
           </div>
        </div>
      )}

      {/* MODAL FINALIZE CONFIRMATION */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm text-center">
              <div className="p-8">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><CheckCircle size={32}/></div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Finalizar Intervenção?</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8 uppercase">TODOS OS DADOS SERÃO BLOQUEADOS E O RELATÓRIO SERÁ DISPONIBILIZADO EM PDF.</p>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setShowFinalizeModal(false)} className="py-4 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-2xl active:scale-95">CANCELAR</button>
                  <button onClick={executeFinalize} className="py-4 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">CONFIRMAR</button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL REOPEN CONFIRMATION */}
      {showReopenModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl text-center">
              <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><RotateCw size={32}/></div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Reabrir Ordem Serviço?</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6 uppercase">O ESTADO PASSARÁ A "INICIADA" E AS ASSINATURAS SERÃO LIMPAS PARA PERMITIR NOVA INTERVENÇÃO.</p>
              
              <div className="space-y-3">
                 <button 
                  onClick={() => executeReopen(OSStatus.INICIADA)}
                  className="w-full py-5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg active:scale-95 transition-all"
                 >
                   REABRIR COMO "INICIADA"
                 </button>
                 <button 
                  onClick={() => setShowReopenModal(false)}
                  className="w-full py-4 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-2xl active:scale-95"
                 >
                   VOLTAR
                 </button>
              </div>
           </div>
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
              <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                 <X size={16} />
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrderDetail;
