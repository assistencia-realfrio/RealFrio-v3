
import React, { useState } from 'react';
import { 
  DatabaseZap, 
  Upload, 
  ShieldCheck, 
  AlertTriangle, 
  History, 
  RefreshCw,
  HardDriveDownload,
  ShieldAlert,
  Loader2,
  X,
  Stethoscope,
  Wrench,
  CheckCircle2,
  Terminal,
  AlertCircle,
  Check,
  Info,
  Beaker,
  Sparkles
} from 'lucide-react';
import { mockData } from '../services/mockData';

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

  const colors = {
    danger: { bg: 'bg-red-500', text: 'text-red-600', icon: 'text-red-500', light: 'bg-red-50' },
    warning: { bg: 'bg-orange-500', text: 'text-orange-600', icon: 'text-orange-500', light: 'bg-orange-50' },
    info: { bg: 'bg-blue-600', text: 'text-blue-600', icon: 'text-blue-500', light: 'bg-blue-50' }
  }[variant];

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-200">
        <div className="p-8 text-center">
          <div className={`w-16 h-16 ${colors.light} dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner`}>
            {variant === 'danger' ? <ShieldAlert className={colors.icon} size={32} /> : variant === 'warning' ? <AlertTriangle className={colors.icon} size={32} /> : <Info className={colors.icon} size={32} />}
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8 uppercase px-4">{message}</p>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={onCancel}
              className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase rounded-2xl active:scale-95 transition-all"
            >
              CANCELAR
            </button>
            <button 
              onClick={onConfirm}
              className={`py-4 ${colors.bg} text-white font-black text-[10px] uppercase rounded-2xl shadow-xl active:scale-95 transition-all`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Maintenance: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRepaired, setIsRepaired] = useState(false);

  // Estados para Controle de Modais de Confirmação
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning' | 'info';
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: '',
    variant: 'info',
    action: () => {}
  });

  const closeConfirm = () => setConfirmConfig(prev => ({ ...prev, isOpen: false }));

  const handleCreateRestorePoint = async () => {
    setLoading(true);
    setStatus("A recolher dados de todas as tabelas...");
    setProgress(20);
    setError(null);
    setIsRepaired(false);
    
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

  const executeRestore = async (file: File) => {
    setLoading(true);
    setError(null);
    setStatus("A validar integridade do ficheiro...");
    setProgress(5);
    setIsRepaired(false);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        if (!backup.data) throw new Error("Ficheiro de backup inválido.");
        
        await mockData.importFullSystemData(backup, (msg) => {
          setStatus(msg);
          setProgress(prev => Math.min(prev + 5, 98));
        });
        
        setProgress(100);
        setStatus("Sistema substituído com sucesso! Recarregando...");
        setTimeout(() => window.location.reload(), 2000);
      } catch (err: any) {
        setError(err.message || "Falha ao restaurar sistema.");
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreSystem = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConfirmConfig({
      isOpen: true,
      title: 'Aviso Crítico',
      message: 'Esta operação irá APAGAR PERMANENTEMENTE todos os dados atuais antes de carregar o backup. Deseja prosseguir?',
      confirmLabel: 'SUBSTITUIR TUDO',
      variant: 'danger',
      action: () => executeRestore(file)
    });
    
    // Limpar input para permitir selecionar o mesmo ficheiro se necessário
    e.target.value = '';
  };

  const executeRepair = async () => {
    setLoading(true);
    setError(null);
    setIsRepaired(false);
    setStatus("A iniciar diagnóstico...");
    setProgress(10);

    try {
      const count = await mockData.repairMissingSedes((msg) => {
        setStatus(msg);
        setProgress(prev => Math.min(prev + 2, 98));
      });
      
      setProgress(100);
      if (count > 0) {
        setStatus(`Reparação concluída! Criados ${count} locais sede.`);
        setIsRepaired(true);
      } else {
        setStatus("Diagnóstico concluído: Integridade verificada.");
      }
    } catch (err: any) {
      setError(err.message || "Erro durante a reparação.");
    } finally {
      setLoading(false);
    }
  };

  const handleRepairMissingSedes = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Reparação de Dados',
      message: 'Deseja iniciar a criação automática de sedes para clientes que não possuem local de intervenção?',
      confirmLabel: 'INICIAR REPARAÇÃO',
      variant: 'warning',
      action: executeRepair
    });
  };

  const executeSeeding = async () => {
    setLoading(true);
    setError(null);
    setProgress(5);
    try {
      await mockData.seedTestData((msg) => {
        setStatus(msg);
        setProgress(prev => Math.min(prev + 3, 98));
      });
      setProgress(100);
      setStatus("Seeding concluído com sucesso!");
    } catch (err: any) {
      setError(err.message || "Falha ao gerar dados de teste.");
    } finally {
      setLoading(false);
    }
  };

  const handleSeedTestData = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Dados de Demonstração',
      message: 'Deseja gerar 30 Ordens de Serviço fictícias (15 por loja) para fins de teste?',
      confirmLabel: 'GERAR DADOS',
      variant: 'info',
      action: executeSeeding
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <ConfirmDialog 
        {...confirmConfig} 
        onCancel={closeConfirm} 
        onConfirm={() => { closeConfirm(); confirmConfig.action(); }} 
      />

      <div className="px-1 flex flex-col gap-2">
         <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight text-center sm:text-left">Painel de Manutenção</h1>
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center sm:text-left">Gestão de Integridade e Pontos de Restauro</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CRIAR BACKUP */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <DatabaseZap size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Criar Ponto de Restauro</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-tight leading-relaxed mb-8 px-4">
            Gera uma fotografia total do sistema para salvaguarda externa. Recomendado antes de grandes alterações.
          </p>
          <button 
            onClick={handleCreateRestorePoint}
            disabled={loading}
            className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
          >
            <HardDriveDownload size={18} />
            GERAR BACKUP TOTAL
          </button>
        </div>

        {/* REPARAR INTEGRIDADE */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-indigo-100 dark:border-indigo-900/30 flex flex-col items-center text-center transition-colors">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <Stethoscope size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Reparar Locais em Falta</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-tight leading-relaxed mb-8 px-4">
            Cria automaticamente sedes para clientes importados que ficaram sem local de intervenção.
          </p>
          <button 
            onClick={handleRepairMissingSedes}
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : <Wrench size={18} />}
            {loading ? 'A PROCESSAR...' : 'EXECUTAR DIAGNÓSTICO'}
          </button>
        </div>

        {/* DADOS DE TESTE (NOVO) */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-emerald-100 dark:border-emerald-900/30 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <Beaker size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Seeding de Dados</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-tight leading-relaxed mb-8 px-4">
            Adiciona instantaneamente 30 Ordens de Serviço (15 CR / 15 PM) para testes de interface e relatórios.
          </p>
          <button 
            onClick={handleSeedTestData}
            disabled={loading}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
          >
            <Sparkles size={18} />
            GERAR 30 OS DE TESTE
          </button>
        </div>

        {/* RESTAURAR BACKUP */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-red-100 dark:border-red-900/30 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <ShieldAlert size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Substituir Sistema</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-tight leading-relaxed mb-8 px-4">
            Importa um backup e SUBSTITUI todos os dados atuais. CUIDADO: Os dados existentes serão apagados.
          </p>
          <label className={`w-full py-4 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border-2 border-dashed border-red-200 dark:border-red-900/50 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-50 transition-all flex items-center justify-center gap-3 cursor-pointer ${loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}>
            <Upload size={18} />
            FICHA DE RESTAURO
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
        <div className={`p-8 rounded-[2.5rem] border shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${error ? 'bg-red-50 border-red-100 dark:bg-red-950/20 dark:border-red-900/50' : 'bg-slate-900 text-white border-slate-800'}`}>
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 {error ? (
                   <AlertTriangle className="text-red-500" size={24} />
                 ) : loading ? (
                   <Loader2 className="text-blue-500 animate-spin" size={24} />
                 ) : isRepaired ? (
                   <CheckCircle2 className="text-emerald-500" size={24} />
                 ) : (
                   <ShieldCheck className="text-emerald-500" size={24} />
                 )}
                 <div>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${error ? 'text-red-900 dark:text-red-400' : 'text-slate-400'}`}>Estado da Operação</h4>
                    <p className={`text-sm font-black uppercase tracking-tight ${error ? 'text-red-600 dark:text-red-500' : 'text-white'}`}>
                      {error ? 'Erro de Ligação/Permissão' : status}
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
             <div className="mt-4 p-4 bg-white/10 dark:bg-black/20 rounded-xl border border-red-200/20">
               <div className="flex items-center gap-2 text-[9px] font-black text-red-400 uppercase tracking-widest mb-2">
                 <Terminal size={12} /> Log de Erro Técnico
               </div>
               <p className="text-[10px] font-mono text-red-500 leading-relaxed break-words">
                 {error}
               </p>
             </div>
           )}
        </div>
      )}

      {/* RECOMENDAÇÕES */}
      <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 transition-colors">
         <div className="flex items-center gap-3 mb-4 text-slate-400">
            <History size={16} />
            <h4 className="text-[10px] font-black uppercase tracking-widest">Recomendações de Segurança</h4>
         </div>
         <ul className="space-y-3">
            {[
              "A reparação utiliza a morada do cliente para criar o local de intervenção.",
              "Operações de manutenção exigem estabilidade de rede.",
              "A limpeza e o restauro ocorrem em tempo real na base de dados."
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3">
                 <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mt-1.5 flex-shrink-0"></div>
                 <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">{text}</p>
              </li>
            ))}
         </ul>
      </div>

      <div className="flex justify-center pt-4">
         <p className="text-[8px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.5em]">Real Frio Maintenance Agent v3.3</p>
      </div>
    </div>
  );
};

export default Maintenance;
