import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Mail, Shield, UserCog, Plus, X, Lock, User, 
  AlertCircle, Sparkles, Edit2, ShieldAlert, LockKeyhole,
  Palmtree, Calendar, Trash2, Clock, History, Loader2,
  ChevronDown, Building2, Download, Upload, FileSpreadsheet,
  RotateCcw, Check, MapPin
} from 'lucide-react';
import { Profile, UserRole, Vacation, VacationStatus } from '../types';
import { mockData } from '../services/mockData';

const Users: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Estados para Gestão de Férias dentro do Modal
  const [userVacations, setUserVacations] = useState<Vacation[]>([]);
  const [vacationLoading, setVacationLoading] = useState(false);
  const [editingVacationId, setEditingVacationId] = useState<string | null>(null);
  const [newVacation, setNewVacation] = useState({
    start_date: '',
    end_date: '',
    notes: '',
    store: 'Caldas da Rainha'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states do Utilizador
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: UserRole.TECNICO,
    store: 'Caldas da Rainha'
  });

  useEffect(() => {
    const loadSessionAndUsers = async () => {
      setLoading(true);
      const session = mockData.getSession();
      setCurrentUser(session);
      
      const role = session?.role?.toLowerCase();
      if (role === UserRole.ADMIN) {
        try {
          const data = await mockData.getProfiles();
          setUsers(data);
        } catch (error) {
          console.error("Erro ao carregar utilizadores:", error);
        }
      }
      setLoading(false);
    };

    loadSessionAndUsers();
  }, []);

  useEffect(() => {
    if (editingUser) {
      fetchUserVacations();
    }
  }, [editingUser]);

  const fetchUsers = async () => {
    try {
      const data = await mockData.getProfiles();
      setUsers(data);
    } catch (error) {
      console.error("Erro ao recarregar utilizadores:", error);
    }
  };

  const fetchUserVacations = async () => {
    if (!editingUser) return;
    setVacationLoading(true);
    try {
      const allVacations = await mockData.getVacations();
      const filtered = allVacations.filter(v => v.user_name === editingUser.full_name);
      setUserVacations(filtered.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()));
    } catch (err) {
      console.error("Erro ao carregar férias do utilizador", err);
    } finally {
      setVacationLoading(false);
    }
  };

  const isAdmin = currentUser?.role?.toLowerCase() === UserRole.ADMIN;

  const handleOpenModal = (user?: Profile) => {
    setFormError(null);
    if (!isAdmin) {
      alert("Acesso negado: Apenas administradores podem gerir a equipa.");
      return;
    }

    if (user) {
      setEditingUser(user);
      setFormData({
        fullName: user.full_name || '',
        email: user.email || '',
        password: '', 
        role: user.role || UserRole.TECNICO,
        store: user.store || 'Caldas da Rainha'
      });
    } else {
      setEditingUser(null);
      setFormData({ fullName: '', email: '', password: '', role: UserRole.TECNICO, store: 'Caldas da Rainha' });
      setUserVacations([]);
    }
    setEditingVacationId(null);
    setNewVacation({ start_date: '', end_date: '', notes: '', store: 'Caldas da Rainha' });
    setShowModal(true);
  };

  const handleProcessUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (isSubmitting) return;
    
    if (!isAdmin) {
      setFormError("Operação não autorizada.");
      return;
    }

    if (!editingUser && formData.password.length < 6) {
      setFormError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editingUser) {
        const result: any = await mockData.updateProfile(editingUser.id, {
          full_name: formData.fullName,
          role: formData.role,
          store: formData.store
        });
        if (result.error) throw result.error;
      } else {
        const result: any = await mockData.signUp(
          formData.email,
          formData.password,
          formData.fullName,
          formData.role,
          formData.store
        );
        if (result.error) throw result.error;
      }
      
      setShowModal(false);
      await fetchUsers();
    } catch (error: any) {
      setFormError(error.message || "Falha ao processar utilizador.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveVacation = async () => {
    if (!editingUser || !newVacation.start_date || !newVacation.end_date) {
      alert("Preencha as datas obrigatórias.");
      return;
    }

    setVacationLoading(true);
    try {
      if (editingVacationId) {
        await mockData.updateVacation(editingVacationId, {
          start_date: newVacation.start_date,
          end_date: newVacation.end_date,
          notes: newVacation.notes,
          store: newVacation.store
        });
      } else {
        await mockData.createVacation({
          user_id: editingUser.id,
          user_name: editingUser.full_name,
          start_date: newVacation.start_date,
          end_date: newVacation.end_date,
          notes: newVacation.notes,
          store: newVacation.store,
          status: VacationStatus.APROVADA
        });
      }
      setNewVacation({ ...newVacation, start_date: '', end_date: '', notes: '', store: formData.store });
      setEditingVacationId(null);
      await fetchUserVacations();
    } catch (err: any) {
      alert("Erro ao guardar férias: " + (err.message || String(err)));
    } finally {
      setVacationLoading(false);
    }
  };

  const handleDeleteVacation = async (id: string) => {
    if (!id) return;
    if (window.confirm("Deseja eliminar definitivamente este período de férias?")) {
      setVacationLoading(true);
      try {
        await mockData.deleteVacation(id);
        await fetchUserVacations();
      } catch (err: any) {
        alert("Falha ao eliminar registo: " + (err.message || String(err)));
      } finally {
        setVacationLoading(false);
      }
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    const r = role?.toLowerCase();
    switch (r) {
      case UserRole.ADMIN: return 'bg-purple-100 text-purple-700 border-purple-200';
      case UserRole.BACKOFFICE: return 'bg-orange-100 text-orange-700 border-orange-200';
      case UserRole.TECNICO: return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-20">
         <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
         <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-4">A verificar permissões...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 uppercase tracking-tight">Equipa Técnica</h1>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">Gestão de Utilizadores e Acessos</p>
        </div>
        
        <button 
          type="button"
          onClick={() => handleOpenModal()}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-medium uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center shadow-lg active:scale-95"
        >
            <Plus size={16} className="mr-2" />
            Novo Utilizador
        </button>
      </div>

      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mx-1">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-300" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border-none bg-slate-50 rounded-xl text-xs font-medium focus:ring-4 focus:ring-blue-500/10 outline-none uppercase transition-all"
            placeholder="Pesquisar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 mx-1">
           <UserCog size={40} className="mx-auto text-slate-100 mb-4" />
           <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Nenhum utilizador encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-1">
          {filteredUsers.map((user) => (
            <div 
              key={user.id} 
              className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 flex flex-col hover:shadow-xl transition-all relative overflow-hidden group animate-in fade-in duration-300"
            >
              <div className="absolute top-6 right-6 flex items-center gap-2">
                 <span className={`text-[8px] px-2 py-1 rounded-full font-medium border uppercase tracking-widest ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                 </span>
                 <button 
                  type="button"
                  onClick={() => handleOpenModal(user)}
                  className="p-1.5 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                 >
                    <Edit2 size={12} />
                 </button>
              </div>

              <div className="flex items-center mb-6 mt-2">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                   <span className="text-lg font-semibold">{user.full_name?.charAt(0) || '?'}</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-base font-semibold text-slate-900 uppercase tracking-tighter leading-none">{user.full_name}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] text-emerald-600 flex items-center font-medium uppercase tracking-widest">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span> Ativo
                    </span>
                    <span className="text-[8px] text-slate-300 font-medium uppercase">|</span>
                    <span className="text-[9px] text-blue-600 font-medium uppercase tracking-widest">{user.store === 'Caldas da Rainha' ? 'CR' : user.store === 'Porto de Mós' ? 'PM' : 'GERAL'}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 mt-auto">
                <div className="flex items-center text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                  <Mail size={14} className="mr-3 text-slate-400" />
                  <span className="truncate lowercase">{user.email}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50 flex-shrink-0">
                 <div>
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-widest">
                      {editingUser ? `Ficha Técnica: ${editingUser.full_name}` : 'Registo de Novo Técnico'}
                    </h3>
                    <p className="text-[8px] font-medium text-blue-500 uppercase flex items-center gap-1 mt-1">
                      <Sparkles size={10} /> {editingUser ? 'Gestão de Perfil e Ausências' : 'Novo Acesso ao Sistema'}
                    </p>
                 </div>
                 <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 p-2 transition-colors"><X size={24}/></button>
              </div>
              
              <div className="overflow-y-auto p-8 space-y-8 no-scrollbar">
                {formError && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 animate-shake">
                    <AlertCircle className="text-red-500" size={20} />
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-tight">{formError}</p>
                  </div>
                )}

                <form onSubmit={handleProcessUser} className="space-y-5">
                   <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">Informações de Perfil</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input 
                            required 
                            type="text" 
                            value={formData.fullName}
                            onChange={e => setFormData({...formData, fullName: e.target.value})}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-xl text-sm font-medium uppercase outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                          />
                        </div>
                      </div>

                      <div className="lowercase-container">
                        <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input 
                            required 
                            disabled={!!editingUser}
                            type="email" 
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all disabled:opacity-50" 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Loja de Referência *</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <select 
                            value={formData.store}
                            onChange={e => setFormData({...formData, store: e.target.value})}
                            className="w-full pl-12 pr-10 py-4 bg-slate-50 border-none rounded-xl text-sm font-medium uppercase outline-none appearance-none"
                          >
                             <option value="Caldas da Rainha">CALDAS DA RAINHA</option>
                             <option value="Porto de Mós">PORTO DE MÓS</option>
                             <option value="Todas">TODAS AS LOJAS (ADMIN)</option>
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cargo / Permissões</label>
                        <select 
                          value={formData.role}
                          onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                          className="w-full px-5 py-4 bg-slate-50 border-none rounded-xl text-sm font-medium uppercase outline-none appearance-none"
                        >
                           <option value={UserRole.TECNICO}>TÉCNICO OPERACIONAL</option>
                           <option value={UserRole.ADMIN}>ADMINISTRADOR GERAL</option>
                           <option value={UserRole.BACKOFFICE}>BACKOFFICE / APOIO</option>
                        </select>
                      </div>

                      {!editingUser && (
                        <div className="lowercase-container">
                          <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Senha de Acesso (Min 6 Caracteres)</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input 
                              required 
                              type="password" 
                              value={formData.password}
                              onChange={e => setFormData({...formData, password: e.target.value})}
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                            />
                          </div>
                        </div>
                      )}
                   </div>

                   <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 text-white py-5 rounded-2xl text-[10px] font-medium uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 mt-4"
                   >
                      {isSubmitting ? 'A PROCESSAR...' : editingUser ? 'GUARDAR ALTERAÇÕES PERFIL' : 'CRIAR CONTA UTILIZADOR'}
                   </button>
                </form>

                {editingUser && (
                  <div className="space-y-6 pt-4 border-t border-slate-100">
                    <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em]">Gestão de Ausências</h4>

                    <div className={`p-6 rounded-3xl border transition-all space-y-4 ${editingVacationId ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[8px] font-medium text-slate-400 uppercase mb-1">Início</label>
                            <input type="date" value={newVacation.start_date} onChange={e => setNewVacation({...newVacation, start_date: e.target.value})} className="w-full px-4 py-2.5 bg-white border-none rounded-xl text-xs font-medium outline-none" />
                          </div>
                          <div>
                            <label className="block text-[8px] font-medium text-slate-400 uppercase mb-1">Fim</label>
                            <input type="date" value={newVacation.end_date} onChange={e => setNewVacation({...newVacation, end_date: e.target.value})} className="w-full px-4 py-2.5 bg-white border-none rounded-xl text-xs font-medium outline-none" />
                          </div>
                          <div className="col-span-2">
                             <button type="button" onClick={handleSaveVacation} disabled={vacationLoading} className="w-full py-4 bg-slate-900 text-white rounded-xl text-[9px] font-medium uppercase tracking-widest shadow-md flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
                                <Plus size={14} /> ADICIONAR PERÍODO DE FÉRIAS
                             </button>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-2">
                       {userVacations.map((v) => (
                         <div key={v.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <div className="flex items-center gap-4">
                               <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center"><Palmtree size={18} /></div>
                               <div>
                                  <p className="text-[11px] font-medium text-slate-900 uppercase">{new Date(v.start_date).toLocaleDateString()} ➜ {new Date(v.end_date).toLocaleDateString()}</p>
                                  <p className="text-[9px] text-slate-400 font-medium uppercase">{v.store}</p>
                               </div>
                            </div>
                            <button type="button" onClick={() => handleDeleteVacation(v.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                         </div>
                       ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-slate-950 text-center flex-shrink-0">
                 <p className="text-[8px] font-medium text-slate-600 uppercase tracking-[0.4em]">Real Frio HR Management v3.0</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Users;