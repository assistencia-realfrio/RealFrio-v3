
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, UserCog, Plus, X, User, 
  AlertCircle, Sparkles, Edit2, 
  Palmtree, Loader2,
  ChevronDown, Download, Upload,
  Check, MapPin, ChevronRight, Navigation,
  Clock, MonitorDot, Radio, Map as MapIcon,
  List as ListIcon, ExternalLink, LayoutGrid, Maximize,
  RefreshCw
} from 'lucide-react';
import { Profile, UserRole, Vacation, VacationStatus } from '../types';
import { mockData } from '../services/mockData';

declare var L: any; // Leaflet Global

const Users: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'live'>('list');
  const [liveSubView, setLiveSubView] = useState<'cards' | 'map'>('cards');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [userVacations, setUserVacations] = useState<Vacation[]>([]);
  const [vacationLoading, setVacationLoading] = useState(false);
  const [editingVacationId, setEditingVacationId] = useState<string | null>(null);
  const [newVacation, setNewVacation] = useState({ start_date: '', end_date: '', notes: '', store: 'Todas' });
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', role: UserRole.TECNICO, store: 'Caldas da Rainha' });

  const mapInstanceRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any>({});

  useEffect(() => {
    const loadSessionAndUsers = async () => {
      setLoading(true);
      setCurrentUser(mockData.getSession());
      try { 
        const data = await mockData.getProfiles();
        setUsers(data); 
      } catch (error) { 
        console.error(error); 
      }
      setLoading(false);
    };
    loadSessionAndUsers();

    // Refresh mais rápido para monitorização live
    const interval = setInterval(() => {
      if (activeView === 'live') refreshUsersSilently();
    }, 15000); 
    
    return () => clearInterval(interval);
  }, [activeView]);

  // Efeito para Gerir o Mapa Leaflet
  useEffect(() => {
    if (activeView === 'live' && liveSubView === 'map' && !loading) {
      const timer = setTimeout(() => {
        initMap();
      }, 400);
      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
        clearTimeout(timer);
      };
    }
  }, [activeView, liveSubView, loading]);

  const initMap = () => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const techniciansWithLoc = users.filter(u => u.last_lat && u.last_lng);
      
      const center: [number, number] = techniciansWithLoc.length > 0 
        ? [techniciansWithLoc[0].last_lat!, techniciansWithLoc[0].last_lng!] 
        : [39.5, -8.5];

      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(center, 10);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstanceRef.current);
      
      const markerGroup = L.featureGroup();
      markersRef.current = {};

      techniciansWithLoc.forEach(user => {
        const status = getLocationStatus(user.last_location_update);
        const markerHtml = `
          <div class="custom-marker-icon">
            <div class="marker-pin" style="background-color: ${status.hex};"></div>
          </div>
        `;

        const icon = L.divIcon({
          html: markerHtml,
          className: 'custom-div-icon',
          iconSize: [30, 42],
          iconAnchor: [15, 42]
        });

        const marker = L.marker([user.last_lat, user.last_lng], { icon })
          .bindPopup(`
            <div style="text-align: center; min-width: 120px;">
              <p style="margin: 0 0 5px 0; font-weight: 900; color: #1e293b; font-size: 11px;">${user.full_name}</p>
              <div style="display: inline-block; padding: 2px 8px; border-radius: 99px; background: ${status.hex}20; color: ${status.hex}; font-size: 8px; font-weight: 900;">${status.label.toUpperCase()}</div>
              <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 8px; border-top: 1px solid #f1f5f9; pt: 4px;">LOJA: ${user.store.toUpperCase()}</p>
            </div>
          `);
          
        markersRef.current[user.id] = marker;
        marker.addTo(markerGroup);
      });

      markerGroup.addTo(mapInstanceRef.current);

      if (techniciansWithLoc.length > 0) {
        mapInstanceRef.current.fitBounds(markerGroup.getBounds(), { padding: [50, 50] });
      }

    } catch (e) {
      console.error("Erro Leaflet:", e);
    }
  };

  const refreshUsersSilently = async () => {
    setIsRefreshing(true);
    try {
      const data = await mockData.getProfiles();
      setUsers(data);
      
      // Se o mapa estiver aberto, atualizar posições sem re-renderizar tudo
      if (mapInstanceRef.current && liveSubView === 'map') {
        data.forEach(user => {
          if (user.last_lat && user.last_lng && markersRef.current[user.id]) {
            markersRef.current[user.id].setLatLng([user.last_lat, user.last_lng]);
            // Atualizar cor do pin se necessário (via novo ícone se o status mudou)
          }
        });
      }
    } catch (e) {
      console.warn("Silent refresh failed");
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const getLocationStatus = (lastUpdate?: string | null) => {
    if (!lastUpdate) return { label: 'Sem GPS', color: 'bg-slate-400', hex: '#94a3b8', pulse: false };
    const diff = Date.now() - new Date(lastUpdate).getTime();
    const mins = diff / 60000;
    
    // Status mais sensível para feedback imediato
    if (mins < 15) return { label: 'Online agora', color: 'bg-emerald-500', hex: '#10b981', pulse: true };
    if (mins < 60) return { label: `Há ${Math.round(mins)} min`, color: 'bg-orange-500', hex: '#f97316', pulse: false };
    if (mins < 1440) return { label: `Há ${Math.round(mins/60)}h`, color: 'bg-slate-500', hex: '#64748b', pulse: false };
    return { label: 'Offline', color: 'bg-slate-300', hex: '#cbd5e1', pulse: false };
  };

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
      const updated = await mockData.getProfiles();
      setUsers(updated);
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

  const fetchUserVacations = async () => {
    if (!editingUser) return;
    setVacationLoading(true);
    try {
      const allVacations = await mockData.getVacations();
      setUserVacations(allVacations.filter(v => v.user_id === editingUser.id).sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()));
    } finally { setVacationLoading(false); }
  };

  const isAdmin = currentUser?.role?.toLowerCase() === UserRole.ADMIN;

  if (loading) return (<div className="h-full flex flex-col items-center justify-center py-20"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Equipa Técnica</h1>
            <div className="flex items-center gap-2 mt-0.5">
               <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Gestão e Monitorização</p>
               {activeView === 'live' && (
                 <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded-full border border-blue-100 dark:border-blue-800">
                    <RefreshCw size={8} className={`text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="text-[7px] font-black text-blue-600 dark:text-blue-400 uppercase">Live 15s</span>
                 </div>
               )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-100 dark:border-slate-800 flex shadow-sm">
              <button 
                onClick={() => setActiveView('list')}
                className={`p-2.5 rounded-xl flex items-center gap-2 transition-all ${activeView === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-blue-600'}`}
              >
                <ListIcon size={16} />
                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Equipa</span>
              </button>
              <button 
                onClick={() => setActiveView('live')}
                className={`p-2.5 rounded-xl flex items-center gap-2 transition-all ${activeView === 'live' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-indigo-600'}`}
              >
                <Radio size={16} className={activeView === 'live' ? 'animate-pulse' : ''} />
                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Radar Live</span>
              </button>
           </div>
           {isAdmin && (
            <button type="button" onClick={() => handleOpenModal()} className="p-3 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl shadow-xl active:scale-95 transition-all">
              <Plus size={20} />
            </button>
          )}
        </div>
      </div>

      {activeView === 'list' ? (
        <>
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

          <div className="flex flex-col space-y-2 px-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
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
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[8px] font-black uppercase tracking-widest ${user.role?.toLowerCase() === UserRole.ADMIN ? 'text-purple-500' : 'text-blue-500'}`}>{user.role}</span>
                        {user.id === currentUser?.id && <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">• Eu</span>}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-200 dark:text-slate-700 group-hover:text-blue-500 transition-all" />
                </div>
              ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
           {/* SUB-VIEW SELECTOR PARA LIVE */}
           <div className="flex justify-center px-1">
              <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex shadow-sm">
                 <button 
                  onClick={() => setLiveSubView('cards')}
                  className={`px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all ${liveSubView === 'cards' ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-400'}`}
                 >
                    <LayoutGrid size={16} />
                    <span className="text-[9px] uppercase tracking-[0.1em]">Cartões</span>
                 </button>
                 <button 
                  onClick={() => setLiveSubView('map')}
                  className={`px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all ${liveSubView === 'map' ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-400'}`}
                 >
                    <MapIcon size={16} />
                    <span className="text-[9px] uppercase tracking-[0.1em]">Mapa Interativo</span>
                 </button>
              </div>
           </div>

           {liveSubView === 'cards' ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-1">
                {users.filter(u => u.role !== UserRole.BACKOFFICE).map(user => {
                    const status = getLocationStatus(user.last_location_update);
                    return (
                      <div key={user.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity"><Navigation size={80} /></div>
                        
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all"><User size={24} /></div>
                              <div>
                                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase truncate max-w-[140px]">{user.full_name}</h3>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <div className={`w-2 h-2 rounded-full ${status.color} ${status.pulse ? 'animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]' : ''}`}></div>
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${status.pulse ? 'text-emerald-500' : 'text-slate-400'}`}>{status.label}</span>
                                  </div>
                              </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{user.store}</span>
                            </div>
                        </div>

                        <div className="mt-auto space-y-4">
                            {user.last_lat && user.last_lng ? (
                              <>
                                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                  <div className="flex items-center gap-2 mb-2">
                                      <MapPin size={12} className="text-indigo-500" />
                                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Coordenadas de Check-in</span>
                                  </div>
                                  <p className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">LAT: {user.last_lat.toFixed(6)}</p>
                                  <p className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">LNG: {user.last_lng.toFixed(6)}</p>
                                </div>
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${user.last_lat},${user.last_lng}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full py-4 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/20 active:scale-95"
                                >
                                  <ExternalLink size={14} /> LOCALIZAR TÉCNICO NO MAPA
                                </a>
                              </>
                            ) : (
                              <div className="py-10 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/30 dark:bg-slate-950/30">
                                <MapPin size={24} className="mx-auto text-slate-200 dark:text-slate-800 mb-2" />
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Sem sinal de GPS recente</p>
                              </div>
                            )}
                        </div>
                      </div>
                    );
                })}
             </div>
           ) : (
             <div className="px-1 h-[500px] sm:h-[600px] relative animate-in zoom-in-95 duration-500">
                <div ref={mapContainerRef} className="w-full h-full rounded-[2.5rem] shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-950"></div>
                <div className="absolute top-4 left-4 z-[20] flex flex-col gap-2">
                   <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-white/20">
                      <div className="flex items-center gap-2 mb-2">
                        <MonitorDot size={12} className="text-indigo-500 animate-pulse" />
                        <span className="text-[8px] font-black uppercase text-slate-400">Estado dos Canais</span>
                      </div>
                      <div className="space-y-1.5">
                         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[7px] font-black text-slate-500 uppercase">ATIVOS AGORA</span></div>
                         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div><span className="text-[7px] font-black text-slate-500 uppercase">SINAL RECENTE</span></div>
                         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-400"></div><span className="text-[7px] font-black text-slate-500 uppercase">DESLIGADOS</span></div>
                      </div>
                   </div>
                </div>
                <button 
                  onClick={() => { if(mapInstanceRef.current) mapInstanceRef.current.setView([39.5, -8.5], 7); }}
                  className="absolute bottom-6 right-6 z-[20] p-4 bg-white dark:bg-slate-900 text-indigo-600 rounded-full shadow-2xl border border-gray-100 dark:border-slate-800 active:scale-95 transition-all"
                  title="Focar em Portugal"
                >
                  <Maximize size={24} />
                </button>
             </div>
           )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/10">
              <div className="p-10 pb-8 border-b border-slate-50 dark:border-slate-800/50 flex justify-between items-start flex-shrink-0">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.1em]">{editingUser ? `FICHA TÉCNICA: ${editingUser.full_name}` : 'REGISTO DE NOVO TÉCNICO'}</h3>
                  <p className="text-[9px] font-black text-blue-500 uppercase flex items-center gap-1.5 mt-2 tracking-widest"><Sparkles size={12} /> GESTÃO DE PERFIL E AUSÊNCIAS</p>
                </div>
                <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 p-2 transition-colors"><X size={28}/></button>
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
                   <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.25em] shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 mt-4">{editingUser ? 'GUARDAR ALTERAÇÕES' : 'CRIAR ACESSO'}</button>
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
