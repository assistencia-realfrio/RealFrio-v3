
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
  Sparkles,
  FileSearch,
  Users,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  User,
  ArrowRight,
  Edit2,
  Save,
  Copy,
  TerminalSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockData } from '../services/mockData';
import { Client } from '../types';

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

interface AuditClient {
  id: string;
  name: string;
  billing_name: string;
  phone: string;
  email: string;
  address: string;
  google_drive_link: string;
  nif: string;
  store: string;
  notes: string;
  missingFields: string[];
}

const Maintenance: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRepaired, setIsRepaired] = useState(false);
  
  // Estados de Colapso
  const [expandedAudit, setExpandedAudit] = useState(false);
  const [expandedBackup, setExpandedBackup] = useState(false);
  const [expandedRepair, setExpandedRepair] = useState(false);
  const [expandedRestore, setExpandedRestore] = useState(false);
  const [expandedSQL, setExpandedSQL] = useState(false);

  // Auditoria de Clientes
  const [auditResults, setAuditResults] = useState<{
    total: number;
    incompleteCount: number;
    missingBilling: number;
    missingPhone: number;
    missingEmail: number;
    missingMaps: number;
    missingDrive: number;
    missingNif: number;
    missingStore: number;
    clients: AuditClient[];
  } | null>(null);

  // Edição rápida de auditoria
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickEditForm, setQuickEditForm] = useState<Partial<Client>>({});

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
    
    e.target.value = '';
  };

  const handleAuditClients = async () => {
    setLoading(true);
    setStatus("A analisar base de dados de clientes...");
    setProgress(10);
    try {
      const clients = await mockData.getClients();
      setProgress(50);
      
      const stats = {
        total: clients.length,
        incompleteCount: 0,
        missingBilling: 0,
        missingPhone: 0,
        missingEmail: 0,
        missingMaps: 0,
        missingDrive: 0,
        missingNif: 0,
        missingStore: 0,
        clients: [] as AuditClient[]
      };

      clients.forEach(c => {
        const missingFields: string[] = [];
        if (!c.billing_name || c.billing_name === '---' || c.billing_name.trim() === '') { stats.missingBilling++; missingFields.push("Firma"); }
        if (!c.phone || c.phone === '---' || c.phone.trim() === '') { stats.missingPhone++; missingFields.push("Telefone"); }
        if (!c.email || c.email === '---' || c.email.trim() === '') { stats.missingEmail++; missingFields.push("Email"); }
        if (!c.address || c.address === '---' || c.address.trim() === '') { stats.missingMaps++; missingFields.push("Morada"); }
        if (!c.google_drive_link || c.google_drive_link.trim() === '') { stats.missingDrive++; missingFields.push("Drive"); }
        if (!c.nif || c.nif === '---' || c.nif.trim() === '') { stats.missingNif++; missingFields.push("NIF"); }
        if (!c.store || c.store.trim() === '') { stats.missingStore++; missingFields.push("Loja"); }
        
        if (missingFields.length > 0) {
          stats.incompleteCount++;
          stats.clients.push({
            id: c.id,
            name: c.name,
            billing_name: c.billing_name || '',
            phone: c.phone || '',
            email: c.email || '',
            address: c.address || '',
            google_drive_link: c.google_drive_link || '',
            nif: c.nif || '',
            store: c.store || '',
            notes: c.notes || '',
            missingFields
          });
        }
      });

      setAuditResults(stats);
      setProgress(100);
      setStatus("Auditoria de clientes concluída.");
    } catch (err: any) {
      setError("Erro na auditoria.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuickEdit = (client: AuditClient) => {
    setQuickEditId(client.id);
    setQuickEditForm({
      billing_name: client.billing_name,
      phone: client.phone,
      email: client.email,
      address: client.address,
      google_drive_link: client.google_drive_link,
      nif: client.nif,
      store: client.store,
      notes: client.notes
    });
  };

  const handleSaveQuickEdit = async (clientId: string) => {
    setLoading(true);
    setStatus("A atualizar dados do cliente...");
    try {
      await mockData.updateClient(clientId, quickEditForm);
      setQuickEditId(null);
      setQuickEditForm({});
      await handleAuditClients();
    } catch (err: any) {
      setError("Erro ao guardar dados.");
      setLoading(false);
    }
  };

  const handleImportClientData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConfirmConfig({
      isOpen: true,
      title: 'Cruzamento de Dados',
      message: 'O ficheiro CSV será processado e os clientes serão atualizados com base no ID. Deseja prosseguir?',
      confirmLabel: 'IMPORTAR E CRUZAR',
      variant: 'info',
      action: () => {
        setLoading(true);
        setStatus("A processar ficheiro CSV...");
        setProgress(10);
        
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const csv = event.target?.result as string;
            const lines = csv.split('\n').filter(l => l.trim() !== '');
            if (lines.length < 2) throw new Error("CSV vazio ou sem cabeçalho.");
            
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const idIdx = headers.indexOf('id');
            if (idIdx === -1) throw new Error("Coluna 'id' obrigatória no CSV.");

            let updatedCount = 0;
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
              const clientId = values[idIdx];
              
              if (!clientId) continue;

              const updates: any = {};
              headers.forEach((h, idx) => {
                if (h === 'id') return;
                const fieldMap: Record<string, string> = {
                  'billing_name': 'billing_name',
                  'firma': 'billing_name',
                  'phone': 'phone',
                  'telefone': 'phone',
                  'email': 'email',
                  'address': 'address',
                  'morada': 'address',
                  'google_drive_link': 'google_drive_link',
                  'drive': 'google_drive_link',
                  'nif': 'nif',
                  'contribuinte': 'nif',
                  'store': 'store',
                  'loja': 'store'
                };
                if (fieldMap[h]) updates[fieldMap[h]] = values[idx];
              });

              if (Object.keys(updates).length > 0) {
                await mockData.updateClient(clientId, updates);
                updatedCount++;
              }
              
              const currentProgress = Math.round((i / lines.length) * 90);
              setProgress(currentProgress);
              setStatus(`A atualizar cliente ${i} de ${lines.length - 1}...`);
            }

            setProgress(100);
            setStatus(`Sucesso! Foram atualizados ${updatedCount} clientes.`);
            setAuditResults(null); 
          } catch (err: any) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        };
        reader.readAsText(file);
      }
    });
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

  const copySQL = () => {
    const sql = `ALTER TABLE service_orders REPLICA IDENTITY FULL;\nALTER TABLE os_activities REPLICA IDENTITY FULL;`;
    navigator.clipboard.writeText(sql);
    alert("Comando SQL copiado!");
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
        
        {/* HELP: CONFIGURAÇÃO SUPABASE REALTIME */}
        <div className="bg-slate-900 dark:bg-indigo-950 rounded-[2.5rem] shadow-xl border border-indigo-500/30 overflow-hidden flex flex-col transition-all md:col-span-2">
          <button 
            onClick={() => setExpandedSQL(!expandedSQL)}
            className="w-full p-8 flex items-center justify-between hover:bg-slate-800 dark:hover:bg-indigo-900/50 transition-colors"
          >
            <div className="flex items-center gap-4 text-white">
              <div className="w-12 h-12 bg-indigo-500/20 text-indigo-300 rounded-2xl flex items-center justify-center shadow-inner">
                <TerminalSquare size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-black uppercase tracking-tight">Configurar Realtime (SQL)</h3>
                <p className="text-[9px] font-bold text-indigo-300/60 uppercase tracking-widest">Para alertas e notificações</p>
              </div>
            </div>
            {expandedSQL ? <ChevronUp size={20} className="text-indigo-400" /> : <ChevronDown size={20} className="text-indigo-400" />}
          </button>
          
          {expandedSQL && (
            <div className="px-8 pb-8 space-y-6 animate-in slide-in-from-top-2 duration-200">
              <div className="p-4 bg-indigo-900/30 rounded-2xl border border-indigo-500/20">
                <p className="text-xs text-indigo-200 font-medium uppercase leading-relaxed mb-4">
                  Se não encontras a opção "Replica Identity" no painel, executa este comando no **SQL Editor** do Supabase para ativar as notificações em tempo real:
                </p>
                <div className="relative group">
                  <pre className="bg-black/40 p-5 rounded-xl text-[10px] font-mono text-indigo-300 overflow-x-auto border border-white/5 lowercase-container" style={{textTransform: 'none'}}>
                    {`ALTER TABLE service_orders REPLICA IDENTITY FULL;\nALTER TABLE os_activities REPLICA IDENTITY FULL;`}
                  </pre>
                  <button 
                    onClick={copySQL}
                    className="absolute top-3 right-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all shadow-lg"
                    title="Copiar SQL"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AUDITORIA DE CLIENTES */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-blue-100 dark:border-blue-900/30 overflow-hidden flex flex-col transition-all md:col-span-2">
          <button 
            onClick={() => setExpandedAudit(!expandedAudit)}
            className="w-full p-8 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shadow-inner">
                <FileSearch size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Auditoria de Clientes</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Identificar lacunas de dados</p>
              </div>
            </div>
            {expandedAudit ? <ChevronUp size={20} className="text-slate-300" /> : <ChevronDown size={20} className="text-slate-300" />}
          </button>
          
          {expandedAudit && (
            <div className="px-8 pb-8 space-y-6 animate-in slide-in-from-top-2 duration-200">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-tight leading-relaxed px-2">
                Analisa a base de dados para detetar fichas com dados de faturação ou links Drive em falta.
              </p>
              
              {auditResults && (
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 text-left space-y-2 border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-slate-400">Total Clientes:</span><span className="text-slate-900 dark:text-white">{auditResults.total}</span></div>
                    <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-red-500">Fichas Incompletas:</span><span className="text-red-600">{auditResults.incompleteCount}</span></div>
                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-x-4 gap-y-1">
                        <div className="text-[8px] font-bold text-slate-400 uppercase">Firma: {auditResults.missingBilling}</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase">Tel.: {auditResults.missingPhone}</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase">Email: {auditResults.missingEmail}</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase">Morada: {auditResults.missingMaps}</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase">Drive: {auditResults.missingDrive}</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase">NIF: {auditResults.missingNif}</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase">Loja: {auditResults.missingStore}</div>
                    </div>
                  </div>

                  {auditResults.clients.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-3">Detalhamento por Cliente</h4>
                      <div className="max-h-96 overflow-y-auto no-scrollbar space-y-2 pr-1">
                        {auditResults.clients.map(c => (
                          <div key={c.id} className={`p-4 bg-white dark:bg-slate-800 border rounded-2xl flex flex-col transition-all ${quickEditId === c.id ? 'border-blue-500 shadow-lg ring-1 ring-blue-500/20' : 'border-slate-100 dark:border-slate-700'}`}>
                            <div className="flex items-center justify-between group">
                              <div className="flex items-center gap-3 min-w-0">
                                 <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-400 flex items-center justify-center flex-shrink-0 group-hover:text-blue-500 transition-colors">
                                    <User size={16} />
                                 </div>
                                 <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{c.name}</p>
                                    {quickEditId !== c.id && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {c.missingFields.map(f => (
                                          <span key={f} className="text-[7px] font-black text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                            Falta: {f}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                 </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {quickEditId !== c.id ? (
                                  <>
                                    <button 
                                      onClick={() => handleStartQuickEdit(c)}
                                      className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                                      title="Preencher Dados"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <Link to={`/clients/${c.id}`} className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                                      <ArrowRight size={18} />
                                    </Link>
                                  </>
                                ) : (
                                  <button onClick={() => setQuickEditId(null)} className="p-2 text-slate-400 hover:text-red-500"><X size={18} /></button>
                                )}
                              </div>
                            </div>

                            {quickEditId === c.id && (
                              <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700 space-y-3 animate-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Nome Faturação / Firma</label>
                                    <input 
                                      type="text" 
                                      className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500/20"
                                      value={quickEditForm.billing_name}
                                      onChange={e => setQuickEditForm({...quickEditForm, billing_name: e.target.value})}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">NIF (Contribuinte)</label>
                                    <input 
                                      type="text" 
                                      className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500/20"
                                      value={quickEditForm.nif}
                                      onChange={e => setQuickEditForm({...quickEditForm, nif: e.target.value})}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Telefone Sede</label>
                                    <input 
                                      type="tel" 
                                      className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                                      value={quickEditForm.phone}
                                      onChange={e => setQuickEditForm({...quickEditForm, phone: e.target.value})}
                                    />
                                  </div>
                                  <div className="lowercase-container">
                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Email Faturação</label>
                                    <input 
                                      type="email" 
                                      className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                                      value={quickEditForm.email}
                                      onChange={e => setQuickEditForm({...quickEditForm, email: e.target.value})}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Loja de Atendimento</label>
                                    <select 
                                      className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500/20"
                                      value={quickEditForm.store}
                                      onChange={e => setQuickEditForm({...quickEditForm, store: e.target.value})}
                                    >
                                      <option value="">SELECIONE UMA LOJA</option>
                                      <option value="Caldas da Rainha">CALDAS DA RAINHA</option>
                                      <option value="Porto de Mós">PORTO DE MÓS</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Google Drive Cliente</label>
                                    <input 
                                      type="url" 
                                      placeholder="https://drive.google.com/..."
                                      className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                                      value={quickEditForm.google_drive_link}
                                      onChange={e => setQuickEditForm({...quickEditForm, google_drive_link: e.target.value})}
                                    />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Morada Sede / Link Maps</label>
                                    <input 
                                      type="text" 
                                      className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500/20"
                                      value={quickEditForm.address}
                                      onChange={e => setQuickEditForm({...quickEditForm, address: e.target.value})}
                                    />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Notas Gerais</label>
                                    <textarea 
                                      className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[60px]"
                                      value={quickEditForm.notes}
                                      onChange={e => setQuickEditForm({...quickEditForm, notes: e.target.value})}
                                      placeholder="Notas adicionais..."
                                    />
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleSaveQuickEdit(c.id)}
                                  disabled={loading}
                                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all mt-2"
                                >
                                  {loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                  GUARDAR ATUALIZAÇÃO
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                  onClick={handleAuditClients}
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <FileSearch size={18} />
                  EXECUTAR AUDITORIA
                </button>
                
                <label className={`w-full py-4 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-50 transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-95`}>
                  <FileSpreadsheet size={18} />
                  CRUZAR DADOS (CSV)
                  <input type="file" accept=".csv" className="hidden" onChange={handleImportClientData} disabled={loading} />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* PONTO DE RESTAURO (BACKUP) */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col transition-all">
          <button 
            onClick={() => setExpandedBackup(!expandedBackup)}
            className="w-full p-8 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl flex items-center justify-center shadow-inner">
                <DatabaseZap size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Salvaguarda Total</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Criar Ponto de Restauro</p>
              </div>
            </div>
            {expandedBackup ? <ChevronUp size={20} className="text-slate-300" /> : <ChevronDown size={20} className="text-slate-300" />}
          </button>

          {expandedBackup && (
            <div className="px-8 pb-8 space-y-6 animate-in slide-in-from-top-2 duration-200">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-tight leading-relaxed px-2">
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
          )}
        </div>

        {/* REPARAR LOCAIS */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-indigo-100 dark:border-indigo-900/30 overflow-hidden flex flex-col transition-all">
          <button 
            onClick={() => setExpandedRepair(!expandedRepair)}
            className="w-full p-8 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner">
                <Stethoscope size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Reparar Integridade</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Normalizar moradas e locais</p>
              </div>
            </div>
            {expandedRepair ? <ChevronUp size={20} className="text-slate-300" /> : <ChevronDown size={20} className="text-slate-300" />}
          </button>

          {expandedRepair && (
            <div className="px-8 pb-8 space-y-6 animate-in slide-in-from-top-2 duration-200">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-tight leading-relaxed px-2">
                Cria automaticamente sedes para clientes importados que ficaram sem local de intervenção.
              </p>
              <button 
                onClick={handleRepairMissingSedes}
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Wrench size={18} />}
                {loading ? 'A PROCESSAR...' : 'EXECUTAR DIAGNÓSTICO'}
              </button>
            </div>
          )}
        </div>

        {/* RESTAURAR BACKUP */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-red-100 dark:border-red-900/30 overflow-hidden flex flex-col transition-all md:col-span-2">
          <button 
            onClick={() => setExpandedRestore(!expandedRestore)}
            className="w-full p-8 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center shadow-inner">
                <ShieldAlert size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Restauro de Sistema</h3>
                <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest">Ação Crítica / Perda de Dados</p>
              </div>
            </div>
            {expandedRestore ? <ChevronUp size={20} className="text-slate-300" /> : <ChevronDown size={20} className="text-slate-300" />}
          </button>

          {expandedRestore && (
            <div className="px-8 pb-8 space-y-6 animate-in slide-in-from-top-2 duration-200">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-tight leading-relaxed px-2">
                Importa um backup e SUBSTITUI todos os dados atuais. CUIDADO: Os dados existentes serão apagados.
              </p>
              <label className={`w-full py-4 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border-2 border-dashed border-red-200 dark:border-red-900/50 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-50 transition-all flex items-center justify-center gap-3 cursor-pointer ${loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}>
                <Upload size={18} />
                FICHA DE RESTAURO
                <input type="file" accept=".rf-backup,.json" className="hidden" onChange={handleRestoreSystem} disabled={loading} />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* STATUS PANEL */}
      {(loading || status || error) && (
        <div className={`p-8 rounded-[2.5rem] border shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${error ? 'bg-red-50 border-red-100 dark:bg-red-950/20 dark:border-red-900/50' : 'bg-slate-900 text-white border-slate-800'}`}>
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 {error ? <AlertTriangle className="text-red-500" size={24} /> : loading ? <Loader2 className="text-blue-500 animate-spin" size={24} /> : isRepaired ? <CheckCircle2 className="text-emerald-500" size={24} /> : <ShieldCheck className="text-emerald-500" size={24} />}
                 <div>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${error ? 'text-red-900 dark:text-red-400' : 'text-slate-400'}`}>Estado da Operação</h4>
                    <p className={`text-sm font-black uppercase tracking-tight ${error ? 'text-red-600 dark:text-red-500' : 'text-white'}`}>
                      {error ? 'Erro de Ligação/Permissão' : status}
                    </p>
                 </div>
              </div>
              {error && <button onClick={() => setError(null)} className="p-2 text-red-300 hover:text-red-600"><X size={20} /></button>}
           </div>

           {loading && !error && (
             <div className="space-y-3">
                <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
                   <div className="bg-blue-600 h-full transition-all duration-500 ease-out shadow-[0_0_15px_rgba(37,99,235,0.5)]" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-[8px] font-black text-slate-500 text-right uppercase tracking-[0.3em]">{progress}% Processado</p>
             </div>
           )}

           {error && (
             <div className="mt-4 p-4 bg-white/10 dark:bg-black/20 rounded-xl border border-red-200/20">
               <div className="flex items-center gap-2 text-[9px] font-black text-red-400 uppercase tracking-widest mb-2"><Terminal size={12} /> Log de Erro Técnico</div>
               <p className="text-[10px] font-mono text-red-500 leading-relaxed break-words">{error}</p>
             </div>
           )}
        </div>
      )}

      {/* RECOMENDAÇÕES */}
      <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 transition-colors">
         <div className="flex items-center gap-3 mb-4 text-slate-400">
            <History size={16} />
            <h4 className="text-[10px] font-black uppercase tracking-widest">Dicas de Importação</h4>
         </div>
         <ul className="space-y-3">
            <li className="flex items-start gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mt-1.5 flex-shrink-0"></div>
               <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">O CSV para Clientes deve conter a coluna "id" (chave primária) e opcionalmente "billing_name", "phone", "email", "address" ou "google_drive_link".</p>
            </li>
            <li className="flex items-start gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mt-1.5 flex-shrink-0"></div>
               <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">A importação de dados em lote substitui apenas os campos fornecidos, mantendo os restantes intactos.</p>
            </li>
         </ul>
      </div>

      <div className="flex justify-center pt-4">
         <p className="text-[8px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.5em]">Real Frio Maintenance Agent v3.5</p>
      </div>
    </div>
  );
};

export default Maintenance;
