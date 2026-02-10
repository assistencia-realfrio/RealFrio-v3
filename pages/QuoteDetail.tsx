
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, FileText, Coins, Check, X, Mail, Download, 
  Printer, Loader2, Building2, MapPin, Calculator, Edit2, Trash2, 
  AlertTriangle, ThumbsUp, ThumbsDown, HardDrive, Tag, ChevronDown, ChevronUp,
  ShieldAlert, ExternalLink
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Estados para quadros colapsáveis
  const [expandedClient, setExpandedClient] = useState(false);
  const [expandedEquip, setExpandedEquip] = useState(false);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await mockData.getQuoteById(id);
      setQuote(data);
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

  // Função auxiliar para obter o URL correto (Produção vs Local)
  const getPublicLink = () => {
    if (!id) return '';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const baseUrl = isLocalhost ? window.location.origin : 'https://realfrio.vercel.app';
    return `${baseUrl}/#/proposal/${id}`;
  };

  const generatePDF = async () => {
    if (!quote) return;
    
    const publicUrl = getPublicLink();
    setIsExportingPDF(true); 
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20; 
      const brandColor = [157, 28, 36];
      const blackColor = [0, 0, 0];

      // --- CABEÇALHO ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.text("REAL FRIO, LDA", margin, 20);
      
      doc.setFontSize(8);
      doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
      doc.text("ASSISTÊNCIA TÉCNICA E REFRIGERAÇÃO", margin, 25);

      doc.setFontSize(10);
      doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
      doc.text(`ORÇAMENTO: ${quote.code}`, pageWidth - margin, 20, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.text(`Data: ${new Date(quote.created_at).toLocaleDateString('pt-PT')}`, pageWidth - margin, 25, { align: "right" });

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(margin, 30, pageWidth - margin, 30);

      // --- BLOCO INFO CLIENTE E ATIVO ---
      let currentY = 42;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("DADOS DO CLIENTE", margin, currentY);
      doc.setFont("helvetica", "normal");
      doc.text((quote.client?.name || "---").toUpperCase(), margin, currentY + 7);
      doc.setFontSize(8);
      doc.text(`Local: ${quote.establishment?.name || 'SEDE / PRINCIPAL'}`, margin, currentY + 16);

      const col2X = pageWidth / 2 + 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("EQUIPAMENTO / ATIVO", col2X, currentY);
      doc.setFont("helvetica", "normal");
      doc.text((quote.equipment?.type || "NÃO ESPECIFICADO").toUpperCase(), col2X, currentY + 7);
      doc.setFontSize(8);
      doc.text(`Marca/Mod: ${quote.equipment?.brand || '---'} / ${quote.equipment?.model || '---'}`, col2X, currentY + 12);
      doc.text(`Nº Série: ${quote.equipment?.serial_number || '---'}`, col2X, currentY + 17);

      // --- TEXTO INTRODUTÓRIO ---
      currentY += 32;
      doc.setFontSize(10);
      const introText = "Após exame técnico minucioso e deteção das anomalias, apresentamos o orçamento líquido para a reparação pretendida:";
      const splitIntro = doc.splitTextToSize(introText, pageWidth - (margin * 2));
      doc.text(splitIntro, margin, currentY);

      // --- TABELA DE ITENS ---
      currentY += 12;
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
        head: [['REF', 'DESIGNAÇÃO / ACESSÓRIOS', 'QTD', 'P. UNIT (LÍQUIDO)', 'TOTAL (LÍQUIDO)']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [40, 50, 65], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 8, cellPadding: 3, textColor: [0, 0, 0], lineColor: [200, 200, 200] },
        columnStyles: { 0: { cellWidth: 20 }, 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } }
      });

      // --- TOTAL LÍQUIDO ---
      let finalY = (doc as any).lastAutoTable.finalY + 10;
      const subtotal = quote.items?.reduce((acc, i) => acc + (i.quantity * i.unit_price), 0) || 0;
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("TOTAL (VALOR LÍQUIDO):", pageWidth - margin - 60, finalY, { align: "right" });
      doc.text(`${subtotal.toFixed(2)} €`, pageWidth - margin, finalY, { align: "right" });
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.text("* Aos valores acima apresentados acresce o IVA à taxa legal de 23%.", pageWidth - margin, finalY + 8, { align: "right" });

      // --- QR CODE E LINKS ---
      finalY += 25;
      const boxHeight = 35;
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, finalY, pageWidth - (margin * 2), boxHeight, 3, 3, 'FD');

      const qrDataUrl = await QRCode.toDataURL(publicUrl, { margin: 0, width: 100 });
      doc.addImage(qrDataUrl, 'PNG', margin + 4, finalY + 4, 27, 27);

      const textX = margin + 35;
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(15, 23, 42);
      doc.text("APROVAÇÃO ONLINE / DIGITAL", textX, finalY + 10);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(71, 85, 105);
      doc.text("Utilize o QR Code ao lado ou o link abaixo para aprovar digitalmente este orçamento:", textX, finalY + 16);
      doc.setFont("courier", "normal"); doc.setFontSize(7);
      const splitUrl = doc.splitTextToSize(publicUrl, pageWidth - textX - margin);
      doc.text(splitUrl, textX, finalY + 23);

      // --- RODAPÉ ---
      doc.setTextColor(100, 100, 100); doc.setFontSize(7); doc.setFont("helvetica", "normal");
      doc.text("Real Frio, Lda • NIF: 504 221 445 • Rua Diogo de Azambuja, 2500-170 Caldas da Rainha • Tel: 262 824 521", pageWidth / 2, 287, { align: "center" });

      doc.save(`ORCAMENTO_${quote.code}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar PDF.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const [isExportingPDF, setIsExportingPDF] = useState(false);

  if (loading) return <div className="h-full flex justify-center items-center py-40"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!quote) return <div className="p-10 text-center uppercase font-black text-slate-300">Não encontrado</div>;

  const netValue = quote.total_amount / 1.23;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-2 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-3 bg-white dark:bg-slate-900 text-slate-500 rounded-2xl shadow-sm border dark:border-slate-800 transition-all hover:bg-slate-50 active:scale-95"><ArrowLeft size={22} /></button>
          <div className="flex gap-2">
            <button onClick={() => navigate(`/quotes/${id}/edit`)} className="p-3.5 sm:p-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl shadow-md border dark:border-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-all" title="Editar"><Edit2 size={20}/></button>
            <button onClick={generatePDF} disabled={isExportingPDF} className="p-3.5 sm:p-4 bg-white dark:bg-slate-800 text-blue-600 rounded-2xl shadow-md border dark:border-slate-700 hover:bg-blue-50 disabled:opacity-50" title="Imprimir">{isExportingPDF ? <Loader2 className="animate-spin" size={20} /> : <Printer size={20}/></button>
            <button onClick={() => setShowDeleteModal(true)} className="p-3.5 sm:p-4 bg-white dark:bg-slate-800 text-rose-500 rounded-2xl shadow-md border dark:border-slate-700 hover:bg-rose transition-all" title="Eliminar"><Trash2 size={20}/></button>
          </div>
        </div>
        <div className="px-1">
           <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">Proposta {quote.code}</h1>
           <div className="flex items-center gap-2 mt-1">
             <span className={`text-[10px] font-black uppercase tracking-widest ${quote.status === QuoteStatus.ACEITE ? 'text-emerald-500' : quote.status === QuoteStatus.PENDENTE ? 'text-blue-500' : 'text-rose-500'}`}>{quote.status}</span>
             <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800"></span>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real Frio Tech</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* QUADRO CLIENTE */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-all">
            <button onClick={() => setExpandedClient(!expandedClient)} className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3 text-left min-w-0">
                <Building2 className="text-blue-500 flex-shrink-0" size={20} />
                <div className="min-w-0">
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Cliente</h3>
                  <div onClick={(e) => { e.stopPropagation(); navigate(`/clients/${quote.client_id}`); }} className="flex items-center gap-1.5 group/link cursor-pointer">
                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate group-hover/link:text-blue-600 transition-colors">{quote.client?.name}</p>
                    <ExternalLink size={10} className="text-slate-300 group-hover/link:text-blue-500" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">{expandedClient ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}</div>
            </button>
            {expandedClient && (
              <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl space-y-3">
                    <div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Entidade / Firma</p><p className="text-xs font-bold dark:text-slate-300 uppercase leading-snug">{quote.client?.billing_name || quote.client?.name}</p></div>
                    <div className="flex items-start gap-2 pt-2 border-t border-slate-100 dark:border-slate-800"><MapPin size={12} className="text-indigo-500 mt-0.5" /><div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Localização</p><p className="text-xs font-bold dark:text-slate-300 uppercase leading-snug">{quote.establishment?.name || 'Sede / Principal'}</p></div></div>
                </div>
              </div>
            )}
        </div>

        {/* QUADRO ATIVO */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-all">
            <button onClick={() => setExpandedEquip(!expandedEquip)} className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3 text-left min-w-0"><HardDrive className="text-emerald-500 flex-shrink-0" size={20} /><div className="min-w-0"><h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Equipamento</h3>{quote.equipment ? (<div onClick={(e) => { e.stopPropagation(); navigate(`/equipments/${quote.equipment_id}`); }} className="flex items-center gap-1.5 group/link cursor-pointer"><p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate group-hover/link:text-emerald-600 transition-colors">{quote.equipment.type}</p><ExternalLink size={10} className="text-slate-300 group-hover/link:text-blue-500" /></div>) : (<p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase truncate">Sem Ativo</p>)}</div></div>
              <div className="flex items-center gap-2">{expandedEquip ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}</div>
            </button>
            {expandedEquip && (
              <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
                {quote.equipment ? (<div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl space-y-3"><div className="grid grid-cols-2 gap-4"><div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Marca</p><p className="text-[11px] font-bold dark:text-slate-300 uppercase">{quote.equipment.brand || '---'}</p></div><div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Modelo</p><p className="text-[11px] font-bold dark:text-slate-300 uppercase">{quote.equipment.model || '---'}</p></div></div><div className="pt-2 border-t border-slate-100 dark:border-slate-800"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Número de Série (S/N)</p><p className="text-[11px] font-black text-blue-600 dark:text-blue-400 font-mono tracking-tighter uppercase">{quote.equipment.serial_number || '---'}</p></div></div>) : (<div className="p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800"><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sem equipamento vinculado</p></div>)}
              </div>
            )}
        </div>
      </div>

      <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 rounded-[2rem] border border-slate-100 dark:border-slate-800">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Notas do Orçamento</p>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 italic px-2 leading-relaxed">"{quote.description}"</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
         <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <h3 className="text-sm font-black dark:text-white uppercase tracking-widest">Detalhamento S/ IVA</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase">{quote.items?.length} itens</span>
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
            <button onClick={() => handleUpdateStatus(QuoteStatus.ACEITE)} disabled={actionLoading || quote.status === QuoteStatus.ACEITE} className="flex items-center justify-center gap-2 py-4 bg-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"><ThumbsUp size={16} /> Aceite</button>
            <button onClick={() => handleUpdateStatus(QuoteStatus.REJEITADO)} disabled={actionLoading || quote.status === QuoteStatus.REJEITADO} className="flex items-center justify-center gap-2 py-4 bg-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50"><ThumbsDown size={16} /> Rejeitar</button>
          </div>
          <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
             <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2"><ExternalLink size={10} /> Link Público de Aprovação</p>
             <div className="flex items-center justify-between gap-2 bg-black/30 p-2 rounded-lg"><span className="text-[8px] text-slate-400 truncate flex-1 font-mono">{getPublicLink()}</span><button onClick={() => navigator.clipboard.writeText(getPublicLink())} className="text-[8px] font-bold text-white uppercase bg-white/10 px-2 py-1 rounded hover:bg-white/20">Copiar</button></div>
          </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"><div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-200"><div className="p-8 text-center"><div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><ShieldAlert size={32} /></div><h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Eliminar Orçamento</h3><p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8 uppercase px-4">Esta operação é IRREVERSÍVEL. Deseja prosseguir?</p><div className="grid grid-cols-2 gap-3"><button onClick={() => setShowDeleteModal(false)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase rounded-2xl active:scale-95 transition-all">CANCELAR</button><button onClick={handleDelete} disabled={actionLoading} className="py-4 bg-red-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50">{actionLoading ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'ELIMINAR'}</button></div></div></div></div>
      )}
    </div>
  );
};

export default QuoteDetail;
