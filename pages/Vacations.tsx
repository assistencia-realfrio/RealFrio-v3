
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Palmtree, Search, Plus, Calendar as CalendarIcon, MapPin, 
  ChevronDown, X, CheckCircle2, Clock, 
  User, AlertCircle, Building2, CalendarRange, ListTodo, 
  ChevronLeft, ChevronRight, Edit2, History, Loader2, RotateCcw, Check,
  Download, Upload, FileSpreadsheet, AlertTriangle
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
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any[] | null>(null);
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
    try {
      const data = await mockData.getVacations();
      setVacations(data);
    } catch (e) {
      console.error("Erro ao carregar dados", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    const data = await mockData.getProfiles();
    setProfiles(data);
  };

  const convertToCSV = (data: any[]) => {
    const headers = ['user_name', 'start_date', 'end_date', 'store', 'notes', 'status', 'user_id'];
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(fieldName => {
        const value = row[fieldName] || '';
        const escaped = ('' + value).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(','))
    ];
    return csvRows.join('\n');
  };

  const parseCSV = (csvText: string) => {
    const rawLines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (rawLines.length < 2) return [];

    const firstLine = rawLines[0];
    const semiCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const separator = semiCount > commaCount ? ';' : ',';

    const headers = firstLine.split(separator).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
    
    return rawLines.slice(1).map(line => {
      const values = line.split(separator).map(v => v.replace(/^"|"$/g, '').trim());
      const obj: any = {};
      
      headers.forEach((header, index) => {
        const key = header === 'user_name' || header === 'utilizador' || header === 'nome' ? 'user_name' : 
                    header === 'start_date' || header === 'inicio' || header === 'data inicio' ? 'start_date' :
                    header === 'end_date' || header === 'fim' || header === 'data fim' ? 'end_date' : 
                    header === 'store' || header === 'loja' ? 'store' : 
                    header === 'notes' || header === 'notas' || header === 'observacoes' ? 'notes' : 
                    header === 'user_id' ? 'user_id' : header;
        obj[key] = values[index];
      });
      return obj;
    });
  };

  const handleExportAll = () => {
    const csvContent = convertToCSV(vacations);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `REALFRIO_ESCALA_FERIAS_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const data = parseCSV(text);
        if (!Array.isArray(data) || data.length === 0) throw new Error("Ficheiro vazio.");
        setPendingImportData(data);
        setShowImportConfirm(true);
      } catch (err: any) {
        alert("Erro ao ler ficheiro: " + err.message);
      } finally {
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = async () => {
    if (!pendingImportData) return;
    setLoading(true);
    setShowImportConfirm(false);
    try {
      await mockData.importVacations(pendingImportData);
      alert("Dados importados com sucesso!");
      fetchData();
    } catch (err: any) {
      alert("Erro de Importação: " + err.message);
    } finally {
      setPendingImportData(null);
      setLoading(false);
    }
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
    for (let i = 0; i < startOffset; i++) { days.push(null); }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const dayVacations = baseFilteredVacations.filter(v => dateStr >= v.start_date && dateStr <= v.end_date);
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
          collaboratorsMap.set(v.user_name, { name: v.user_name, initials: getInitials(v.user_name) });
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
      setFormData({ user_name: v.user_name, start_date: v.start_date, end_date: v.end_date, store: v.store, notes: v.notes || '' });
    } else {
      setEditingVacationId(null);
      setFormData({ user_name: '', start_date: '', end_date: '', store: (currentStore === 'Todas' ? 'Caldas da Rainha' : currentStore) as string, notes: '' });
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
        await mockData.updateVacation(editingVacationId, { ...formData, store: formData.store as any });
      } else {
        await mockData.createVacation({ ...formData, user_id: 'user-' + Math.random().toString(36).substr(2, 5), status: VacationStatus.APROVADA, store: formData.store as any });
      }
      setShowModal(false);
      await fetchData();
    } catch (e) {
      alert("Erro ao processar registo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const weekDays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
  const listToDisplay = activeTab === 'upcoming' ? upcomingVacations : pastVacations;

  return (
    <div className="max-w-4xl mx-auto pb-24 relative px-1 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 px-2">
         <div className="text-center sm:text-left">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">Férias do Pessoal</h1>
            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.3em] mt-1">Escala de Ausências</p>
         </div>

         <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="flex items-center justify-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 transition-colors">
               <button onClick={handleExportAll} className="flex items-center justify-center gap-2 px-3 py-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all">
                  <Download size={16} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Exportar</span>
               </button>
               <div className="w-px h-4 bg-slate-100 dark:bg-slate-800 mx-1"></div>
               <label className="flex items-center justify-center gap-2 px-3 py-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all cursor-pointer">
                  <Upload size={16} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Importar</span>
                  <input type="file" accept=".csv" onChange={handleImportAll} className="hidden" />
               </label>
            </div>
            <div className="relative w-full sm:w-60">
              <select
                value={currentStore}
                onChange={(e) => setStore(e.target.value as any)}
                className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm rounded-2xl pl-10 pr-10 py-3 text-[11px] font-black text-slate-700 dark:text-slate-300 appearance-none cursor-pointer focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none uppercase tracking-widest"
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

      <div className="flex bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm p-1 mx-2 mb-6 overflow-x-auto no-scrollbar transition-colors">
        <button onClick={() => setActiveTab('monthly')} className={`flex-1 flex items-center justify-center py-3 px-2 rounded-xl gap-2 transition-all whitespace-nowrap ${activeTab === 'monthly' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}><CalendarRange size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Calendário</span></button>
        <button onClick={() => setActiveTab('upcoming')} className={`flex-1 flex items-center justify-center py-3 px-2 rounded-xl gap-2 transition-all whitespace-nowrap ${activeTab === 'upcoming' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}><ListTodo size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Próximas</span></button>
        <button onClick={() => setActiveTab('past')} className={`flex-1 flex items-center justify-center py-3 px-2 rounded-xl gap-2 transition-all whitespace-nowrap ${activeTab === 'past' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}><History size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Passadas</span></button>
      </div>

      {activeTab !== 'monthly' && (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-[1.8rem] shadow-sm border border-gray-100 dark:border-slate-800 mx-2 mb-6 transition-colors">
          <div className="relative">
             <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
             <input type="text" placeholder="Pesquisar colaborador..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-[11px] font-black dark:text-white uppercase tracking-tight focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" />
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : (activeTab === 'upcoming' || activeTab === 'past') ? (
        <div className="space-y-4 mx-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {listToDisplay.length === 0 ? (
            <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-800 transition-colors">
               {activeTab === 'upcoming' ? <Palmtree size={48} className="mx-auto text-gray-100 dark:text-slate-800 mb-4" /> : <History size={48} className="mx-auto text-gray-100 dark:text-slate-800 mb-4" />}
               <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-8">{activeTab === 'upcoming' ? 'Nenhuma férias futura encontrada' : 'Sem registos de férias passadas'}</p>
            </div>
          ) : (
            listToDisplay.map((v) => (
              <div key={v.id} className={`bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group ${v.end_date < todayStr ? 'opacity-75 grayscale-[0.3]' : ''}`}>
                 <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner"><User size={22} /></div>
                       <div>
                          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">{v.user_name}</h3>
                          <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded leading-none">{v.store}</span>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => handleOpenModal(v)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit2 size={18} /></button>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 p-4 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors">
                       <CalendarIcon size={18} className="text-blue-500" />
                       <div className="min-w-0">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Período</p>
                          <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{new Date(v.start_date).toLocaleDateString()} <span className="mx-1 text-slate-300">➜</span> {new Date(v.end_date).toLocaleDateString()}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors">
                       <Clock size={18} className="text-emerald-500" />
                       <div className="min-w-0">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Duração</p>
                          <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">{calculateDays(v.start_date, v.end_date)} Dias</p>
                       </div>
                    </div>
                 </div>
                 {v.notes && (
                   <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Observações</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 italic leading-relaxed">{v.notes}</p>
                   </div>
                 )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6 mx-2">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-300 transition-colors">
             <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between transition-colors">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl shadow-sm transition-all text-slate-400 hover:text-blue-600"><ChevronLeft size={20} /></button>
                <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">{viewDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</h2>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl shadow-sm transition-all text-slate-400 hover:text-blue-600"><ChevronRight size={20} /></button>
             </div>
             <div className="grid grid-cols-7 border-b border-gray-50 dark:border-slate-800 transition-colors">
                {weekDays.map(day => (<div key={day} className="py-3 text-center text-[8px] font-black text-slate-400 uppercase tracking-widest">{day}</div>))}
             </div>
             <div className="grid grid-cols-7 min-h-[400px]">
                {calendarDays.map((dayObj, idx) => (
                  <div key={idx} className={`min-h-[80px] sm:min-h-[100px] border-r border-b border-gray-50 dark:border-slate-800 p-1.5 sm:p-2 transition-colors ${!dayObj ? 'bg-slate-50/30 dark:bg-slate-950/30' : 'bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'}`}>
                    {dayObj && (<>
                      <span className={`text-[10px] font-black ${dayObj.vacations.length > 0 ? 'text-blue-600' : 'text-slate-300 dark:text-slate-700'}`}>{dayObj.day}</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {dayObj.vacations.map(v => (<div key={v.id} title={`${v.user_name} (Clique para editar)`} onClick={() => handleOpenModal(v)} className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-white flex items-center justify-center text-[8px] sm:text-[9px] font-black shadow-sm transform hover:scale-110 transition-transform cursor-pointer ${v.end_date < todayStr ? 'bg-slate-400 dark:bg-slate-600' : 'bg-blue-600'}`}>{getInitials(v.user_name)}</div>))}
                      </div>
                    </>)}
                  </div>
                ))}
             </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-gray-100 dark:border-slate-800 shadow-sm animate-in slide-in-from-bottom-2 duration-500 transition-colors">
             <div className="flex items-center gap-2 mb-6 text-slate-900 px-2 transition-colors"><Palmtree size={18} className="text-blue-600" /><h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Ausências em {viewDate.toLocaleDateString('pt-PT', { month: 'long' })}</h3></div>
             {monthlyCollaborators.length === 0 ? (<p className="text-center py-4 text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest italic">Nenhum colaborador com férias registadas este mês.</p>) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                 {monthlyCollaborators.map(collab => (<div key={collab.name} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100/50 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 hover:border-blue-100 dark:hover:border-blue-900/50 transition-all group"><div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform">{collab.initials}</div><span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight truncate group-hover:text-blue-600 transition-colors">{collab.name}</span></div>))}
               </div>
             )}
          </div>
        </div>
      )}

      {showImportConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden transition-colors">
              <div className="p-8 text-center">
                 <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-bounce"><FileSpreadsheet size={32} /></div>
                 <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Importar Dados?</h3>
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8 uppercase px-4">FORAM DETETADOS <span className="text-blue-600 font-black">{pendingImportData?.length}</span> REGISTOS NO FICHEIRO CSV.</p>
                 <div className="grid grid-cols-2 gap-4">
                   <button onClick={() => { setShowImportConfirm(false); setPendingImportData(null); }} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase rounded-2xl active:scale-95 transition-all">CANCELAR</button>
                   <button onClick={confirmImport} className="py-4 bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">{loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} CONFIRMAR</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <button onClick={() => handleOpenModal()} className="fixed bottom-6 right-6 p-5 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 hover:bg-blue-700 hover:scale-110 transition-all transform flex items-center justify-center active:scale-95 z-40" title="Registar Férias"><Plus size={28} /></button>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col transition-colors">
              <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 transition-colors"><h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{editingVacationId ? 'Editar Período de Férias' : 'Registar Férias'}</h3><button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-2"><X size={24}/></button></div>
              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                 <div className="space-y-4">
                    <div className="relative" ref={suggestionsRef}>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Colaborador / Técnico *</label>
                      <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input required type="text" placeholder="Nome completo..." value={formData.user_name} onChange={e => { setFormData({...formData, user_name: e.target.value}); setIsSuggestionsOpen(true); }} onFocus={() => setIsSuggestionsOpen(true)} autoComplete="off" className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10 transition-all dark:text-white" /></div>
                      {isSuggestionsOpen && filteredProfiles.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          {filteredProfiles.map(p => (<button key={p.id} type="button" onClick={() => selectProfile(p.full_name)} className="w-full text-left px-5 py-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors group flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all"><User size={14} /></div><div><p className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase group-hover:text-blue-600">{p.full_name}</p><p className="text-[10px] text-slate-400 dark:text-slate-500 lowercase font-medium">{p.email}</p></div></button>))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Loja *</label>
                      <div className="relative"><Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><select required value={formData.store} onChange={e => setFormData({...formData, store: e.target.value as any})} className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-sm font-black uppercase outline-none appearance-none dark:text-white"><option value="Caldas da Rainha">CALDAS DA RAINHA</option><option value="Porto de Mós">PORTO DE MÓS</option></select><ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data Início *</label><input required type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-sm font-black outline-none dark:text-white" /></div>
                       <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data Fim *</label><input required type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-sm font-black outline-none dark:text-white" /></div>
                    </div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Observações</label><textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-medium outline-none dark:text-white" placeholder="Ex: Viagem..." /></div>
                 </div>
                 <div className="flex gap-3 pt-2">
                   <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}{isSubmitting ? 'A GUARDAR...' : editingVacationId ? 'GUARDAR ALTERAÇÕES' : 'CONFIRMAR FÉRIAS'}</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Vacations;
