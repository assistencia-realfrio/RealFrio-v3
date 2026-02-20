
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Building2, MapPin, HardDrive, Printer, Loader2, 
  Edit2, Trash2, ShieldAlert, ExternalLink, ThumbsUp, ThumbsDown,
  ChevronDown, ChevronUp, CheckCircle2, ShieldCheck, Sparkles, Check,
  Mail, ShieldCheck as InsuranceIcon, AlertTriangle, Stethoscope, FileText
} from 'lucide-react';
import { mockData } from '../services/mockData';
import { Quote, QuoteStatus } from '../types';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from 'qrcode';

const QuoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingInsurance, setIsExportingInsurance] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  const [expandedClient, setExpandedClient] = useState(false);
  const [expandedEquip, setExpandedEquip] = useState(false);
  const [expandedTechnical, setExpandedTechnical] = useState(true);

  useEffect(() => { 
    if (id) fetchData(); 
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await mockData.getQuoteById(id!);
      setQuote(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (s: QuoteStatus) => {
    if (!id) return;
    setActionLoading(true);
    try {
      await mockData.updateQuoteStatus(id, s);
      setQuote(prev => prev ? { ...prev, status: s } : null);
    } catch (err) {
      alert("Erro ao atualizar estado.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await mockData.verifyQuote(id);
      setQuote(prev => prev ? { ...prev, status: QuoteStatus.ACEITE } : null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err) {
      console.error("Erro na verificação:", err);
      alert("Erro ao validar orçamento.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await mockData.deleteQuote(id);
      navigate('/quotes');
    } catch (error) {
      console.error(error);
      alert("Erro ao eliminar orçamento.");
    } finally {
      setActionLoading(false);
      setShowDeleteModal(false);
    }
  };

  const getPublicLink = () => {
    if (!id) return '';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const baseUrl = isLocalhost ? window.location.origin : 'https://realfrio.vercel.app';
    return `${baseUrl}/#/proposal/${id}`;
  };

  const getBase64ImageFromURL = (url: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const generateStandardPDF = async () => {
    if (!quote) return null;
    const publicUrl = getPublicLink();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20; 
    const brandColor = [0, 0, 0];

    // Tentar carregar logótipos
    const logoWide = await getBase64ImageFromURL('/logo.png');
    const logoSquare = await getBase64ImageFromURL('/rf-apple-v5.png');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);

    if (logoWide) {
      // Logótipo Novo (Horizontal) - Não precisa de texto
      doc.addImage(logoWide, 'PNG', 20, 10, 80, 20);
    } else if (logoSquare) {
      // Logótipo Antigo (Quadrado) - Precisa de texto ao lado
      doc.addImage(logoSquare, 'PNG', 20, 10, 25, 25);
      doc.text("REAL FRIO, LDA", 50, 20);
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text("ASSISTÊNCIA TÉCNICA E REFRIGERAÇÃO", 50, 25);
    } else {
      // Sem Logótipo - Apenas Texto
      doc.text("REAL FRIO, LDA", margin, 20);
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text("ASSISTÊNCIA TÉCNICA E REFRIGERAÇÃO", margin, 25);
    }
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`ORÇAMENTO: ${quote.code}`, pageWidth - margin, 20, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(`Data: ${new Date(quote.created_at).toLocaleDateString('pt-PT')}`, pageWidth - margin, 25, { align: "right" });
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 30, pageWidth - margin, 30);

    let currentY = 42;
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("DADOS DO CLIENTE", margin, currentY);
    doc.setFont("helvetica", "normal");
    doc.text((quote.client?.name || "---").toUpperCase(), margin, currentY + 7);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`FIRMA: ${(quote.client?.billing_name || quote.client?.name || '---').toUpperCase()}`, margin, currentY + 13);
    doc.text(`NIF: ${quote.client?.nif || '---'}`, margin, currentY + 18);
    doc.text(`LOCAL: ${quote.establishment?.name || 'SEDE / PRINCIPAL'}`, margin, currentY + 23);

    const col2X = pageWidth / 2 + 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("EQUIPAMENTO / ATIVO", col2X, currentY);
    doc.setFont("helvetica", "normal");
    doc.text((quote.equipment?.type || "NÃO ESPECIFICADO").toUpperCase(), col2X, currentY + 7);
    doc.setFontSize(8);
    doc.text(`Marca/Mod: ${quote.equipment?.brand || '---'} / ${quote.equipment?.model || '---'}`, col2X, currentY + 12);
    doc.text(`Nº Série: ${quote.equipment?.serial_number || '---'}`, col2X, currentY + 17);

    currentY += 40;
    doc.setFontSize(10); doc.setTextColor(0, 0, 0);
    const introText = "Após análise técnica pormenorizada ao equipamento acima identificado, apresenta-se o seguinte orçamento detalhado:";
    const splitIntro = doc.splitTextToSize(introText, pageWidth - (margin * 2));
    doc.text(splitIntro, margin, currentY);

    currentY += 15;
    const tableBody = (quote.items || []).map(i => [
      i.reference || '---',
      i.name.toUpperCase(),
      `${i.quantity} UN`,
      `${i.unit_price.toFixed(2)} €`,
      `${(i.quantity * i.unit_price).toFixed(2)} €`
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['REF', 'DESIGNAÇÃO', 'QTD', 'P. UNIT (LÍQUIDO)', 'TOTAL (LÍQUIDO)']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    const subtotal = quote.items?.reduce((acc, i) => acc + (i.quantity * i.unit_price), 0) || 0;
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(0, 0, 0);
    doc.text("TOTAL LÍQUIDO:", pageWidth - margin - 65, finalY, { align: "right" });
    doc.text(`${subtotal.toFixed(2)} €`, pageWidth - margin, finalY, { align: "right" });
    doc.setFontSize(9); doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.text("* Aos valores apresentados acresce o IVA de 23%.", pageWidth - margin, finalY + 8, { align: "right" });

    finalY += 22;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(60, 60, 60);
    const disclaimerText = "Validade do orçamento: 30 dias. Os valores podem sofrer um ajuste de até 10% em caso de deteção de avarias ocultas durante a reparação.";
    const splitDisclaimer = doc.splitTextToSize(disclaimerText, pageWidth - (margin * 2));
    doc.text(splitDisclaimer, margin, finalY);

    finalY += 20;
    const qrDataUrl = await QRCode.toDataURL(publicUrl, { margin: 1, width: 100 });
    doc.addImage(qrDataUrl, 'PNG', margin, finalY, 25, 25);
    doc.setFontSize(7); doc.setTextColor(100, 100, 100);
    doc.text("Digitalize para Aprovação Online", margin + 28, finalY + 10);
    doc.text(publicUrl, margin + 28, finalY + 15, { maxWidth: 120 });

    return doc;
  };

  const generateInsurancePDF = async () => {
    if (!quote) return;
    setIsExportingInsurance(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      const primaryColor: [number, number, number] = [0, 0, 0]; // Preto
      const slateColor: [number, number, number] = [40, 40, 40]; // Cinza Escuro para tabelas

      // Tentar carregar logótipos
      const logoWide = await getBase64ImageFromURL('/logo.png');
      const logoSquare = await getBase64ImageFromURL('/rf-apple-v5.png');

      // --- 1. CABEÇALHO DA EMPRESA ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);

      if (logoWide) {
        doc.addImage(logoWide, 'PNG', 20, 15, 70, 18);
      } else if (logoSquare) {
        doc.addImage(logoSquare, 'PNG', 20, 15, 25, 25);
        doc.text("REAL FRIO, LDA", 50, 25);
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.setFont("helvetica", "normal");
        doc.text("ASSISTÊNCIA TÉCNICA E REFRIGERAÇÃO", 50, 31);
      } else {
        doc.text("REAL FRIO, LDA", margin, 25);
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.setFont("helvetica", "normal");
        doc.text("ASSISTÊNCIA TÉCNICA E REFRIGERAÇÃO", margin, 31);
      }
      
      doc.setFontSize(10);
      doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
      doc.setFont("helvetica", "bold");
      doc.text("RELATÓRIO TÉCNICO DE PERITAGEM", pageWidth - margin, 25, { align: "right" });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`REF: ${quote.code}`, pageWidth - margin, 30, { align: "right" });
      doc.text(`EMISSÃO: ${new Date().toLocaleDateString('pt-PT')}`, pageWidth - margin, 34, { align: "right" });

      doc.setDrawColor(230, 230, 230);
      doc.line(margin, 40, pageWidth - margin, 40);

      let currentY = 50;
      
      // --- 2. IDENTIFICAÇÃO DO SINISTRO / ATIVO ---
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 42, 3, 3, 'F');
      
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
      doc.text("DADOS DO CLIENTE E EQUIPAMENTO", margin + 5, currentY + 8);
      
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
      doc.text(`CLIENTE: ${(quote.client?.name || '---').toUpperCase()}`, margin + 5, currentY + 16);
      doc.text(`FIRMA: ${(quote.client?.billing_name || quote.client?.name || '---').toUpperCase()}`, margin + 5, currentY + 22);
      doc.text(`NIF: ${quote.client?.nif || '---'}`, margin + 5, currentY + 28);
      doc.text(`LOCALIZAÇÃO: ${(quote.establishment?.name || '---').toUpperCase()}`, margin + 5, currentY + 34);
      
      const equipText = `${quote.equipment?.type || 'S/ TIPO'} - ${quote.equipment?.brand || 'S/ MARCA'} (${quote.equipment?.model || 'S/ MODELO'})`.toUpperCase();
      doc.text(`ATIVO: ${equipText}`, margin + 5, currentY + 40);
      doc.text(`Nº SÉRIE: ${quote.equipment?.serial_number || '---'}`, pageWidth - margin - 5, currentY + 40, { align: "right" });

      currentY += 52;

      // --- 3. PARECER TÉCNICO ---
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("1. DIAGNÓSTICO E PROBLEMA DETETADO", margin, currentY);
      
      currentY += 6;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(40, 40, 40);
      const probText = (quote.detected_problem || "Equipamento em falha técnica. Requer intervenção para substituição de componentes danificados conforme listagem abaixo.").toUpperCase();
      const splitProb = doc.splitTextToSize(probText, pageWidth - (margin * 2));
      doc.text(splitProb, margin, currentY);
      
      currentY += (splitProb.length * 5) + 10;

      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("2. CAUSA PROVÁVEL DO INCIDENTE", margin, currentY);
      
      currentY += 6;
      doc.setFont("helvetica", "normal");
      const causeText = (quote.cause || "Danos resultantes de anomalia externa ou desgaste mecânico acelerado.").toUpperCase();
      const splitCause = doc.splitTextToSize(causeText, pageWidth - (margin * 2));
      doc.text(splitCause, margin, currentY);

      currentY += (splitCause.length * 5) + 15;

      // --- 4. DETALHAMENTO DE PEÇAS E VALORES ---
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("3. COMPONENTES NECESSÁRIOS E ESTIMATIVA DE REPARAÇÃO", margin, currentY);
      
      currentY += 5;
      
      const tableBody = (quote.items || []).map(i => [
        i.name.toUpperCase(),
        `${i.quantity} UN`,
        `${i.unit_price.toFixed(2)} €`,
        `${(i.quantity * i.unit_price).toFixed(2)} €`
      ]);

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['DESIGNAÇÃO TÉCNICA', 'QTD', 'VALOR UNIT.', 'TOTAL']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: slateColor, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } }
      });

      let finalY = (doc as any).lastAutoTable.finalY + 10;
      
      const subtotal = quote.items?.reduce((acc, i) => acc + (i.quantity * i.unit_price), 0) || 0;
      
      doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
      doc.text("VALOR TOTAL LÍQUIDO ESTIMADO:", pageWidth - margin - 85, finalY, { align: "right" });
      doc.text(`${subtotal.toFixed(2)} €`, pageWidth - margin, finalY, { align: "right" });
      
      doc.setFontSize(8); doc.setTextColor(150, 150, 150);
      doc.setFont("helvetica", "normal");
      doc.text("* Valores líquidos sujeitos a IVA à taxa legal em vigor.", pageWidth - margin, finalY + 6, { align: "right" });

      // --- 5. RODAPÉ ---
      doc.setFontSize(7);
      doc.text("Este documento é um parecer técnico emitido pela Real Frio, Lda para instrução de processos de sinistro junto de seguradoras.", pageWidth / 2, 285, { align: "center" });

      doc.save(`RELATORIO_PERITAGEM_${quote.code}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar relatório de peritagem.");
    } finally {
      setIsExportingInsurance(false);
    }
  };

  const handleDownloadStandard = async () => {
    setIsExportingPDF(true);
    try {
      const doc = await generateStandardPDF();
      if (doc) doc.save(`ORCAMENTO_${quote?.code}.pdf`);
    } finally {
      setIsExportingPDF(false);
    }
  };

  if (loading) return <div className="h-full flex justify-center items-center py-40"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  if (!quote) return <div className="p-10 text-center uppercase font-black text-slate-300">Orçamento não encontrado</div>;

  const netValue = quote.total_amount / 1.23;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-2 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/quotes')} className="p-3 bg-white dark:bg-slate-900 text-slate-500 rounded-2xl shadow-sm border dark:border-slate-800 transition-all hover:bg-slate-50 active:scale-95">
            <ArrowLeft size={22} />
          </button>
          <div className="flex gap-2">
            <button onClick={() => navigate(`/quotes/${id}/edit`)} className="p-3.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl shadow-md border dark:border-slate-700 hover:bg-blue-50 transition-all">
              <Edit2 size={20}/>
            </button>
            <button onClick={generateInsurancePDF} disabled={isExportingInsurance} className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-md border border-indigo-500 hover:bg-indigo-700 disabled:opacity-50 transition-all" title="Gerar Relatório de Seguro">
              {isExportingInsurance ? <Loader2 className="animate-spin" size={20} /> : <InsuranceIcon size={20}/>}
            </button>
            <button onClick={handleDownloadStandard} disabled={isExportingPDF} className="p-3.5 bg-white dark:bg-slate-800 text-blue-600 rounded-2xl shadow-md border dark:border-slate-700 hover:bg-blue-50 disabled:opacity-50 transition-all">
              {isExportingPDF ? <Loader2 className="animate-spin" size={20} /> : <Printer size={20}/>}
            </button>
            <button onClick={() => setShowDeleteModal(true)} className="p-3.5 bg-white dark:bg-slate-800 text-rose-500 rounded-2xl shadow-md border dark:border-slate-700 hover:bg-rose-50 transition-all">
              <Trash2 size={20}/>
            </button>
          </div>
        </div>
        
        <div className="px-1">
           <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">
             Cotação {quote.code}
           </h1>
           <div className="flex items-center gap-2 mt-1">
             <span className={`text-[10px] font-black uppercase tracking-widest ${
               quote.status === QuoteStatus.ACEITE ? 'text-emerald-500' : 
               quote.status === QuoteStatus.PENDENTE ? 'text-blue-500' : 'text-rose-500'
             }`}>
               {quote.status}
             </span>
             <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800"></span>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real Frio Tech</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-all">
            <button onClick={() => setExpandedClient(!expandedClient)} className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3 text-left min-w-0">
                <Building2 className="text-blue-500 flex-shrink-0" size={20} />
                <div className="min-w-0">
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Cliente</h3>
                  <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{quote.client?.name}</p>
                </div>
              </div>
              <div>{expandedClient ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}</div>
            </button>
            {expandedClient && (
              <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl space-y-3">
                    <div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Firma</p><p className="text-xs font-bold dark:text-slate-300 uppercase leading-snug">{quote.client?.billing_name || quote.client?.name}</p></div>
                    <div className="flex items-start gap-2 pt-2 border-t border-slate-100 dark:border-slate-800"><MapPin size={12} className="text-indigo-500 mt-0.5" /><div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Localização</p><p className="text-xs font-bold dark:text-slate-300 uppercase leading-snug">{quote.establishment?.name || 'Sede / Principal'}</p></div></div>
                </div>
              </div>
            )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-all">
            <button onClick={() => setExpandedEquip(!expandedEquip)} className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3 text-left min-w-0">
                <HardDrive className="text-emerald-500 flex-shrink-0" size={20} />
                <div className="min-w-0">
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Equipamento</h3>
                  <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{quote.equipment?.type || 'Sem Ativo'}</p>
                </div>
              </div>
              <div>{expandedEquip ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}</div>
            </button>
            {expandedEquip && (
              <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
                {quote.equipment ? (
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Marca</p><p className="text-[11px] font-bold dark:text-slate-300 uppercase">{quote.equipment.brand || '---'}</p></div>
                      <div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Modelo</p><p className="text-[11px] font-bold dark:text-slate-300 uppercase">{quote.equipment.model || '---'}</p></div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Nº de Série</p><p className="text-[11px] font-black text-blue-600 dark:text-blue-400 font-mono uppercase">{quote.equipment.serial_number || '---'}</p></div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sem equipamento vinculado</p>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      {/* PERITAGEM TÉCNICA */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-all">
          <button onClick={() => setExpandedTechnical(!expandedTechnical)} className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-3 text-left min-w-0">
              <Stethoscope className="text-orange-500 flex-shrink-0" size={20} />
              <div className="min-w-0">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Peritagem Técnica</h3>
                <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">Problema & Causa</p>
              </div>
            </div>
            <div>{expandedTechnical ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}</div>
          </button>
          {expandedTechnical && (
            <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
               <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl space-y-6">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                       Problema Detetado
                    </p>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase leading-relaxed">
                       {quote.detected_problem || "NÃO REGISTADO NA FICHA TÉCNICA."}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                       Causa Provável
                    </p>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase leading-relaxed">
                       {quote.cause || "NÃO REGISTADA NA FICHA TÉCNICA."}
                    </p>
                  </div>
               </div>
            </div>
          )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
         <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <h3 className="text-sm font-black dark:text-white uppercase tracking-widest">Detalhamento S/ IVA</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase">{quote.items?.length || 0} itens</span>
         </div>
         <div className="p-8 space-y-4">
            {(quote.items || []).map(item => (
              <div key={item.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-transparent hover:border-blue-100 transition-all group">
                 <div className="min-w-0 mr-4">
                    <p className="text-xs font-black dark:text-white uppercase truncate">{item.name}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{item.quantity} UN x {item.unit_price.toFixed(2)}€</p>
                 </div>
                 <p className="text-sm font-black text-blue-600 dark:text-blue-400">{(item.quantity * item.unit_price).toFixed(2)}€</p>
              </div>
            ))}
         </div>
      </div>

      <div className="bg-slate-900 dark:bg-slate-950 p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Total (Valor Líquido)</p>
            <h2 className="text-4xl font-black">{netValue.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</h2>
            <p className="text-[8px] font-bold text-red-400 uppercase mt-3 tracking-widest">* Aos valores apresentados acresce o IVA de 23%</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-10">
            <button onClick={() => handleUpdateStatus(QuoteStatus.ACEITE)} disabled={actionLoading || quote.status === QuoteStatus.ACEITE} className="flex items-center justify-center gap-2 py-4 bg-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50">
              <ThumbsUp size={16} /> Aceite
            </button>
            <button onClick={() => handleUpdateStatus(QuoteStatus.REJEITADO)} disabled={actionLoading || quote.status === QuoteStatus.REJEITADO} className="flex items-center justify-center gap-2 py-4 bg-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50">
              <ThumbsDown size={16} /> Rejeitar
            </button>
          </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className={`w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner`}>
                <ShieldAlert size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Eliminar Orçamento</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8 uppercase px-4">Esta operação é IRREVERSÍVEL. Deseja prosseguir?</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase rounded-2xl active:scale-95 transition-all">CANCELAR</button>
                <button onClick={handleDelete} disabled={actionLoading} className="py-4 bg-red-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50">
                  {actionLoading ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'ELIMINAR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteDetail;
