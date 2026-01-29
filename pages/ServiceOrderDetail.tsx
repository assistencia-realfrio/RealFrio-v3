
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
  Settings2, FileDown, Key, Mail, Share2, UploadCloud
} from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import SignatureCanvas from '../components/SignatureCanvas';
import OSStatusBadge from '../components/OSStatusBadge';
import { OSStatus, ServiceOrder, PartUsed, PartCatalogItem, OSPhoto, OSNote, OSActivity } from '../types';
import { generateOSReportSummary } from '../services/geminiService';
import { mockData } from '../services/mockData';
import { normalizeString } from '../utils';
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
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'finalizar' || tabParam === 'info' || tabParam === 'notas' || tabParam === 'tecnico' || tabParam === 'fotos') {
      return tabParam as TabType;
    }
    return 'info';
  });
  const [os, setOs] = useState<ServiceOrder | null>(null);
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
  
  // Drag and Drop state
  const [dragActiveType, setDragActiveType] = useState<string | null>(null);
  
  // Estados para Garantia
  const [isWarranty, setIsWarranty] = useState(false);
  const [warrantyInfo, setWarrantyInfo] = useState<ServiceOrder['warranty_info']>({});
  
  // Modais
  const [showDeletePartModal, setShowDeletePartModal] = useState(false);
  const [showDeletePhotoModal, setShowDeletePhotoModal] = useState(false);
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [showEditQuantityModal, setShowEditQuantityModal] = useState(false);
  
  const [partToDelete, setPartToDelete] = useState<PartUsed | null>(null);
  const [partToEditQuantity, setPartToEditQuantity] = useState<PartUsed | null>(null);
  
  // Estados para Quantidade com suporte Decimal
  const [partQuantityStr, setPartQuantityStr] = useState<string>("1");
  const [tempQuantityStr, setTempQuantityStr] = useState<string>("1");

  const [photoToDelete, setPhotoToDelete] = useState<OSPhoto | null>(null);
  const [selectedPhotoForView, setSelectedPhotoForView] = useState<OSPhoto | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados para Adição de Peças
  const [partSearchTerm, setPartSearchTerm] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [isCreatingNewPart, setIsCreatingNewPart] = useState(false);
  const [newPartForm, setNewPartForm] = useState({ name: '', reference: '' });

  // Estados para cartões colapsáveis
  const [expandedClient, setExpandedClient] = useState(false);
  const [expandedEquip, setExpandedEquip] = useState(false);
  const [expandedWarranty, setExpandedWarranty] = useState(false);
  const [expandedPlanning, setExpandedPlanning] = useState(false);
  const [expandedLog, setExpandedLog] = useState(false);

  const descTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchOSDetails();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'info' && descTextareaRef.current) {
      descTextareaRef.current.style.height = 'auto';
      descTextareaRef.current.style.height = `${descTextareaRef.current.scrollHeight}px`;
    }
  }, [description, activeTab, loading]);

  // Carregar catálogo ao abrir modal de material
  useEffect(() => {
    if (showPartModal && catalog.length === 0) {
      mockData.getCatalog().then(setCatalog).catch(() => setErrorMessage("ERRO AO CARREGAR CATÁLOGO."));
    }
  }, [showPartModal]);

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
      currentTechSig !== originalTechSig ||
      isWarranty !== (!!os.is_warranty) ||
      JSON.stringify(warrantyInfo || {}) !== JSON.stringify(os.warranty_info || {})
    );
  }, [os, description, anomaly, resolutionNotes, observations, scheduledDate, scheduledTime, clientSignature, technicianSignature, isWarranty, warrantyInfo]);

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
        setIsWarranty(!!osData.is_warranty);
        setWarrantyInfo(osData.warranty_info || {});
        
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
      
      if (newStatus === OSStatus.CONCLUIDA) {
        setActiveTab('info');
        fetchOSDetails(false);
      } else {
        fetchOSDetails(false);
      }
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
      const finalScheduled = scheduledDate 
        ? `${scheduledDate}T${scheduledTime || '00:00'}:00` 
        : null;

      await mockData.updateServiceOrder(id, {
        description: description,
        anomaly_detected: anomaly,
        resolution_notes: resolutionNotes,
        observations: observations,
        client_signature: clientSignature,
        technician_signature: technicianSignature,
        scheduled_date: finalScheduled as any,
        is_warranty: isWarranty,
        warranty_info: warrantyInfo
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

  const toggleWarranty = () => {
    const newValue = !isWarranty;
    setIsWarranty(newValue);
    if (newValue) {
      const autoCheckedInfo: ServiceOrder['warranty_info'] = { ...warrantyInfo };
      if (os?.equipment) {
        autoCheckedInfo.has_brand = !!os.equipment.brand;
        autoCheckedInfo.has_model = !!os.equipment.model;
        autoCheckedInfo.has_serial = !!os.equipment.serial_number;
        autoCheckedInfo.has_photo_nameplate = !!os.equipment.nameplate_url;
      }
      if (anomaly && anomaly.trim().length > 0) {
        autoCheckedInfo.has_failure_reason = true;
      }
      setWarrantyInfo(autoCheckedInfo);
    }
  };

  const handleSelectReopenStatus = async (targetStatus: OSStatus) => {
    if (!id || !os) return;
    setActionLoading(true);
    try {
      const updates: Partial<ServiceOrder> = { 
        status: targetStatus,
        anomaly_detected: '',
        resolution_notes: '',
        client_signature: null,
        technician_signature: null
      };

      await mockData.updateServiceOrder(id, updates);
      await mockData.addOSActivity(id, {
        description: `OS REABERTA COM ESTADO: ${getStatusLabelText(targetStatus).toUpperCase()} (DADOS DE FECHO RESETADOS)`
      });

      setAnomaly('');
      setResolutionNotes('');
      setClientSignature(null);
      setTechnicianSignature(null);
      
      setShowReopenModal(false);
      fetchOSDetails(false);
    } catch (e: any) {
      setErrorMessage("ERRO AO REABRIR OS.");
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Geração de PDF Ultra-Compacto (Mínimo espaço vazio e ficheiro leve)
   */
  const createPDFDocument = async () => {
    if (!os) return null;
    
    const doc = new jsPDF({ 
      compress: true,
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.width;
    const margin = 10; // Reduzido para o mínimo aceitável
    const contentWidth = pageWidth - (margin * 2);
    
    // 1. HEADER COMPACTO
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, pageWidth, 28, 'F'); 
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("REAL FRIO", margin, 12);
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("REGISTO DIGITAL DE ASSISTÊNCIA TÉCNICA", margin, 18);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(os.code, pageWidth - margin, 12, { align: 'right' });
    
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 180, 180);
    doc.text(`EMISSÃO: ${new Date().toLocaleString('pt-PT')}`, pageWidth - margin, 18, { align: 'right' });

    let currentY = 32;

    // 2. BLOCO DE DADOS CLIENTE/EQUIPAMENTO
    doc.setDrawColor(241, 245, 249);
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(margin, currentY, contentWidth, 22, 1, 1, 'FD'); 
    
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO CLIENTE", margin + 3, currentY + 5);
    doc.text("EQUIPAMENTO", margin + (contentWidth / 2) + 3, currentY + 5);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(margin + 3, currentY + 7, margin + (contentWidth / 2) - 3, currentY + 7);
    doc.line(margin + (contentWidth / 2) + 3, currentY + 7, margin + contentWidth - 3, currentY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    
    // Coluna Cliente
    doc.text(`CLIENTE: ${os.client?.name || '---'}`, margin + 3, currentY + 11);
    doc.text(`FIRMA: ${os.client?.billing_name || '---'}`, margin + 3, currentY + 14.5, { maxWidth: (contentWidth / 2) - 8 });
    doc.text(`LOCAL: ${os.establishment?.name || '---'}`, margin + 3, currentY + 18);
    
    // Coluna Equipamento
    doc.text(`TIPO: ${os.equipment?.type || '---'}`, margin + (contentWidth / 2) + 3, currentY + 11);
    doc.text(`MARCA/MOD: ${os.equipment?.brand || '---'} / ${os.equipment?.model || '---'}`, margin + (contentWidth / 2) + 3, currentY + 14.5);
    doc.text(`S/N: ${os.equipment?.serial_number || '---'}`, margin + (contentWidth / 2) + 3, currentY + 18);

    currentY += 26;

    // 3. SECÇÕES DE TEXTO
    const narrativeFields = [
      { label: "DESCRIÇÃO DO PEDIDO / AVARIA:", value: os.description || 'N/A' },
      { label: "ANOMALIA DETETADA NO LOCAL:", value: os.anomaly_detected || 'N/A' },
      { label: "TRABALHO EFETUADO E RESOLUÇÃO:", value: os.resolution_notes || 'N/A' }
    ];

    narrativeFields.forEach(field => {
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(field.label, margin, currentY);
      
      currentY += 3;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5); 
      doc.setTextColor(51, 65, 85);
      
      const splitText = doc.splitTextToSize(field.value.toUpperCase(), contentWidth);
      doc.text(splitText, margin, currentY);
      
      currentY += (splitText.length * 4) + 3; // Menor espaço entre blocos

      if (currentY > 275) { doc.addPage(); currentY = 15; }
    });

    // 4. MATERIAL
    if (partsUsed.length > 0) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("MATERIAL APLICADO:", margin, currentY);
      currentY += 2;

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        theme: 'plain',
        head: [['ARTIGO / DESIGNAÇÃO', 'REFERÊNCIA', 'QTD']],
        body: partsUsed.map(p => [p.name.toUpperCase(), p.reference.toUpperCase(), `${p.quantity.toLocaleString('pt-PT')} UN`]),
        headStyles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontSize: 6, fontStyle: 'bold', halign: 'left' },
        styles: { fontSize: 7, cellPadding: 1, textColor: [51, 65, 85], lineWidth: 0.05, lineColor: [241, 245, 249] },
        columnStyles: { 2: { halign: 'right' } }
      });
      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    // 5. ASSINATURAS
    if (currentY > 250) { doc.addPage(); currentY = 15; }

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 5;
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("VALIDAÇÃO E CONFORMIDADE", margin, currentY);
    currentY += 3;

    const sigBoxWidth = (contentWidth / 2) - 5;
    
    // Assinatura Cliente
    if (clientSignature) { 
      try { 
        doc.addImage(clientSignature, 'JPEG', margin, currentY, 40, 15, undefined, 'FAST'); 
      } catch (e) {} 
    }
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, currentY + 16, margin + sigBoxWidth, currentY + 16);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("ASSINATURA CLIENTE", margin + (sigBoxWidth / 2), currentY + 20, { align: 'center' });

    // Assinatura Técnico
    if (technicianSignature) { 
      try { 
        doc.addImage(technicianSignature, 'JPEG', margin + (contentWidth / 2) + 5, currentY, 40, 15, undefined, 'FAST'); 
      } catch (e) {} 
    }
    doc.line(margin + (contentWidth / 2) + 5, currentY + 16, margin + contentWidth, currentY + 16);
    doc.text("ASSINATURA TÉCNICO", margin + (contentWidth / 2) + 5 + (sigBoxWidth / 2), currentY + 20, { align: 'center' });

    doc.setFontSize(5);
    doc.setTextColor(148, 163, 184);
    doc.text("Documento oficial Real Frio. Emitido via Plataforma Cloud Técnica.", pageWidth / 2, 290, { align: 'center' });
    
    return doc;
  };

  const generatePDFReport = async () => {
    setIsExportingPDF(true);
    try {
      const doc = await createPDFDocument();
      if (doc) doc.save(`RELATORIO_${os?.code}.pdf`);
    } catch (err) {
      setErrorMessage("ERRO AO GERAR PDF.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  /**
   * Envio de email com texto padrão e destinatário automático via MAILTO:
   */
  const handleSendEmailShortcut = async () => {
    if (!os) return;
    
    const clientEmail = os.client?.email?.trim();
    if (!clientEmail) {
      alert("ATENÇÃO: Este cliente não tem um email registado. Por favor, adicione o destinatário manualmente no seu gestor de email.");
    }

    setIsExportingPDF(true);
    try {
      // 1. Descarrega o ficheiro primeiro (para estar disponível no dispositivo)
      const doc = await createPDFDocument();
      if (!doc) throw new Error("Falha ao gerar documento");
      
      const filename = `RELATORIO_REALFRIO_${os.code}.pdf`;
      doc.save(filename);

      // 2. Prepara dados para o link mailto
      const interventionDate = new Date(os.created_at).toLocaleDateString('pt-PT');
      const equipmentInfo = os.equipment ? `${os.equipment.type} - ${os.equipment.brand}` : '---';
      
      const subject = `RELATÓRIO TÉCNICO - ${os.code} - ${os.client?.name}`;
      
      // Texto padrão solicitado
      const body = `Exmos. Srs.\n\n` +
                   `Junto enviamos o relatório técnico relativo à intervenção efetuada em ${interventionDate}.\n\n` +
                   `Código OS: ${os.code}\n` +
                   `Equipamento: ${equipmentInfo}\n\n` +
                   `Com os melhores cumprimentos,\n` +
                   `Real Frio, Lda`;

      // 3. Abre o gestor de email com destinatário, assunto e corpo preenchidos
      const mailtoLink = `mailto:${clientEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      window.location.href = mailtoLink;
      
      await mockData.addOSActivity(os.id, { description: `EMAIL ABERTO PARA: ${clientEmail || '(MANUAL)'}` });
      
    } catch (err) {
      console.error(err);
      setErrorMessage("ERRO AO PREPARAR ENVIO.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleUploadPhoto = async (fileOrEvent: React.ChangeEvent<HTMLInputElement> | File, type: 'antes' | 'depois' | 'peca' | 'geral') => {
    let file: File | undefined;
    if (fileOrEvent instanceof File) {
      file = fileOrEvent;
    } else {
      file = fileOrEvent.target.files?.[0];
    }
    
    if (!file || !id) return;
    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        await mockData.addOSPhoto(id, { url: base64, type: type });
        await mockData.addOSActivity(id, { description: `ADICIONOU FOTO (${type.toUpperCase()})` });
        fetchOSDetails(false);
      } catch (err: any) {
        setErrorMessage("ERRO AO CARREGAR FOTO.");
      } finally {
        setIsUploadingPhoto(false);
        // Reset input value to allow uploading same file again
        if (!(fileOrEvent instanceof File) && fileOrEvent.target) {
          fileOrEvent.target.value = '';
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (os?.status !== OSStatus.CONCLUIDA) {
      setDragActiveType(type);
    }
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveType(null);
  };

  const handleDrop = (e: React.DragEvent, type: 'antes' | 'depois' | 'peca' | 'geral') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveType(null);
    if (os?.status === OSStatus.CONCLUIDA) return;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleUploadPhoto(file, type);
      }
    }
  };

  const handleDeletePhoto = async () => {
    if (!photoToDelete) return;
    setActionLoading(true);
    try {
      await mockData.deleteOSPhoto(photoToDelete.id);
      await mockData.addOSActivity(id!, { description: `REMOVEU FOTO (${photoToDelete.type.toUpperCase()})` });
      setShowDeletePhotoModal(false);
      setPhotoToDelete(null);
      fetchOSDetails(false);
    } catch (e: any) {
      setErrorMessage("ERRO AO REMOVER FOTO.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddPart = async () => {
    if (!id || !selectedPartId) return;
    const part = catalog.find(p => p.id === selectedPartId);
    if (!part) return;
    setActionLoading(true);
    try {
      const numericQuantity = parseFloat(partQuantityStr.replace(',', '.'));
      if (isNaN(numericQuantity)) throw new Error("Quantidade inválida.");
      await mockData.addOSPart(id, { part_id: part.id, name: part.name, reference: part.reference, quantity: numericQuantity });
      await mockData.addOSActivity(id, { description: `APLICOU MATERIAL: ${numericQuantity.toLocaleString('pt-PT')}x ${part.name}` });
      setShowPartModal(false);
      setSelectedPartId('');
      setPartQuantityStr("1");
      setPartSearchTerm('');
      fetchOSDetails(false);
    } catch (e: any) {
      setErrorMessage("ERRO AO ADICIONAR MATERIAL.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAndAddPart = async () => {
    if (!id || !newPartForm.name) return;
    setActionLoading(true);
    try {
      const finalReference = newPartForm.reference.trim() 
        ? newPartForm.reference.replace(/\D/g, '') 
        : Math.floor(1000000 + Math.random() * 9000000).toString();
      const numericQuantity = parseFloat(partQuantityStr.replace(',', '.'));
      if (isNaN(numericQuantity)) throw new Error("Quantidade inválida.");
      const createdPart = await mockData.addCatalogItem({ name: newPartForm.name.toUpperCase(), reference: finalReference, stock: 0 });
      await mockData.addOSPart(id, { part_id: createdPart.id, name: createdPart.name, reference: createdPart.reference, quantity: numericQuantity });
      await mockData.addOSActivity(id, { description: `REGISTOU E APLICOU NOVO MATERIAL: ${numericQuantity.toLocaleString('pt-PT')}x ${createdPart.name}` });
      setShowPartModal(false);
      setIsCreatingNewPart(false);
      setNewPartForm({ name: '', reference: '' });
      setSelectedPartId('');
      setPartQuantityStr("1");
      setPartSearchTerm('');
      fetchOSDetails(false);
      const newCatalog = await mockData.getCatalog();
      setCatalog(newCatalog);
    } catch (e: any) {
      setErrorMessage("ERRO AO CRIAR MATERIAL.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePartQuantity = async (partUsedId: string, newQuantityStr: string) => {
    const numericQuantity = parseFloat(newQuantityStr.replace(',', '.'));
    if (isNaN(numericQuantity) || numericQuantity < 0 || !id) return;
    setActionLoading(true);
    try {
      await mockData.updateOSPart(partUsedId, { quantity: numericQuantity });
      fetchOSDetails(false);
    } catch (e: any) {
      setErrorMessage("ERRO AO ATUALIZAR QUANTIDADE.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePart = async () => {
    if (!partToDelete) return;
    setActionLoading(true);
    try {
      await mockData.removeOSPart(partToDelete.id);
      await mockData.addOSActivity(id!, { description: `REMOVEU MATERIAL: ${partToDelete.name}` });
      setShowDeletePartModal(false);
      setPartToDelete(null);
      fetchOSDetails(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateAISummary = async () => {
    if (!anomaly || !anomaly.trim()) {
      setErrorMessage("DESCREVA A ANOMALIA PRIMEIRO.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const summary = await generateOSReportSummary(description, anomaly, resolutionNotes, partsUsed.map(p => `${p.quantity.toLocaleString('pt-PT')}x ${p.name}`), os?.type || "INTERVENÇÃO TÉCNICA");
      if (summary) {
        setResolutionNotes(summary.toUpperCase());
        await mockData.addOSActivity(id!, { description: "GEROU RESUMO TÉCNICO VIA IA (PT-PT)" });
      }
    } catch (e: any) {
      setErrorMessage(e.message || "ERRO AO COMUNICAR COM A IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetAnomaly = () => setAnomaly('');
  const handleResetResolution = () => setResolutionNotes('');

  const filteredCatalog = useMemo(() => {
    const term = normalizeString(partSearchTerm);
    if (!term) return catalog;
    return catalog.filter(p => normalizeString(p.name).includes(term) || normalizeString(p.reference).includes(term));
  }, [catalog, partSearchTerm]);

  const groupedPhotos = useMemo(() => {
    const groups: Record<string, OSPhoto[]> = { antes: [], depois: [], peca: [], geral: [] };
    photos.forEach(photo => { if (groups[photo.type]) groups[photo.type].push(photo); });
    return groups;
  }, [photos]);

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center p-20">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">A CARREGAR OS...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-44 relative px-1 sm:px-0 space-y-4">
      <FloatingEditBar isVisible={isDirty} isSubmitting={actionLoading} onSave={handleSaveData} onCancel={fetchOSDetails} />

      <div className="space-y-2 mb-4">
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-gray-200 dark:border-slate-800 p-3 flex items-center justify-between transition-colors overflow-hidden">
          <div className="flex-shrink-0">
            <button onClick={() => navigate('/os')} className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 rounded-2xl transition-all bg-slate-50 dark:bg-slate-800 border border-transparent hover:border-blue-100">
              <ArrowLeft size={20} />
            </button>
          </div>
          <div className="flex-1 px-3 text-center min-w-0 overflow-hidden">
            <span className="text-[11px] sm:text-[13px] font-black text-blue-600 uppercase tracking-tight sm:tracking-[0.2em] font-mono leading-none whitespace-nowrap block truncate">
              {os?.code}
            </span>
            <div className="flex items-center justify-center gap-2 mt-1">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{os?.store}</span>
               <span className="text-[8px] text-slate-300">•</span>
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  {os?.created_at ? new Date(os.created_at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '---'}
               </span>
            </div>
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
                 <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                    {os?.equipment ? <button onClick={() => navigate(`/equipments/${os.equipment_id}`)} className="w-full text-left p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 transition-all group"><p className="text-sm font-black text-slate-900 dark:text-white uppercase group-hover:text-blue-600 transition-colors">{os.equipment.type} - {os.equipment.brand}</p><p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-1">S/N: {os.equipment.serial_number}</p><p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-2">Ver Ficha Técnica Integral ➜</p></button> : <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">Sem equipamento registado</div>}
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

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm transition-all overflow-hidden">
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
            
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm transition-all overflow-hidden">
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

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm transition-all overflow-hidden">
               <button onClick={() => setExpandedLog(!expandedLog)} className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"><div className="flex items-center gap-3"><History size={18} className="text-slate-400" /><h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Log de Atividade</h3></div>{expandedLog ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}</button>
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
                       <div key={note.id} className={`flex flex-col ${note.user_id === 'current' ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium ${note.user_id === 'current' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none'}`}><p className="leading-relaxed">{note.content}</p></div>
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
                  <button onClick={() => { setShowPartModal(true); setIsCreatingNewPart(false); setPartQuantityStr("1"); }} disabled={os?.status === OSStatus.CONCLUIDA} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 active:scale-95 disabled:opacity-50"><Plus size={14} /> ADICIONAR</button>
               </div>
               <div className="space-y-2">
                  {partsUsed.length === 0 ? <div className="text-center py-10 opacity-20"><Package size={32} className="mx-auto mb-2" /><p className="text-[10px] font-black uppercase tracking-widest">Nenhum material registado</p></div> : partsUsed.map((part) => (
                    <div key={part.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3 transition-all hover:border-blue-100 dark:hover:border-blue-900/30 group">
                       <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-600 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:text-blue-500 group-hover:bg-blue-50 transition-all"><Package size={14} /></div>
                       <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase leading-tight truncate">{part.name}</p>
                          <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono mt-0.5">REF: {part.reference} • <span className="text-blue-600 dark:text-blue-400 font-black">{part.quantity.toLocaleString('pt-PT', { maximumFractionDigits: 3 })} UN</span></p>
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
                     <label 
                        key={type} 
                        onDragOver={handleDrag}
                        onDragEnter={(e) => handleDragIn(e, type)}
                        onDragLeave={handleDragOut}
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
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadPhoto(e, type as any)} disabled={os?.status === OSStatus.CONCLUIDA} />
                     </label>
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
                      <h3 className={`text-[10px] font-black uppercase tracking-widest ${showValidationErrors && !anomaly.trim() ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>Anomalia Detetada *</h3>
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
                <textarea className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-[2rem] px-6 py-5 text-sm text-slate-800 dark:text-slate-200 leading-relaxed outline-none focus:ring-4 focus:ring-blue-500/10 transition-all min-h-[160px] resize-none" value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} readOnly={os?.status === OSStatus.CONCLUIDA} placeholder="..." />
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

      {/* MENU FLUTUANTE INFERIOR */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-[#9d1c24] dark:border-[#9d1c24]/60 shadow-[0_12px_40px_rgba(157,28,36,0.25)] rounded-full p-1.5 flex items-center justify-around transition-all animate-in slide-in-from-bottom-10 duration-500">
        {[
          { id: 'info', icon: Info, label: 'INFO' },
          { id: 'notas', icon: MessageSquare, label: 'NOTAS' },
          { id: 'tecnico', icon: Package, label: 'MATERIAL' },
          { id: 'fotos', icon: ImageIcon, label: 'FOTOS' },
          { id: 'finalizar', icon: CheckCircle, label: 'FECHO' }
        ].map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as TabType)} 
            className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-full transition-all gap-1 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
          >
            <tab.icon size={18} />
            <span className="text-[7px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* MODAL ERRO DE VALIDAÇÃO */}
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

      {/* MODAL REABRIR OS */}
      {showReopenModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 transition-colors">
              <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                 <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Reabrir Intervenção</h3>
                 <button onClick={() => setShowReopenModal(false)} className="text-gray-400 hover:text-gray-600 p-2"><X size={24}/></button>
              </div>
              <div className="p-8 space-y-4">
                 <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-800/50 mb-2"><p className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest leading-relaxed">Atenção: Os dados de fecho (anomalia, notas e assinaturas) serão resetados.</p></div>
                 <div className="grid grid-cols-1 gap-2.5">
                   {[OSStatus.POR_INICIAR, OSStatus.INICIADA, OSStatus.PARA_ORCAMENTO, OSStatus.ORCAMENTO_ENVIADO, OSStatus.AGUARDA_PECAS, OSStatus.PECAS_RECEBIDAS].map((status) => (
                     <button key={status} onClick={() => handleSelectReopenStatus(status)} disabled={actionLoading} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-left hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all flex items-center justify-between"><span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">{getStatusLabelText(status)}</span><ChevronRight size={16} className="text-slate-200" /></button>
                   ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL MATERIAL */}
      {showPartModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 transition-colors">
              <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50"><h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{isCreatingNewPart ? 'Novo Artigo' : 'Aplicar Material'}</h3><button onClick={() => { setShowPartModal(false); setIsCreatingNewPart(false); }} className="text-gray-400 hover:text-gray-600 p-2"><X size={24}/></button></div>
              <div className="p-8 space-y-6">
                {!isCreatingNewPart ? (
                  <>
                    <div className="relative"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" /><input type="text" placeholder="Pesquisar catálogo..." value={partSearchTerm} onChange={e => setPartSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold dark:text-white focus:ring-4 focus:ring-blue-500/10 transition-all" /></div>
                    <div className="max-h-60 overflow-y-auto no-scrollbar space-y-2">
                       {filteredCatalog.length === 0 ? (<div className="text-center py-6 space-y-4"><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Nenhum artigo encontrado.</p><button onClick={() => { setIsCreatingNewPart(true); setNewPartForm({ name: partSearchTerm, reference: '' }); }} className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all"><Plus size={10} /> CRIAR NOVO ARTIGO</button></div>) : filteredCatalog.map(p => (<button key={p.id} onClick={() => { setSelectedPartId(p.id); setPartQuantityStr("1"); }} className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${selectedPartId === p.id ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800'}`}><div className="min-w-0 pr-4"><p className={`text-sm font-black uppercase truncate ${selectedPartId === p.id ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}>{p.name}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">REF: {p.reference}</p></div>{selectedPartId === p.id && <CheckCircle2 size={18} className="text-blue-600 flex-shrink-0" />}</button>))}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Designação *</label><input type="text" value={newPartForm.name} onChange={e => setNewPartForm({...newPartForm, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-black uppercase dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="EX: FILTRO DESIDRATADOR" /></div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Referência</label><div className="relative"><Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} /><input type="text" value={newPartForm.reference} onChange={e => setNewPartForm({...newPartForm, reference: e.target.value})} className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-mono font-black uppercase dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="EX: 102030" /></div></div>
                  </div>
                )}
                {(selectedPartId || isCreatingNewPart) && (<div className="pt-4 flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl animate-in slide-in-from-top-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">QTD:</span><div className="flex items-center gap-4"><button onClick={() => { const currentVal = parseFloat(partQuantityStr.replace(',', '.')); const newVal = Math.max(0.1, Number((currentVal - 1).toFixed(3))); setPartQuantityStr(newVal.toString().replace('.', ',')); }} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm active:scale-90 transition-all"><Minus size={18} /></button><input type="text" inputMode="decimal" value={partQuantityStr} onChange={e => { const val = e.target.value.replace(',', '.'); if (/^\d*[.]?\d*$/.test(val) || val === '') setPartQuantityStr(e.target.value); }} className="w-16 bg-transparent text-lg font-black text-slate-900 dark:text-white text-center outline-none border-b-2 border-transparent focus:border-blue-500 transition-all" /><button onClick={() => { const currentVal = parseFloat(partQuantityStr.replace(',', '.')) || 0; const newVal = Number((currentVal + 1).toFixed(3)); setPartQuantityStr(newVal.toString().replace('.', ',')); }} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm active:scale-90 transition-all"><Plus size={18} /></button></div></div>)}
                <button onClick={isCreatingNewPart ? handleCreateAndAddPart : handleAddPart} disabled={(isCreatingNewPart ? !newPartForm.name : !selectedPartId) || actionLoading} className="w-full bg-blue-600 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50">{actionLoading ? <Loader2 size={20} className="animate-spin mx-auto" /> : isCreatingNewPart ? 'REGISTAR E APLICAR' : 'CONFIRMAR APLICAÇÃO'}</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL AJUSTAR QUANTIDADE */}
      {showEditQuantityModal && partToEditQuantity && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 transition-colors">
              <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50"><h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Ajustar Quantidade</h3><button onClick={() => setShowEditQuantityModal(false)} className="text-gray-400 hover:text-gray-600 p-2"><X size={24}/></button></div>
              <div className="p-8 space-y-8">
                 <div className="text-center"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4 line-clamp-2">{partToEditQuantity.name}</p><div className="flex items-center justify-center gap-6"><button onClick={() => { const currentVal = parseFloat(tempQuantityStr.replace(',', '.')); const newVal = Math.max(0.1, Number((currentVal - 1).toFixed(3))); setTempQuantityStr(newVal.toString().replace('.', ',')); }} className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center shadow-sm active:scale-90 transition-all"><Minus size={28} /></button><input type="text" inputMode="decimal" value={tempQuantityStr} onChange={e => { const val = e.target.value.replace(',', '.'); if (/^\d*[.]?\d*$/.test(val) || val === '') setTempQuantityStr(e.target.value); }} className="w-24 bg-transparent text-5xl font-black text-slate-900 dark:text-white text-center outline-none border-b-4 border-transparent focus:border-blue-500 transition-all" /><button onClick={() => { const currentVal = parseFloat(tempQuantityStr.replace(',', '.')) || 0; const newVal = Number((currentVal + 1).toFixed(3)); setTempQuantityStr(newVal.toString().replace('.', ',')); }} className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center shadow-sm active:scale-90 transition-all"><Plus size={28} /></button></div></div>
                 <button onClick={async () => { await handleUpdatePartQuantity(partToEditQuantity.id, tempQuantityStr); setShowEditQuantityModal(false); }} disabled={actionLoading} className="w-full bg-blue-600 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-[0.98] transition-all">{actionLoading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'CONFIRMAR AJUSTE'}</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAIS DE CONFIRMAÇÃO DE REMOÇÃO */}
      {showDeletePartModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm text-center transition-colors">
              <div className="p-8"><div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Trash2 size={32}/></div><h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Remover Material?</h3><div className="grid grid-cols-2 gap-3 mt-8"><button onClick={() => setShowDeletePartModal(false)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase rounded-2xl active:scale-95 transition-all">CANCELAR</button><button onClick={handleDeletePart} className="py-4 bg-red-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">REMOVER</button></div></div>
           </div>
        </div>
      )}

      {showDeletePhotoModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm text-center transition-colors">
              <div className="p-8"><div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Camera size={32}/></div><h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Eliminar Foto?</h3><div className="grid grid-cols-2 gap-3 mt-8"><button onClick={() => setShowDeletePhotoModal(false)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase rounded-2xl active:scale-95 transition-all">CANCELAR</button><button onClick={handleDeletePhoto} className="py-4 bg-red-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all">ELIMINAR</button></div></div>
           </div>
        </div>
      )}

      {showFinalizeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm text-center transition-colors">
              <div className="p-8"><div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><CheckCircle size={32}/></div><h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Finalizar Intervenção?</h3><p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8 uppercase">TODOS OS DADOS SERÃO BLOQUEADOS E O RELATÓRIO SERÁ GERADO.</p><div className="grid grid-cols-2 gap-4"><button onClick={() => setShowFinalizeModal(false)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase rounded-2xl active:scale-95">CANCELAR</button><button onClick={async () => { await mockData.updateServiceOrder(id!, { status: OSStatus.CONCLUIDA, anomaly_detected: anomaly, resolution_notes: resolutionNotes, client_signature: clientSignature, technician_signature: technicianSignature, is_warranty: isWarranty, warranty_info: warrantyInfo }); setShowFinalizeModal(false); setActiveTab('info'); fetchOSDetails(false); }} className="py-4 bg-emerald-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">CONFIRMAR</button></div></div>
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
