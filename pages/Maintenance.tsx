
import React, { useState } from 'react';
import { 
  DatabaseZap, 
  Download, 
  Upload, 
  ShieldCheck, 
  AlertTriangle, 
  History, 
  RefreshCw,
  HardDriveDownload,
  ShieldAlert,
  Loader2,
  FileCheck,
  RotateCcw,
  X
} from 'lucide-react';
import { mockData } from '../services/mockData';

const Maintenance: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRestorePoint = async () => {
    setLoading(true);
    setStatus("A recolher dados de todas as tabelas...");
    setProgress(20);
    setError(null);
    
    try {
      const backup = await mockData.exportFullSystemData();
      setProgress(60);
      setStatus("A preparar ficheiro de segurança...");
      
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const date = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `REALFRIO_PONTO_RESTAURO_${date}.rf-backup`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setProgress(100);
      setStatus("Ponto de restauro criado e transferido com sucesso!");
    } catch (err: any) {
      setError(err.message || "Erro ao criar backup.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreSystem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("AVISO DE SUBSTITUIÇÃO TOTAL:\n\nEsta operação irá APAGAR PERMANENTEMENTE todos os dados atuais da base de dados antes de carregar o backup.\n\nTem a certeza que deseja prosseguir?")) {
      e.target.value = '';
      return;
    }

    setLoading(true);
    setError(null);
    setStatus("A validar integridade do ficheiro...");
    setProgress(5);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        
        if (!backup.data) {
          throw new Error("Ficheiro de backup inválido ou corrompido (falta secção 'data').");
        }

        setProgress(10);
        
        // Chamar a função de importação com Wipe total
        await mockData.importFullSystemData(backup, (msg) => {
          setStatus(msg);
          setProgress(prev => Math.min(prev + 5, 98));
        });
        
        setProgress(100);
        setStatus("Sistema substituído com sucesso! A aplicação irá recarregar em 3 segundos.");
        
        setTimeout(() => window.location.reload(), 3000);
      } catch (err: any) {
        setError(err.message || "Falha ao restaurar sistema. Verifique a consola para detalhes técnicos.");
        setLoading(false);
      } finally {
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="px-1 flex flex-col gap-2">
         <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-tight">Painel de Manutenção</h1>
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Gestão de Integridade e Pontos de Restauro</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CRIAR BACKUP */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <DatabaseZap size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Criar Ponto de Restauro</h3>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-tight leading-relaxed mb-8 px-4">
            Gera uma fotografia total do sistema para salvaguarda externa. Recomendado antes de grandes alterações.
          </p>
          <button 
            onClick={handleCreateRestorePoint}
            disabled={loading}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
          >
            <HardDriveDownload size={18} />
            GERAR BACKUP TOTAL
          </button>
        </div>

        {/* RESTAURAR BACKUP */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-red-100 flex flex-col items-center text-center relative overflow-hidden">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <ShieldAlert size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Substituir Sistema</h3>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-tight leading-relaxed mb-8 px-4">
            Importa um backup e SUBSTITUI todos os dados atuais. CUIDADO: Os dados existentes serão apagados.
          </p>
          <label className={`w-full py-4 bg-white text-red-600 border-2 border-dashed border-red-200 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-50 transition-all flex items-center justify-center gap-3 cursor-pointer ${loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}>
            <Upload size={18} />
            SELECIONAR FICHA DE RESTAURO
            <input 
              type="file" 
              accept=".rf-backup,.json" 
              className="hidden" 
              onChange={handleRestoreSystem}
              disabled={loading}
            />
          </label>
        </div>
      </div>

      {/* STATUS PANEL */}
      {(loading || status || error) && (
        <div className={`p-8 rounded-[2.5rem] border shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${error ? 'bg-red-50 border-red-100' : 'bg-slate-900 text-white border-slate-800'}`}>
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 {error ? (
                   <AlertTriangle className="text-red-500" size={24} />
                 ) : loading ? (
                   <Loader2 className="text-blue-500 animate-spin" size={24} />
                 ) : (
                   <ShieldCheck className="text-emerald-500" size={24} />
                 )}
                 <div>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${error ? 'text-red-900' : 'text-slate-400'}`}>Estado da Operação</h4>
                    <p className={`text-sm font-black uppercase tracking-tight ${error ? 'text-red-600' : 'text-white'}`}>
                      {error ? 'Erro de Execução' : status}
                    </p>
                 </div>
              </div>
              {error && (
                <button onClick={() => setError(null)} className="p-2 text-red-300 hover:text-red-600">
                   <X size={20} />
                </button>
              )}
           </div>

           {loading && !error && (
             <div className="space-y-3">
                <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
                   <div 
                    className="bg-blue-600 h-full transition-all duration-500 ease-out shadow-[0_0_15px_rgba(37,99,235,0.5)]" 
                    style={{ width: `${progress}%` }}
                   />
                </div>
                <p className="text-[8px] font-black text-slate-500 text-right uppercase tracking-[0.3em]">{progress}% Processado</p>
             </div>
           )}

           {error && (
             <p className="text-[10px] font-bold text-red-500 uppercase leading-relaxed mt-2 bg-white/50 p-4 rounded-xl border border-red-100">
               {error}
             </p>
           )}
        </div>
      )}

      {/* RECOMENDAÇÕES */}
      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
         <div className="flex items-center gap-3 mb-4 text-slate-400">
            <History size={16} />
            <h4 className="text-[10px] font-black uppercase tracking-widest">Recomendações de Segurança</h4>
         </div>
         <ul className="space-y-3">
            {[
              "A importação agora limpa a base de dados ANTES de inserir os novos registos.",
              "Isto garante que ficheiros de backup v2.x sejam restaurados sem conflitos de IDs.",
              "Os perfis de utilizadores também são atualizados para coincidir com o backup.",
              "Não interrompa a operação; a limpeza e o restauro ocorrem em menos de 30 segundos."
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3">
                 <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 flex-shrink-0"></div>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{text}</p>
              </li>
            ))}
         </ul>
      </div>

      <div className="flex justify-center pt-4">
         <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.5em]">Real Frio Wipe & Restore Agent v2.2</p>
      </div>
    </div>
  );
};

export default Maintenance;
