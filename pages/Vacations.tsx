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
    const separator = rawLines[0].includes(';') ? ';' : ',';
    const headers = rawLines[0].split(separator).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
    return rawLines.slice(1).map(line => {
      const values = line.split(separator).map(v => v.replace(/^"|"$/g, '').trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        const key = header === 'user_name' || header === 'utilizador' || header === 'nome' ? 'user_name' : 
                    header === 'start_date' || header === 'inicio' ? 'start_date' :
                    header === 'end_date' || header === 'fim' ? 'end_date' : 'user_id';
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
    link.setAttribute('download', `ESCALA_FERIAS.csv`);
    link.click();
  };

  const handleImportAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = parseCSV(event.target?.result as string);
        setPendingImportData(data);
        setShowImportConfirm(true);
      } catch (err: any) {
        alert("Erro ao ler ficheiro.");
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
      fetchData();
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
    return baseFilteredVacations.filter(v => v.end_date >= todayStr).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [baseFilteredVacations, todayStr]);

  const pastVacations = useMemo(() => {
    return baseFilteredVacations.filter(v => v.end_date < todayStr).sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
  }, [baseFilteredVacations, todayStr]);

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

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const calculateDays = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.ceil(diff / (1000 * 3600 * 24)) + 1;
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingVacationId) {
        await mockData.updateVacation(editingVacationId, formData);
      } else {
        await mockData.createVacation({ ...formData, user_id: 'user-' + Math.random().toString(36).substr(2, 5), status: VacationStatus.APROVADA });
      }
      setShowModal(false);
      await fetchData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const weekDays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
  const listToDisplay = activeTab === 'upcoming' ? upcomingVacations : pastVacations;

  return (
    <div className="max-w-4xl mx-auto pb-44 relative px-1 sm:px-0 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 px-2">
         <div className="text-center sm:text-left">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Férias do Pessoal</h1>
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
         </div>
      </div>

      {activeTab !== 'monthly' && (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-[1.8rem] shadow-sm border border-gray-100 dark:border-slate-800 mx-2 mb-6 transition-colors">
          <div className="relative">
             <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
             <input type="text" placeholder="Pesquisar colaborador..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-[11px] font-black dark:text-white uppercase tracking-tight outline-none" />
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : activeTab === 'monthly' ? (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-300 mx-2">
             <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between transition-colors">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl shadow-sm transition-all text-slate-400 hover:text-blue-600"><ChevronLeft size={20} /></button>
                <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">{viewDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</h2>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl shadow-sm transition-all text-slate-400 hover:text-blue-600"><ChevronRight size={20} /></button>
             </div>
             <div className="grid grid-cols-7 border-b border-gray-50 dark:border-slate-800">
                {weekDays.map(day => (<div key={day} className="py-3 text-center text-[8px] font-black text-slate-400 uppercase tracking-widest">{day}</div>))}
             </div>
             <div className="grid grid-cols-7 min-h-[400px]">
                {calendarDays.map((dayObj, idx) => (
                  <div key={idx} className={`min-h-[80px] sm:min-h-[100px] border-r border-b border-gray-50 dark:border-slate-800 p-1.5 sm:p-2 transition-colors ${!dayObj ? 'bg-slate-50/30 dark:bg-slate-950/30' : 'bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'}`}>
                    {dayObj && (<>
                      <span className={`text-[10px] font-black ${dayObj.vacations.length > 0 ? 'text-blue-600' : 'text-slate-300 dark:text-slate-700'}`}>{dayObj.day}</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {dayObj.vacations.map(v => (<div key={v.id} onClick={() => handleOpenModal(v)} className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-white flex items-center justify-center text-[8px] sm:text-[9px] font-black shadow-sm transform hover:scale-110 transition-transform cursor-pointer ${v.end_date < todayStr ? 'bg-slate-400 dark:bg-slate-600' : 'bg-blue-600'}`}>{getInitials(v.user_name)}</div>))}
                      </div>
                    </>)}
                  </div>
                ))}
             </div>
        </div>
      ) : (
        <div className="space-y-4 mx-2 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20">
          {listToDisplay.map((v) => (
            <div key={v.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
               <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center shadow-inner"><User size={22} /></div>
                     <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase truncate">{v.user_name}</h3>
                        <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{v.store}</span>
                     </div>
                  </div>
                  <button type="button" onClick={() => handleOpenModal(v)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit2 size={18} /></button>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                     <CalendarIcon size={18} className="text-blue-500" />
                     <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{new Date(v.start_date).toLocaleDateString()} ➜ {new Date(v.end_date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                     <Clock size={18} className="text-emerald-500" />
                     <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{calculateDays(v.start_date, v.end_date)} Dias</p>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* BARRA DE NAVEGAÇÃO FLUTUANTE INFERIOR */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-gray-200 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full p-1.5 flex items-center justify-around transition-all animate-in slide-in-from-bottom-10 duration-500">
        {[
          { id: 'monthly', icon: CalendarRange, label: 'AGENDA' },
          { id: 'upcoming', icon: ListTodo, label: 'PRÓXIMAS' },
          { id: 'past', icon: History, label: 'PASSADAS' }
        ].map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-full transition-all gap-1 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
          >
            <tab.icon size={18} />
            <span className="text-[7px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* BOTÃO ADICIONAR (Acima da barra flutuante) */}
      <button 
        onClick={() => handleOpenModal()} 
        className="fixed bottom-24 right-6 p-5 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 hover:bg-blue-700 hover:scale-110 transition-all transform flex items-center justify-center active:scale-95 z-40"
      >
        <Plus size={28} />
      </button>

      {/* MODAL FÉRIAS */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
              <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50"><h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{editingVacationId ? 'Editar Férias' : 'Registar Férias'}</h3><button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-2"><X size={24}/></button></div>
              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                 <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nome Colaborador *</label>
                      <input required type="text" value={formData.user_name} onChange={e => setFormData({...formData, user_name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-sm font-black uppercase outline-none dark:text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Início *</label><input required type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-sm outline-none dark:text-white" /></div>
                       <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Fim *</label><input required type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-sm outline-none dark:text-white" /></div>
                    </div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Loja *</label><select required value={formData.store} onChange={e => setFormData({...formData, store: e.target.value as any})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-sm font-black outline-none appearance-none dark:text-white"><option value="Caldas da Rainha">CALDAS DA RAINHA</option><option value="Porto de Mós">PORTO DE MÓS</option></select></div>
                 </div>
                 <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} CONFIRMAR</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Vacations;