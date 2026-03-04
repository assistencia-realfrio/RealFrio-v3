import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Box, CheckCircle2, XCircle, Clock, MapPin, Hash, FileText, Loader2, Check, AlertCircle, Edit, Trash2, Printer, CheckSquare, Square } from 'lucide-react';
import { mockData } from '../services/mockData';
import { MaterialDelivery, MaterialDeliveryItem } from '../types';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import SignatureCanvas from '../components/SignatureCanvas';

const DeliveryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState<MaterialDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [partialSignature, setPartialSignature] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  useEffect(() => {
    fetchDelivery();
  }, [id]);

  const fetchDelivery = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await mockData.getMaterialDeliveryById(id);
      
      // Extract metadata from notes if present (schema-safe fallback)
      let metadata: any = {};
      try {
        if (data.notes && (data.notes.startsWith('{') || data.notes.startsWith('['))) {
          metadata = JSON.parse(data.notes);
        }
      } catch (e) {
        console.log("Notes is not JSON");
      }

      const enrichedData = {
        ...data,
        items: (data.items || []).map((item: any, idx: number) => ({
          ...item,
          id: item.id || `item-${idx}`
        })),
        client_nif: data.client_nif || metadata.client_nif,
        partial_signature: data.partial_signature || metadata.partial_signature,
        partial_delivered_at: data.partial_delivered_at || metadata.partial_delivered_at,
        // If status is pending but we have partial info or real_status, treat as partial
        status: data.status === 'pending' 
          ? (metadata.real_status || (metadata.partial_signature || data.items.some((i: MaterialDeliveryItem) => i.delivered) ? 'partial' : 'pending'))
          : data.status
      };

      // Sort items: Delivered first
      enrichedData.items.sort((a: MaterialDeliveryItem, b: MaterialDeliveryItem) => {
        if (a.delivered === b.delivered) return 0;
        return a.delivered ? -1 : 1;
      });

      setDelivery(enrichedData);
      if (enrichedData.client_signature) {
        setClientSignature(enrichedData.client_signature);
      }
      if (enrichedData.partial_signature) {
        setPartialSignature(enrichedData.partial_signature);
      }
    } catch (err: any) {
      setError("Erro ao carregar os dados da entrega.");
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    if (delivery?.status === 'delivered' || delivery?.status === 'canceled') return;
    
    setSelectedItemIds(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId) 
        : [...prev, itemId]
    );
  };

  const handleUpdateStatus = async (newStatus: 'delivered' | 'canceled') => {
    if (!id || !delivery) return;
    setActionLoading(true);
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'delivered') {
        updates.delivered_at = new Date().toISOString();
      }
      await mockData.updateMaterialDelivery(id, updates);
      await fetchDelivery();
    } catch (err: any) {
      alert("Erro ao atualizar o estado.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizeDelivery = async () => {
    if (!id || !delivery) return;
    
    if (selectedItemIds.length === 0) {
      alert("Por favor, selecione pelo menos um artigo para entregar.");
      return;
    }

    const isPartial = selectedItemIds.length < delivery.items.filter((item: MaterialDeliveryItem) => !item.delivered).length || (delivery.status === 'pending' && selectedItemIds.length < delivery.items.length);
    const isFinal = !isPartial;

    const signatureToUse = isFinal ? clientSignature : partialSignature;

    if (!signatureToUse) {
      setShowValidationErrors(true);
      alert("Por favor, recolha a assinatura do cliente antes de concluir.");
      return;
    }

    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const updatedItems = delivery.items.map((item: MaterialDeliveryItem, idx: number) => {
        const itemId = item.id || `item-${idx}`;
        if (selectedItemIds.includes(itemId)) {
          return { ...item, id: itemId, delivered: true, delivered_at: now };
        }
        return { ...item, id: itemId };
      });

      const allDelivered = updatedItems.every((item: MaterialDeliveryItem) => item.delivered);
      
      // Pack metadata into notes to be schema-safe
      let metadata: any = {};
      try {
        if (delivery.notes && (delivery.notes.startsWith('{') || delivery.notes.startsWith('['))) {
          metadata = JSON.parse(delivery.notes);
        }
      } catch (e) {}

      const newMetadata = {
        ...metadata,
        client_nif: delivery.client_nif,
        real_status: allDelivered ? 'delivered' : 'partial'
      };

      // Prepare the minimal, safe update object
      const safeUpdates: any = {
        items: updatedItems,
        status: allDelivered ? 'delivered' : 'pending',
      };

      if (allDelivered) {
        safeUpdates.client_signature = clientSignature;
        safeUpdates.delivered_at = now;
      } else {
        newMetadata.partial_signature = partialSignature;
        newMetadata.partial_delivered_at = now;
      }

      safeUpdates.notes = JSON.stringify(newMetadata);

      // Single, safe update call
      await mockData.updateMaterialDelivery(id, safeUpdates);

      await fetchDelivery();
      setShowValidationErrors(false);
    } catch (err: any) {
      console.error("Final error:", err);
      alert("Erro ao concluir a entrega. Por favor, tente novamente.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await mockData.deleteMaterialDelivery(id);
      navigate('/deliveries');
    } catch (err: any) {
      alert("Erro ao eliminar a entrega.");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getBase64ImageFromURL = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Error loading image:", url, e);
      return null;
    }
  };

  const generatePDF = async () => {
    if (!delivery) return;
    setIsExportingPDF(true);
    try {
      const doc = new jsPDF({ compress: true, orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.width;
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);

      // Tentar carregar logótipos
      const logoWide = await getBase64ImageFromURL('/logo.png');
      const logoSquare = await getBase64ImageFromURL('/rf-apple-v5.png');

      // Header Background
      doc.setFillColor(40, 40, 40);
      doc.rect(0, 0, pageWidth, 35, 'F');

      if (logoWide) {
        doc.addImage(logoWide, 'PNG', margin, 8, 55, 15);
      } else if (logoSquare) {
        doc.addImage(logoSquare, 'PNG', margin, 8, 20, 20);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("REAL FRIO", margin + 25, 18);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("ASSISTÊNCIA TÉCNICA E REFRIGERAÇÃO", margin + 25, 24);
      } else {
        // Fallback text if no logo
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("REAL FRIO", margin, 18);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("ASSISTÊNCIA TÉCNICA E REFRIGERAÇÃO", margin, 24);
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("GUIA DE ENTREGA DE MATERIAL", pageWidth - margin, 18, { align: 'right' });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 180, 180);
      doc.text(`DATA: ${new Date(delivery.created_at).toLocaleDateString('pt-PT')}`, pageWidth - margin, 24, { align: 'right' });

      let currentY = 45;

      // Client Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, currentY, contentWidth, 35, 2, 2, 'FD');
      
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("DADOS DO CLIENTE", margin + 5, currentY + 7);
      
      doc.setFontSize(10);
      doc.text(delivery.client_name.toUpperCase(), margin + 5, currentY + 15);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      if (delivery.client_nif) {
        doc.text(`NIF: ${delivery.client_nif}`, margin + 5, currentY + 21);
      }
      if (delivery.at_code) {
        doc.text(`CÓDIGO AT: ${delivery.at_code}`, margin + 5, currentY + 26);
      }

      // Addresses
      const col2X = margin + (contentWidth / 2) + 5;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text("LOCALIZAÇÃO", col2X, currentY + 7);
      
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      if (delivery.loading_address) {
        doc.text("CARGA:", col2X, currentY + 13);
        doc.setTextColor(40, 40, 40);
        doc.text(delivery.loading_address.toUpperCase(), col2X + 12, currentY + 13, { maxWidth: (contentWidth / 2) - 20 });
      }
      
      doc.setTextColor(100, 116, 139);
      if (delivery.unloading_address) {
        doc.text("DESCARGA:", col2X, currentY + 22);
        doc.setTextColor(40, 40, 40);
        doc.text(delivery.unloading_address.toUpperCase(), col2X + 17, currentY + 22, { maxWidth: (contentWidth / 2) - 25 });
      }

      currentY += 45;

      // Items Table
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("ARTIGOS ENTREGUES:", margin, currentY);
      
      currentY += 4;
      
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        theme: 'striped',
        head: [['DESIGNAÇÃO DO MATERIAL', 'QUANTIDADE']],
        body: delivery.items.map(item => {
          let name = item.name.toUpperCase();
          if (item.delivered) {
            name += ' (ENTREGUE)';
            if (item.delivered_at) {
              name += `\nEntregue a: ${new Date(item.delivered_at).toLocaleString('pt-PT')}`;
            } else if (delivery.delivered_at) {
               // Fallback if item doesn't have date but delivery has (legacy data)
               name += `\nEntregue a: ${new Date(delivery.delivered_at).toLocaleString('pt-PT')}`;
            }
          } else {
            name += ' (PENDENTE)';
          }
          return [name, `${item.quantity} UN`];
        }),
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 4 },
        columnStyles: { 
          0: { cellWidth: 'auto' },
          1: { halign: 'right', cellWidth: 30 } 
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const text = data.cell.raw as string;
            if (text.includes('(ENTREGUE)')) {
              data.cell.styles.textColor = [16, 185, 129]; // Emerald-600
            } else {
              data.cell.styles.textColor = [245, 158, 11]; // Amber-500
            }
          }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;

      // Signature Section
      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }

      const signatureWidth = 80;
      const signatureHeight = 25;

      // Partial Signature
      if (delivery.partial_signature) {
        doc.setDrawColor(203, 213, 225);
        doc.line(margin, currentY + 22, margin + signatureWidth, currentY + 22);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text("ASSINATURA ENTREGA PARCIAL", margin + (signatureWidth / 2), currentY + 26, { align: 'center' });
        
        try {
          doc.addImage(delivery.partial_signature, 'PNG', margin + 10, currentY, 60, 20);
        } catch (e) {
          console.error("Erro ao adicionar assinatura parcial ao PDF", e);
        }

        if (delivery.partial_delivered_at) {
          doc.setFontSize(5);
          doc.text(`DATA: ${new Date(delivery.partial_delivered_at).toLocaleString('pt-PT')}`, margin + (signatureWidth / 2), currentY + 29, { align: 'center' });
        }
        
        currentY += 40;
      }

      // Final Signature
      if (delivery.client_signature) {
        if (currentY > 240) {
          doc.addPage();
          currentY = 20;
        }

        doc.setDrawColor(203, 213, 225);
        doc.line(margin, currentY + 22, margin + signatureWidth, currentY + 22);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text("ASSINATURA ENTREGA FINAL", margin + (signatureWidth / 2), currentY + 26, { align: 'center' });

        try {
          doc.addImage(delivery.client_signature, 'PNG', margin + 10, currentY, 60, 20);
        } catch (e) {
          console.error("Erro ao adicionar assinatura final ao PDF", e);
        }

        if (delivery.delivered_at) {
          doc.setFontSize(5);
          doc.text(`DATA: ${new Date(delivery.delivered_at).toLocaleString('pt-PT')}`, margin + (signatureWidth / 2), currentY + 29, { align: 'center' });
        }
      }

      if (delivery.delivered_at) {
        doc.setFontSize(6);
        doc.text(`ENTREGUE EM: ${new Date(delivery.delivered_at).toLocaleString('pt-PT')}`, margin + 40, currentY + 34, { align: 'center' });
      }

      // Footer
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text("Este documento comprova a receção dos materiais acima descritos.", pageWidth / 2, 285, { align: 'center' });
      doc.text("Emitido via Plataforma Real Frio Assistência Técnica.", pageWidth / 2, 289, { align: 'center' });

      doc.save(`GUIA_ENTREGA_${delivery.client_name.replace(/\s+/g, '_').toUpperCase()}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar o documento de impressão.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  if (loading) return <div className="h-full flex justify-center items-center py-40"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (error || !delivery) return <div className="p-8 text-center text-red-500 font-bold">{error || "Entrega não encontrada."}</div>;

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'delivered': return { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle2, label: 'Entregue' };
      case 'partial': return { color: 'bg-blue-50 text-blue-600 border-blue-100', icon: Clock, label: 'Parcial' };
      case 'canceled': return { color: 'bg-red-50 text-red-600 border-red-100', icon: XCircle, label: 'Cancelada' };
      default: return { color: 'bg-amber-50 text-amber-600 border-amber-100', icon: Clock, label: 'Pendente' };
    }
  };

  const status = getStatusConfig(delivery.status);
  const StatusIcon = status.icon;

  return (
    <div className="max-w-4xl mx-auto pb-24 px-2 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={() => navigate(-1)} className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 text-slate-500 rounded-2xl border dark:border-slate-800 flex-shrink-0 shadow-sm active:scale-95 transition-all">
            <ArrowLeft size={20} className="sm:w-[22px] sm:h-[22px]" />
          </button>
          <div className="min-w-0">
             <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight truncate">Detalhes da Entrega</h1>
             <p className="text-[9px] sm:text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Guia de Transporte</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-2">
            {(delivery.status === 'delivered' || delivery.status === 'partial') && (
              <button 
                onClick={generatePDF}
                disabled={isExportingPDF}
                className="p-2.5 sm:p-3 bg-emerald-600 text-white rounded-2xl border border-emerald-500 hover:bg-emerald-700 transition-all shadow-sm active:scale-95 flex items-center gap-2"
                title="Imprimir Guia"
              >
                {isExportingPDF ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} className="sm:w-5 sm:h-5" />}
                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Imprimir</span>
              </button>
            )}
            <button 
              onClick={() => navigate(`/deliveries/${id}/edit`)}
              className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 text-blue-600 rounded-2xl border dark:border-slate-800 hover:bg-blue-50 transition-all shadow-sm active:scale-95"
              title="Editar"
            >
              <Edit size={18} className="sm:w-5 sm:h-5" />
            </button>
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 text-red-500 rounded-2xl border dark:border-slate-800 hover:bg-red-50 transition-all shadow-sm active:scale-95"
              title="Eliminar"
            >
              <Trash2 size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
          <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border flex items-center gap-1.5 sm:gap-2 shadow-sm ${status.color}`}>
            <StatusIcon size={14} className="sm:w-4 sm:h-4" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{status.label}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</h3>
              <p className="text-lg font-black text-slate-900 dark:text-white uppercase">{delivery.client_name}</p>
              {delivery.client_nif && (
                <p className="text-xs font-bold text-slate-500 uppercase mt-1">NIF: {delivery.client_nif}</p>
              )}
            </div>

            {delivery.at_code && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <Hash size={18} />
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Código AT</h3>
                  <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">{delivery.at_code}</p>
                </div>
              </div>
            )}

            {(delivery.loading_address || delivery.unloading_address) && (
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                {delivery.loading_address && (
                  <div className="flex gap-3">
                    <MapPin size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Morada de Carga</h3>
                      <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">{delivery.loading_address}</p>
                    </div>
                  </div>
                )}
                {delivery.unloading_address && (
                  <div className="flex gap-3">
                    <MapPin size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-0.5">Morada de Descarga</h3>
                      <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">{delivery.unloading_address}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {(delivery.status === 'pending' || delivery.status === 'partial') && (
            <div className="space-y-4">
              {delivery.status === 'partial' && delivery.partial_signature && (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-gray-100 dark:border-slate-800 p-6 text-center">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Assinatura Entrega Parcial</h3>
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 inline-block">
                    <img src={delivery.partial_signature} alt="Assinatura Parcial" className="h-24 object-contain filter dark:invert" />
                  </div>
                  {delivery.partial_delivered_at && (
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                      Entregue a {new Date(delivery.partial_delivered_at).toLocaleString('pt-PT')}
                    </p>
                  )}
                </div>
              )}

              <SignatureCanvas 
                label={selectedItemIds.length === delivery.items.filter(i => !i.delivered).length ? "Assinatura Final" : "Assinatura Parcial"} 
                onSave={selectedItemIds.length === delivery.items.filter(i => !i.delivered).length ? setClientSignature : setPartialSignature} 
                onClear={() => selectedItemIds.length === delivery.items.filter(i => !i.delivered).length ? setClientSignature(null) : setPartialSignature(null)} 
                initialValue={selectedItemIds.length === delivery.items.filter(i => !i.delivered).length ? clientSignature : partialSignature} 
                error={showValidationErrors && !(selectedItemIds.length === delivery.items.filter(i => !i.delivered).length ? clientSignature : partialSignature)}
              />
              
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 p-6 flex flex-col gap-3">
                <button 
                  onClick={handleFinalizeDelivery}
                  disabled={actionLoading || selectedItemIds.length === 0}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  {selectedItemIds.length === delivery.items.filter(i => !i.delivered).length ? "Concluir Entrega Final" : "Concluir Entrega Parcial"}
                </button>
                <button 
                  onClick={() => handleUpdateStatus('canceled')}
                  disabled={actionLoading}
                  className="w-full py-4 bg-slate-50 dark:bg-slate-800 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  Cancelar Entrega
                </button>
              </div>
            </div>
          )}

          {delivery.status === 'delivered' && (
            <div className="space-y-6">
              {delivery.partial_signature && (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 text-center">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Assinatura Parcial</h3>
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 inline-block">
                    <img src={delivery.partial_signature} alt="Assinatura Parcial" className="h-32 object-contain filter dark:invert" />
                  </div>
                  {delivery.partial_delivered_at && (
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-4">
                      Entregue a {new Date(delivery.partial_delivered_at).toLocaleString('pt-PT')}
                    </p>
                  )}
                </div>
              )}

              {delivery.client_signature && (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 text-center">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Assinatura Final</h3>
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 inline-block">
                    <img src={delivery.client_signature} alt="Assinatura Final" className="h-32 object-contain filter dark:invert" />
                  </div>
                  {delivery.delivered_at && (
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-4">
                      Concluído a {new Date(delivery.delivered_at).toLocaleString('pt-PT')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 space-y-6">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-6">
            <Box size={18} className="text-blue-500" /> Artigos Entregues
          </h3>

          <div className="space-y-3">
            {delivery.items.map((item, index) => {
              const isSelected = selectedItemIds.includes(item.id);
              const canSelect = !item.delivered && (delivery.status === 'pending' || delivery.status === 'partial');
              
              return (
                <div 
                  key={item.id || index} 
                  onClick={() => canSelect && toggleItemSelection(item.id)}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    item.delivered 
                      ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 opacity-80' 
                      : isSelected 
                        ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' 
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800'
                  } ${canSelect ? 'cursor-pointer active:scale-[0.98]' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {canSelect ? (
                      <div className={`transition-colors ${isSelected ? 'text-blue-600' : 'text-slate-300'}`}>
                        {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                      </div>
                    ) : item.delivered ? (
                      <div className="text-emerald-600">
                        <CheckCircle2 size={20} />
                      </div>
                    ) : null}
                    
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center text-xs font-black">
                      {item.quantity}
                    </div>
                    <p className={`text-xs font-black uppercase ${item.delivered ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                      {item.name}
                    </p>
                  </div>
                  
                  {item.delivered && (
                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-lg">Entregue</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

    {/* Modal de Eliminação */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border dark:border-white/5">
              <div className="p-8 text-center space-y-4">
                 <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
                    <Trash2 size={32} />
                 </div>
                 <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Eliminar Entrega?</h3>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                   Esta ação não pode ser revertida. Tem a certeza que deseja eliminar este registo?
                 </p>
                 
                 <div className="flex flex-col gap-3 pt-4">
                    <button 
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      ELIMINAR DEFINITIVAMENTE
                    </button>
                    <button 
                      onClick={() => setShowDeleteModal(false)}
                      className="w-full py-4 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                    >
                      CANCELAR
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default DeliveryDetail;
