import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Building2, MapPin, HardDrive, Printer, Loader2, 
  Edit2, Trash2, ShieldAlert, ExternalLink, ThumbsUp, ThumbsDown,
  ChevronDown, ChevronUp, CheckCircle2, ShieldCheck, Sparkles, Check
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  const [expandedClient, setExpandedClient] = useState(false);
  const [expandedEquip, setExpandedEquip] = useState(false);

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
      // 1. Persistir na base de dados
      await mockData.verifyQuote(id);
      
      // 2. Atualizar estado local imediatamente para esconder o banner e mostrar o badge
      setQuote(prev => prev ? { ...prev, status: QuoteStatus.ACEITE } : null);
      
      // 3. Feedback visual
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err) {
      console.error("Erro na verificação:", err);
      alert("Erro ao validar orçamento. Verifique a sua ligação.");
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

  const generatePDF = async () => {
    if (!quote) return;
    const publicUrl = getPublicLink();
    setIsExportingPDF(true); 
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20; 
      const brandColor = [157, 28, 36];

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.text("REAL FRIO, LDA", margin, 20);
      
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text("ASSISTÊNCIA TÉCNICA E REFRIGERAÇÃO", margin, 25);

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`ORÇAMENTO: ${quote.code}`, pageWidth - margin, 20, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.text(`Data: ${new Date(quote.created_at).toLocaleDateString('pt-PT')}`, pageWidth - margin, 25, { align: "right" });

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, 30, pageWidth - margin, 30);

      let currentY = 42;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("DADOS DO CLIENTE", margin, currentY);
      doc.setFont("helvetica", "normal");
      doc.text((quote.client?.name || "---").toUpperCase(), margin, currentY + 7);
      doc.setFontSize(8);
      doc.text(`Local: ${quote.establishment?.name || 'SEDE / PRINCIPAL'}`, margin, currentY + 14);

      const col2X = pageWidth / 2 + 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("EQUIPAMENTO / ATIVO", col2X, currentY);
      doc.setFont("helvetica", "normal");
      doc.text((quote.equipment?.type || "NÃO ESPECIFICADO").toUpperCase(), col2X, currentY + 7);
      doc.setFontSize(8);
      doc.text(`Marca/Mod: ${quote.equipment?.brand || '---'} / ${quote.equipment?.model || '---'}`, col2X, currentY + 12);
      doc.text(`Nº Série: ${quote.equipment?.serial_number || '---'}`, col2X, currentY + 17);

      currentY += 32;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const introText = "Depois de examinadas todas as peças, detetadas as respetivas avarias, resultou o orçamento para reparação das suas máquinas que importa em:";
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
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } }
      });

      let finalY = (doc as any).lastAutoTable.finalY + 10;
      const subtotal = quote.items?.reduce((acc, i) => acc + (i.quantity * i.unit_price), 0) || 0;
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("TOTAL (VALOR LÍQUIDO):", pageWidth - margin - 65, finalY, { align: "right" });
      doc.text(`${subtotal.toFixed(2)} €`, pageWidth - margin, finalY, { align: "right" });
      
      doc.setFontSize(9);
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.text("* Aos valores apresentados acresce o IVA de 23%.", pageWidth - margin, finalY + 8, { align: "right" });

      finalY += 22;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      const disclaimerText = "Mais referimos que o presente orçamento serve apenas para estimativa, podendo ter uma variação, para mais ou para menos, no máximo de 10%. Para qualquer esclarecimento suplementar, utilize os contactos habituais. Pedimos-lhe que nos envie a resposta com a brevidade possível. Decorridos 30 dias, caso não nos responda por escrito, consideramos este orçamento sem efeito.";
      const splitDisclaimer = doc.splitTextToSize(disclaimerText, pageWidth - (margin * 2));
      doc.text(splitDisclaimer, margin, finalY);

      finalY += 25;
      const qrDataUrl = await QRCode.toDataURL(publicUrl, { margin: 1, width: 100 });
      doc.addImage(qrDataUrl, 'PNG', margin, finalY, 30, 30);
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("Digitalize para Aprovação Online", margin + 32, finalY + 12);
      doc.setFontSize(6);
      doc.text(publicUrl, margin + 32, finalY + 18, { maxWidth: 100 });

      doc.save(`ORCAMENTO_${quote.code}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar PDF.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const netValue = useMemo(() => {
    if (!quote) return 0;
    return quote.total_amount / 1.23;
  }, [quote]);

  if (loading) return (
    <div className="h-full flex justify-center items-center py-40">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  if (!quote) return (
    <div className="p-10 text-center uppercase font-black text-slate-300">
      Orçamento não encontrado
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-2 animate-in slide-in-from-bottom-2 duration-500">
      {/* TOAST SUCESSO VALIDAÇÃO */}
      {showSuccessToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-10 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 border border-emerald-500/50">
              <CheckCircle2 size={24} />
              <p className="text-xs font-black uppercase tracking-widest">Orçamento Validado com Sucesso!</p>
           </div>
        </div>
      )}

      {quote.status === QuoteStatus.AGUARDA_VALIDACAO && (
        <div className="bg-indigo-600 text-white p-6 rounded-[2.5rem] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in zoom-in-95 duration-500">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
               <Sparkles className="text-white" size={24} />
            </div>
            <div>
               <h3 className="font-black uppercase tracking-tight text-lg leading-tight">Aprovação Recente</h3>
               <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mt-1">Este orçamento foi aceite pelo cliente e aguarda validação interna.</p>
            </div>
          </div>
          <button 
            onClick={handleVerify}
            disabled={actionLoading}
            className="bg-white text-indigo-600 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg active:scale-95 disabled:opacity-50 whitespace-nowrap min-w-[200px]"
          >
            {actionLoading ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'CONFIRMAR RECEÇÃO'}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/quotes')} className="p-3 bg-white dark:bg-slate-900 text-slate-500 rounded-2xl shadow-sm border dark:border-slate-800 transition-all hover:bg-slate-50 active:scale-95">
            <ArrowLeft size={22} />
          </button>
          <div className="flex gap-2">
            <button onClick={() => navigate(`/quotes/${id}/edit`)} className="p-3.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl shadow-md border dark:border-slate-700 hover:bg-blue-50 transition-all">
              <Edit2 size={20}/>
            </button>
            <button onClick={generatePDF} disabled={isExportingPDF} className="p-3.5 bg-white dark:bg-slate-800 text-blue-600 rounded-2xl shadow-md border dark:border-slate-700 hover:bg-blue-50 disabled:opacity-50 transition-all">
              {isExportingPDF ? <Loader2 className="animate-spin" size={20} /> : <Printer size={20}/>}
            </button>
            <button onClick={() => setShowDeleteModal(true)} className="p-3.5 bg-white dark:bg-slate-800 text-rose-500 rounded-2xl shadow-md border dark:border-slate-700 hover:bg-rose-50 transition-all">
              <Trash2 size={20}/>
            </button>
          </div>
        </div>
        
        <div className="px-1">
           <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">
             Proposta {quote.code}
           </h1>
           <div className="flex items-center gap-2 mt-1">
             <span className={`text-[10px] font-black uppercase tracking-widest ${
               quote.status === QuoteStatus.ACEITE ? 'text-emerald-500' : 
               quote.status === QuoteStatus.PENDENTE ? 'text-blue-500' : 'text-rose-500'
             }`}>
               {quote.status}
             </span>
             {quote.status === QuoteStatus.ACEITE && (
               <>
                 <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800"></span>
                 <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                   <ShieldCheck size={10} /> Validado
                 </span>
               </>
             )}
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
          <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
             <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2"><ExternalLink size={10} /> Link Público de Aprovação</p>
             <div className="flex items-center justify-between gap-2 bg-black/30 p-2 rounded-lg">
                <span className="text-[8px] text-slate-400 truncate flex-1 font-mono">{getPublicLink()}</span>
                <button onClick={() => { navigator.clipboard.writeText(getPublicLink()); alert("Link copiado!"); }} className="text-[8px] font-bold text-white uppercase bg-white/10 px-2 py-1 rounded hover:bg-white/20">Copiar</button>
             </div>
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