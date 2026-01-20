
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ClipboardList, Users as UsersIcon, HardDrive, LayoutDashboard, LogOut, User, Plus, ArrowUp, Package, MapPin, ChevronDown, Bell, Activity, ArrowRight, History, Search, Calendar, Palmtree, UserCog, Sun, Moon } from 'lucide-react';
import { UserRole, OSActivity, ServiceOrder, Client, Equipment } from '../types';
import { mockData } from '../services/mockData';
import BrandLogo from './BrandLogo';
import { useStore } from '../contexts/StoreContext';
import { useTheme } from '../contexts/ThemeContext';
import { normalizeString } from '../utils';

interface LayoutProps {
  children: React.ReactNode;
  user?: any;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activities, setActivities] = useState<(OSActivity & { os_code?: string })[]>([]);
  const [searchResults, setSearchResults] = useState<{
    os: ServiceOrder[];
    clients: Client[];
    equipments: Equipment[];
  }>({ os: [], clients: [], equipments: [] });
  
  const location = useLocation();
  const navigate = useNavigate();
  const { currentStore, setStore, searchTerm, setSearchTerm } = useStore();
  const { theme, toggleTheme } = useTheme();
  const notificationsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeSessionUser = mockData.getSession() || user;

  useEffect(() => {
    const handleScroll = () => {
      const mainElement = document.querySelector('main');
      const scrolled = (mainElement && mainElement.scrollTop > 300) || window.scrollY > 300;
      setShowScrollTop(scrolled);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
      if (mainEl) mainEl.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const fetchSearchData = async () => {
      if (searchTerm.length < 2) {
        setSearchResults({ os: [], clients: [], equipments: [] });
        return;
      }

      const [allOS, allClients, allEquipments] = await Promise.all([
        mockData.getServiceOrders(),
        mockData.getClients(),
        mockData.getEquipments()
      ]);

      const term = normalizeString(searchTerm);

      setSearchResults({
        os: allOS.filter(o => 
          normalizeString(o.code).includes(term) || 
          normalizeString(o.client?.name || '').includes(term) ||
          normalizeString(o.description).includes(term)
        ).slice(0, 5),
        clients: allClients.filter(c => 
          normalizeString(c.name).includes(term) || 
          normalizeString(c.billing_name || '').includes(term)
        ).slice(0, 5),
        equipments: allEquipments.filter(e => 
          normalizeString(e.serial_number).includes(term) || 
          normalizeString(e.brand).includes(term) ||
          normalizeString(e.model).includes(term) ||
          normalizeString(e.type).includes(term)
        ).slice(0, 5)
      });
    };

    const debounce = setTimeout(fetchSearchData, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const fetchGlobalActivities = async () => {
    const data = await mockData.getAllActivities();
    setActivities(data.slice(0, 10));
  };

  useEffect(() => {
    if (notificationsOpen) {
      setSearchOpen(false);
      fetchGlobalActivities();
    }
  }, [notificationsOpen]);

  useEffect(() => {
    if (searchOpen) {
      setNotificationsOpen(false);
      setTimeout(() => searchInputRef.current?.focus(), 150);
    }
  }, [searchOpen]);

  const handleLogoutClick = async () => {
    onLogout();
    navigate('/login');
  };

  const scrollToTop = () => {
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToResult = (path: string) => {
    navigate(path);
    setSearchOpen(false);
    setSearchTerm('');
  };

  const isAdmin = activeSessionUser?.role?.toLowerCase() === UserRole.ADMIN;

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Ordens de Serviço', path: '/os', icon: ClipboardList },
    { name: 'Agendamentos', path: '/appointments', icon: Calendar },
    { name: 'Férias', path: '/vacations', icon: Palmtree },
    { name: 'Clientes', path: '/clients', icon: UsersIcon },
    { name: 'Stock & Catálogo', path: '/inventory', icon: Package },
    ...(isAdmin ? [{ name: 'Equipa', path: '/users', icon: UserCog }] : []),
  ];

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Agora mesmo';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `Há ${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Há ${diffInHours}h`;
    return date.toLocaleDateString('pt-PT');
  };

  const isActive = (path: string) => location.pathname === path;
  const showFab = location.pathname === '/os';
  const fabConfig = { to: '/os/new', title: 'Nova Ordem de Serviço' };

  const hasResults = searchResults.os.length > 0 || searchResults.clients.length > 0 || searchResults.equipments.length > 0;

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-950 overflow-hidden font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-[60] w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-20 px-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <BrandLogo variant={theme === 'dark' ? 'light' : 'dark'} size="sm" />
            </Link>
            <button 
              className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-2"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={22} />
            </button>
          </div>

          <div className="px-4 py-6 bg-white dark:bg-slate-900">
             <div className="flex items-center text-slate-400 dark:text-slate-500 mb-3 text-[10px] uppercase font-medium tracking-[0.2em] px-2">
               <MapPin size={12} className="mr-2 text-blue-500" /> Loja Ativa
             </div>
             <div className="relative group">
                <select 
                  value={currentStore}
                  onChange={(e) => setStore(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700/50 p-3 appearance-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="Todas">Todas as Lojas</option>
                  <option value="Caldas da Rainha">Caldas da Rainha</option>
                  <option value="Porto de Mós">Porto de Mós</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                  <ChevronDown size={14} />
                </div>
             </div>
          </div>

          <nav className="px-3 py-2 space-y-1 flex-1 overflow-y-auto no-scrollbar bg-white dark:bg-slate-900">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center px-4 py-3.5 text-xs font-medium uppercase tracking-widest rounded-xl transition-all
                  ${isActive(item.path) 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/10 dark:shadow-blue-900/20 translate-x-1' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-white'}
                `}
              >
                <item.icon className={`mr-3 h-5 w-5 ${isActive(item.path) ? 'text-white' : 'text-slate-400 group-hover:text-blue-500'}`} />
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="bg-white dark:bg-slate-900 p-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
            <button 
              onClick={toggleTheme}
              className="flex items-center w-full px-4 py-3.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors mb-2 group"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="mr-3 h-4 w-4 text-slate-400 group-hover:text-blue-500" />
                  Modo Escuro
                </>
              ) : (
                <>
                  <Sun className="mr-3 h-4 w-4 text-slate-400 group-hover:text-yellow-500" />
                  Modo Claro
                </>
              )}
            </button>
            <Link 
              to="/profile"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group mb-2"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <User size={16} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-medium text-slate-900 dark:text-white uppercase truncate">
                  {activeSessionUser?.full_name || 'Utilizador'}
                </span>
                <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-tighter truncate">Ver Perfil</span>
              </div>
            </Link>
            <button 
              onClick={handleLogoutClick}
              className="flex items-center w-full px-4 py-3 text-[10px] font-medium text-red-500 dark:text-red-400 uppercase tracking-widest rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sair da Conta
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 transition-colors duration-300 z-50 flex-shrink-0">
          <div className="flex items-center h-20 px-4 md:px-8 relative">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-3 -ml-2 text-slate-600 dark:text-slate-400 lg:hidden hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all active:scale-90"
                aria-label="Abrir menu"
              >
                <Menu size={26} />
              </button>
            </div>

            <div className="absolute left-1/2 -translate-x-1/2">
              <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
                <BrandLogo variant={theme === 'dark' ? 'light' : 'dark'} size="sm" className="!items-center" />
              </Link>
            </div>

            <div className="flex-1 flex justify-end items-center gap-1 sm:gap-2">
               <div className="relative" ref={searchRef}>
                 <button 
                   onClick={() => setSearchOpen(!searchOpen)}
                   className={`p-3 rounded-2xl transition-all relative active:scale-90 ${searchOpen ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                   title="Pesquisar Sistema"
                 >
                   <Search size={22} />
                 </button>
                 {searchOpen && (
                   <div className="fixed sm:absolute inset-x-4 sm:inset-auto top-24 sm:top-full sm:right-0 mt-0 sm:mt-4 w-auto sm:w-[460px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                         <div className="relative">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
                            <input 
                              ref={searchInputRef}
                              type="text"
                              placeholder="Procurar OS, Cliente, S/N..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full pl-12 pr-10 py-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                            />
                            {searchTerm && (
                              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                                <X size={16} />
                              </button>
                            )}
                         </div>
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto no-scrollbar py-2">
                        {searchTerm.length < 2 ? (
                          <div className="py-12 text-center">
                            <Search size={32} className="mx-auto text-slate-100 dark:text-slate-800 mb-2" />
                            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-600 uppercase tracking-widest px-8 leading-relaxed">Digite pelo menos 2 caracteres para pesquisar</p>
                          </div>
                        ) : hasResults ? (
                          <>
                            {searchResults.os.length > 0 && (
                              <div className="p-4 border-b border-slate-50 dark:border-slate-800 last:border-0">
                                <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-3 px-2">Ordens de Serviço</h4>
                                <div className="space-y-1">
                                  {searchResults.os.map(os => (
                                    <button key={os.id} onClick={() => navigateToResult(`/os/${os.id}`)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group">
                                      <div className="text-left">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-medium text-blue-600 font-mono">{os.code}</span>
                                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate uppercase">{os.client?.name}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 italic truncate mt-0.5">{os.description}</p>
                                      </div>
                                      <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-500 translate-x-0 group-hover:translate-x-1 transition-all" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {searchResults.clients.length > 0 && (
                              <div className="p-4 border-b border-slate-50 dark:border-slate-800 last:border-0">
                                <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-3 px-2">Clientes</h4>
                                <div className="space-y-1">
                                  {searchResults.clients.map(client => (
                                    <button key={client.id} onClick={() => navigateToResult(`/clients/${client.id}`)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group">
                                      <div className="text-left">
                                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 uppercase">{client.name}</div>
                                        <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{client.address}</p>
                                      </div>
                                      <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-500" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="py-12 text-center">
                            <Search size={32} className="mx-auto text-slate-100 dark:text-slate-800 mb-2" />
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Nenhum resultado encontrado</p>
                          </div>
                        )}
                      </div>
                   </div>
                 )}
               </div>
               <div className="relative" ref={notificationsRef}>
                 <button 
                   onClick={() => setNotificationsOpen(!notificationsOpen)}
                   className={`p-3 rounded-2xl transition-all relative active:scale-90 ${notificationsOpen ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                   title="Atividade Recente"
                 >
                   <Bell size={22} />
                   <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                 </button>
                 {notificationsOpen && (
                   <div className="fixed sm:absolute inset-x-4 sm:inset-auto top-24 sm:top-full sm:right-0 mt-0 sm:mt-4 w-auto sm:w-[380px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="p-5 border-b border-slate-50 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <History size={16} className="text-blue-500" />
                           <h3 className="text-[10px] font-medium text-slate-900 dark:text-white uppercase tracking-widest">Feed Global</h3>
                         </div>
                         <button onClick={() => setNotificationsOpen(false)} className="text-slate-400 hover:text-slate-600">
                           <X size={16} />
                         </button>
                      </div>
                      <div className="max-h-[420px] overflow-y-auto no-scrollbar py-2">
                         {activities.length === 0 ? (
                           <div className="py-12 text-center">
                              <Activity size={32} className="mx-auto text-slate-200 dark:text-slate-800 mb-3" />
                              <p className="text-[10px] font-medium text-slate-300 dark:text-slate-700 uppercase tracking-widest">Sem atividades</p>
                           </div>
                         ) : (
                           activities.map((act) => (
                             <Link 
                               key={act.id}
                               to={`/os/${act.os_id}`}
                               onClick={() => setNotificationsOpen(false)}
                               className="flex items-start gap-4 p-4 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors border-b border-slate-50/50 dark:border-slate-800/50 last:border-0 group"
                             >
                                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all flex-shrink-0 shadow-inner">
                                   <User size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                   <div className="flex items-center justify-between mb-0.5">
                                      <span className="text-[10px] font-medium text-slate-900 dark:text-slate-200 uppercase truncate pr-2">{act.user_name}</span>
                                      <span className="text-[8px] font-medium text-slate-400 uppercase whitespace-nowrap">{getRelativeTime(act.created_at)}</span>
                                   </div>
                                   <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2 italic">
                                      {act.description}
                                   </p>
                                   <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded uppercase tracking-tighter">
                                        OS: {act.os_code || '---'}
                                      </span>
                                      <ArrowRight size={10} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity translate-x-0 group-hover:translate-x-1" />
                                   </div>
                                </div>
                             </Link>
                           ))
                         )}
                      </div>
                   </div>
                 )}
               </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-6 scroll-smooth bg-slate-50/50 dark:bg-slate-950/50 transition-colors duration-300">
          {children}
        </main>

        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
          {showScrollTop && (
            <button 
              onClick={scrollToTop}
              className="p-3.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full shadow-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all transform hover:scale-110 active:scale-95"
              title="Voltar ao topo"
            >
              <ArrowUp size={20} />
            </button>
          )}

          {showFab && (
            <Link 
              to={fabConfig.to}
              className="p-5 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 hover:bg-blue-700 hover:scale-110 transition-all transform flex items-center justify-center active:scale-95"
              title={fabConfig.title}
            >
              <Plus size={28} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Layout;
