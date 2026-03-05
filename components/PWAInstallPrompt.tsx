
import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Info, ExternalLink, Share, MoreVertical } from 'lucide-react';

interface PWAInstallPromptProps {
  variant?: 'sidebar' | 'profile';
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ variant = 'sidebar' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  useEffect(() => {
    // Verificar se está num iframe
    setIsInIframe(window.self !== window.top);

    // Verificar se é iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Verificar se já está instalado (standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsInstalled(isStandalone);

    const handler = (e: any) => {
      console.log('Event beforeinstallprompt fired');
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      setShowManualInstructions(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      alert("Para instalar no iPhone/iPad:\n1. Clique no botão 'Partilhar' (quadrado com seta)\n2. Role para baixo e clique em 'Adicionar ao Ecrã Principal'");
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response: ${outcome}`);
      setDeferredPrompt(null);
    } else {
      // Fallback: mostrar instruções manuais
      setShowManualInstructions(true);
    }
  };

  if (isInstalled) return null;

  // Se estiver num iframe, avisar que precisa abrir noutra aba
  if (isInIframe && variant === 'profile') {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-[2.5rem] border border-blue-100 dark:border-blue-800 p-8 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-800 text-blue-600 flex items-center justify-center">
            <Info size={24} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white uppercase text-sm">Modo de Pré-visualização</h3>
            <p className="text-[9px] text-slate-500 font-black uppercase mt-1">Abra o link direto para instalar</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
          A instalação PWA não funciona dentro desta janela. Clique no botão de "Abrir em nova aba" no topo do ecrã ou use o link direto da aplicação.
        </p>
      </div>
    );
  }

  if (variant === 'profile') {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 p-8 space-y-6 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center shadow-inner">
                {isIOS ? <Share size={24} /> : <Smartphone size={24} />}
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-[0.1em] leading-none">
                  {isIOS ? 'Instalar no iOS' : 'Instalar Aplicação'}
                </h3>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase mt-1.5 tracking-widest">
                  {isIOS ? 'Siga as instruções de partilha' : 'Acesso rápido no ecrã principal'}
                </p>
              </div>
            </div>
            <button 
              onClick={handleInstallClick}
              className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
              {isIOS ? <Info size={14} /> : <Download size={14} />}
              {isIOS ? 'Como Instalar' : 'Instalar'}
            </button>
          </div>
        </div>

        {showManualInstructions && !isIOS && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-[2.5rem] border border-blue-100 dark:border-blue-800 p-8 space-y-4 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3 text-blue-600">
              <Info size={18} />
              <h4 className="text-[10px] font-black uppercase tracking-widest">Instalação Manual (Chrome)</h4>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase leading-relaxed">
                O prompt automático não foi disparado pelo navegador. Siga estes passos:
              </p>
              <ol className="text-[10px] text-slate-600 dark:text-slate-400 font-medium space-y-2 list-decimal pl-4">
                <li>Clique no menu do Chrome (3 pontos <MoreVertical size={12} className="inline" /> no topo direito)</li>
                <li>Procure e clique em <span className="font-black text-blue-600">"Instalar aplicação"</span> ou <span className="font-black text-blue-600">"Adicionar ao ecrã principal"</span></li>
              </ol>
            </div>
            <button 
              onClick={() => setShowManualInstructions(false)}
              className="text-[9px] font-black text-blue-600 underline uppercase tracking-widest"
            >
              Fechar Instruções
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 space-y-0.5">
      <button 
        onClick={handleInstallClick}
        className="flex items-center w-full px-4 py-2.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-widest rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group"
      >
        {isIOS ? <Share className="mr-3 h-4 w-4 text-blue-500" /> : <Download className="mr-3 h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />}
        {isIOS ? 'Como Instalar (iOS)' : 'Instalar Aplicação'}
      </button>
    </div>
  );
};

export default PWAInstallPrompt;
