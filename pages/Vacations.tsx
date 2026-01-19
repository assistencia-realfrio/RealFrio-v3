
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Palmtree, Search, Plus, Calendar as CalendarIcon, MapPin, 
  ChevronDown, X, Trash2, CheckCircle2, Clock, 
  User, AlertCircle, Building2, CalendarRange, ListTodo, 
  ChevronLeft, ChevronRight, Edit2, History, Loader2, RotateCcw, Check
} from 'lucide-react';
import { mockData } from '../services/mockData';
import { Vacation, VacationStatus, Profile } from '../types';
import { useStore } from '../contexts/StoreContext';
import { normalizeString } from '../utils';

const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const Vacations: React.FC = () => {
  const { currentStore, setStore } = useStore();
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'monthly'>('monthly');
  
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [viewDate, setViewDate] = useState(new Date());

  const [showModal, setShowModal] = useState(false);
  const [editingVacationId, setEditingVacationId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [formData, setFormData] = useState({
    user_name: '',
    start_date: '',
    end_date: '',
    store: (currentStore === 'Todas' ? 'Caldas da Rainha' : currentStore) as string,
    notes: ''
  });

  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    fetchProfiles();

    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const data = await mockData.getVacations();
    setVacations(data);
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const data = await mockData.getProfiles();
    setProfiles(data);
  };

  const baseFilteredVacations = useMemo(() => {
    const term = normalizeString(searchTerm);
    return vacations.filter(v => {
      const matchesStore = currentStore === 'Todas' || v.store === currentStore;
      const matchesSearch = normalizeString(v.user_name).includes(term);
      return matchesStore && matchesSearch;
    });
  }, [vacations, currentStore, searchTerm]);

  const upcomingVacations = useMemo(() => {
    return baseFilteredVacations
      .filter(v => v.end_date >= todayStr)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [baseFilteredVacations, todayStr]);

  const pastVacations = useMemo(() => {
    return baseFilteredVacations
      .filter(v => v.end_date < todayStr)
      .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
  }, [baseFilteredVacations, todayStr]);

  const filteredProfiles = useMemo(() => {
    const term = normalizeString(formData.user_name);
    if (!term || !isSuggestionsOpen) return [];
    return profiles.filter(p => 
      normalizeString(p.full_name).includes(term) || 
      normalizeString(p.email).includes(term)
    ).slice(0, 5);
  }, [profiles, formData.user_name, isSuggestionsOpen]);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const days = [];
    
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const dayVacations = baseFilteredVacations.filter(v => {
        return dateStr >= v.start_date && dateStr <= v.end_date;
      });
      days.push({ day: d, dateStr, vacations: dayVacations });
    }
    
    return days;
  }, [viewDate, baseFilteredVacations]);

  const monthlyCollaborators = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const collaboratorsMap = new Map<string, { name: string, initials: string }>();
    
    baseFilteredVacations.forEach(v => {
      if (v.start_date <= endOfMonth && v.end_date >= startOfMonth) {
        if (!collaboratorsMap.has(v.user_name)) {
          collaboratorsMap.set(v.user_name, {
            name: v.user_name,
            initials: getInitials(v.user_name)
          });
        }
      }
    });

    return Array.from(collaboratorsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [viewDate, baseFilteredVacations]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    setViewDate(newDate);
  };

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24)) + 1;
    return days > 0 ? days : 0;
  };

  const handleOpenModal = (v?: Vacation) => {
    if (v) {
      setEditingVacationId(v.id);
      setFormData({
        user_name: v.user_name,
        start_date: v.start_date,
        end_date: v.end_date,
        store: v.store,
        notes: v.notes || ''
      });
    } else {
      setEditingVacationId(null);
      setFormData({
        user_name: '',
        start_date: '',
        end_date: '',
        store: (currentStore === 'Todas' ? 'Caldas da Rainha' : currentStore) as string,
        notes: ''
      });
    }
    setShowModal(true);
    setIsSuggestionsOpen(false);
  };

  const selectProfile = (name: string) => {
    setFormData({ ...formData, user_name: name });
    setIsSuggestionsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingVacationId) {
        await mockData.updateVacation(editingVacationId, {
          ...formData,
          store: formData.store as any
        });
      } else {
        await mockData.createVacation({
          ...formData,
          user_id: 'user-' + Math.random().toString(36).substr(2, 5),
          status: VacationStatus.APROVADA,
          store: formData.store as any
        });
      }
      setShowModal(false);
      fetchData();
    } catch (e) {
      alert("Erro ao processar registo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVacation = async (id: string) => {
    if (!id) return;
    if (window.confirm("Deseja eliminar definitivamente este período de férias?")) {
      setIsSubmitting(true);
      try {
        await mockData.deleteVacation(id);
        if (editingVacationId === id) {
          setShowModal(false);
        }
        await fetchData();
      } catch (err: any) {
        alert("Erro ao eliminar registo: " + (err.message || String(err)));
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const weekDays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
  const listToDisplay = activeTab === 'upcoming' ? upcomingVacations : pastVacations;

  return (
    <div className="max-w-4xl mx-auto pb-24 relative px-1 sm:px-0">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 px-2">
         <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-tight">Férias do Pessoal</h1>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mt-1">
              Escala de Ausências
            </p>
         </div>

         <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative w-full sm:w-64">
              <select
                value={currentStore}
                onChange={(e) => setStore(e.target.value as any)}
                className="w-full bg-white border border-gray-200 shadow-sm rounded-2xl pl-10 pr-10 py-3 text-[11px] font-black text-slate-700 appearance-none cursor-pointer focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none uppercase tracking-widest"
              >
                <option value="Todas">TODAS AS LOJAS</option>
                <option value="Caldas da Rainha">CALDAS DA RAINHA</option>
                <option value="Porto de Mós">PORTO DE MÓS</option>
              </select>
              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
         </div>
      </div>

      <div className="flex bg-white border border-gray-100 rounded-2xl shadow-sm p-1 mx-2 mb-6 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('monthly')}
          className={`flex-1 flex items-center justify-center py-3 px-2 rounded-xl gap-2 transition-all whitespace-nowrap ${activeTab === 'monthly' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <CalendarRange size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">Calendário</span>
        </button>
        <button 
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 flex items-center justify-center py-3 px-2 rounded-xl gap-2 transition-all whitespace-nowrap ${activeTab === 'upcoming' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <ListTodo size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">Próximas</span>
        </button>
        <button 
          onClick={() => setActiveTab('past')}
          className={`flex-1 flex items-center justify-center py-3 px-2 rounded-xl gap-2 transition-all whitespace-nowrap ${activeTab === 'past' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <History size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">Passadas</span>
        </button>
      </div>

      {activeTab !== 'monthly' && (
        <div className="bg-white p-3 rounded-[1.8rem] shadow-sm border border-gray-100 mx-2 mb-6">
          <div className="relative">
             <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
             <input 
               type="text" 
               placeholder="Pesquisar colaborador..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-[11px] font-black uppercase tracking-tight focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
             />
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center">
           <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (activeTab === 'upcoming' || activeTab === 'past') ? (
        <div className="space-y-4 mx-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {listToDisplay.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
               {activeTab === 'upcoming' ? <Palmtree size={48} className="mx-auto text-gray-100 mb-4" /> : <History size={48} className="mx-auto text-gray-100 mb-4" />}
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-8">
                 {activeTab === 'upcoming' ? 'Nenhuma férias futura encontrada' : 'Sem registos de férias passadas'}
               </p>
            </div>
          ) : (
            listToDisplay.map((v) => (
              <div key={v.id} className={`bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group ${v.end_date < todayStr ? 'opacity-75 grayscale-[0.3]' : ''}`}>
                 <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                          <User size={22} />
                       </div>
                       <div>
                          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-tight">{v.user_name}</h3>
                          <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded leading-none">{v.store}</span>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => handleOpenModal(v)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                         <Edit2 size={18} />
                      </button>
                      <button type="button" onClick={() => handleDeleteVacation(v.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                         <Trash2 size={18} />
                      </button>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                       <CalendarIcon size={18} className="text-blue-500" />
                       <div className="min-w-0">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Período</p>
                          <p className="text-xs font-black text-slate-700 uppercase">
                            {new Date(v.start_date).toLocaleDateString()} <span className="mx-1 text-slate-300">➜</span> {new Date(v.end_date).toLocaleDateString()}
                          </p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                       <Clock size={18} className="text-emerald-500" />
                       <div className="min-w-0">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Duração</p>
                          <p className="text-xs font-black text-slate-900 uppercase">{calculateDays(v.start_date, v.end_date)} Dias</p>
                       </div>
                    </div>
                 </div>
                 {v.notes && (
                   <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Observações</p>
                      <p className="text-xs text-slate-600 italic leading-relaxed">{v.notes}</p>
                   </div>
                 )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6 mx-2">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
             <div className="p-6 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-xl shadow-sm transition-all text-slate-400 hover:text-blue-600">
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">
                  {viewDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                </h2>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-xl shadow-sm transition-all text-slate-400 hover:text-blue-600">
                  <ChevronRight size={20} />
                </button>
             </div>

             <div className="grid grid-cols-7 border-b border-gray-50">
                {weekDays.map(day => (
                  <div key={day} className="py-3 text-center text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    {day}
                  </div>
                ))}
             </div>

             <div className="grid grid-cols-7 min-h-[400px]">
                {calendarDays.map((dayObj, idx) => (
                  <div 
                    key={idx} 
                    className={`
                      min-h-[80px] sm:min-h-[100px] border-r border-b border-gray-50 p-1.5 sm:p-2 transition-colors
                      ${!dayObj ? 'bg-slate-50/30' : 'bg-white hover:bg-slate-50/50'}
                    `}
                  >
                    {dayObj && (
                      <>
                        <span className={`text-[10px] font-black ${dayObj.vacations.length > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                          {dayObj.day}
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {dayObj.vacations.map(v => (
                            <div 
                              key={v.id} 
                              title={`${v.user_name} (Clique para editar)`}
                              onClick={() => handleOpenModal(v)}
                              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-white flex items-center justify-center text-[8px] sm:text-[9px] font-black shadow-sm transform hover:scale-110 transition-transform cursor-pointer ${v.end_date < todayStr ? 'bg-slate-400' : 'bg-blue-600'}`}
                            >
                              {getInitials(v.user_name)}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
             </div>

             <div className="p-4 bg-slate-50 border-t border-gray-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">
                  Clique nas iniciais para editar o período de férias
                </p>
             </div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm animate-in slide-in-from-bottom-2 duration-500">
             <div className="flex items-center gap-2 mb-6 text-slate-900 px-2">
                <Palmtree size={18} className="text-blue-600" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Ausências em {viewDate.toLocaleDateString('pt-PT', { month: 'long' })}</h3>
             </div>
             
             {monthlyCollaborators.length === 0 ? (
               <p className="text-center py-4 text-[9px] font-black text-slate-300 uppercase tracking-widest italic">
                 Nenhum colaborador com férias registadas este mês.
               </p>
             ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                 {monthlyCollaborators.map(collab => (
                   <div key={collab.name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100/50 hover:bg-white hover:border-blue-100 transition-all group">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform">
                        {collab.initials}
                      </div>
                      <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight truncate group-hover:text-blue-600 transition-colors">
                        {collab.name}
                      </span>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>
      )}

      <button 
        onClick={() => handleOpenModal()}
        className="fixed bottom-6 right-6 p-5 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 hover:bg-blue-700 hover:scale-110 transition-all transform flex items-center justify-center active:scale-95 z-40"
        title="Registar Férias"
      >
        <Plus size={28} />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                  {editingVacationId ? 'Editar Período de Férias' : 'Registar Férias'}
                </h3>
                <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-2"><X size={24}/></button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                 <div className="space-y-4">
                    <div className="relative" ref={suggestionsRef}>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Colaborador / Técnico *</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input 
                          required 
                          type="text" 
                          placeholder="Nome completo..." 
                          value={formData.user_name} 
                          onChange={e => { setFormData({...formData, user_name: e.target.value}); setIsSuggestionsOpen(true); }} 
                          onFocus={() => setIsSuggestionsOpen(true)}
                          autoComplete="off"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-xl text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                        />
                      </div>

                      {/* Dropdown de Sugestões de Utilizadores */}
                      {isSuggestionsOpen && filteredProfiles.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          {filteredProfiles.map(p => (
                            <button 
                              key={p.id} 
                              type="button" 
                              onClick={() => selectProfile(p.full_name)}
                              className="w-full text-left px-5 py-4 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-colors group flex items-center gap-3"
                            >
                               <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                  <User size={14} />
                               </div>
                               <div>
                                  <p className="text-sm font-black text-slate-900 uppercase group-hover:text-blue-600">{p.full_name}</p>
                                  <p className="text-[10px] text-slate-400 lowercase font-medium">{p.email}</p>
                               </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Loja *</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <select required value={formData.store} onChange={e => setFormData({...formData, store: e.target.value as any})} className="w-full pl-12 pr-10 py-4 bg-slate-50 border-none rounded-xl text-sm font-black uppercase outline-none appearance-none">
                           <option value="Caldas da Rainha">CALDAS DA RAINHA</option>
                           <option value="Porto de Mós">PORTO DE MÓS</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data Início *</label>
                          <input required type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-xl text-sm font-black outline-none" />
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data Fim *</label>
                          <input required type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-xl text-sm font-black outline-none" />
                       </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Observações</label>
                      <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-medium outline-none" placeholder="Ex: Viagem..." />
                    </div>
                 </div>

                 <div className="flex gap-3 pt-2">
                   <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="flex-1 bg-blue-600 text-white py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                   >
                      {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : editingVacationId ? <Check size={16} /> : <Check size={16} />}
                      {isSubmitting ? 'A GUARDAR...' : editingVacationId ? 'GUARDAR ALTERAÇÕES' : 'CONFIRMAR FÉRIAS'}
                   </button>
                   {editingVacationId && (
                     <button 
                      type="button"
                      onClick={() => handleDeleteVacation(editingVacationId)}
                      disabled={isSubmitting}
                      className="w-[64px] h-[64px] bg-red-100 text-red-600 rounded-3xl hover:bg-red-200 transition-all flex items-center justify-center flex-shrink-0"
                     >
                        <Trash2 size={24} />
                     </button>
                   )}
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Vacations;
