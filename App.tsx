
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { mockData } from './services/mockData';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ServiceOrders from './pages/ServiceOrders';
import { ServiceOrderDetail } from './pages/ServiceOrderDetail';
import NewServiceOrder from './pages/NewServiceOrder';
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
import { UserRole } from './types';
import { StoreProvider } from './contexts/StoreContext';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = () => {
      const sessionUser = mockData.getSession();
      if (sessionUser) {
        setUser(sessionUser);
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const handleLogin = () => {
    const sessionUser = mockData.getSession();
    setUser(sessionUser);
  };

  const handleLogout = async () => {
    await mockData.signOut();
    setUser(null);
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 text-gray-500 uppercase font-black text-[10px] tracking-widest">A iniciar aplicação...</div>;
  }
  
  return (
    <ThemeProvider>
      <StoreProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
            
            <Route path="/" element={user ? <Layout user={user} onLogout={handleLogout}><Dashboard /></Layout> : <Navigate to="/login" />} />
            <Route path="/os" element={user ? <Layout user={user} onLogout={handleLogout}><ServiceOrders /></Layout> : <Navigate to="/login" />} />
            <Route path="/os/new" element={user ? <Layout user={user} onLogout={handleLogout}><NewServiceOrder /></Layout> : <Navigate to="/login" />} />
            <Route path="/os/:id" element={user ? <Layout user={user} onLogout={handleLogout}><ServiceOrderDetail /></Layout> : <Navigate to="/login" />} />
            <Route path="/appointments" element={user ? <Layout user={user} onLogout={handleLogout}><Appointments /></Layout> : <Navigate to="/login" />} />
            <Route path="/vacations" element={user ? <Layout user={user} onLogout={handleLogout}><Vacations /></Layout> : <Navigate to="/login" />} />
            
            <Route path="/clients" element={user ? <Layout user={user} onLogout={handleLogout}><Clients /></Layout> : <Navigate to="/login" />} />
            <Route path="/clients/new" element={user ? <Layout user={user} onLogout={handleLogout}><NewClient /></Layout> : <Navigate to="/login" />} />
            <Route path="/clients/:id" element={user ? <Layout user={user} onLogout={handleLogout}><ClientDetail /></Layout> : <Navigate to="/login" />} />
            
            <Route path="/equipments" element={user ? <Layout user={user} onLogout={handleLogout}><Equipments /></Layout> : <Navigate to="/login" />} />
            <Route path="/equipments/:id" element={user ? <Layout user={user} onLogout={handleLogout}><EquipmentDetail /></Layout> : <Navigate to="/login" />} />
            <Route path="/clients/:clientId/equipments/new" element={user ? <Layout user={user} onLogout={handleLogout}><NewEquipment /></Layout> : <Navigate to="/login" />} />
            <Route path="/equipments/:id/edit" element={user ? <Layout user={user} onLogout={handleLogout}><EditEquipment /></Layout> : <Navigate to="/login" />} />
            
            <Route path="/inventory" element={user ? <Layout user={user} onLogout={handleLogout}><Inventory /></Layout> : <Navigate to="/login" />} />
            <Route path="/users" element={user ? <Layout user={user} onLogout={handleLogout}><Users /></Layout> : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? <Layout user={user} onLogout={handleLogout}><Profile /></Layout> : <Navigate to="/login" />} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </HashRouter>
      </StoreProvider>
    </ThemeProvider>
  );
}

export default App;
