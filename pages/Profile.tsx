
import React, { useEffect, useState } from 'react';
import { 
  User, Mail, Shield, LogOut, Briefcase, Clock, 
  CheckCircle, Lock, Key, AlertCircle, Check, 
  Loader2, MapPin, Palmtree, Plus, 
  Sparkles, X, Edit2, Download, Upload, FileSpreadsheet,
  Bell, BellOff, BellRing, Settings2, AlertTriangle,
  SendHorizontal
} from 'lucide-react';
import { mockData } from '../services/mockData';
import { notificationService } from '../services/notificationService';
import { useNavigate } from 'react-router-dom';
import { Vacation, VacationStatus, Profile as UserProfile } from '../types';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [editName, setEditName] = useState('');
  const [userVacations, setUserVacations] = useState<Vacation[]>([]);
  const [vacationLoading, setVacationLoading] = useState(false);
  const [newVacation, setNewVacation] = useState({ start_date: '', end_date: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados de Notificações
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    const u = mockData.getSession();
    if (u) {
      setUser(u);
      setEditName(u.full_name || '');
      fetchUserVacations(u);
      checkNotificationStatus();
    }
  }, []);

  const checkNotificationStatus = () => {
    if (!('Notification' in window)) {
      setPushStatus('unsupported');
      return;
    }
    setPushStatus(Notification.permission as any);
  };

  const handleRequestNotifications = async () => {
    setIsSubscribing(true);
    try {
      const granted = await notificationService.requestPermission();
      setPushStatus(Notification.permission as any);

      if (granted) {
        // Tentar subscrever para Push real (Backgound)
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          try {
            const registration = await navigator.serviceWorker.ready;
            // Chave pública genérica para permitir a subscrição inicial
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: 'BEl62vp9IH1w94S_7pQ3U656A74377F7A74377F7A74377F7A74377F7A74377F7A' 
            });
            await mockData.savePushSubscription(user.id, subscription);
          } catch (pushErr) {
            console.warn("Push subscription falhou, mas notificações locais funcionarão:", pushErr);
          }
        }
        
        setSuccess("Notificações ativadas!");
        notificationService.notify(
          "Sistema Ativo", 
          `Olá ${user.full_name}, as notificações foram configuradas com sucesso.`
        );
      }
    } catch (err) {
      console.error("Falha ao configurar notificações:", err);
      setError("Erro ao configurar notificações.");
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleTestNotification = async () => {
    if (Notification.permission !== 'granted') {
       const granted = await notificationService.requestPermission();
       if (!granted) return;
    }
    
    // Usar o serviço central para garantir que o teste reflete a realidade
    await notificationService.notify(
      "Teste de Alerta 🚨", 
      "Se está a ver isto, o motor de avisos da Real Frio está a comunicar corretamente com o seu dispositivo.",
      "/profile"
    );
  };

  const fetchUserVacations = async (currentUser: any) => {
    setVacationLoading(true);
    try {
      const allVacations = await mockData.getVacations();
      const filtered = allVacations.filter(v => v.user_id === currentUser.id);
      setUserVacations(filtered.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()));
    } catch (err) {
      console.error("Erro ao carregar férias", err);
    } finally {
      setVacationLoading(false);
    }
  };

  const handleLogout = async () => {
    await mockData.signOut();
    navigate('/login');
    window.location.reload();
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await mockData.updateProfile(user.id, { full_name: editName });
      setUser({ ...user, full_name: editName });
      setIsEditing(false);
      setSuccess("Perfil atualizado!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Falha ao atualizar.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setError("As senhas não coincidem."); return; }
    setLoading(true);
    try {
      const { error: updateError } = await mockData.updatePassword(passwordForm.newPassword);
      if (updateError) throw updateError;
      setSuccess("Senha atualizada!");
      setIsChangingPassword(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVacation = async () => {
    if (!newVacation.start_date || !newVacation.end_date) return;
    setVacationLoading(true);
    try {
      await mockData.createVacation({ user_id: user.id, user_name: user.full_name, start_date: newVacation.start_date, end_date: newVacation.end_date, store: 'Todas', status: VacationStatus.APROVADA });
      setNewVacation({ start_date: '', end_date: '' });
      await fetchUserVacations(user);
    } catch (err) {
      setError("Erro ao registar férias.");
    } finally {
      setVacationLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 px-2">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight px-1">O Meu Perfil</h1>
      
      {/* CARD IDENTIDADE */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden transition-all">
        <div className="bg-[#0f172a] dark:bg-blue-600 h-32 w-full"></div>
        <div className="px-10 pb-10 relative">
          <div className="mt-8 flex flex-col items-start gap-1">
            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="w-full flex items-center gap-3"><input autoFocus className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter bg-slate-50 dark:bg-slate-950 px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 flex-1" value={editName} onChange={e => setEditName(e.target.value)} /><button type="submit" className="p-3 bg-blue-600 text-white rounded-xl shadow-lg active:scale-95"><Check size={20}/></button><button type="button" onClick={() => setIsEditing(false)} className="p-3 bg-slate-100 text-slate-400 rounded-xl active:scale-95"><X size={20}/></button></form>
            ) : (
              <div className="group cursor-pointer" onClick={() => setIsEditing(true)}><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none flex items-center gap-3">{user?.full_name}<Edit2 size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" /></h2><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Técnico Autorizado</p></div>
            )}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-black uppercase tracking-widest mt-4 border border-blue-100 dark:border-blue-900/30"><Shield size={10} />{user?.role?.toUpperCase()}</div>
          </div>
        </div>
      </div>

      {/* FEEDBACKS */}
      {error && (<div className="p-5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-3xl flex items-center gap-4 text-red-600 dark:text-red-400 animate-shake mx-1"><AlertCircle size={22} /><p className="text-[10px] font-black uppercase tracking-widest">{error}</p></div>)}
      {success && (<div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-3xl flex items-center gap-4 text-emerald-600 dark:text-emerald-400 mx-1"><CheckCircle size={22} /><p className="text-[10px] font-black uppercase tracking-widest">{success}</p></div>)}

      {/* CENTRO DE NOTIFICAÇÕES */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 p-8 space-y-6 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center shadow-inner">
              <BellRing size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-[0.1em] leading-none">Centro de Alertas</h3>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase mt-1.5 tracking-widest">Push do Sistema</p>
            </div>
          </div>
          
          {pushStatus === 'granted' ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl border border-emerald-100 dark:border-emerald-800">
               <CheckCircle size={14} />
               <span className="text-[9px] font-black uppercase tracking-widest">Ativo</span>
            </div>
          ) : (
            <button 
              onClick={handleRequestNotifications}
              disabled={isSubscribing || pushStatus === 'unsupported'}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubscribing ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
              {pushStatus === 'denied' ? 'DESBLOQUEAR ALERTAS' : 'ATIVAR NOTIFICAÇÕES'}
            </button>
          )}
        </div>
        
        {pushStatus === 'granted' && (
          <button 
            onClick={handleTestNotification}
            className="w-full flex items-center justify-center gap-3 py-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-[0.98]"
          >
            <SendHorizontal size={14} />
            Testar Sistema de Alertas
          </button>
        )}
        
        {pushStatus === 'denied' && (
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-800 flex items-start gap-3">
             <AlertTriangle size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
             <p className="text-[9px] font-bold text-orange-700 dark:text-orange-400 uppercase leading-relaxed">
               Bloqueou as notificações no seu navegador. Para receber alertas de novas OS, aceda às definições do site e permita "Notificações".
             </p>
          </div>
        )}
      </div>

      {/* SEGURANÇA */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 p-8 space-y-8 transition-all">
        <div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center shadow-inner"><Lock size={24} /></div><div><h3 className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-[0.1em] leading-none">Segurança</h3><p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase mt-1.5 tracking-widest">Gestão de Acesso</p></div></div>{!isChangingPassword && (<button onClick={() => setIsChangingPassword(true)} className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-xl transition-all">Alterar Senha</button>)}</div>
        {isChangingPassword && (<form onSubmit={handlePasswordUpdate} className="space-y-4 animate-in slide-in-from-top-2 duration-300 bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem]"><div className="space-y-4"><div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nova Senha</label><input required type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} className="w-full px-5 py-4 bg-white dark:bg-slate-900 border-none rounded-2xl text-sm font-bold outline-none dark:text-white" /></div><div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Confirmar Senha</label><input required type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} className="w-full px-5 py-4 bg-white dark:bg-slate-900 border-none rounded-2xl text-sm font-bold outline-none dark:text-white" /></div></div><div className="flex gap-3 pt-2"><button type="button" onClick={() => setIsChangingPassword(false)} className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all">Cancelar</button><button type="submit" disabled={loading} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">{loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}ATUALIZAR SENHA</button></div></form>)}
      </div>

      {/* FÉRIAS */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 p-8 space-y-8 transition-all">
        <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center shadow-inner"><Palmtree size={24} /></div><div><h3 className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-[0.1em] leading-none">Minhas Férias</h3><p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase mt-1.5 tracking-widest">Ausências Planeadas</p></div></div>
        <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[2rem] space-y-6"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Início</label><input type="date" value={newVacation.start_date} onChange={e => setNewVacation({...newVacation, start_date: e.target.value})} className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 border-none rounded-xl text-xs font-black dark:text-white outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" /></div><div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Fim</label><input type="date" value={newVacation.end_date} onChange={e => setNewVacation({...newVacation, end_date: e.target.value})} className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 border-none rounded-xl text-xs font-black dark:text-white outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" /></div></div><button type="button" onClick={handleAddVacation} disabled={vacationLoading} className="w-full py-4.5 bg-[#0f172a] dark:bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-[0.98]"><Plus size={16} /> REGISTAR AUSÊNCIA</button></div>
        <div className="space-y-3">
           {userVacations.length === 0 ? (<div className="py-10 text-center opacity-20"><Palmtree size={32} className="mx-auto mb-2" /><p className="text-[9px] font-black uppercase tracking-widest">Sem ausências registadas</p></div>) : (
             userVacations.map((v) => (
               <div key={v.id} className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.8rem] shadow-sm hover:border-blue-100 transition-all group"><div className="flex items-center gap-5"><div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all"><Palmtree size={20} /></div><div><p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{new Date(v.start_date).toLocaleDateString()} <span className="mx-2 text-slate-300">➜</span> {new Date(v.end_date).toLocaleDateString()}</p><p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Ausência Global</p></div></div></div>
             ))
           )}
        </div>
      </div>

      <button onClick={handleLogout} className="w-full flex items-center justify-center gap-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 py-6 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-red-100 shadow-xl shadow-red-500/5 active:scale-[0.98] transition-all"><LogOut size={22} /><span>Terminar Sessão</span></button>
    </div>
  );
};

export default Profile;
