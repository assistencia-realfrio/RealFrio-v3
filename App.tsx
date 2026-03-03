
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { mockData } from './services/mockData';
import { supabase } from './supabaseClient';
import { notificationService } from './services/notificationService';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ServiceOrders from './pages/ServiceOrders';
import { ServiceOrderDetail } from './pages/ServiceOrderDetail';
import NewServiceOrder from './pages/NewServiceOrder';
import NewQuote from './pages/NewQuote';
import Quotes from './pages/Quotes';
import QuoteDetail from './pages/QuoteDetail';
import PublicQuoteView from './pages/PublicQuoteView';
import Appointments from './pages/Appointments';
import Vacations from './pages/Vacations';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import NewClient from './pages/NewClient';
import NewEquipment from './pages/NewEquipment';
import EditEquipment from './pages/EditEquipment';
import EquipmentDetail from './pages/EquipmentDetail';
import Equipments from './pages/Equipments';
import Inventory from './pages/Inventory';
import Profile from './pages/Profile';
import Users from './pages/Users';
import Maintenance from './pages/Maintenance';
import FleetManagement from './pages/FleetManagement';
import { UserRole, OSStatus } from './types';
import { StoreProvider, useStore } from './contexts/StoreContext';
import { ThemeProvider } from './contexts/ThemeContext';
import StoreSelectionModal from './components/StoreSelectionModal';
import PermissionRequestModal from './components/PermissionRequestModal';

