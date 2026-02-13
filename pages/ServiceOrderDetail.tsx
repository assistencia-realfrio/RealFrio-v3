
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
  RotateCw, Cloud, Edit2, Layers, Tag, Hash, ShieldCheck, ScrollText, CheckSquare, Square,
  Settings2, FileDown, Key, Mail, ThumbsUp, ThumbsDown, ThumbsDown as CancelIcon, Play, Square as StopIcon, Timer, 
  Wrench, Snowflake, Printer, Check, Image as LucideImage, QrCode,
  Calculator, UploadCloud, Navigation
} from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from 'qrcode';
import SignatureCanvas from '../components/SignatureCanvas';
import OSStatusBadge from '../components/OSStatusBadge';
import { OSStatus, ServiceOrder, PartUsed, PartCatalogItem, OSPhoto, OSNote, OSActivity } from '../types';
import { generateOSReportSummary } from '../services/geminiService';
import { mockData } from '../services/mockData';
import { normalizeString, compressImage } from '../utils';
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
      touchStartRef.current.x = touchStartRef.current.x || 0;
      const dx = e.touches[0].pageX - touchStartRef.current.x;
      const dy = e.touches[0].pageY - touchStartRef.current.y;
      const limit = (scale - 1) * 200;
      setPosition({
        x: Math.min(Math.max(touchStartRef.current.pos.x + dx, -limit), limit),
        y: Math.min(Math.max(touchStartRef.current.y + dy, -limit), limit)
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
      <img src={src} alt={alt} className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-75 ease-out select-none pointer-events-none" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, fontSmooth: 'always' }} />
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
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'finalizar' || tabParam === 'info' || tabParam === 'notas' || tabParam === 'tecnico' || tabParam === 'fotos') {
      return tabParam as TabType;
    }
    return 'info';
  });
  const [os, setOs] = useState<any | null>(null);
  const [partsUsed, setPartsUsed] = useState<PartUsed[]>([]);
  const [photos, setPhotos] = useState<OSPhoto[]>([]);
  const [notesList, setNotesList] = useState<OSNote[]>([]);
  const [activities, setActivities] = useState<OSActivity[]>([]);
  const [catalog, setCatalog] = useState<PartCatalogItem[]>([]);
  
  const [description, setDescription] = useState('');
  const [anomaly, setAnomaly] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [observations, setObservations] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [technicianSignature, setTechnicianSignature] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [dragActiveType, setDragActiveType] = useState<string | null>(null);
  const [isWarranty, setIsWarranty] = useState(false);
  const [warrantyInfo, setWarrantyInfo] = useState<ServiceOrder['warranty_info']>({});
  
  const [showDeletePartModal, setShowDeletePartModal] = useState(false);
  const [showDeletePhotoModal, setShowDeletePhotoModal] = useState(false);
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [showEditQuantityModal, setShowEditQuantityModal] = useState(false);
  const [showTimerTypeModal, setShowTimerTypeModal] = useState(false);
  const [showTagPreview, setShowTagPreview] = useState(false);
  
  // Estados para cancelamento
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [tagPdfUrl, setTagPdfUrl] = useState<string | null>(null);
  const [partToDelete, setPartToDelete] = useState<PartUsed | null>(null);
  const [partToEditQuantity, setPartToEditQuantity] = useState<PartUsed | null>(null);
  const [partQuantityStr, setPartQuantityStr] = useState<string>("1");
  const [tempQuantityStr, setTempQuantityStr] = useState<string>("1");

  const [photoToDelete, setPhotoToDelete] = useState<OSPhoto | null>(null);
  const [selectedPhotoForView, setSelectedPhotoForView] = useState<OSPhoto | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [partSearchTerm, setPartSearchTerm] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [isCreatingNewPart, setIsCreatingNewPart] = useState(false);
  const [newPartForm, setNewPartForm] = useState({ name: '', reference: '' });

  const [expandedClient, setExpandedClient] = useState(false);
  const [expandedEquip, setExpandedEquip] = useState(false);
  const [expandedWarranty, setExpandedWarranty] = useState(false);
  const [expandedPlanning, setExpandedPlanning] = useState(false);
  const [expandedLog, setExpandedLog] = useState(false);

  // Estados para Upload Seletivo
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [pendingUploadType, setPendingUploadType] = useState<'antes' | 'depois' | 'peca' | 'geral' | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Estados do Cronómetro PARTILHADO
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerIntervalRef = useRef<number | null>(null);

  const descTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Lógica de Detecção de Alterações (isDirty)
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
    
    const currentWarrantyInfoStr = JSON.stringify(warrantyInfo || {});
    const originalWarrantyInfoStr = JSON.stringify(os.warranty_info || {});

    return (
      description !== (os.description || '') ||
      anomaly !== (os.anomaly_detected || '') ||
      resolutionNotes !== (os.resolution_notes || '') ||
      observations !== (os.observations || '') ||
      scheduledDate !== origDate ||
      scheduledTime !== origTime ||
      currentClientSig !== originalClientSig ||
      currentTechSig !== originalTechSig ||
      isWarranty !== (!!os.is_warranty) ||
      currentWarrantyInfoStr !== originalWarrantyInfoStr
    );
  }, [os, description, anomaly, resolutionNotes, observations, scheduledDate, scheduledTime, clientSignature, technicianSignature, isWarranty, warrantyInfo]);

  useEffect(() => { fetchOSDetails(); }, [id]);

  useEffect(() => {
    if (activeTab === 'info' && descTextareaRef.current) {
      descTextareaRef.current.style.height = 'auto';
      descTextareaRef.current.style.height = `${descTextareaRef.current.scrollHeight}px`;
    }
  }, [description, activeTab, loading]);

  useEffect(() => {
    if (showPartModal && catalog.length === 0) {
      mockData.getCatalog().then(setCatalog).catch(() => setErrorMessage("ERRO AO CARREGAR CATÁLOGO."));
    }
  }, [showPartModal]);

  // Efeito do Ticker do Cronómetro Baseado no Estado Global da OS
  useEffect(() => {
    if (os?.timer_is_active && os?.timer_start_time) {
      const startTime = new Date(os.timer_start_time).getTime();
      
      const updateElapsed = () => {
        setElapsedTime(Date.now() - startTime);
      };
      
      updateElapsed();
      timerIntervalRef.current = window.setInterval(updateElapsed, 1000);
    } else {
      setElapsedTime(0);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [os?.timer_is_active, os?.timer_start_time]);

  // Sincronização periódica da OS para apanhar mudanças de timer de outros utilizadores
  useEffect(() => {
    if (!id || isDirty) return;
    const syncInterval = setInterval(() => { fetchOSDetails(false); }, 8000); 
    return () => clearInterval(syncInterval);
  }, [id, isDirty]);

  const handleStartTimer = async () => {
    if (!id || os?.timer_is_active) return;
    setActionLoading(true);
    
    // CAPTURA DE LOCALIZAÇÃO (CHECK-IN)
    let lat: number | null = null;
    let lng: number | null = null;
    
    try {
      if (navigator.geolocation) {
        const pos: GeolocationPosition = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, enableHighAccuracy: true });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }
    } catch (err) {
      console.warn("GPS não disponível para Check-in:", err);
    }

    try {
      const now = new Date().toISOString();
      const updates: any = { 
        timer_is_active: true, 
        timer_start_time: now,
        status: OSStatus.INICIADA
      };
      
      if (lat && lng) {
        updates.checkin_lat = lat;
        updates.checkin_lng = lng;
      }

      await mockData.updateServiceOrder(id, updates);
      await mockData.addOSActivity(id, { 
        description: lat && lng 
          ? `INICIOU CRONÓMETRO (CHECK-IN VALIDADO VIA GPS)` 
          : `INICIOU CRONÓMETRO (CHECK-IN SEM GPS)` 
      });
      await fetchOSDetails(false);
    } catch (e) { 
      setErrorMessage("ERRO AO INICIAR CRONÓMETRO."); 
    } finally { 
      setActionLoading(false); 
    }
  };

  const handleStopTimer = () => { if (!id || !os?.timer_start_time) return; setShowTimerTypeModal(true); };

  const handleResetTimer = async () => {
    if (!id || !os?.timer_is_active) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar Tempo',
      message: 'Deseja parar o cronómetro e descartar o tempo decorrido sem efetuar qualquer registo de mão de obra?',
      confirmLabel: 'ELIMINAR TEMPO',
      variant: 'danger',
      action: async () => {
        setActionLoading(true);
        try {
          await mockData.updateServiceOrder(id, { timer_is_active: false, timer_start_time: null });
          await mockData.addOSActivity(id, { description: "CANCELOU E ELIMINOU TEMPO DO CRONÓMETRO (SEM REGISTO)" });
          setElapsedTime(0);
          await fetchOSDetails(false);
        } catch (e) { setErrorMessage("ERRO AO ELIMINAR TEMPO."); } finally { setActionLoading(false); }
      }
    });
  };

  const handleConfirmTimerRegistration = async (type: 'GERAL' | 'FRIO') => {
    if (!id || !os?.timer_start_time) return;
    setActionLoading(true);
    setShowTimerTypeModal(false);
    try {
      const startTime = new Date(os.timer_start_time).getTime();
      const finalElapsed = Date.now() - startTime;
      const minutes = Math.max(1, Math.round(finalElapsed / 60000));
      const hours = Number((minutes / 60).toFixed(2));
      const designation = type === 'FRIO' ? "MÃO DE OBRA FRIO" : "MÃO DE OBRA GERAL";
      const reference = type === 'FRIO' ? "MO-FRIO" : "MO-GERAL";
      await mockData.updateServiceOrder(id, { timer_is_active: false, timer_start_time: null });
      await mockData.addOSPart(id, { name: designation, reference: reference, quantity: hours });
      await mockData.createTimeEntry({ os_id: id, start_time: os.timer_start_time, duration_minutes: minutes, description: `Registo cronómetro: ${designation}` });
      await mockData.addOSActivity(id, { description: `PAROU CRONÓMETRO: REGISTADO ${minutes} MINUTOS COMO ${designation}` });
      setElapsedTime(0);
      fetchOSDetails(false);
    } catch (e) { setErrorMessage("ERRO AO FINALIZAR REGISTO DE TEMPO."); } finally { setActionLoading(false); }
  };

  const formatElapsedTime = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const missingFields = useMemo(() => {
    const list = [];
    if (!anomaly || !anomaly.trim()) list.push("CAUSA DA AVARIA");
    if (!clientSignature) list.push("ASSINATURA DO CLIENTE");
    if (!technicianSignature) list.push("ASSINATURA DO TÉCNICO");
    return list;
  }, [anomaly, clientSignature, technicianSignature]);

  const fetchOSDetails = async (showLoader = true) => {
    if (!id) return;
    if (showLoader) setLoading(true);
    try {
      const osData = await mockData.getServiceOrderById(id);
      if (osData) {
        setOs(osData);
        if (showLoader || !isDirty) {
          setDescription(osData.description || '');
          setAnomaly(osData.anomaly_detected || '');
          setResolutionNotes(osData.resolution_notes || '');
          setObservations(osData.observations || '');
          setClientSignature(osData.client_signature && osData.client_signature.trim() !== '' ? osData.client_signature : null);
          setTechnicianSignature(osData.technician_signature && osData.technician_signature.trim() !== '' ? osData.technician_signature : null);
          setIsWarranty(!!osData.is_warranty);
          setWarrantyInfo(osData.warranty_info || {});
          if (osData.scheduled_date) {
            const parts = osData.scheduled_date.split(/[T ]/);
            setScheduledDate(parts[0] || '');
            setScheduledTime((parts[1] || '').substring(0, 5));
          } else { setScheduledDate(''); setScheduledTime(''); }
        }
        const [p, ph, n, act] = await Promise.all([ mockData.getOSParts(id), mockData.getOSPhotos(id), mockData.getOSNotes(id), mockData.getOSActivity(id) ]);
        setPartsUsed(p); setPhotos(ph); setNotesList(n); setActivities(act);
      }
    } catch (error: any) { console.error("ERRO AO CARREGAR OS:", error.message || error); } finally { if (showLoader) setLoading(false); }
  };

  const quoteTotals = useMemo(() => {
    const subtotal = partsUsed.reduce((acc, p) => acc + (p.quantity * (p.unit_price || 0)), 0);
    const iva = subtotal * 0.23;
    const total = subtotal + iva;
    return { subtotal, iva, total, hasValues: subtotal > 0 };
  }, [partsUsed]);

  const handleUpdateStatus = async (newStatus: OSStatus) => {
    if (!id || !os) return;
    if (newStatus === OSStatus.CONCLUIDA && missingFields.length > 0) { setShowValidationErrorModal(true); setShowValidationErrors(true); setActiveTab('finalizar'); return; }
    
    if (newStatus === OSStatus.CANCELADA) {
      setShowCancelModal(true);
      return;
    }

    setActionLoading(true);
    try {
      const oldStatusLabel = getStatusLabelText(os.status).toUpperCase();
      const newStatusLabel = getStatusLabelText(newStatus).toUpperCase();
      await mockData.updateServiceOrder(id, { status: newStatus });
      await mockData.addOSActivity(id, { description: `ALTEROU ESTADO: DE ${oldStatusLabel} PARA ${newStatusLabel}` });
      fetchOSDetails(false);
    } catch (e: any) { setErrorMessage("ERRO AO ATUALIZAR ESTADO."); } finally { setActionLoading(false); }
  };

  const handleConfirmCancellation = async () => {
    if (!id || !os || !cancelReason.trim()) return;
    setActionLoading(true);
    setShowCancelModal(false);
    try {
      const session = mockData.getSession();
      const reasonText = cancelReason.trim().toUpperCase();
      
      // 1. Atualizar Estado da OS
      await mockData.updateServiceOrder(id, { status: OSStatus.CANCELADA });
      
      // 2. Registar Nota Interna com o motivo
      await mockData.addOSNote(id, { 
        content: `OS CANCELADA POR ${session?.full_name?.toUpperCase()}. MOTIVO: ${reasonText}` 
      });

      // 3. Registar Atividade
      await mockData.addOSActivity(id, { 
        description: `CANCELOU A ORDEM DE SERVIÇO. MOTIVO: ${reasonText}` 
      });

      setCancelReason('');
      fetchOSDetails(true);
    } catch (e: any) { 
      setErrorMessage("ERRO AO CANCELAR ORDEM DE SERVIÇO."); 
    } finally { 
      setActionLoading(false); 
    }
  };

  const handleSaveData = async () => {
    if (!id || !os) return;
    setActionLoading(true);
    try {
      const changes = [];
      if (description !== (os.description || '')) changes.push("PEDIDO/AVARIA");
      if (anomaly !== (os.anomaly_detected || '')) changes.push("CAUSA DA AVARIA");
      if (resolutionNotes !== (os.resolution_notes || '')) changes.push("RESUMO DA RESOLUÇÃO");
      if (observations !== (os.observations || '')) changes.push("OBSERVAÇÕES");
      const originalDate = os.scheduled_date?.split(/[T ]/)[0] || '';
      const originalTime = os.scheduled_date?.split(/[T ]/)[1]?.substring(0, 5) || '';
      if (scheduledDate !== originalDate || scheduledTime !== originalTime) { changes.push(`AGENDAMENTO (${scheduledDate} ${scheduledTime})`); }
      if (clientSignature !== (os.client_signature || null)) changes.push("ASSINATURA CLIENTE");
      if (technicianSignature !== (os.technician_signature || null)) changes.push("ASSINATURA TÉCNICO");
      if (isWarranty !== !!os.is_warranty) changes.push(isWarranty ? "ATIVOU GARANTIA" : "DESATIVOU GARANTIA");
      const finalScheduled = scheduledDate ? `${scheduledDate}T${scheduledTime || '00:00'}:00` : null;
      await mockData.updateServiceOrder(id, { description, anomaly_detected: anomaly, resolution_notes: resolutionNotes, observations, client_signature: clientSignature, technician_signature: technicianSignature, scheduled_date: finalScheduled as any, is_warranty: isWarranty, warranty_info: warrantyInfo });
      if (changes.length > 0) { await mockData.addOSActivity(id, { description: `ATUALIZOU: ${changes.join(', ')}` }); }
      setShowValidationErrors(false);
      fetchOSDetails(true); 
    } catch (e: any) { setErrorMessage("ERRO AO GUARDAR DADOS."); } finally { setActionLoading(false); }
  };

  const toggleWarranty = () => {
    const newValue = !isWarranty;
    setIsWarranty(newValue);
    if (newValue) {
      const autoCheckedInfo: ServiceOrder['warranty_info'] = { ...warrantyInfo };
      if (os?.equipment) { autoCheckedInfo.has_brand = !!os.equipment.brand; autoCheckedInfo.has_model = !!os.equipment.model; autoCheckedInfo.has_serial = !!os.equipment.serial_number; autoCheckedInfo.has_photo_nameplate = !!os.equipment.nameplate_url; }
      if (anomaly && anomaly.trim().length > 0) { autoCheckedInfo.has_failure_reason = true; }
      setWarrantyInfo(autoCheckedInfo);
    }
  };

  const handleSelectReopenStatus = async (targetStatus: OSStatus) => {
    if (!id || !os) return;
    setActionLoading(true);
    try {
      await mockData.updateServiceOrder(id, { status: targetStatus, anomaly_detected: '', resolution_notes: '', client_signature: null, technician_signature: null });
      await mockData.addOSActivity(id, { description: `REABERTA: ESTADO ${getStatusLabelText(targetStatus).toUpperCase()} (RESETOU DADOS DE FECHO)` });
      setAnomaly(''); setResolutionNotes(''); setClientSignature(null); setTechnicianSignature(null); setShowReopenModal(false); fetchOSDetails(true);
    } catch (e: any) { setErrorMessage("ERRO AO REABRIR OS."); } finally { setActionLoading(false); }
  };

  const generateTechnicalTag = async () => {
    if (!os) return;
    setIsExportingPDF(true);
    try {
      let qrAssetDataUrl = '';
      let qrOSDataUrl = '';
      const baseUrl = window.location.href.split('#')[0];

      // QR Code 1: Ativo / Equipamento (Histórico)
      if (os.equipment_id) {
        const qrAssetUrl = `${baseUrl}#/equipments/${os.equipment_id}`;
        qrAssetDataUrl = await QRCode.toDataURL(qrAssetUrl, { margin: 1, width: 300 });
      }

      // QR Code 2: Ordem de Serviço Direta
      const qrOSUrl = `${baseUrl}#/os/${os.id}`;
      qrOSDataUrl = await QRCode.toDataURL(qrOSUrl, { margin: 1, width: 300 });

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.width;
      const margin = 10;
      
      // Borda da etiqueta
      doc.setLineWidth(1.2); 
      doc.rect(margin, margin, pageWidth - (margin * 2), 175);
      
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(80, 80, 80);
      doc.text("REAL FRIO - IDENTIFICAÇÃO TÉCNICA", pageWidth / 2, margin + 10, { align: "center" });

      // --- SECÇÃO OS (TOPO) ---
      const rightColX = pageWidth - margin - 42; // Coluna direita para QR codes

      // QR 2: ORDEM DE SERVIÇO (Topo Direito)
      if (qrOSDataUrl) {
        doc.addImage(qrOSDataUrl, 'PNG', rightColX, margin + 15, 34, 34);
        doc.setFontSize(6.5); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 100, 200);
        doc.text("SCAN PARA ESTA OS", rightColX + 17, margin + 53, { align: "center" });
      }

      // ID da OS (Esquerda)
      doc.setFontSize(26); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
      doc.text(os.code, margin + 8, margin + 30);
      
      doc.setLineWidth(0.5); doc.setDrawColor(220, 220, 220);
      doc.line(margin + 5, margin + 60, pageWidth - margin - 5, margin + 60);
      
      // --- CLIENTE ---
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
      doc.text("CLIENTE:", margin + 8, margin + 70);
      doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
      const clientName = (os.client?.name || "---").toUpperCase(); 
      const splitClient = doc.splitTextToSize(clientName, pageWidth - (margin * 2) - 50); 
      doc.text(splitClient, margin + 8, margin + 78);
      
      // --- EQUIPAMENTO / ATIVO ---
      const equipY = margin + 105;
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
      doc.text("EQUIPAMENTO / ATIVO:", margin + 8, equipY);
      
      doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
      const equipText = (os.equipment?.type || 'NÃO DEFINIDO').toUpperCase(); 
      doc.text(equipText, margin + 8, equipY + 10);
      
      doc.setFontSize(12); doc.setTextColor(60, 60, 60);
      const brandModel = `${os.equipment?.brand || ''} ${os.equipment?.model ? '- ' + os.equipment.model : ''}`.toUpperCase(); 
      doc.text(brandModel, margin + 8, equipY + 18);
      
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(120, 120, 120);
      doc.text(`S/N: ${os.equipment?.serial_number || '---'}`.toUpperCase(), margin + 8, equipY + 24);

      // QR 1: ATIVO (Próximo à info do Ativo)
      if (qrAssetDataUrl) {
        doc.addImage(qrAssetDataUrl, 'PNG', rightColX, equipY - 5, 34, 34);
        doc.setFontSize(6.5); doc.setFont("helvetica", "bold"); doc.setTextColor(120, 120, 120);
        doc.text("SCAN PARA FICHA DO ATIVO", rightColX + 17, equipY + 33, { align: "center" });
      }
      
      doc.setLineWidth(0.3); doc.setDrawColor(220, 220, 220);
      doc.line(margin + 5, margin + 140, pageWidth - margin - 5, margin + 140);
      
      // --- PEDIDO ORIGINAL (RODAPÉ) ---
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
      doc.text("PEDIDO ORIGINAL:", margin + 8, margin + 148);
      doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
      const pedidoText = (os.description || "NÃO ESPECIFICADO").toUpperCase(); 
      const splitDesc = doc.splitTextToSize(pedidoText, pageWidth - (margin * 2) - 20); 
      doc.text(splitDesc, margin + 8, margin + 156);
      
      doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 180, 180); 
      const dateStr = `EMISSÃO ETIQUETA: ${new Date().toLocaleDateString('pt-PT')} ${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`; 
      doc.text(dateStr, pageWidth - margin - 8, margin + 172, { align: "right" });
      
      const blobUrl = doc.output('bloburl'); 
      setTagPdfUrl(String(blobUrl)); 
      setShowTagPreview(true);
    } catch (err) {
      console.error("Erro ao gerar etiqueta:", err);
      setErrorMessage("ERRO AO GERAR ETIQUETA TÉCNICA.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handlePrintTag = () => { if (tagPdfUrl) { window.open(tagPdfUrl, '_blank'); } };

  const createPDFDocument = async () => {
    if (!os) return null;
    const doc = new jsPDF({ compress: true, orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, pageWidth, 28, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text("REAL FRIO", margin, 12); doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.text("REGISTO DIGITAL DE ASSISTÊNCIA TÉCNICA", margin, 18); doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text(os.code, pageWidth - margin, 12, { align: 'right' }); doc.setFontSize(6); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 180, 180); doc.text(`EMISSÃO: ${new Date().toLocaleString('pt-PT')}`, pageWidth - margin, 18, { align: 'right' });
    let currentY = 32; doc.setDrawColor(241, 245, 249); doc.setFillColor(252, 252, 253); doc.roundedRect(margin, currentY, contentWidth, 22, 1, 1, 'FD'); doc.setTextColor(15, 23, 42); doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.text("DADOS DO CLIENTE", margin + 3, currentY + 5); doc.text("EQUIPAMENTO", margin + (contentWidth / 2) + 3, currentY + 5); doc.setDrawColor(226, 232, 240); doc.line(margin + 3, currentY + 7, margin + (contentWidth / 2) - 3, currentY + 7); doc.line(margin + (contentWidth / 2) + 3, currentY + 7, margin + contentWidth - 3, currentY + 7); doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(71, 85, 105); doc.text(`CLIENTE: ${os.client?.name || '---'}`, margin + 3, currentY + 11); doc.text(`FIRMA: ${os.client?.billing_name || '---'}`, margin + 3, currentY + 14.5, { maxWidth: (contentWidth / 2) - 8 }); doc.text(`LOCAL: ${os.establishment?.name || '---'}`, margin + 3, currentY + 18); doc.text(`TIPO: ${os.equipment?.type || '---'}`, margin + (contentWidth / 2) + 3, currentY + 11); doc.text(`MARCA/MOD: ${os.equipment?.brand || '---'} / ${os.equipment?.model || '---'}`, margin + (contentWidth / 2) + 3, currentY + 14.5); doc.text(`S/N: ${os.equipment?.serial_number || '---'}`, margin + (contentWidth / 2) + 3, currentY + 18);
    currentY += 26; const narrativeFields = [ { label: "DESCRIÇÃO DO PEDIDO / AVARIA:", value: os.description || 'N/A' }, { label: "CAUSA DA AVARIA:", value: os.anomaly_detected || 'N/A' }, { label: "TRABALHO EFETUADO E RESOLUÇÃO:", value: os.resolution_notes || 'N/A' } ];
    narrativeFields.forEach(field => { doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42); doc.text(field.label, margin, currentY); currentY += 3; doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(51, 65, 85); const splitText = doc.splitTextToSize(field.value.toUpperCase(), contentWidth); doc.text(splitText, margin, currentY); currentY += (splitText.length * 4) + 3; if (currentY > 275) { doc.addPage(); currentY = 15; } });
    if (partsUsed.length > 0) { doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42); doc.text("MATERIAL APLICADO:", margin, currentY); currentY += 2; autoTable(doc, { startY: currentY, margin: { left: margin, right: margin }, theme: 'plain', head: [['ARTIGO / DESIGNAÇÃO', 'REFERÊNCIA', 'QTD']], body: partsUsed.map(p => [p.name.toUpperCase(), p.reference.toUpperCase(), `${p.quantity.toLocaleString('pt-PT')} UN`]), headStyles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontSize: 6, fontStyle: 'bold', halign: 'left' }, styles: { fontSize: 7, cellPadding: 1, textColor: [51, 65, 85], lineWidth: 0.05, lineColor: [241, 245, 249] }, columnStyles: { 2: { halign: 'right' } } }); currentY = (doc as any).lastAutoTable.finalY + 8; }
    if (currentY > 250) { doc.addPage(); currentY = 15; } doc.setDrawColor(226, 232, 240); doc.line(margin, currentY, pageWidth - margin, currentY); currentY += 5; doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.text("VALIDAÇÃO E CONFORMIDADE", margin, currentY); currentY += 3; const sigBoxWidth = (contentWidth / 2) - 5; if (clientSignature) { try { doc.addImage(clientSignature, 'JPEG', margin, currentY, 40, 15, undefined, 'FAST'); } catch (e) {} } doc.setDrawColor(203, 213, 225); doc.line(margin, currentY + 16, margin + sigBoxWidth, currentY + 16); doc.setFontSize(5.5); doc.setFont("helvetica", "normal"); doc.setTextColor(148, 163, 184); doc.text("ASSINATURA CLIENTE", margin + (sigBoxWidth / 2), currentY + 20, { align: 'center' }); if (technicianSignature) { try { doc.addImage(technicianSignature, 'JPEG', margin + (contentWidth / 2) + 5, currentY, 40, 15, undefined, 'FAST'); } catch (e) {} } doc.line(margin + (contentWidth / 2) + 5, currentY + 16, margin + contentWidth, currentY + 16); doc.text("ASSINATURA TÉCNICO", margin + (contentWidth / 2) + 5 + (sigBoxWidth / 2), currentY + 20, { align: 'center' }); doc.setFontSize(5); doc.setTextColor(148, 163, 184); doc.text("Documento oficial Real Frio. Emitido via Plataforma Cloud Técnica.", pageWidth / 2, 290, { align: 'center' }); return doc;
  };

  const generatePDFReport = async () => { setIsExportingPDF(true); try { const doc = await createPDFDocument(); if (doc) doc.save(`RELATORIO_${os?.code}.pdf`); } catch (err) { setErrorMessage("ERRO AO GERAR PDF."); } finally { setIsExportingPDF(false); } };

  const handleSendEmailShortcut = async () => { if (!os) return; const clientEmail = os.client?.email?.trim(); if (!clientEmail) alert("CLIENTE SEM EMAIL REGISTADO."); setIsExportingPDF(true); try { const doc = await createPDFDocument(); if (!doc) throw new Error("Falha"); doc.save(`RELATORIO_REALFRIO_${os.code}.pdf`); const interventionDate = new Date(os.created_at).toLocaleDateString('pt-PT'); const subject = `RELATÓRIO TÉCNICO - ${os.code} - ${os.client?.name}`; const body = `Exmos. Srs.\n\nJunto enviamos o relatório técnico relativo à intervenção efetuada em ${interventionDate}.\n\nCódigo OS: ${os.code}\n\nCom os melhores cumprimentos,\nReal Frio, Lda`; window.location.href = `mailto:${clientEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; await mockData.addOSActivity(os.id, { description: `EMAIL ABERTO PARA: ${clientEmail || '(MANUAL)'}` }); } catch (err) { setErrorMessage("ERRO AO PREPARAR ENVIO."); } finally { setIsExportingPDF(false); } };

  const handleUploadPhoto = async (fileOrEvent: React.ChangeEvent<HTMLInputElement> | File, type: 'antes' | 'depois' | 'peca' | 'geral') => {
    let file = fileOrEvent instanceof File ? fileOrEvent : fileOrEvent.target.files?.[0];
    if (!file || !id) return;
    setIsUploadingPhoto(true);
    try {
      const compressedBase64 = await compressImage(file);
      await mockData.addOSPhoto(id, { url: compressedBase64, type });
      await mockData.addOSActivity(id, { description: `ADICIONOU FOTO: ${type.toUpperCase()}` });
      fetchOSDetails(false);
    } catch (err: any) { 
      console.error(err);
      setErrorMessage("ERRO AO COMPRIMIR/CARREGAR FOTO."); 
    } finally { 
      setIsUploadingPhoto(false); 
    }
  };

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragIn = (e: React.DragEvent, type: string) => { e.preventDefault(); e.stopPropagation(); if (os?.status !== OSStatus.CONCLUIDA) setDragActiveType(type); };
  const handleDragOut = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActiveType(null); };
  const handleDrop = (e: React.DragEvent, type: 'antes' | 'depois' | 'peca' | 'geral') => { e.preventDefault(); e.stopPropagation(); setDragActiveType(null); if (os?.status === OSStatus.CONCLUIDA) return; const files = e.dataTransfer.files; if (files?.[0]?.type.startsWith('image/')) handleUploadPhoto(files[0], type); };

  const handleDeletePhoto = async () => { if (!photoToDelete) return; setActionLoading(true); try { await mockData.deleteOSPhoto(photoToDelete.id); await mockData.addOSActivity(id!, { description: `REMOVEU FOTO: ${photoToDelete.type.toUpperCase()}` }); setShowDeletePhotoModal(false); setPhotoToDelete(null); fetchOSDetails(false); } finally { setActionLoading(false); } };

  const handleAddPart = async () => { if (!id || !selectedPartId) return; const part = catalog.find(p => p.id === selectedPartId); if (!part) return; setActionLoading(true); try { const numericQuantity = parseFloat(partQuantityStr.replace(',', '.')); await mockData.addOSPart(id, { part_id: part.id, name: part.name, reference: part.reference, quantity: numericQuantity }); await mockData.addOSActivity(id, { description: `APLICOU MATERIAL: ${numericQuantity.toLocaleString('pt-PT')}x ${part.name}` }); setShowPartModal(false); setSelectedPartId(''); setPartQuantityStr("1"); setPartSearchTerm(''); fetchOSDetails(false); } finally { setActionLoading(false); } };

  const handleCreateAndAddPart = async () => { if (!id || !newPartForm.name) return; setActionLoading(true); try { const ref = newPartForm.reference.trim() || Math.floor(1000000 + Math.random() * 9000000).toString(); const qty = parseFloat(partQuantityStr.replace(',', '.')); const created = await mockData.addCatalogItem({ name: newPartForm.name.toUpperCase(), reference: ref, stock: 0 }); await mockData.addOSPart(id, { part_id: created.id, name: created.name, reference: created.reference, quantity: qty }); await mockData.addOSActivity(id, { description: `CRIOU E APLICOU: ${qty.toLocaleString('pt-PT')}x ${created.name}` }); setShowPartModal(false); setIsCreatingNewPart(false); setNewPartForm({ name: '', reference: '' }); fetchOSDetails(false); mockData.getCatalog().then(setCatalog); } finally { setActionLoading(false); } };

  const handleUpdatePartQuantity = async (partUsedId: string, newQuantityStr: string) => { const numericQuantity = parseFloat(newQuantityStr.replace(',', '.')); if (isNaN(numericQuantity) || numericQuantity < 0 || !id) return; setActionLoading(true); try { const part = partsUsed.find(p => p.id === partUsedId); await mockData.updateOSPart(partUsedId, { quantity: numericQuantity }); await mockData.addOSActivity(id, { description: `AJUSTOU QTD MATERIAL (${part?.name}): PARA ${numericQuantity.toLocaleString('pt-PT')}` }); setShowEditQuantityModal(false); fetchOSDetails(false); } finally { setActionLoading(false); } };

  const handleDeletePart = async () => { if (!partToDelete) return; setActionLoading(true); try { await mockData.removeOSPart(partToDelete.id); await mockData.addOSActivity(id!, { description: `REMOVEU MATERIAL: ${partToDelete.name}` }); setShowDeletePartModal(false); setPartToDelete(null); fetchOSDetails(false); } finally { setActionLoading(false); } };

  const handleGenerateAISummary = async () => { if (!anomaly?.trim()) { setErrorMessage("DESCREVA A CAUSA PRIMEIRO."); return; } setIsGenerating(true); try { const summary = await generateOSReportSummary(description, anomaly, resolutionNotes, partsUsed.map(p => `${p.quantity.toLocaleString('pt-PT')}x ${p.name}`), os?.type || "INTERVENÇÃO"); if (summary) { setResolutionNotes(summary.toUpperCase()); await mockData.addOSActivity(id!, { description: "GEROU RESUMO VIA IA" }); } } catch (e: any) { setErrorMessage("ERRO IA."); } finally { setIsGenerating(false); } };

  const handleDeleteQuote = () => {
    if (!os) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar Orçamento',
      message: 'Esta ação irá remover permanentemente todos os artigos, mão de obra e preços deste orçamento. A OS voltará ao estado "Por Iniciar". Deseja continuar?',
      confirmLabel: 'ELIMINAR ORÇAMENTO',
      variant: 'danger',
      action: async () => {
        setActionLoading(true);
        try {
          // Remover partes
          for (const part of partsUsed) {
            await mockData.removeOSPart(part.id);
          }
          // Reset status
          await mockData.updateServiceOrder(os.id, { status: OSStatus.POR_INICIAR });
          await mockData.addOSActivity(os.id, { description: "ELIMINOU ORÇAMENTO COMPLETO (RESET DE FINANCEIRO)" });
          fetchOSDetails(true);
        } catch (e) {
          setErrorMessage("ERRO AO ELIMINAR ORÇAMENTO.");
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleResetAnomaly = () => setAnomaly('');
  const handleResetResolution = () => setResolutionNotes('');
  const filteredCatalog = useMemo(() => { const term = normalizeString(partSearchTerm); return term ? catalog.filter(p => normalizeString(p.name).includes(term) || normalizeString(p.reference).includes(term)) : catalog; }, [catalog, partSearchTerm]);
  const groupedPhotos = useMemo(() => { const groups: Record<string, OSPhoto[]> = { antes: [], depois: [], peca: [], geral: [] }; photos.forEach(photo => { if (groups[photo.type]) groups[photo.type].push(photo); }); return groups; }, [photos]);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning' | 'info';
    action: () => void;
  }>({
    isOpen: false, title: '', message: '', confirmLabel: '', variant: 'info', action: () => {}
  });

  const closeConfirm = () => setConfirmConfig(prev => ({ ...prev, isOpen: false }));

  const openSourceSelector = (type: 'antes' | 'depois' | 'peca' | 'geral') => {
    if (os?.status === OSStatus.CONCLUIDA) return;
    setPendingUploadType(type);
    setShowSourceModal(true);
  };

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center p-20">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">A CARREGAR OS...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-44 relative px-1 sm:px-0 space-y-4">
      {/* Inputs de ficheiro escondidos para captura seletiva */}
      <input 
        type="file" accept="image/*" capture="environment" 
        className="hidden" ref={cameraInputRef} 
        onChange={(e) => { if(pendingUploadType) handleUploadPhoto(e, pendingUploadType); setShowSourceModal(false); }} 
      />
      <input 
        type="file" accept="image/*" 
        className="hidden" ref={galleryInputRef} 
        onChange={(e) => { if(pendingUploadType) handleUploadPhoto(e, pendingUploadType); setShowSourceModal(false); }} 
      />

      {/* Diálogo de Origem de Upload Centrado */}
      {showSourceModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
              <div className="p-8 text-center">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Escolher Origem</h3>
                    <button onClick={() => setShowSourceModal(false)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><X size={24} /></button>
                 </div>
                 <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-4 p-6 bg-blue-600 text-white rounded-3xl shadow-xl hover:bg-blue-700 transition-all active:scale-95"
                    >
                       <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"><Camera size={28} /></div>
                       <div className="text-left"><p className="font-black text-sm uppercase tracking-tight">Usar Câmara</p><p className="text-[10px] opacity-70 uppercase font-bold">Captura direta do local</p></div>
                    </button>
                    <button 
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex items-center gap-4 p-6 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-3xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                    >
                       <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center"><LucideImage size={28} /></div>
                       <div className="text-left"><p className="font-black text-sm uppercase tracking-tight">Abrir Galeria</p><p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Escolher foto existente</p></div>
                    </button>
                 </div>
                 <button onClick={() => setShowSourceModal(false)} className="mt-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-slate-600">CANCELAR</button>
              </div>
           </div>
        </div>
      )}

      {/* Loader Global para Upload */}
      {isUploadingPhoto && (
        <div className="fixed inset-0 z-[700] bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 border border-white/10">
              <div className="relative">
                 <Loader2 size={48} className="text-blue-600 animate-spin" />
                 <Camera size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400" />
              </div>
              <div className="text-center">
                 <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Otimizando Imagem</p>
                 <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">A comprimir e carregar...</p>
              </div>
           </div>
        </div>
      )}

      <div className={confirmConfig.isOpen ? "block" : "hidden"}>
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className={`w-16 h-16 ${confirmConfig.variant === 'danger' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'} dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner`}>
                {confirmConfig.variant === 'danger' ? <ShieldAlert size={32} /> : <AlertTriangle size={32} />}
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{confirmConfig.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8 uppercase px-4">{confirmConfig.message}</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={closeConfirm} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase rounded-2xl active:scale-95 transition-all">CANCELAR</button>
                <button onClick={() => { closeConfirm(); confirmConfig.action(); }} className={`py-4 ${confirmConfig.variant === 'danger' ? 'bg-red-600' : 'bg-orange-500'} text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all`}>{confirmConfig.confirmLabel}</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FloatingEditBar isVisible={isDirty} isSubmitting={actionLoading} onSave={handleSaveData} onCancel={() => fetchOSDetails(true)} />

      <div className="space-y-2 mb-4">
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-gray-200 dark:border-slate-800 p-3 flex items-center justify-between transition-colors overflow-hidden">
          <div className="flex-shrink-0">
            <button onClick={() => navigate('/os')} className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 rounded-2xl transition-all bg-slate-50 dark:bg-slate-800 border border-transparent hover:border-blue-100">
              <ArrowLeft size={20} />
            </button>
          </div>
          <div className="flex-1 px-3 text-center min-w-0 overflow-hidden">
            <span className="text-[13px] sm:text-[15px] font-black text-blue-600 uppercase tracking-tight sm:tracking-[0.2em] font-mono leading-none whitespace-nowrap block truncate">
              {os?.code}
            </span>
          </div>
          <div className="flex-shrink-0">
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
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'info' && (
          <div className="space-y-3">
            {/* INFORMAÇÃO DE CHECK-IN GPS */}
            {os?.checkin_lat && os?.checkin_lng && (
               <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-2xl p-3 flex items-center justify-between px-6">
                  <div className="flex items-center gap-3">
                     <Navigation size={14} className="text-blue-600" />
                     <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Presença validada no local via GPS</span>
                  </div>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${os.checkin_lat},${os.checkin_lng}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[8px] font-black text-blue-400 underline uppercase hover:text-blue-600 transition-colors"
                  >
                    Ver Mapa
                  </a>
               </div>
            )}

            {/* CARD DE ORÇAMENTO NO TOPO DA FICHA */}
            {quoteTotals.hasValues && (os?.status === OSStatus.PARA_ORCAMENTO || os?.status === OSStatus.ORCAMENTO_ENVIADO) && (
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-blue-100 dark:border-blue-900/40 p-6 animate-in zoom-in-95 duration-500 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                  <Calculator size={80} className="text-blue-600" />
                </div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.3em]">Resumo do Orçamento</h3>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {quoteTotals.total.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                    </p>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Inclui IVA 23%</span>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button 
                      onClick={() => navigate('/quotes/new', { state: { osId: os?.id } })}
                      className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-blue-100 transition-all shadow-sm"
                    >
                      <Edit2 size={12} /> Rever Valores
                    </button>
                  </div>
                </div>
                
                {/* Ações de Estado e Limpeza */}
                <div className="grid grid-cols-12 gap-2">
                  <button 
                    onClick={() => handleUpdateStatus(OSStatus.AGUARDA_PECAS)}
                    className="col-span-5 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    <ThumbsUp size={14} /> Aceite
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(OSStatus.POR_INICIAR)}
                    className="col-span-5 flex items-center justify-center gap-2 py-3 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    <ThumbsDown size={14} /> Rejeitado
                  </button>
                  <button 
                    onClick={handleDeleteQuote}
                    className="col-span-2 flex items-center justify-center py-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition-all border border-slate-100 dark:border-slate-700"
                    title="Eliminar Orçamento"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}

            {os?.equipment && (
              <button 
                onClick={generateTechnicalTag}
                disabled={isExportingPDF}
                className="w-full py-4 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded-[1.8rem] text-[10px] font-black uppercase tracking-[0.25em] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95 animate-in slide-in-from-top-2 duration-500 disabled:opacity-50"
              >
                {isExportingPDF ? <Loader2 className="animate-spin" size={18} /> : <QrCode size={18} />} 
                {isExportingPDF ? 'A PREPARAR ETIQUETA...' : 'IMPRIMIR ETIQUETA TÉCNICA (DUAL QR)'}
              </button>
            )}

            <div className="bg-slate-900 dark:bg-slate-900 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-xl border border-slate-800 transition-all overflow-hidden relative group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Timer size={60} className="text-white" />
               </div>
               
               <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                     <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${os?.timer_is_active ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-slate-600'}`}></div>
                        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Cronómetro</h3>
                     </div>
                     <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 border border-white/10 rounded-full">
                        <Cloud size={10} className="text-blue-400" />
                        <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest hidden sm:inline">Sincronizado</span>
                     </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                     <div className="text-center sm:text-left">
                        <div className="text-3xl sm:text-5xl font-black text-white font-mono tracking-tight leading-none">
                           {formatElapsedTime(elapsedTime)}
                        </div>
                     </div>

                     <div className="flex items-center gap-2 w-full sm:w-auto">
                        {!os?.timer_is_active ? (
                          <button 
                            onClick={handleStartTimer}
                            disabled={os?.status === OSStatus.CONCLUIDA || actionLoading}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-900/40 disabled:opacity-30"
                          >
                             {actionLoading ? <RefreshCw className="animate-spin" size={14} /> : <Play size={14} fill="currentColor" />} INICIAR
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 flex-1 sm:flex-none">
                            <button 
                              onClick={handleResetTimer}
                              disabled={actionLoading}
                              className="p-3 bg-slate-800 text-red-500 border border-slate-700 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-95 group/reset"
                              title="Cancelar e eliminar tempo"
                            >
                              <RotateCcw size={20} className="group-hover/reset:rotate-[-90deg] transition-transform" />
                            </button>
                            <button 
                              onClick={handleStopTimer}
                              disabled={actionLoading}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-blue-900/40 animate-in zoom-in-95 disabled:opacity-50"
                            >
                               {actionLoading ? <RefreshCw className="animate-spin" size={14} /> : <StopIcon size={14} fill="currentColor" />} PARAR
                            </button>
                          </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>

            {os?.status === OSStatus.CONCLUIDA && (
              <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 p-6 rounded-[2rem] shadow-sm animate-in zoom-in-95 duration-300 transition-colors">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-none">
                    <CheckCircle2 size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest leading-none">Intervenção Finalizada</h3>
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500/70 uppercase tracking-tight mt-1.5">A OS está bloqueada para edição</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={handleSendEmailShortcut} className="p-3 bg-white dark:bg-slate-800 text-blue-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:scale-105 transition-all" title="Enviar Relatório">
                       <Mail size={18} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={generatePDFReport} typeof="button" disabled={isExportingPDF} className="flex items-center justify-center gap-3 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-70">
                    {isExportingPDF ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />} 
                    {isExportingPDF ? 'A GERAR PDF...' : 'VER RELATÓRIO PDF'}
                  </button>
                  <button onClick={() => setShowReopenModal(true)} typeof="button" className="flex items-center justify-center gap-3 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all active:scale-95">
                    <RotateCw size={18} /> REABRIR PARA EDIÇÃO
                  </button>
                  <button onClick={handleSendEmailShortcut} typeof="button" disabled={isExportingPDF} className="sm:col-span-2 flex items-center justify-center gap-3 py-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-100 transition-all active:scale-95 disabled:opacity-50">
                    {isExportingPDF ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />} 
                    {isExportingPDF ? 'A PREPARAR...' : `ENVIAR PARA: ${os.client?.email || '(MANUAL)'}`}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm transition-all overflow-hidden">
              <div className="flex items-center gap-3 mb-3">
                 <AlertCircle size={18} className="text-orange-500" />
                 <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none">PEDIDO DO CLIENTE / AVARIA</h3>
              </div>
              <textarea ref={descTextareaRef} className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-4 text-xs text-slate-700 dark:text-slate-300 italic font-medium leading-relaxed outline-none focus:ring-4 focus:ring-blue-500/5 transition-all resize-none overflow-hidden" value={description} onChange={e => setDescription(e.target.value)} readOnly={os?.status === OSStatus.CONCLUIDA} placeholder="..." />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm transition-all overflow-hidden">
               <button onClick={() => setExpandedEquip(!expandedEquip)} className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                 <div className="flex items-center gap-3"><HardDrive size={18} className="text-slate-400" /><div className="text-left"><h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Equipamento Vinculado</h3>{!expandedEquip && os?.equipment && <p className="text-[11px] font-bold text-blue-600 uppercase tracking-tight mt-0.5">{os.equipment.type} - {os.equipment.brand}</p>}</div></div>
                 {expandedEquip ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
               </button>
               {expandedEquip && (
                 <div className="px-6 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    {os?.equipment ? (
                      <>
                        <button 
                          onClick={() => navigate(`/equipments/${os.equipment_id}`)}
                          className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 px-4 py-2.5 rounded-full transition-all hover:bg-blue-100 dark:hover:bg-blue-900/40 w-full"
                        >
                          <HardDrive size={14} />
                          <span className="text-xs font-black uppercase tracking-tight truncate">{os.equipment.type}</span>
                        </button>
                        
                        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 space-y-2.5">
                          <div className="flex items-baseline gap-2">
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest w-12">Marca</span>
                             <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">{os.equipment.brand || '---'}</span>
                          </div>
                          <div className="flex items-baseline gap-2">
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest w-12">Modelo</span>
                             <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">{os.equipment.model || '---'}</span>
                          </div>
                          <div className="flex items-baseline gap-2">
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest w-12">S/N</span>
                             <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase font-mono">{os.equipment.serial_number || '---'}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">Sem equipamento registado</div>
                    )}
                 </div>
               )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm transition-all overflow-hidden">
               <button onClick={() => setExpandedWarranty(!expandedWarranty)} className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                 <div className="flex items-center gap-3">
                   <ShieldCheck size={18} className={isWarranty ? "text-emerald-500" : "text-slate-400"} />
                   <div className="text-left">
                     <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Estado de Garantia</h3>
                     <p className={`text-[11px] font-bold uppercase tracking-tight mt-0.5 ${isWarranty ? "text-emerald-600" : "text-slate-400"}`}>
                       {isWarranty ? "Intervenção em Garantia" : "Serviço Fora de Garantia"}
                     </p>
                   </div>
                 </div>
                 {expandedWarranty ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
               </button>
               {expandedWarranty && (
                 <div className="px-6 pb-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ativar Regime de Garantia</span>
                       <button 
                         onClick={toggleWarranty}
                         disabled={os?.status === OSStatus.CONCLUIDA}
                         className={`w-12 h-6 rounded-full transition-all relative ${isWarranty ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`}
                       >
                         <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isWarranty ? 'left-7' : 'left-1'}`} />
                       </button>
                    </div>

                    {isWarranty && (
                      <div className="space-y-4 pt-2 animate-in zoom-in-95">
                         <div className="grid grid-cols-1 gap-2">
                            {[
                              { id: 'has_brand', label: 'Marca Identificada' },
                              { id: 'has_model', label: 'Modelo Identificado' },
                              { id: 'has_serial', label: 'Nº Série Identificado' },
                              { id: 'has_photo_nameplate', label: 'Foto Chapa Características' },
                              { id: 'has_photo_parts', label: 'Foto Peça Avariada' },
                              { id: 'has_failure_reason', label: 'Causa da Avaria Descrita' },
                            ].map((item) => (
                              <button
                                key={item.id}
                                disabled={os?.status === OSStatus.CONCLUIDA}
                                onClick={() => setWarrantyInfo({...warrantyInfo, [item.id]: !((warrantyInfo as any)[item.id])})}
                                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-emerald-200 transition-all text-left"
                              >
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">{item.label}</span>
                                {(warrantyInfo as any)[item.id] ? (
                                  <CheckSquare className="text-emerald-500" size={16} />
                                ) : (
                                  <Square className="text-slate-200 dark:text-slate-800" size={16} />
                                )}
                              </button>
                            ))}
                         </div>
                      </div>
                    )}
                 </div>
               )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm transition-all overflow-hidden">
               <button onClick={() => setExpandedClient(!expandedClient)} className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                 <div className="flex items-center gap-3"><Building2 size={18} className="text-blue-500" /><div className="text-left"><h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Cliente & Contactos</h3>{!expandedClient && os?.client && <p className="text-[11px] font-bold text-blue-600 uppercase tracking-tight mt-0.5">{os.client.name}</p>}</div></div>
                 {expandedClient ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
               </button>
               {expandedClient && (
                 <div className="px-6 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <button onClick={() => navigate(`/clients/${os?.client_id}`)} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 px-4 py-2.5 rounded-full transition-all hover:bg-blue-100 dark:hover:bg-blue-900/40 w-full"><User size={14} /><span className="text-xs font-black uppercase tracking-tight truncate">{os?.client?.name}</span></button>
                    <a href={getMapLink(os?.client?.address || '')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800 px-4 py-2.5 rounded-full transition-all hover:border-blue-200 dark:hover:border-blue-700 w-full"><MapPin size={14} className="text-slate-400" /><span className="text-[10px] font-black uppercase tracking-tight truncate">{os?.client?.address}</span></a>
                    <a href={`tel:${os?.client?.phone}`} className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 px-4 py-2.5 rounded-full transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/40 w-full"><Phone size={14} /><span className="text-xs font-black uppercase tracking-tight">{os?.client?.phone}</span></a>
                 </div>
               )}
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm transition-all overflow-hidden">
               <button onClick={() => setExpandedPlanning(!expandedPlanning)} className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                 <div className="flex items-center gap-3"><Calendar size={18} className="text-blue-500" /><div className="text-left"><h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Planeamento / Agendamento</h3>{!expandedPlanning && (scheduledDate || scheduledTime) && <p className="text-[11px] font-bold text-blue-600 uppercase tracking-tight mt-0.5">{scheduledDate ? new Date(scheduledDate).toLocaleDateString() : ''} {scheduledTime ? ` às ${scheduledTime}` : ''}</p>}</div></div>
                 {expandedPlanning ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
               </button>
               {expandedPlanning && (
                 <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-4">
                       <div><label className="block text-[8px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">Data</label><input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} disabled={os?.status === OSStatus.CONCLUIDA} className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-4 py-3 text-xs font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" /></div>
                       <div><label className="block text-[8px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">Hora</label><input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} disabled={os?.status === OSStatus.CONCLUIDA} className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-4 py-3 text-xs font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" /></div>
                    </div>
                 </div>
               )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm transition-all overflow-hidden">
               <button onClick={() => setExpandedLog(!expandedLog)} className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"><div className="flex items-center gap-3"><History size={18} className="text-slate-400" /><h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Log de Atividade Detalhado</h3></div>{expandedLog ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}</button>
               {expandedLog && (
                 <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-4 relative ml-2">
                       <div className="absolute left-0 top-2 bottom-2 w-px bg-slate-100 dark:border-slate-800"></div>
                       {activities.length === 0 ? <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic py-4 text-center">Sem registos.</p> : activities.map((act) => (
                           <div key={act.id} className="relative pl-6">
                              <div className="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900 shadow-sm"></div>
                              <div className="flex justify-between items-start"><p className="text-[10px] font-black text-slate-900 dark:text-slate-200 uppercase">{act.user_name}</p><span className="text-[8px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-tighter ml-4">{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight mt-1 leading-relaxed">{act.description}</p>
                           </div>
                        ))}
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}

        {activeTab === 'notas' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm min-h-[400px] flex flex-col transition-colors">
                <div className="flex items-center gap-3 mb-6"><MessageSquare size={18} className="text-blue-500" /><h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Notas Internas</h3></div>
                <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] no-scrollbar mb-6">
                   {notesList.length === 0 ? <div className="h-full flex flex-col items-center justify-center opacity-30 py-20 text-slate-400"><MessageSquare size={32} className="mb-2" /><p className="text-[10px] font-black uppercase tracking-widest">Sem mensagens.</p></div> : notesList.map((note) => (
                       <div key={note.id} className={`flex flex-col ${note.user_id === 'current' || note.user_name === mockData.getSession()?.full_name ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium ${note.user_id === 'current' || note.user_name === mockData.getSession()?.full_name ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none'}`}><p className="leading-relaxed">{note.content}</p></div>
                          <div className="flex items-center gap-2 mt-1.5 px-2 text-[8px] font-black text-slate-400 uppercase"><span>{note.user_name}</span><span className="text-[7px] text-slate-300 dark:text-slate-600">•</span><span>{new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                       </div>
                    ))}
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
                  <div className="flex items-center gap-3"><Package size={18} className="text-slate-400" /><h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Material Aplicado</h3></div>
                  <div className="flex items-center gap-2">
                    {quoteTotals.hasValues && (
                       <button onClick={() => navigate('/quotes/new', { state: { osId: os?.id } })} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-100 transition-all">
                         <Calculator size={14} /> Orçamento
                       </button>
                    )}
                    <button onClick={() => { setShowPartModal(true); setIsCreatingNewPart(false); setPartQuantityStr("1"); }} disabled={os?.status === OSStatus.CONCLUIDA} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 active:scale-95 disabled:opacity-50"><Plus size={14} /> ADICIONAR</button>
                  </div>
               </div>
               <div className="space-y-2">
                  {partsUsed.length === 0 ? <div className="text-center py-10 opacity-20"><Package size={32} className="mx-auto mb-2" /><p className="text-[10px] font-black uppercase tracking-widest">Nenhum material registado</p></div> : partsUsed.map((part) => (
                    <div key={part.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3 transition-all hover:border-blue-100 dark:hover:border-blue-900/30 group">
                       <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-slate-400 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:text-blue-500 group-hover:text-white transition-all"><Package size={14} /></div>
                       <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-900 dark:text-white uppercase leading-tight truncate">{part.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono mt-0.5">REF: {part.reference} • <span className="text-blue-600 dark:text-blue-400 font-black">{part.quantity.toLocaleString('pt-PT', { maximumFractionDigits: 3 })} UN</span> {part.unit_price ? `• ${part.unit_price.toFixed(2)}€/un` : ''}</p>
                       </div>
                       <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700 shadow-sm flex-shrink-0">
                          <button onClick={() => { setPartToEditQuantity(part); setTempQuantityStr(part.quantity.toString().replace('.', ',')); setShowEditQuantityModal(true); }} disabled={os?.status === OSStatus.CONCLUIDA} className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"><Edit2 size={14} /></button>
                          <div className="w-px h-3 bg-slate-100 dark:bg-slate-700"></div>
                          <button onClick={() => { setPartToDelete(part); setShowDeletePartModal(true); }} disabled={os?.status === OSStatus.CONCLUIDA} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
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
                <div className="flex items-center justify-between mb-6"><div className="flex items-center gap-3"><ImageIcon size={18} className="text-slate-400" /><h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Evidências Fotográficas</h3></div></div>
                <div className="grid grid-cols-2 gap-3 mb-8">
                   {['antes', 'depois', 'peca', 'geral'].map((type) => (
                     <div 
                        key={type} 
                        onClick={() => openSourceSelector(type as any)}
                        onDragOver={handleDrag}
                        onDragEnter={(e) => handleDragIn(e, type)}
                        onDragLeave={(e) => handleDragOut}
                        onDrop={(e) => handleDrop(e, type as any)}
                        className={`flex flex-col items-center justify-center py-6 bg-slate-50 dark:bg-slate-950 border-2 border-dashed rounded-3xl cursor-pointer transition-all group relative overflow-hidden ${dragActiveType === type ? 'border-blue-500 bg-blue-50/50 scale-[1.02] ring-4 ring-blue-500/10' : 'border-slate-200 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-200'}`}
                     >
                        {dragActiveType === type && (
                          <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-[2px] flex items-center justify-center z-10 pointer-events-none">
                            <div className="flex flex-col items-center gap-2 animate-bounce">
                              <UploadCloud size={32} className="text-blue-600" />
                              <span className="text-[10px] font-black text-blue-600 uppercase">Solte para Carregar</span>
                            </div>
                          </div>
                        )}
                        <Camera size={24} className={`mb-2 transition-colors ${dragActiveType === type ? 'text-blue-600' : 'text-slate-300 group-hover:text-blue-500'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${dragActiveType === type ? 'text-blue-600' : 'text-slate-400'}`}>{type.toUpperCase()}</span>
                     </div>
                   ))}
                </div>
                <div className="space-y-10">
                   {(Object.entries(groupedPhotos) as [string, OSPhoto[]][]).map(([category, categoryPhotos]) => (
                     categoryPhotos.length > 0 && (
                       <div key={category} className="space-y-4">
                          <div className="flex items-center gap-3 border-b border-slate-50 dark:border-slate-800 pb-2"><h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">{category}</h4><span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] px-2 py-0.5 rounded-full font-black">{categoryPhotos.length}</span></div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                             {categoryPhotos.map(photo => (
                               <div key={photo.id} className="relative aspect-square group animate-in zoom-in-95 duration-200">
                                  <img src={photo.url} onClick={() => setSelectedPhotoForView(photo)} className="w-full h-full object-cover rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 group-hover:ring-4 group-hover:ring-blue-100 cursor-zoom-in transition-all" alt="Evidência" />
                                  <button onClick={(e) => { e.stopPropagation(); setPhotoToDelete(photo); setShowDeletePhotoModal(true); }} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg z-10"><Trash2 size={12} /></button>
                               </div>
                             ))}
                          </div>
                       </div>
                     )
                   ))}
                   {photos.length === 0 && <div className="text-center py-10 opacity-30"><ImageIcon size={32} className="mx-auto mb-2 text-slate-300" /><p className="text-[9px] font-black uppercase tracking-widest">Ainda não foram carregadas fotografias</p></div>}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'finalizar' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className={`p-6 rounded-[2.5rem] shadow-sm border transition-all ${showValidationErrors && !anomaly.trim() ? 'border-red-500 bg-red-50/20 ring-2 ring-red-500/20' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800'}`}>
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-3">
                      <AlertTriangle size={18} className={showValidationErrors && !anomaly.trim() ? "text-red-600" : "text-orange-500"} />
                      <h3 className={`text-[10px] font-black uppercase tracking-widest ${showValidationErrors && !anomaly.trim() ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>Causa da Avaria *</h3>
                   </div>
                   <button type="button" onClick={handleResetAnomaly} disabled={os?.status === OSStatus.CONCLUIDA} className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors p-2" title="Limpar"><RotateCcw size={12} /> <span className="text-[9px] font-black uppercase">LIMPAR</span></button>
                </div>
                <input type="text" placeholder="..." className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-4 text-xs font-black uppercase dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" value={anomaly} onChange={e => setAnomaly(e.target.value)} readOnly={os?.status === OSStatus.CONCLUIDA} />
             </div>
             <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 transition-colors">
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-3 text-blue-500"><Sparkles size={18} /><h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Resumo da Intervenção (IA)</h3></div>
                   <div className="flex items-center gap-2">
                     <button type="button" onClick={handleResetResolution} disabled={os?.status === OSStatus.CONCLUIDA} className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors p-2"><RotateCcw size={12} /> <span className="text-[9px] font-black uppercase">LIMPAR</span></button>
                     <button type="button" onClick={handleGenerateAISummary} disabled={isGenerating || os?.status === OSStatus.CONCLUIDA} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-blue-100 transition-all disabled:opacity-50">{isGenerating ? <RefreshCw size={12} className="animate-spin" /> : <Sparkle size={12} />} GERAR IA</button>
                   </div>
                </div>
                <textarea className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-[2rem] px-6 py-5 text-sm text-slate-800 dark:text-slate-200 leading-relaxed outline-none focus:ring-4 focus:ring-blue-500/10 transition-all min-h-[160px] resize-none" value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} readOnly={os?.status === OSStatus.CONCLUIDA} placeholder="..." />
             </div>
             <div className="space-y-4">
               <div className="flex items-center justify-between px-2"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Validação de Trabalho</h3></div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <SignatureCanvas label="Assinatura Cliente" onSave={setClientSignature} onClear={() => setClientSignature(null)} initialValue={clientSignature} readOnly={os?.status === OSStatus.CONCLUIDA} error={showValidationErrors && !clientSignature} />
                 <SignatureCanvas label="Assinatura Técnico" onSave={setTechnicianSignature} onClear={() => setTechnicianSignature(null)} initialValue={technicianSignature} readOnly={os?.status === OSStatus.CONCLUIDA} error={showValidationErrors && !technicianSignature} />
               </div>
             </div>
             <div className="pt-6"><button onClick={async () => { if (missingFields.length > 0) { setShowValidationErrors(true); setShowValidationErrorModal(true); return; } setShowFinalizeModal(true); }} disabled={os?.status === OSStatus.CONCLUIDA || actionLoading} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-95 disabled:opacity-50">CONCLUIR ORDEM DE SERVIÇO</button></div>
          </div>
        )}
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-[#9d1c24] dark:border-[#9d1c24]/60 shadow-[0_12px_40px_rgba(157,28,36,0.25)] rounded-full p-1.5 flex items-center justify-around transition-all animate-in slide-in-from-bottom-10 duration-500">
        {[ { id: 'info', icon: Info, label: 'INFO' }, { id: 'notas', icon: MessageSquare, label: 'NOTAS' }, { id: 'tecnico', icon: Package, label: 'MATERIAL' }, { id: 'fotos', icon: ImageIcon, label: 'FOTOS' }, { id: 'finalizar', icon: CheckCircle, label: 'FECHO' } ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-full transition-all gap-1 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
            <tab.icon size={18} /><span className="text-[7px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>

      {showValidationErrorModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 transition-colors">
              <div className="p-8 text-center">
                 <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><ShieldAlert size={32}/></div>
                 <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Dados em Falta</h3>
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6 uppercase">Preencha os seguintes campos para concluir:</p>
                 <div className="space-y-2 mb-8">{missingFields.map((field, idx) => (<div key={idx} className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-3 rounded-xl text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">{field}</div>))}</div>
                 <button onClick={() => setShowValidationErrorModal(false)} className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">ENTENDIDO, VOU PREENCHER</button>
              </div>
           </div>
        </div>
      )}

      {showTagPreview && tagPdfUrl && (
        <div className="fixed inset-0 z-[500] bg-slate-950/95 backdrop-blur-md flex flex-col p-4 sm:p-8 animate-in fade-in duration-300">
           <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-white/10">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                 <div className="flex items-center gap-3">
                   <Printer size={20} className="text-blue-600" />
                   <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Etiqueta Técnica Gerada</h3>
                 </div>
                 <button onClick={() => { setShowTagPreview(false); setTagPdfUrl(null); }} className="text-gray-400 hover:text-red-500 p-2 transition-colors"><X size={28}/></button>
              </div>
              <div className="flex-1 relative bg-slate-100 dark:bg-slate-950 p-4 sm:p-8 flex items-center justify-center">
                 <iframe id="tag-preview-iframe" src={tagPdfUrl} className="w-full h-full rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 bg-white" title="PDF Preview" />
              </div>
              <div className="p-8 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                 <button onClick={handlePrintTag} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] text-sm font-black uppercase tracking-[0.25em] shadow-2xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3"><Printer size={24} /> ABRIR PARA IMPRESSÃO</button>
              </div>
           </div>
        </div>
      )}

      {showTimerTypeModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-white/10">
              <div className="p-10 text-center">
                 <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner"><Clock size={40} /></div>
                 <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">Registar Tempo</h3>
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-10 uppercase tracking-widest">Selecione o tipo de intervenção efetuada para contabilização:</p>
                 <div className="grid grid-cols-1 gap-4">
                    <button onClick={() => handleConfirmTimerRegistration('GERAL')} className="group flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-600 hover:text-white rounded-[2rem] transition-all active:scale-95 border border-transparent hover:shadow-xl hover:shadow-blue-600/20">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 text-blue-600 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white"><Wrench size={20} /></div>
                          <span className="text-sm font-black uppercase tracking-tight">Mão de Obra Geral</span>
                       </div>
                       <ChevronRight size={18} className="opacity-30 group-hover:opacity-100" />
                    </button>
                    <button onClick={() => handleConfirmTimerRegistration('FRIO')} className="group flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-600 hover:text-white rounded-[2rem] transition-all active:scale-95 border border-transparent hover:shadow-xl hover:shadow-emerald-600/20">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 text-emerald-600 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white"><Snowflake size={20} /></div>
                          <span className="text-sm font-black uppercase tracking-tight">Mão de Obra Frio</span>
                       </div>
                       <ChevronRight size={18} className="opacity-30 group-hover:opacity-100" />
                    </button>
                 </div>
                 <button onClick={() => setShowTimerTypeModal(false)} className="mt-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-red-500 transition-colors">CANCELAR E MANTER ATIVO</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL ADICIONAR MATERIAL */}
      {showPartModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-white/5">
            <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
               <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Adicionar Material</h3>
               <button onClick={() => setShowPartModal(false)} className="text-gray-400 hover:text-gray-600 p-2"><X size={24}/></button>
            </div>
            <div className="p-8 overflow-y-auto no-scrollbar space-y-6">
              {!isCreatingNewPart ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Pesquisar no catálogo..." className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase" value={partSearchTerm} onChange={(e) => setPartSearchTerm(e.target.value)} />
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                    {filteredCatalog.length === 0 ? ( <div className="text-center py-10 opacity-30"> <p className="text-[10px] font-black uppercase">Nenhum artigo encontrado</p> </div> ) : ( filteredCatalog.map(item => ( <button key={item.id} onClick={() => setSelectedPartId(item.id)} className={`w-full text-left p-4 rounded-2xl border transition-all flex justify-between items-center ${selectedPartId === item.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'}`}> <div className="min-w-0 flex-1"> <p className={`text-xs font-black uppercase truncate ${selectedPartId === item.id ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{item.name}</p> <p className={`text-[9px] font-bold uppercase tracking-widest ${selectedPartId === item.id ? 'text-blue-100' : 'text-slate-400'}`}>REF: {item.reference}</p> </div> {selectedPartId === item.id && <Check size={18} />} </button> )) )}
                  </div>
                  <button onClick={() => setIsCreatingNewPart(true)} className="w-full py-4 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest hover:underline text-center"> + Criar Artigo Fora do Catálogo </button>
                </div>
              ) : (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dados do Novo Artigo</h4>
                  <input type="text" placeholder="Designação do Artigo *" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-black uppercase outline-none dark:text-white" value={newPartForm.name} onChange={(e) => setNewPartForm({...newPartForm, name: e.target.value})} />
                  <input type="text" placeholder="Referência (Opcional)" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-black uppercase outline-none dark:text-white" value={newPartForm.reference} onChange={(e) => setNewPartForm({...newPartForm, reference: e.target.value})} />
                  <button onClick={() => setIsCreatingNewPart(false)} className="w-full py-4 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:underline text-center"> Voltar para Pesquisa no Catálogo </button>
                </div>
              )}
              <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Quantidade a Aplicar</label>
                <div className="flex items-center gap-4">
                   <input type="text" inputMode="decimal" className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-lg font-black dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 text-center" value={partQuantityStr} onChange={(e) => setPartQuantityStr(e.target.value)} />
                   <span className="text-xs font-black text-slate-400 uppercase">UN</span>
                </div>
              </div>
              <button onClick={isCreatingNewPart ? handleCreateAndAddPart : handleAddPart} disabled={actionLoading || (!selectedPartId && !newPartForm.name)} className="w-full bg-blue-600 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50">{actionLoading ? <RefreshCw className="animate-spin mx-auto" /> : 'CONFIRMAR ADIÇÃO'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR QUANTIDADE MATERIAL */}
      {showEditQuantityModal && partToEditQuantity && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/5">
             <div className="p-8 border-b border-gray-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Ajustar Quantidade</h3>
                <button onClick={() => setShowEditQuantityModal(false)} className="text-gray-400 hover:text-red-500 p-2"><X size={24}/></button>
             </div>
             <div className="p-8 space-y-6">
                <div className="text-center">
                   <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{partToEditQuantity.name}</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">REF: {partToEditQuantity.reference}</p>
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 text-center">Nova Quantidade</label>
                   <input autoFocus type="text" inputMode="decimal" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-2xl font-black text-blue-600 dark:text-blue-400 outline-none focus:ring-4 focus:ring-blue-500/10 text-center" value={tempQuantityStr} onChange={(e) => setTempQuantityStr(e.target.value)} />
                </div>
                <button onClick={() => handleUpdatePartQuantity(partToEditQuantity.id, tempQuantityStr)} disabled={actionLoading} className="w-full bg-blue-600 text-white py-5 rounded-3xl text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-95 transition-all">{actionLoading ? <RefreshCw className="animate-spin mx-auto" /> : 'GUARDAR ALTERAÇÃO'}</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO ELIMINAR MATERIAL */}
      {showDeletePartModal && partToDelete && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="p-8 text-center">
                 <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Trash2 size={32}/></div>
                 <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Eliminar Material</h3>
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6 uppercase">Remover "{partToDelete.name}" da lista de material aplicado?</p>
                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setShowDeletePartModal(false)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase rounded-2xl active:scale-95 transition-all">CANCELAR</button>
                    <button onClick={handleDeletePart} className="py-4 bg-red-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">ELIMINAR</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO ELIMINAR FOTO */}
      {showDeletePhotoModal && photoToDelete && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="p-8 text-center">
                 <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Trash2 size={32}/></div>
                 <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Remover Foto</h3>
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6 uppercase">Eliminar esta evidência fotográfica permanentemente?</p>
                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setShowDeletePhotoModal(false)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase rounded-2xl active:scale-95 transition-all">CANCELAR</button>
                    <button onClick={handleDeletePhoto} className="py-4 bg-red-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">ELIMINAR</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO FINALIZAR OS */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="p-8 text-center">
                 <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><CheckCircle2 size={32}/></div>
                 <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Concluir Intervenção</h3>
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6 uppercase">Confirmar o fecho desta Ordem de Serviço? Os dados ficarão bloqueados para edição.</p>
                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setShowFinalizeModal(false)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase rounded-2xl active:scale-95 transition-all">VOLTAR</button>
                    <button onClick={async () => { setShowFinalizeModal(false); await handleUpdateStatus(OSStatus.CONCLUIDA); }} className="py-4 bg-emerald-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">CONCLUIR AGORA</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL CANCELAMENTO OBRIGATÓRIO */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/5">
              <div className="p-8 text-center">
                 <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <CancelIcon size={40}/>
                 </div>
                 <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Motivo do Cancelamento</h3>
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8 uppercase px-4 tracking-widest">
                    Para cancelar esta OS, deve obrigatoriamente indicar o motivo. Este será registado nas notas.
                 </p>
                 
                 <div className="mb-8">
                    <textarea 
                      autoFocus
                      required
                      placeholder="EX: CLIENTE DESISTIU DA REPARAÇÃO..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-4 text-xs font-black uppercase dark:text-white outline-none focus:ring-4 focus:ring-red-500/10 transition-all min-h-[120px] resize-none"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => { setShowCancelModal(false); setCancelReason(''); }} 
                      className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase rounded-2xl active:scale-95 transition-all"
                    >
                      ABORTAR
                    </button>
                    <button 
                      onClick={handleConfirmCancellation}
                      disabled={!cancelReason.trim() || actionLoading}
                      className="py-4 bg-red-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'CONFIRMAR CANCELAMENTO'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL REABRIR OS */}
      {showReopenModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="p-8 text-center">
                 <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><RotateCw size={32}/></div>
                 <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Reabrir OS</h3>
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8 uppercase">Selecione o novo estado para a OS reaberta:</p>
                 <div className="space-y-2">
                    <button onClick={() => handleSelectReopenStatus(OSStatus.INICIADA)} className="w-full py-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all">MARCAR COMO INICIADA</button>
                    <button onClick={() => handleSelectReopenStatus(OSStatus.AGUARDA_PECAS)} className="w-full py-4 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-100 transition-all">AGUARDA PEÇAS</button>
                    <button onClick={() => handleSelectReopenStatus(OSStatus.PARA_ORCAMENTO)} className="w-full py-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-yellow-100 transition-all">PARA ORÇAMENTO</button>
                    <button onClick={() => setShowReopenModal(false)} className="w-full py-4 mt-4 text-slate-400 font-black text-[9px] uppercase tracking-widest">CANCELAR</button>
                 </div>
              </div>
           </div>
        </div>
      )}
      
      {selectedPhotoForView && (
        <div className="fixed inset-0 z-[300] bg-slate-950 flex flex-col animate-in fade-in duration-300">
           <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-6 z-[310] bg-gradient-to-b from-black/80 to-transparent"><span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">{selectedPhotoForView.type}</span><button onClick={() => setSelectedPhotoForView(null)} className="p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all active:scale-90 backdrop-blur-lg"><X size={24} /></button></div>
           <div className="flex-1 w-full h-full"><ZoomableImage src={selectedPhotoForView.url} alt="Evidência" /></div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[400] w-full max-w-xs animate-in slide-in-from-top-10 duration-300 px-4"><div className="bg-red-600 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3"><AlertCircle size={20} className="flex-shrink-0" /><div className="flex-1"><p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Erro de Operação</p><p className="text-[9px] font-bold uppercase">{errorMessage}</p></div><button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X size={16} /></button></div></div>
      )}
    </div>
  );
};

export default ServiceOrderDetail;
