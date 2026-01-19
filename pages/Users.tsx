
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Mail, Shield, UserCog, Plus, X, Lock, User, 
  AlertCircle, Sparkles, Edit2, ShieldAlert, LockKeyhole,
  Palmtree, Calendar, Trash2, Clock, History, Loader2,
  ChevronDown, Building2, Download, Upload, FileSpreadsheet,
  RotateCcw, Check
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
    role: UserRole.TECNICO
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

  // Carregar férias quando o utilizador em edição muda
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
        role: user.role || UserRole.TECNICO
      });
    } else {
      setEditingUser(null);
      setFormData({ fullName: '', email: '', password: '', role: UserRole.TECNICO });
      setUserVacations([]);
    }
    setEditingVacationId(null);
    setNewVacation({ start_date: '', end_date: '', notes: '', store: 'Caldas da Rainha' });
    setShowModal(true);
  };

  const handleProcessUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    if (!isAdmin) {
      alert("Operação não autorizada.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editingUser) {
        const result = await mockData.updateProfile(editingUser.id, {
          full_name: formData.fullName,
          role: formData.role
        });
        if (result.error) throw result.error;
      } else {
        await mockData.signUp(
          formData.email,
          formData.password,
          formData.fullName,
          formData.role
        );
      }
      
      setShowModal(false);
      await fetchUsers();
    } catch (error: any) {
      alert("Erro ao processar utilizador: " + (error.message || "Falha na comunicação"));
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
      setNewVacation({ ...newVacation, start_date: '', end_date: '', notes: '' });
      setEditingVacationId(null);
      await fetchUserVacations();
    } catch (err: any) {
      alert("Erro ao guardar férias: " + (err.message || String(err)));
    } finally {
      setVacationLoading(false);
    }
  };

  const handleEditVacationClick = (v: Vacation) => {
    setEditingVacationId(v.id);
    setNewVacation({
      start_date: v.start_date,
      end_date: v.end_date,
      notes: v.notes || '',
      store: v.store
    });
    const modalContent = document.querySelector('.modal-scroll-area');
    if (modalContent) {
      modalContent.scrollTo({ top: 350, behavior: 'smooth' });
    }
  };

  const handleCancelVacationEdit = () => {
    setEditingVacationId(null);
    setNewVacation({ start_date: '', end_date: '', notes: '', store: 'Caldas da Rainha' });
  };

  const handleExportCSV = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setVacationLoading(true);
    try {
      const csv = await mockData.exportUserVacationsCSV(editingUser.full_name);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `FERIAS_${editingUser.full_name.replace(/\s+/g, '_').toUpperCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert("Falha ao exportar ficheiro.");
    } finally {
      setVacationLoading(false);
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingUser) return;

    setVacationLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const result = await mockData.importUserVacationsCSV(editingUser.id, editingUser.full_name, content);
        
        let msg = `${result.imported} períodos importados com sucesso.`;
        if (result.skipped > 0) {
          msg += `\n${result.skipped} registos ignorados por sobreposição de datas.`;
        }
        alert(msg);
        
        await fetchUserVacations();
      } catch (err: any) {
        alert("Erro na importação CSV: Verifique se o formato das colunas está correto.");
      } finally {
        setVacationLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteVacation = async (id: string) => {
    if (!id) return;
    
    if (window.confirm("Deseja eliminar definitivamente este período de férias?")) {
      setVacationLoading(true);
      try {
        await mockData.deleteVacation(id);
        
        if (editingVacationId === id) {
          setEditingVacationId(null);
          setNewVacation({ start_date: '', end_date: '', notes: '', store: 'Caldas da Rainha' });
        }
        
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

  const getStoreShortName = (store: string) => {
    if (!store) return '';
    if (store.includes('Rainha')) return 'RAINHA';
    if (store.includes('Mós')) return 'MÓS';
    return store.toUpperCase();
  };

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-20">
         <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">A verificar permissões...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Equipa Técnica</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Gestão de Utilizadores e Acessos</p>
        </div>
        
        <button 
          type="button"
          onClick={() => handleOpenModal()}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center shadow-lg active:scale-95"
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
            className="block w-full pl-10 pr-3 py-3 border-none bg-slate-50 rounded-xl text-xs font-bold focus:ring-4 focus:ring-blue-500/10 outline-none uppercase transition-all"
            placeholder="Pesquisar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 mx-1">
           <UserCog size={40} className="mx-auto text-slate-100 mb-4" />
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum utilizador encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-1">
          {filteredUsers.map((user) => (
            <div 
              key={user.id} 
              className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 flex flex-col hover:shadow-xl transition-all relative overflow-hidden group animate-in fade-in duration-300"
            >
              <div className="absolute top-6 right-6 flex items-center gap-2">
                 <span className={`text-[8px] px-2 py-1 rounded-full font-black border uppercase tracking-widest ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                 </span>
                 <button 
                  type="button"
                  onClick={() => handleOpenModal(user)}
                  className="p-1.5 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors ml-1"
                  title="Editar Perfil e Férias"
                 >
                    <Edit2 size={12} />
                 </button>
              </div>

              <div className="flex items-center mb-6 mt-2">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                   <span className="text-lg font-black">{user.full_name?.charAt(0) || '?'}</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tighter leading-none">{user.full_name}</h3>
                  <span className="text-[9px] text-emerald-600 flex items-center mt-1.5 font-black uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></span>
                    Ativo
                  </span>
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

      {/* MODAL CRIAR/EDITAR UTILIZADOR COM GESTÃO DE FÉRIAS */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50 flex-shrink-0">
                 <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                      {editingUser ? `Ficha Técnica: ${editingUser.full_name}` : 'Registo de Novo Técnico'}
                    </h3>
                    <p className="text-[8px] font-black text-blue-500 uppercase flex items-center gap-1 mt-1">
                      <Sparkles size={10} /> {editingUser ? 'Gestão de Perfil e Ausências' : 'Novo Acesso ao Sistema'}
                    </p>
                 </div>
                 <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-2"><X size={24}/></button>
              </div>
              
              <div className="overflow-y-auto p-8 space-y-8 no-scrollbar modal-scroll-area">
                {/* SECÇÃO PERFIL */}
                <form onSubmit={handleProcessUser} className="space-y-5">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">Informações de Perfil</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input 
                            required 
                            type="text" 
                            value={formData.fullName}
                            onChange={e => setFormData({...formData, fullName: e.target.value})}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-xl text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                          />
                        </div>
                      </div>

                      <div className="lowercase-container">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input 
                            required 
                            disabled={!!editingUser}
                            type="email" 
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all disabled:opacity-50" 
                          />
                        </div>
                      </div>

                      {!editingUser && (
                        <div className="lowercase-container">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Senha Inicial</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input 
                              required 
                              type="password" 
                              value={formData.password}
                              onChange={e => setFormData({...formData, password: e.target.value})}
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cargo</label>
                        <select 
                          value={formData.role}
                          onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                          className="w-full px-5 py-4 bg-slate-50 border-none rounded-xl text-sm font-black uppercase outline-none appearance-none"
                        >
                           <option value={UserRole.TECNICO}>TÉCNICO</option>
                           <option value={UserRole.ADMIN}>ADMINISTRADOR</option>
                           <option value={UserRole.BACKOFFICE}>BACKOFFICE</option>
                        </select>
                      </div>
                   </div>

                   <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 mt-2"
                   >
                      {isSubmitting ? 'A PROCESSAR...' : editingUser ? 'GUARDAR PERFIL' : 'REGISTAR UTILIZADOR'}
                   </button>
                </form>

                {/* SECÇÃO FÉRIAS (APENAS EDIÇÃO) */}
                {editingUser && (
                  <div className="space-y-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gestão de Férias e Ausências</h4>
                       {vacationLoading && <Loader2 size={14} className="animate-spin text-blue-500" />}
                    </div>

                    {/* Ações Rápidas CSV */}
                    <div className="flex gap-2">
                       <button 
                        type="button"
                        onClick={handleExportCSV}
                        disabled={vacationLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                       >
                          <Download size={14} /> EXPORTAR CSV
                       </button>
                       <label className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all cursor-pointer">
                          <Upload size={14} /> IMPORTAR CSV
                          <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleImportCSV} />
                       </label>
                    </div>

                    {/* Form de Registo/Edição de Férias */}
                    <div className={`p-6 rounded-3xl border transition-all space-y-4 ${editingVacationId ? 'bg-orange-50 border-orange-200' : 'bg-blue-50/50 border-blue-100'}`}>
                       <div className="flex justify-between items-center mb-2">
                          <p className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${editingVacationId ? 'text-orange-600' : 'text-blue-600'}`}>
                            {editingVacationId ? <Edit2 size={12} /> : <Plus size={12} />} 
                            {editingVacationId ? 'Editar Período Selecionado' : 'Marcar Novo Período'}
                          </p>
                          {editingVacationId && (
                            <button type="button" onClick={handleCancelVacationEdit} className="text-[8px] font-black text-orange-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                               <RotateCcw size={10} /> CANCELAR EDIÇÃO
                            </button>
                          )}
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Início *</label>
                            <input type="date" value={newVacation.start_date} onChange={e => setNewVacation({...newVacation, start_date: e.target.value})} className="w-full px-4 py-2.5 bg-white border-none rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-blue-200" />
                          </div>
                          <div>
                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Fim *</label>
                            <input type="date" value={newVacation.end_date} onChange={e => setNewVacation({...newVacation, end_date: e.target.value})} className="w-full px-4 py-2.5 bg-white border-none rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-blue-200" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Notas / Motivo</label>
                            <input type="text" placeholder="Ex: Férias de Verão..." value={newVacation.notes} onChange={e => setNewVacation({...newVacation, notes: e.target.value})} className="w-full px-4 py-2.5 bg-white border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-200" />
                          </div>
                          <div className="col-span-2 flex gap-3">
                             <button 
                              type="button"
                              onClick={handleSaveVacation} 
                              disabled={vacationLoading} 
                              className={`flex-1 py-4 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2 ${editingVacationId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                             >
                                {editingVacationId ? <Check size={14} /> : <Palmtree size={14} />}
                                {editingVacationId ? 'GUARDAR ALTERAÇÕES' : 'ADICIONAR PERÍODO'}
                             </button>
                             {editingVacationId && (
                               <button 
                                type="button"
                                onClick={() => handleDeleteVacation(editingVacationId)}
                                className="w-[56px] h-[56px] bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all flex items-center justify-center flex-shrink-0"
                               >
                                  <Trash2 size={20} />
                               </button>
                             )}
                          </div>
                       </div>
                    </div>

                    {/* Listagem de Férias do Utilizador - Visual Ajustado */}
                    <div className="space-y-2">
                       {userVacations.length === 0 ? (
                         <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                            <Clock size={24} className="mx-auto text-slate-200 mb-2" />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sem períodos registados</p>
                         </div>
                       ) : (
                         userVacations.map((v) => (
                           <div 
                             key={v.id} 
                             className={`flex items-center justify-between p-4 bg-white border rounded-[1.5rem] transition-all shadow-sm ${editingVacationId === v.id ? 'border-orange-500 ring-1 ring-orange-100' : 'border-slate-100 hover:border-blue-100'}`}
                           >
                              <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => handleEditVacationClick(v)}>
                                 <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${new Date(v.end_date) < new Date() ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {new Date(v.end_date) < new Date() ? <History size={18} /> : <Palmtree size={18} />}
                                 </div>
                                 <div className="min-w-0">
                                    <p className="text-[11px] font-black text-slate-900 uppercase">
                                      {new Date(v.start_date).toLocaleDateString()} <span className="mx-1 text-slate-300">➜</span> {new Date(v.end_date).toLocaleDateString()}
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[180px]">
                                      {v.notes ? v.notes : getStoreShortName(v.store)}
                                    </p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button 
                                  type="button"
                                  onClick={() => handleEditVacationClick(v)} 
                                  className={`p-2 transition-colors ${editingVacationId === v.id ? 'text-orange-500' : 'text-slate-300 hover:text-blue-500'}`}
                                  title="Editar Período"
                                >
                                   <Edit2 size={16} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteVacation(v.id)} 
                                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                  title="Eliminar Período"
                                >
                                   <Trash2 size={18} />
                                </button>
                              </div>
                           </div>
                         ))
                       )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-slate-900 text-center flex-shrink-0">
                 <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em]">Real Frio HR Management v2.0</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Users;
