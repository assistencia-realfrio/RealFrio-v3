
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-10 h-10 text-blue-600 animate-spin" /></div>;
  if (!quote) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400 font-bold uppercase">Proposta não encontrada ou link inválido.</div>;

  if (successMode === 'accept') {
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
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
    <div className="min-h-screen bg-gray-50 font-sans text-slate-900">
      <div className="max-w-2xl mx-auto bg-white min-h-screen shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-8 border-b border-gray-100 flex flex-col items-center text-center bg-white">
          <BrandLogo variant="dark" size="lg" className="mb-4" />
          <div className="inline-block bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">Proposta Comercial</div>
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Orçamento #{quote.code}</h2>
          <p className="text-xs text-slate-400 font-bold uppercase mt-1">Data: {new Date(quote.created_at).toLocaleDateString('pt-PT')}</p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-10 space-y-8 flex-1">
          {isReadOnly && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 ${quote.status === QuoteStatus.ACEITE ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {quote.status === QuoteStatus.ACEITE ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
              <div>
                <p className="text-xs font-black uppercase tracking-widest">Estado da Proposta</p>
                <p className="text-sm font-bold">{quote.status === QuoteStatus.ACEITE ? 'JÁ APROVADA' : 'REJEITADA'}</p>
              </div>
            </div>
          )}

          {/* Client & Asset Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-2 mb-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <Building2 size={12} /> Cliente
              </div>
              <p className="font-bold text-sm uppercase text-slate-800 leading-tight">{quote.client?.name}</p>
              <div className="flex items-center gap-1 mt-2 text-slate-500 text-xs">
                <MapPin size={12} /> {quote.establishment?.name || 'Sede'}
              </div>
            </div>
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-2 mb-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <HardDrive size={12} /> Equipamento
              </div>
              <p className="font-bold text-sm uppercase text-slate-800 leading-tight">{quote.equipment?.type || 'Geral'}</p>
              <p className="text-xs text-slate-500 mt-1 uppercase">{quote.equipment?.brand} {quote.equipment?.model}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Detalhamento</h3>
            <div className="space-y-3">
              {quote.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-sm">
                  <div className="flex-1 pr-4">
                    <p className="font-bold text-slate-700 uppercase">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{item.quantity} UN x {item.unit_price.toFixed(2)}€</p>
                  </div>
                  <div className="font-black text-slate-900">{(item.quantity * item.unit_price).toFixed(2)}€</div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t-2 border-slate-100 flex justify-between items-end">
              <div className="text-right w-full">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Estimado (c/ IVA)</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{quote.total_amount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</p>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="bg-blue-50 p-5 rounded-3xl text-[10px] text-blue-800 leading-relaxed font-medium">
            <strong>Nota:</strong> O presente orçamento serve apenas para estimativa, podendo ter uma variação máxima de 10%. 
            A validade desta proposta é de 30 dias.
          </div>

          {/* Actions */}
          {!isReadOnly && (
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Assine para Aceitar</p>
                <SignatureCanvas 
                  label="Assinatura do Responsável"
                  onSave={setSignature}
                  onClear={() => setSignature(null)}
                  initialValue={signature}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleReject}
                  disabled={isSubmitting}
                  className="py-4 bg-white border-2 border-red-100 text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-colors active:scale-95"
                >
                  Rejeitar
                </button>
                <button 
                  onClick={handleAccept}
                  disabled={isSubmitting || !signature}
                  className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin mx-auto"/> : 'Aceitar Proposta'}
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-slate-900 p-6 text-center">
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Powered by Real Frio Tech</p>
        </div>
      </div>
    </div>
  );
};

export default PublicQuoteView;
