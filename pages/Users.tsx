
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Mail, Shield, UserCog, Plus, X, Lock, User, 
  AlertCircle, Sparkles, Edit2, ShieldAlert, LockKeyhole,
  Palmtree, Calendar, Clock, History, Loader2,
  ChevronDown, Building2, Download, Upload, FileSpreadsheet,
  RotateCcw, Check, MapPin, ChevronRight
} from 'lucide-react';
import { Profile, UserRole, Vacation, VacationStatus } from '../types';
import { mockData } from '../services/mockData';

const Users: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [userVacations, setUserVacations] = useState<Vacation[]>([]);
  const [vacationLoading, setVacationLoading] = useState(false);
  const [editingVacationId, setEditingVacationId] = useState<string | null>(null);
  const [newVacation, setNewVacation] = useState({ start_date: '', end_date: '', notes: '', store: 'Todas' });
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', role: UserRole.TECNICO, store: 'Caldas da Rainha' });

  useEffect(() => {
    const loadSessionAndUsers = async () => {
      setLoading(true);
      setCurrentUser(mockData.getSession());
      try { setUsers(await mockData.getProfiles()); } catch (error) { console.error(error); }
      setLoading(false);
    };
    loadSessionAndUsers();
  }, []);

  useEffect(() => { if (editingUser) fetchUserVacations(); }, [editingUser]);

  const fetchUserVacations = async () => {
    if (!editingUser) return;
    setVacationLoading(true);
    try {
      const allVacations = await mockData.getVacations();
      setUserVacations(allVacations.filter(v => v.user_id === editingUser.id).sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()));
    } finally { setVacationLoading(false); }
  };

  const isAdmin = currentUser?.role?.toLowerCase() === UserRole.ADMIN;

  const handleOpenModal = (user?: Profile) => {
    setFormError(null);
    if (!isAdmin && user && user.id !== currentUser?.id) { alert("Acesso negado."); return; }
    if (user) {
      setEditingUser(user);
      setFormData({ fullName: user.full_name || '', email: user.email || '', password: '', role: user.role || UserRole.TECNICO, store: user.store || 'Caldas da Rainha' });
    } else {
      if (!isAdmin) return;
      setEditingUser(null);
      setFormData({ fullName: '', email: '', password: '', role: UserRole.TECNICO, store: 'Caldas da Rainha' });
      setUserVacations([]);
    }
    setEditingVacationId(null);
    setNewVacation({ start_date: '', end_date: '', notes: '', store: 'Todas' });
    setShowModal(true);
  };

  const handleProcessUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingUser) {
        if (editingUser.id === currentUser?.id && formData.password) { await mockData.updatePassword(formData.password); }
        await mockData.updateProfile(editingUser.id, isAdmin ? { full_name: formData.fullName, role: formData.role, store: formData.store } : { full_name: formData.fullName });
      } else {
        await mockData.signUp(formData.email, formData.password, formData.fullName, formData.role, formData.store);
      }
      setShowModal(false);
      setUsers(await mockData.getProfiles());
    } catch (error: any) { setFormError(error.message); } finally { setIsSubmitting(false); }
  };

  const handleSaveVacation = async () => {
    if (!editingUser || !newVacation.start_date || !newVacation.end_date) return;
    setVacationLoading(true);
    try {
      if (editingVacationId) { await mockData.updateVacation(editingVacationId, { start_date: newVacation.start_date, end_date: newVacation.end_date, notes: newVacation.notes, store: 'Todas' }); }
      else { await mockData.createVacation({ user_id: editingUser.id, user_name: editingUser.full_name, start_date: newVacation.start_date, end_date: newVacation.end_date, notes: newVacation.notes, store: 'Todas', status: VacationStatus.APROVADA }); }
      setNewVacation({ ...newVacation, start_date: '', end_date: '', notes: '' });
      setEditingVacationId(null);
      await fetchUserVacations();
    } finally { setVacationLoading(false); }
  };

  if (loading) return (<div className="h-full flex flex-col items-center justify-center py-20"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Equipa Técnica</h1>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mt-0.5">Gestão de Utilizadores</p>
        </div>
        {isAdmin && (
          <button type="button" onClick={() => handleOpenModal()} className="bg-slate-900 dark:bg-blue-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 dark:hover:bg-blue-700 transition-all flex items-center shadow-xl active:scale-95">
            <Plus size={16} className="mr-2" />Novo Utilizador
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mx-1 transition-colors">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-300" />
          </div>
          <input 
            type="text" 
            className="block w-full pl-12 pr-4 py-4 border-none bg-slate-50 dark:bg-slate-950 rounded-xl text-xs font-black focus:ring-4 focus:ring-blue-500/10 outline-none uppercase transition-all dark:text-white" 
            placeholder="Pesquisar por nome..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="flex flex-col space-y-2 px-1">
        {users
          .filter(u => u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((user) => (
            <div 
              key={user.id} 
              onClick={() => handleOpenModal(user)}
              className="flex items-center justify-between p-4.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900 transition-all cursor-pointer active:scale-[0.99] group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all shadow-inner ${user.id === currentUser?.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600'} group-hover:bg-blue-600 group-hover:text-white`}>
                  <User size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                    {user.full_name}
                  </span>
                  {user.id === currentUser?.id && (
                    <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">A Minha Conta</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`hidden sm:inline-block text-[8px] px-2 py-0.5 rounded-full font-black border uppercase tracking-widest ${user.role?.toLowerCase() === UserRole.ADMIN ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'} dark:bg-slate-800 dark:border-slate-700`}>
                  {user.role}
                </span>
                <ChevronRight size={16} className="text-slate-200 dark:text-slate-700 group-hover:text-blue-500 transition-all" />
              </div>
            </div>
          ))}
          
        {users.filter(u => u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-800 transition-colors">
            <UserCog size={32} className="mx-auto text-gray-200 dark:text-slate-700 mb-4" />
            <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Nenhum utilizador encontrado</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/10">
              <div className="p-10 pb-8 border-b border-slate-50 dark:border-slate-800/50 flex justify-between items-start flex-shrink-0">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.1em]">{editingUser ? `FICHA TÉCNICA: ${editingUser.full_name}` : 'REGISTO DE NOVO TÉCNICO'}</h3>
                  <p className="text-[9px] font-black text-blue-500 uppercase flex items-center gap-1.5 mt-2 tracking-widest"><Sparkles size={12} /> GESTÃO DE PERFIL E AUSÊNCIAS</p>
                </div>
                <button type="button" onClick={() => setShowModal(false)} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><X size={28}/></button>
              </div>
              <div className="overflow-y-auto p-10 space-y-10 no-scrollbar">
                {formError && (<div className="bg-red-50 p-5 rounded-3xl flex items-center gap-4 text-red-600 animate-shake"><AlertCircle size={24} /><p className="text-[10px] font-black uppercase tracking-tight">{formError}</p></div>)}
                <form onSubmit={handleProcessUser} className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome Completo</label><input required type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-6 py-4.5 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-black uppercase outline-none dark:text-white" /></div>
                        <div className="lowercase-container"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email</label><input required disabled={!!editingUser} type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-6 py-4.5 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold disabled:opacity-50 dark:text-white outline-none" /></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Loja *</label><select disabled={!isAdmin} value={formData.store} onChange={e => setFormData({...formData, store: e.target.value})} className="w-full px-6 py-4.5 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-black appearance-none dark:text-white outline-none"><option value="Caldas da Rainha">CALDAS DA RAINHA</option><option value="Porto de Mós">PORTO DE MÓS</option><option value="Todas">TODAS</option></select></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Cargo</label><select disabled={!isAdmin} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="w-full px-6 py-4.5 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-black appearance-none dark:text-white outline-none"><option value={UserRole.TECNICO}>TÉCNICO</option><option value={UserRole.ADMIN}>ADMINISTRADOR</option></select></div>
                   </div>
                   <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.25em] shadow-2xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 mt-4">{editingUser ? 'GUARDAR ALTERAÇÕES' : 'CRIAR ACESSO'}</button>
                </form>
                {editingUser && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-3">GESTÃO DE AUSÊNCIAS (GLOBAL)<span className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></span></h4>
                    <div className="p-8 rounded-[2.5rem] bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Início</label><input type="date" value={newVacation.start_date} onChange={e => setNewVacation({...newVacation, start_date: e.target.value})} className="w-full px-6 py-4 bg-white dark:bg-slate-900 border-none rounded-2xl text-xs font-black outline-none dark:text-white" /></div>
                        <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Fim</label><input type="date" value={newVacation.end_date} onChange={e => setNewVacation({...newVacation, end_date: e.target.value})} className="w-full px-6 py-4 bg-white dark:bg-slate-900 border-none rounded-2xl text-xs font-black outline-none dark:text-white" /></div>
                        <div className="col-span-2 pt-2"><button type="button" onClick={handleSaveVacation} disabled={vacationLoading} className="w-full py-5 bg-slate-950 dark:bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-[0.98]"><Plus size={16} /> REGISTAR AUSÊNCIA</button></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                       {userVacations.length === 0 ? (<div className="py-10 text-center opacity-30"><Palmtree size={32} className="mx-auto mb-2" /><p className="text-[9px] font-black uppercase tracking-widest">Sem ausências registadas</p></div>) : (
                         userVacations.map((v) => (<div key={v.id} className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.8rem] shadow-sm"><div className="flex items-center gap-5"><div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center shadow-inner"><Palmtree size={20} /></div><div><p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{new Date(v.start_date).toLocaleDateString()} <span className="mx-2 text-slate-300">➜</span> {new Date(v.end_date).toLocaleDateString()}</p><p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ausência Geral</p></div></div></div>))
                       )}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-8 bg-slate-950 text-center flex-shrink-0"><p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.5em]">REAL FRIO HR MANAGEMENT V3.0</p></div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Users;