const AppContent: React.FC<{ 
  user: any; 
  onLogin: () => void; 
  onLogout: () => void; 
  loading: boolean 
}> = ({ user, onLogin, onLogout, loading }) => {
  const { triggerSelectionModal, currentStore } = useStore();
  const [showPermissions, setShowPermissions] = useState(false);

  useEffect(() => {
    if (user) {
      // Check if permissions are already granted or if we should ask
      const checkInitialPermissions = async () => {
        const notif = "Notification" in window && Notification.permission === 'granted';
        
        // If any important permission is missing, show modal
        if (!notif) {
          setShowPermissions(true);
        }
      };
      
      // Delay slightly to not conflict with other modals
      setTimeout(checkInitialPermissions, 1000);
    }
  }, [user]);

  const handleLoginSuccess = () => {
    onLogin();
    triggerSelectionModal();
  };

  // ENGINE DE ALERTAS EM TEMPO REAL (SUPABASE REALTIME)
  useEffect(() => {
    if (!user) return;

    let osChannel: any;
    let activityChannel: any;

    const setupChannels = () => {
      // Limpar canais existentes se houver
      if (osChannel) supabase.removeChannel(osChannel);
      if (activityChannel) supabase.removeChannel(activityChannel);

      // 1. Ouvir Novas OS e Mudanças de Estado
      osChannel = supabase
        .channel('os-realtime-alerts')
        .on('postgres_changes', { event: '*', table: 'service_orders', schema: 'public' }, async (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;
          
          if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && newData) {
            // Filtrar por loja se necessário
            if (currentStore && currentStore !== 'Todas' && newData.store !== currentStore) return;

            // Buscar detalhes adicionais (Cliente e Equipamento) para a notificação
            const { data: osDetails } = await supabase
              .from('service_orders')
              .select('code, client:clients(name), equipment:equipments(type)')
              .eq('id', newData.id)
              .single();

            const clientName = (osDetails as any)?.client?.name || '---';
            const equipType = (osDetails as any)?.equipment?.type || '---';
            const osCode = osDetails?.code || newData.code;

            if (payload.eventType === 'INSERT') {
              notificationService.notify(
                "🚨 NOVA ORDEM DE SERVIÇO",
                `OS ${osCode} • ${clientName} • ${equipType}`,
                `/os/${newData.id}`
              );
            } else if (payload.eventType === 'UPDATE') {
              const hasStatusChanged = oldData && oldData.status !== undefined ? oldData.status !== newData.status : true;
              
              if (hasStatusChanged) {
                const statusLabel = (newData.status as string).replace('_', ' ').toUpperCase();
                notificationService.notify(
                  "🔄 MUDANÇA DE ESTADO",
                  `OS ${osCode} [${statusLabel}] • ${clientName} • ${equipType}`,
                  `/os/${newData.id}`
                );
              }
            }
          }
        })
        .subscribe((status) => {
          console.log(`[Realtime OS] Status: ${status}`);
        });

      // 2. Ouvir Atividade Técnica (Notas, Fotos, Materiais)
      activityChannel = supabase
        .channel('activity-realtime-alerts')
        .on('postgres_changes', { event: 'INSERT', table: 'os_activities', schema: 'public' }, async (payload) => {
          const newData = payload.new as any;
          if (!newData) return;

          // Não notificar o próprio utilizador sobre as suas ações
          if (newData.user_name !== user.full_name) {
            // Buscar detalhes da OS para contexto
            const { data: osDetails } = await supabase
              .from('service_orders')
              .select('code, store, client:clients(name), equipment:equipments(type)')
              .eq('id', newData.os_id)
              .single();

            // Filtrar por loja se necessário
            if (currentStore && currentStore !== 'Todas' && (osDetails as any)?.store !== currentStore) return;

            const clientName = (osDetails as any)?.client?.name || '---';
            const equipType = (osDetails as any)?.equipment?.type || '---';
            const osCode = osDetails?.code || '---';

            notificationService.notify(
              `👷 ${newData.user_name?.toUpperCase()}`,
              `${newData.description} • OS ${osCode} • ${clientName} • ${equipType}`,
              `/os/${newData.os_id}`
            );
          }
        })
        .subscribe((status) => {
          console.log(`[Realtime Activity] Status: ${status}`);
        });
    };

    setupChannels();

    // Re-conectar quando a app volta ao primeiro plano (crítico para mobile)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("[App] App visível, a reforçar canais realtime...");
        setupChannels();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (osChannel) supabase.removeChannel(osChannel);
      if (activityChannel) supabase.removeChannel(activityChannel);
    };
  }, [user, currentStore]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 text-gray-500 uppercase font-black text-[10px] tracking-widest">A iniciar...</div>;

  return (
    <>
      {user && <StoreSelectionModal />}
      {user && showPermissions && <PermissionRequestModal onClose={() => setShowPermissions(false)} />}

      <Routes>
        <Route path="/proposal/:id" element={<PublicQuoteView />} />
        <Route path="/login" element={!user ? <Login onLogin={handleLoginSuccess} /> : <Navigate to="/" />} />
        
        <Route path="/" element={user ? <Layout user={user} onLogout={onLogout}><Dashboard /></Layout> : <Navigate to="/login" />} />
        <Route path="/os" element={user ? <Layout user={user} onLogout={onLogout}><ServiceOrders /></Layout> : <Navigate to="/login" />} />
        <Route path="/os/new" element={user ? <Layout user={user} onLogout={onLogout}><NewServiceOrder /></Layout> : <Navigate to="/login" />} />
        <Route path="/os/:id" element={user ? <Layout user={user} onLogout={onLogout}><ServiceOrderDetail /></Layout> : <Navigate to="/login" />} />
        
        <Route path="/quotes" element={user ? <Layout user={user} onLogout={onLogout}><Quotes /></Layout> : <Navigate to="/login" />} />
        <Route path="/quotes/new" element={user ? <Layout user={user} onLogout={onLogout}><NewQuote /></Layout> : <Navigate to="/login" />} />
        <Route path="/quotes/:id" element={user ? <Layout user={user} onLogout={onLogout}><QuoteDetail /></Layout> : <Navigate to="/login" />} />
        <Route path="/quotes/:id/edit" element={user ? <Layout user={user} onLogout={onLogout}><NewQuote /></Layout> : <Navigate to="/login" />} />

        <Route path="/appointments" element={user ? <Layout user={user} onLogout={onLogout}><Appointments /></Layout> : <Navigate to="/login" />} />
        <Route path="/vacations" element={user ? <Layout user={user} onLogout={onLogout}><Vacations /></Layout> : <Navigate to="/login" />} />
        
        <Route path="/clients" element={user ? <Layout user={user} onLogout={onLogout}><Clients /></Layout> : <Navigate to="/login" />} />
        <Route path="/clients/new" element={user ? <Layout user={user} onLogout={onLogout}><NewClient /></Layout> : <Navigate to="/login" />} />
        <Route path="/clients/:id" element={user ? <Layout user={user} onLogout={onLogout}><ClientDetail /></Layout> : <Navigate to="/login" />} />
        
        <Route path="/equipments" element={user ? <Layout user={user} onLogout={onLogout}><Equipments /></Layout> : <Navigate to="/login" />} />
        <Route path="/equipments/:id" element={user ? <Layout user={user} onLogout={onLogout}><EquipmentDetail /></Layout> : <Navigate to="/login" />} />
        <Route path="/clients/:clientId/equipments/new" element={user ? <Layout user={user} onLogout={onLogout}><NewEquipment /></Layout> : <Navigate to="/login" />} />
        <Route path="/equipments/:id/edit" element={user ? <Layout user={user} onLogout={onLogout}><EditEquipment /></Layout> : <Navigate to="/login" />} />
        
        <Route path="/inventory" element={user ? <Layout user={user} onLogout={onLogout}><Inventory /></Layout> : <Navigate to="/login" />} />
        <Route path="/fleet" element={user ? <Layout user={user} onLogout={onLogout}><FleetManagement /></Layout> : <Navigate to="/login" />} />
        <Route path="/users" element={user && user.role === UserRole.ADMIN ? <Layout user={user} onLogout={onLogout}><Users /></Layout> : <Navigate to="/" />} />
        <Route path="/maintenance" element={user && user.role === UserRole.ADMIN ? <Layout user={user} onLogout={onLogout}><Maintenance /></Layout> : <Navigate to="/" />} />
        <Route path="/profile" element={user ? <Layout user={user} onLogout={onLogout}><Profile /></Layout> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
};

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = () => {
      try {
        const sessionUser = mockData.getSession();
        if (sessionUser) setUser(sessionUser);
      } catch (e) {
        console.error("Erro ao carregar sessão:", e);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleLogin = () => setUser(mockData.getSession());
  const handleLogout = async () => { await mockData.signOut(); setUser(null); };

  return (
    <ThemeProvider>
      <StoreProvider>
        <HashRouter>
          <AppContent 
            user={user} 
            onLogin={handleLogin} 
            onLogout={handleLogout} 
            loading={loading} 
          />
        </HashRouter>
      </StoreProvider>
    </ThemeProvider>
  );
}

export default App;
