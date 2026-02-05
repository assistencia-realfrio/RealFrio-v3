
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, HardDrive, Edit2, History, Image as ImageIcon, 
  Paperclip, Plus, Trash2, Camera, MapPin, Building2, ExternalLink,
  ChevronRight, Download, FileText, X, Eye, Activity, Tag, UploadCloud,
  FileImage, AlertTriangle, ShieldAlert, Printer, FileImage as ImageIcon2,
  Image as LucideImage
} from 'lucide-react';
import QRCode from 'qrcode';
import { mockData } from '../services/mockData';
import { Equipment, ServiceOrder, EquipmentAttachment, OSStatus } from '../types';
import OSStatusBadge from '../components/OSStatusBadge';

// Componente de Diálogo de Confirmação
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'warning' | 'info';
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
            <button onClick={onCancel} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase rounded-2xl active:scale-95 transition-all">CANCELAR</button>
            <button onClick={onConfirm} className={`py-4 ${isDanger ? 'bg-red-600' : 'bg-orange-500'} text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all`}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente de visualização com zoom
const ZoomableImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ dist: number; x: number; y: number; scale: number; pos: { x: number; y: number } } | null>(null);
  const lastTapRef = useRef<number>(0);
  const handleWheel = (e: React.WheelEvent) => { const delta = e.deltaY * -0.01; const newScale = Math.min(Math.max(1, scale + delta), 5); setScale(newScale); if (newScale === 1) setPosition({ x: 0, y: 0 }); };
  const handleTouchStart = (e: React.TouchEvent) => { const now = Date.now(); const DOUBLE_TAP_DELAY = 300; if (e.touches.length === 1 && (now - lastTapRef.current) < DOUBLE_TAP_DELAY) { if (scale > 1) { setScale(1); setPosition({ x: 0, y: 0 }); } else { setScale(2.5); } lastTapRef.current = 0; return; } lastTapRef.current = now; if (e.touches.length === 2) { const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY); touchStartRef.current = { dist, x: 0, y: 0, scale, pos: { ...position } }; } else if (e.touches.length === 1 && scale > 1) { touchStartRef.current = { dist: 0, x: e.touches[0].pageX, y: e.touches[0].pageY, scale, pos: { ...position } }; } };
  const handleTouchMove = (e: React.TouchEvent) => { if (!touchStartRef.current) return; if (e.touches.length === 2 && touchStartRef.current.dist > 0) { const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY); const ratio = dist / touchStartRef.current.dist; const newScale = Math.min(Math.max(1, touchStartRef.current.scale * ratio), 6); setScale(newScale); } else if (e.touches.length === 1 && scale > 1) { touchStartRef.current.x = touchStartRef.current.x || 0; const dx = e.touches[0].pageX - touchStartRef.current.x; const dy = e.touches[0].pageY - touchStartRef.current.y; const limit = (scale - 1) * 200; setPosition({ x: Math.min(Math.max(touchStartRef.current.pos.x + dx, -limit), limit), y: Math.min(Math.max(touchStartRef.current.y + dy, -limit), limit) }); } };
  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none bg-slate-950" onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={() => { touchStartRef.current = null; }} >
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none"> <span className="bg-white/10 backdrop-blur-md text-white/50 text-[8px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full border border-white/5"> {scale > 1 ? `ZOOM: ${Math.round(scale * 100)}%` : 'PINCH PARA ZOOM / DUPLO TOQUE'} </span> </div>
      <img src={src} alt={alt} className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-75 ease-out select-none pointer-events-none" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, fontSmooth: 'always' }} />
      {scale > 1 && ( <button onClick={(e) => { e.stopPropagation(); setScale(1); setPosition({x:0,y:0}); }} className="absolute bottom-10 bg-white text-slate-900 px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all shadow-2xl border border-slate-200 z-30 active:scale-90">Repor Vista (1:1)</button> )}
    </div>
  );
};

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
  const [selectedAttachmentForView, setSelectedAttachmentForView] = useState<EquipmentAttachment | null>(null);
  const [showNameplateFullscreen, setShowNameplateFullscreen] = useState(false);
  
  // Estados para Upload Seletivo
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [uploadContext, setUploadContext] = useState<'chapa' | 'anexo' | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean; title: string; message: string; confirmLabel: string; variant: 'danger' | 'warning' | 'info'; action: () => void;
  }>({
    isOpen: false, title: '', message: '', confirmLabel: '', variant: 'info', action: () => {}
  });

  const closeConfirm = () => setConfirmConfig(prev => ({ ...prev, isOpen: false }));
  const [isDraggingNameplate, setIsDraggingNameplate] = useState(false);
  const [isDraggingAttachment, setIsDraggingAttachment] = useState(false);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [eq, allOs] = await Promise.all([ mockData.getEquipmentById(id), mockData.getServiceOrders() ]);
      if (eq) {
        setEquipment(eq);
        const [client, establishments] = await Promise.all([ mockData.getClientById(eq.client_id), mockData.getEstablishmentsByClient(eq.client_id) ]);
        setClientName(client?.name || 'Cliente Desconhecido'); setEstablishmentName(establishments.find(e => e.id === eq.establishment_id)?.name || 'Localização Desconhecida');
        const eqOs = allOs.filter(o => o.equipment_id === id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setHistory(eqOs);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const generateAssetPNG = async () => {
    if (!equipment) return;
    const widthMM = 127.0; const heightMM = 59.2; const dpi = 300; const mmToPx = dpi / 25.4; const widthPX = Math.round(widthMM * mmToPx); const heightPX = Math.round(heightMM * mmToPx);
    const canvas = document.createElement('canvas'); canvas.width = widthPX; canvas.height = heightPX; const ctx = canvas.getContext('2d'); if (!ctx) return;
    const qrSize = Math.round(heightPX * 0.75 * 1.25); const marginMM = 4; const marginPX = Math.round(marginMM * mmToPx);
    const baseUrl = window.location.href.split('#')[0]; const qrUrl = `${baseUrl}#/equipments/${equipment.id}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: qrSize, color: { dark: '#000000', light: '#00000000' } });
    const qrImage = new Image(); qrImage.src = qrDataUrl;
    await new Promise((resolve) => { qrImage.onload = () => { const qrX = widthPX - qrSize - marginPX; const qrY = (heightPX - qrSize) / 2; ctx.drawImage(qrImage, qrX, qrY); resolve(true); }; });
    const textMarginX = Math.round(5 * mmToPx); const textMaxWidth = widthPX - qrSize - (marginPX * 3);
    const fontSize = Math.round(14 * mmToPx); const lineSpacing = Math.round(4 * mmToPx);
    const totalBlockHeight = (fontSize * 3) + (lineSpacing * 2); let currentY = (heightPX - totalBlockHeight) / 2 + (fontSize * 0.85);
    ctx.fillStyle = '#000000'; const fontStyle = `bold ${fontSize}px Inter, "Segoe UI", Helvetica, Arial, sans-serif`; ctx.font = fontStyle;
    ctx.fillText("REAL FRIO", textMarginX, currentY, textMaxWidth); currentY += fontSize + lineSpacing;
    const equipType = equipment.type.toUpperCase(); ctx.fillText(equipType, textMarginX, currentY, textMaxWidth); currentY += fontSize + lineSpacing;
    const brandModel = `${equipment.brand || ''} ${equipment.model ? '- ' + equipment.model : ''}`.toUpperCase(); ctx.fillText(brandModel, textMarginX, currentY, textMaxWidth);
    const safeClient = clientName.replace(/\s+/g, '_').toUpperCase(); const safeType = equipment.type.replace(/\s+/g, '_').toUpperCase(); const safeBrand = (equipment.brand || '').replace(/\s+/g, '_').toUpperCase(); const safeModel = (equipment.model || '').replace(/\s+/g, '_').toUpperCase(); const safeSerial = (equipment.serial_number || 'S-N').replace(/\s+/g, '_').toUpperCase();
    const finalFileName = `ETIQUETA_MAXQR_${safeClient}_${safeType}_${safeBrand}_${safeModel}_${safeSerial}.png`;
    const pngUrl = canvas.toDataURL('image/png', 1.0); const link = document.createElement('a'); link.href = pngUrl; link.download = finalFileName; link.click();
  };

  const handleUploadNameplate = async (fileOrEvent: React.ChangeEvent<HTMLInputElement> | File) => {
    let file = fileOrEvent instanceof File ? fileOrEvent : fileOrEvent.target.files?.[0];
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

  const handleAddAttachment = async (fileOrEvent: React.ChangeEvent<HTMLInputElement> | File) => {
    let file = fileOrEvent instanceof File ? fileOrEvent : fileOrEvent.target.files?.[0];
    if (file && equipment) {
      const fileName = prompt("Nome amigável para este anexo:", file.name) || file.name;
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const newAttachment: EquipmentAttachment = { id: Math.random().toString(36).substr(2, 9), name: fileName, url: base64, created_at: new Date().toISOString() };
        const updatedAttachments = [...(equipment.attachments || []), newAttachment];
        await mockData.updateEquipment(equipment.id, { attachments: updatedAttachments });
        setEquipment(prev => prev ? { ...prev, attachments: updatedAttachments } : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const executeRemoveAttachment = async (attachmentId: string) => {
    if (!equipment) return;
    try {
      const updated = (equipment.attachments || []).filter(a => a.id !== attachmentId);
      await mockData.updateEquipment(equipment.id, { attachments: updated });
      setEquipment(prev => prev ? { ...prev, attachments: updated } : null);
    } catch (err) { console.error("Erro ao remover anexo:", err); alert("ERRO AO REMOVER ANEXO."); }
  };

  const handleRemoveAttachment = (e: React.MouseEvent, attachmentId: string) => { e.preventDefault(); e.stopPropagation(); setConfirmConfig({ isOpen: true, title: 'Eliminar Anexo', message: 'Tem a certeza que deseja eliminar este documento/imagem permanentemente?', confirmLabel: 'ELIMINAR', variant: 'danger', action: () => executeRemoveAttachment(attachmentId) }); };

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };

  const isImageAttachment = (url: string) => { return url.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url); };

  const openSourceSelector = (context: 'chapa' | 'anexo') => {
    setUploadContext(context);
    setShowSourceModal(true);
  };

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center p-20">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!equipment) return <div className="p-8 text-center uppercase font-black text-slate-400">Ativo não encontrado.</div>;

  return (
    <div className="max-w-4xl mx-auto pb-44 relative px-1 sm:px-0">
      {/* Inputs Escondidos */}
      <input 
        type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} 
        onChange={(e) => { 
          if(uploadContext === 'chapa') handleUploadNameplate(e);
          else if(uploadContext === 'anexo') handleAddAttachment(e);
          setShowSourceModal(false); 
        }} 
      />
      <input 
        type="file" accept="image/*,application/pdf" className="hidden" ref={galleryInputRef} 
        onChange={(e) => { 
          if(uploadContext === 'chapa') handleUploadNameplate(e);
          else if(uploadContext === 'anexo') handleAddAttachment(e);
          setShowSourceModal(false); 
        }} 
      />

      {/* Seletor de Origem */}
      {showSourceModal && (
        <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
              <div className="p-8 text-center">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Origem do Arquivo</h3>
                    <button onClick={() => setShowSourceModal(false)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><X size={24} /></button>
                 </div>
                 <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-4 p-6 bg-blue-600 text-white rounded-3xl shadow-xl hover:bg-blue-700 transition-all active:scale-95"
                    >
                       <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"><Camera size={28} /></div>
                       <div className="text-left"><p className="font-black text-sm uppercase tracking-tight">Câmara</p><p className="text-[10px] opacity-70 uppercase font-bold">Foto Instantânea</p></div>
                    </button>
                    <button 
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex items-center gap-4 p-6 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-3xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                    >
                       <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center"><LucideImage size={28} /></div>
                       <div className="text-left"><p className="font-black text-sm uppercase tracking-tight">Galeria / Arquivos</p><p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Documentos e Fotos</p></div>
                    </button>
                 </div>
                 <button onClick={() => setShowSourceModal(false)} className="mt-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">VOLTAR</button>
              </div>
           </div>
        </div>
      )}

      <ConfirmDialog {...confirmConfig} onCancel={closeConfirm} onConfirm={() => { closeConfirm(); confirmConfig.action(); }} />

      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2 px-1">
          <button onClick={() => navigate(-1)} className="p-3 text-slate-500 dark:text-slate-400 hover:text-blue-600 rounded-2xl transition-all bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm active:scale-95">
            <ArrowLeft size={22} />
          </button>
        </div>

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
                   <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center flex-shrink-0"> <Building2 size={22} /> </div>
                   <div className="min-w-0 pr-4"> <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Proprietário / Cliente</p> <button onClick={() => navigate(`/clients/${equipment.client_id}`)} className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase truncate hover:text-blue-600 text-left transition-colors"> {clientName} </button> </div>
                </div>
                <div className="p-6 flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center flex-shrink-0"> <MapPin size={22} /> </div>
                   <div className="min-w-0 pr-4"> <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Localização de Instalação</p> <p className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase truncate">{establishmentName}</p> </div>
                </div>
                <div className="p-6 flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center flex-shrink-0"> <Tag size={22} /> </div>
                   <div className="min-w-0 pr-4"> <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Marca / Modelo</p> <p className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase truncate">{equipment.brand} <span className="text-slate-300 dark:text-slate-700 mx-1">|</span> {equipment.model || '---'}</p> </div>
                </div>
                <div className="p-6 flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center flex-shrink-0"> <FileText size={22} /> </div>
                   <div className="min-w-0 pr-4"> <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Número de Série (S/N)</p> <p className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono uppercase">{equipment.serial_number || '---'}</p> </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
                <button onClick={generateAssetPNG} className="w-full bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 py-5 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] shadow-sm hover:bg-blue-50 transition-all flex items-center justify-center gap-3 active:scale-95" > <ImageIcon2 size={16} /> EXPORTAR ETIQUETA (127x59) </button>
                <Link to={`/equipments/${equipment.id}/edit`} className="w-full bg-slate-900 dark:bg-blue-600 text-white py-5 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95" > <Edit2 size={16} /> EDITAR FICHA DO ATIVO </Link>
              </div>
            </div>
          )}

          {activeTab === 'chapa' && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 space-y-6 text-center transition-colors">
               <div className="flex flex-col items-center">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Chapa de Características</h3>
                  <div 
                    onClick={() => openSourceSelector('chapa')}
                    onDragOver={handleDrag}
                    onDragEnter={(e) => { handleDrag(e); setIsDraggingNameplate(true); }}
                    onDragLeave={(e) => { handleDrag(e); setIsDraggingNameplate(false); }}
                    onDrop={(e) => {
                      handleDrag(e); setIsDraggingNameplate(false); const files = e.dataTransfer.files;
                      if (files && files.length > 0) { const file = files[0]; if (file.type.startsWith('image/')) handleUploadNameplate(file); }
                    }}
                    className={`relative group w-full max-w-md mx-auto aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-2 border-dashed transition-all cursor-pointer ${isDraggingNameplate ? 'border-blue-500 bg-blue-50/50 scale-105 ring-4 ring-blue-500/10' : 'border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-blue-200'}`}
                  >
                    {isDraggingNameplate && (
                      <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-[2px] flex items-center justify-center z-20 pointer-events-none">
                        <div className="flex flex-col items-center gap-2 animate-bounce">
                          <UploadCloud size={48} className="text-blue-600" />
                          <span className="text-[12px] font-black text-blue-600 uppercase">Largar para Carregar</span>
                        </div>
                      </div>
                    )}
                    {equipment.nameplate_url ? (
                      <>
                        <img src={equipment.nameplate_url} className="w-full h-full object-contain" alt="Chapa de Características" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-10">
                           <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowNameplateFullscreen(true); }} className="p-4 bg-white text-slate-900 rounded-full hover:bg-blue-50 transition-colors shadow-xl active:scale-90" > <Eye size={24} /> </button>
                           <div className="p-4 bg-blue-600 text-white rounded-full shadow-xl"> <Camera size={24} /> </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                         <Camera size={48} className={`mb-4 transition-colors ${isDraggingNameplate ? 'text-blue-600' : 'text-gray-300 group-hover:text-blue-400'}`} />
                         <p className={`text-[10px] font-black uppercase tracking-widest ${isDraggingNameplate ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`}>Adicionar Foto da Chapa</p>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3 pb-10">
               <div className="flex items-center justify-between px-4 mb-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intervenções (Ativas e Histórico)</h3>
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black px-2 py-0.5 rounded-full">{history.length}</span>
               </div>
               {history.length === 0 ? ( <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-800 mx-1"> <History size={32} className="mx-auto text-gray-200 dark:text-slate-700 mb-4" /> <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Sem registos para este ativo</p> </div> ) : (
                 <div className="space-y-3 px-1"> {history.map(os => ( <Link key={os.id} to={`/os/${os.id}`} className="flex items-center justify-between p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl hover:border-blue-100 hover:shadow-lg transition-all group" > <div className="flex items-center gap-5 min-w-0 flex-1"> <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center font-black group-hover:bg-blue-600 group-hover:text-white transition-all flex-shrink-0 shadow-inner"> <span className="text-[10px] font-mono text-slate-400 group-hover:text-blue-100 leading-none">OS</span> <span className="text-[8px] text-slate-300 group-hover:text-blue-200 uppercase mt-0.5">{new Date(os.created_at).toLocaleDateString('pt-PT', {day: '2-digit', month: '2-digit'})}</span> </div> <div className="min-w-0 flex-1"> <div className="flex items-center gap-2 mb-1"> <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{os.code}</p> <span className="text-[8px] font-black text-slate-300 uppercase">|</span> <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{os.type}</p> </div> <h4 className="text-base font-black text-slate-900 dark:text-white uppercase truncate mb-1">{os.description}</h4> </div> </div> <OSStatusBadge status={os.status} className="scale-90 flex-shrink-0" /> </Link> ))} </div>
               )}
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 space-y-6 transition-colors pb-10">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Anexos & Documentação</h3>
                 <button onClick={() => openSourceSelector('anexo')} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-blue-700 shadow-lg active:scale-95 transition-all"> <Plus size={14} /> ADICIONAR </button>
              </div>
              <div onDragOver={handleDrag} onDragEnter={(e) => { handleDrag(e); setIsDraggingAttachment(true); }} onDragLeave={(e) => { handleDrag(e); setIsDraggingAttachment(false); }} onDrop={(e) => { handleDrag(e); setIsDraggingAttachment(false); const files = e.dataTransfer.files; if (files && files.length > 0) { handleAddAttachment(files[0]); } }} className={`min-h-[200px] transition-all rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden ${isDraggingAttachment ? 'border-blue-500 bg-blue-50/50 scale-[1.02]' : 'border-transparent'}`} >
                {isDraggingAttachment && ( <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-[2px] flex items-center justify-center z-20 pointer-events-none"> <div className="flex flex-col items-center gap-2 animate-bounce"> <UploadCloud size={48} className="text-blue-600" /> <span className="text-[12px] font-black text-blue-600 uppercase">Largar Arquivo Aqui</span> </div> </div> )}
                {(equipment.attachments || []).length === 0 ? ( <div className="text-center py-10 transition-colors"> <Paperclip size={32} className={`mx-auto mb-3 transition-colors ${isDraggingAttachment ? 'text-blue-600' : 'text-slate-200 dark:text-slate-800'}`} /> <p className={`text-[10px] font-black uppercase tracking-widest px-8 transition-colors ${isDraggingAttachment ? 'text-blue-600' : 'text-slate-300 dark:text-slate-700'}`}> Nenhum esquema ou manual anexado.<br/> <span className="text-[8px] opacity-60">Pode arrastar arquivos diretamente para aqui.</span> </p> </div> ) : ( <div className="space-y-3 w-full p-2"> {equipment.attachments?.map(att => { const isImage = isImageAttachment(att.url); return ( <div key={att.id} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 transition-all group"> <div className="flex items-center gap-4 min-w-0 flex-1"> <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 text-slate-400 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:text-blue-500 overflow-hidden"> {isImage ? ( <img src={att.url} alt={att.name} className="w-full h-full object-cover" /> ) : ( <FileText size={20} /> )} </div> <div className="min-w-0 flex-1"> <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase truncate mb-0.5">{att.name}</p> <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest"> {isImage ? 'Imagem' : 'Documento'} • {new Date(att.created_at).toLocaleDateString()} </p> </div> </div> <div className="flex items-center gap-2"> <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); isImage ? setSelectedAttachmentForView(att) : window.open(att.url); }} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all" title={isImage ? "Visualizar Imagem" : "Abrir Documento"} > {isImage ? <Eye size={18} /> : <ExternalLink size={18} />} </button> <button onClick={(e) => handleRemoveAttachment(e, att.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all" title="Remover" > <Trash2 size={18} /> </button> </div> </div> ); })} <div className="text-center py-4 opacity-30"> <p className="text-[8px] font-black uppercase tracking-widest">Arraste mais arquivos para adicionar</p> </div> </div> )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedAttachmentForView && ( <div className="fixed inset-0 z-[300] bg-slate-950 flex flex-col animate-in fade-in duration-300"> <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-6 z-[310] bg-gradient-to-b from-black/80 to-transparent"> <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] truncate pr-10"> {selectedAttachmentForView.name} </span> <button onClick={() => setSelectedAttachmentForView(null)} className="p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all active:scale-90 backdrop-blur-lg"> <X size={24} /> </button> </div> <div className="flex-1 w-full h-full"> <ZoomableImage src={selectedAttachmentForView.url} alt={selectedAttachmentForView.name} /> </div> </div> )}
      {showNameplateFullscreen && equipment.nameplate_url && ( <div className="fixed inset-0 z-[300] bg-slate-950 flex flex-col animate-in fade-in duration-300"> <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-6 z-[310] bg-gradient-to-b from-black/80 to-transparent"> <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] truncate pr-10"> CHAPA DE CARACTERÍSTICAS: {equipment.type} </span> <button onClick={() => setShowNameplateFullscreen(false)} className="p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all active:scale-90 backdrop-blur-lg"> <X size={24} /> </button> </div> <div className="flex-1 w-full h-full"> <ZoomableImage src={equipment.nameplate_url} alt="Chapa de Características" /> </div> </div> )}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-[#9d1c24] dark:border-[#9d1c24]/60 shadow-[0_12px_40px_rgba(157,28,36,0.15)] rounded-full p-1.5 flex items-center justify-around transition-all animate-in slide-in-from-bottom-10 duration-500">
        {[ { id: 'info', icon: HardDrive, label: 'GERAL' }, { id: 'chapa', icon: ImageIcon, label: 'CHAPA' }, { id: 'history', icon: History, label: 'HIST.' }, { id: 'attachments', icon: Paperclip, label: 'ANEXOS' } ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-full transition-all gap-1 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
            <tab.icon size={18} /><span className="text-[7px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default EquipmentDetail;
