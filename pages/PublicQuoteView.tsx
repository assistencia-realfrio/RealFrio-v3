
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Building2, MapPin, HardDrive, CheckCircle2, X, AlertTriangle, Loader2
} from 'lucide-react';
import { mockData } from '../services/mockData';
import { Quote, QuoteStatus } from '../types';
import BrandLogo from '../components/BrandLogo';
import SignatureCanvas from '../components/SignatureCanvas';

const PublicQuoteView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [signature, setSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMode, setSuccessMode] = useState<'accept' | 'reject' | null>(null);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await mockData.getQuoteById(id!);
      setQuote(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!quote || !signature) {
      alert("Por favor, assine para confirmar.");
      return;
    }
    setIsSubmitting(true);
    try {
      await mockData.clientSignQuote(quote.id, signature);
      setSuccessMode('accept');
    } catch (e) {
      alert("Erro ao processar aceitação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!quote) return;
    if (!window.confirm("Tem a certeza que deseja rejeitar esta proposta?")) return;
    setIsSubmitting(true);
    try {
      await mockData.updateQuoteStatus(quote.id, QuoteStatus.REJEITADO);
      setSuccessMode('reject');
    } catch (e) {
      alert("Erro ao rejeitar proposta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="w-10 h-10 text-blue-600 animate-spin" /></div>;
  if (!quote) return <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-400 font-bold uppercase">Proposta não encontrada ou link inválido.</div>;

  if (successMode === 'accept') {
    return (
      <div className="h-screen bg-emerald-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6 shadow-xl">
          <CheckCircle2 size={48} />
        </div>
        <h1 className="text-3xl font-black text-emerald-900 uppercase tracking-tight mb-2">Proposta Aceite!</h1>
        <p className="text-emerald-700 font-medium max-w-md">Obrigado pela sua aprovação. A nossa equipa técnica foi notificada e dará seguimento ao processo.</p>
        <p className="mt-8 text-[10px] font-black text-emerald-400 uppercase tracking-widest">Pode fechar esta janela</p>
      </div>
    );
  }

  if (successMode === 'reject') {
    return (
      <div className="h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 mb-6">
          <X size={48} />
        </div>
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-2">Proposta Rejeitada</h1>
        <p className="text-gray-600 font-medium max-w-md">Registámos a sua decisão. Se mudar de ideias ou precisar de uma revisão, por favor contacte-nos.</p>
        <p className="mt-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pode fechar esta janela</p>
      </div>
    );
  }

  const isReadOnly = quote.status !== QuoteStatus.PENDENTE;

  return (
    <div className="h-full overflow-y-auto bg-gray-100 font-sans text-slate-900 selection:bg-blue-100 no-scrollbar">
      <div className="max-w-2xl mx-auto bg-white min-h-full shadow-2xl flex flex-col">
        {/* Header - Fixed aspect for document look */}
        <div className="p-8 sm:p-12 border-b border-gray-100 flex flex-col items-center text-center bg-white">
          <BrandLogo variant="dark" size="lg" className="mb-6" />
          <div className="inline-block bg-slate-900 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] mb-6 shadow-sm">Proposta Comercial</div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">Orçamento #{quote.code}</h2>
          <p className="text-[10px] text-slate-400 font-black uppercase mt-2 tracking-widest">Emitido em: {new Date(quote.created_at).toLocaleDateString('pt-PT')}</p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-12 space-y-10 flex-1">
          {isReadOnly && (
            <div className={`p-6 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-top-4 ${quote.status === QuoteStatus.ACEITE ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${quote.status === QuoteStatus.ACEITE ? 'bg-white' : 'bg-white shadow-sm'}`}>
                {quote.status === QuoteStatus.ACEITE ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Estado da Proposta</p>
                <p className="text-sm font-black uppercase">{quote.status === QuoteStatus.ACEITE ? 'PROPOSTA JÁ APROVADA' : 'ESTA PROPOSTA FOI REJEITADA'}</p>
              </div>
            </div>
          )}

          {/* Client & Asset Info - Two column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-3 text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">
                <Building2 size={14} className="text-blue-500" /> Cliente
              </div>
              <p className="font-black text-[13px] uppercase text-slate-800 dark:text-white leading-tight mb-2">{quote.client?.name}</p>
              <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400 text-[11px] font-medium italic">
                <MapPin size={14} className="mt-0.5 flex-shrink-0" /> 
                <span className="uppercase">{quote.establishment?.name || 'Sede / Principal'}</span>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-3 text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">
                <HardDrive size={14} className="text-emerald-500" /> Equipamento
              </div>
              <p className="font-black text-[13px] uppercase text-slate-800 dark:text-white leading-tight mb-2">{quote.equipment?.type || 'GERAL / INTERVENÇÃO'}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">
                {quote.equipment?.brand ? `${quote.equipment.brand} ${quote.equipment.model || ''}` : 'S/ REFERÊNCIA TÉCNICA'}
              </p>
            </div>
          </div>

          {/* Itemized List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Detalhamento de Peças e Serviços</h3>
               <span className="text-[9px] font-black text-slate-300 uppercase">{quote.items?.length} itens</span>
            </div>
            <div className="space-y-4">
              {quote.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start group">
                  <div className="flex-1 pr-6">
                    <p className="font-black text-[12px] text-slate-700 dark:text-slate-200 uppercase leading-tight group-hover:text-blue-600 transition-colors">{item.name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{item.quantity} UN • {item.unit_price.toFixed(2)}€/un</p>
                  </div>
                  <div className="font-black text-[13px] text-slate-900 dark:text-white">{(item.quantity * item.unit_price).toFixed(2)}€</div>
                </div>
              ))}
            </div>
            
            <div className="pt-8 mt-8 border-t-2 border-slate-100 flex flex-col items-end gap-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Estimado (Inc. IVA 23%)</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                    {quote.total_amount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
                <p className="text-[8px] font-bold text-slate-300 uppercase mt-1 italic">Variação máxima prevista de 10% s/ orçamento</p>
            </div>
          </div>

          {/* Notes Section */}
          {quote.description && (
            <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100/50">
               <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Notas do Técnico</p>
               <p className="text-xs font-medium text-blue-800 leading-relaxed uppercase italic">"{quote.description}"</p>
            </div>
          )}

          {/* Conditions */}
          <div className="bg-slate-50 p-6 rounded-[2rem] text-[9px] text-slate-500 leading-relaxed font-bold uppercase tracking-tight border border-slate-100">
            A validade desta proposta é de 30 dias. Os preços apresentados incluem a deslocação e mão de obra estimada para a resolução da anomalia descrita. Reservamo-nos o direito de ajustar o valor final em caso de detecção de anomalias ocultas durante a reparação.
          </div>

          {/* Validation Actions */}
          {!isReadOnly && (
            <div className="space-y-8 pt-6 pb-12 animate-in slide-in-from-bottom-6 duration-700">
              <div className="space-y-4">
                <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Área de Assinatura do Cliente</p>
                <SignatureCanvas 
                  label="Assinatura Digital"
                  onSave={setSignature}
                  onClear={() => setSignature(null)}
                  initialValue={signature}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleReject}
                  disabled={isSubmitting}
                  className="py-5 bg-white border-2 border-red-100 text-red-600 rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50"
                >
                  REJEITAR
                </button>
                <button 
                  onClick={handleAccept}
                  disabled={isSubmitting || !signature}
                  className="py-5 bg-emerald-600 text-white rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin mx-auto"/> : 'ACEITAR E ENVIAR'}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Document Footer */}
        <div className="bg-slate-900 p-8 text-center">
          <p className="text-[7px] font-black text-slate-600 uppercase tracking-[0.5em] mb-1">REAL FRIO - ASSISTÊNCIA TÉCNICA E REFRIGERAÇÃO</p>
          <p className="text-[7px] font-bold text-slate-700 uppercase tracking-widest leading-loose">
            Plataforma Real Frio Tech • Documento Gerado em Conformidade Digital
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicQuoteView;
