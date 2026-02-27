import React, { useEffect, useState } from 'react';
import { Bell, MapPin, Camera, Check, X } from 'lucide-react';
import { notificationService } from '../services/notificationService';

interface PermissionStatus {
  notifications: boolean;
  location: boolean;
  camera: boolean;
}

const PermissionRequestModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    notifications: false,
    location: false,
    camera: false
  });
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    // Check Notification
    const notif = "Notification" in window && Notification.permission === 'granted';
    
    // Check Location (approximate check via permissions API if available, otherwise assume false until requested)
    let loc = false;
    try {
      const locPerm = await navigator.permissions.query({ name: 'geolocation' });
      loc = locPerm.state === 'granted';
    } catch (e) {}

    // Check Camera
    let cam = false;
    try {
      const camPerm = await navigator.permissions.query({ name: 'camera' as any });
      cam = camPerm.state === 'granted';
    } catch (e) {}

    setPermissions({ notifications: notif, location: loc, camera: cam });
    
    // If all granted, close automatically
    if (notif && loc && cam) {
      onClose();
    }
  };

  const requestNotification = async () => {
    setLoading('notification');
    await notificationService.requestPermission();
    await checkPermissions();
    setLoading(null);
  };

  const requestLocation = () => {
    setLoading('location');
    navigator.geolocation.getCurrentPosition(
      () => {
        checkPermissions();
        setLoading(null);
      },
      (err) => {
        console.error(err);
        setLoading(null);
        alert("É necessário permitir a localização nas definições do navegador.");
      }
    );
  };

  const requestCamera = async () => {
    setLoading('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop immediately
      stream.getTracks().forEach(track => track.stop());
      await checkPermissions();
    } catch (err) {
      console.error(err);
      alert("É necessário permitir a câmara nas definições do navegador.");
    } finally {
      setLoading(null);
    }
  };

  // If all permissions are granted, don't render anything (or close)
  if (permissions.notifications && permissions.location && permissions.camera) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">
            Configuração Inicial
          </h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Para o correto funcionamento da app, precisamos das seguintes permissões:
          </p>
        </div>

        <div className="space-y-4">
          {/* NOTIFICATIONS */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${permissions.notifications ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                <Bell size={20} />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Notificações</h3>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Alertas de OS e Chat</p>
              </div>
            </div>
            {permissions.notifications ? (
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                <Check size={16} />
              </div>
            ) : (
              <button 
                onClick={requestNotification}
                disabled={loading === 'notification'}
                className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-colors"
              >
                {loading === 'notification' ? '...' : 'Ativar'}
              </button>
            )}
          </div>

          {/* LOCATION */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${permissions.location ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                <MapPin size={20} />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Localização</h3>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Navegação e Check-in</p>
              </div>
            </div>
            {permissions.location ? (
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                <Check size={16} />
              </div>
            ) : (
              <button 
                onClick={requestLocation}
                disabled={loading === 'location'}
                className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-colors"
              >
                {loading === 'location' ? '...' : 'Ativar'}
              </button>
            )}
          </div>

          {/* CAMERA */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${permissions.camera ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                <Camera size={20} />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Câmara</h3>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Fotos e QR Code</p>
              </div>
            </div>
            {permissions.camera ? (
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                <Check size={16} />
              </div>
            ) : (
              <button 
                onClick={requestCamera}
                disabled={loading === 'camera'}
                className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-colors"
              >
                {loading === 'camera' ? '...' : 'Ativar'}
              </button>
            )}
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          Continuar mesmo sem permissões
        </button>
      </div>
    </div>
  );
};

export default PermissionRequestModal;
