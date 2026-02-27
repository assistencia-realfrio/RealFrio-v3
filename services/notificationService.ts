
export const notificationService = {
  /**
   * Dispara uma notificação de forma resiliente.
   */
  notify: async (title: string, body: string, url: string = '/') => {
    console.log(`[NotificationService] Disparando: ${title}`);

    if (!("Notification" in window)) return false;

    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return false;
    }

    try {
      // Garantir que temos acesso ao Service Worker
      const registration = await navigator.serviceWorker.ready;
      
      const payload = {
        type: 'SHOW_NOTIFICATION',
        title,
        body,
        url: window.location.origin + '/#' + url
      };

      // Tentar via postMessage se o controlador existir (mais seguro contra bloqueios de UI)
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(payload);
        console.log("[NotificationService] Enviado via controlador.");
        return true;
      }

      // Se não houver controlador (ex: página acabou de carregar), usar a registration direta
      if (registration && registration.showNotification) {
        await registration.showNotification(title, {
          body,
          icon: '/rf-icon-192-v5.png',
          badge: '/rf-favicon-v5.png',
          vibrate: [200, 100, 200],
          data: { url: window.location.origin + '/#' + url }
        } as any);
        console.log("[NotificationService] Enviado via registration direta.");
        return true;
      }
    } catch (e) {
      console.error("[NotificationService] Erro fatal no disparo:", e);
    }

    return false;
  },

  /**
   * Solicita permissão e garante que o SW está ativo
   */
  requestPermission: async (): Promise<{ granted: boolean, error?: string }> => {
    if (!("Notification" in window)) {
      return { granted: false, error: "O seu navegador não suporta notificações." };
    }
    
    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== "granted") {
        return { granted: false, error: "Permissão bloqueada nas definições do navegador." };
      }

      if ('serviceWorker' in navigator) {
        try {
          // Registrar com um timestamp para evitar cache agressivo no telemóvel
          const registration = await navigator.serviceWorker.register(`/sw.js?v=${Date.now()}`);
          await navigator.serviceWorker.ready;
          
          // Forçar o service worker a assumir o controlo se houver um novo
          if (registration.active) {
            registration.active.postMessage({ type: 'SKIP_WAITING' });
          }
          
          console.log("[NotificationService] Service Worker pronto e registado.");
        } catch (swError: any) {
          console.error("[NotificationService] Erro ao registar Service Worker:", swError);
          return { 
            granted: true, 
            error: "Permissão concedida, mas o motor falhou ao iniciar: " + (swError.message || "Erro desconhecido.") 
          };
        }
      }
      
      return { granted: true };
    } catch (e: any) {
      console.error("[NotificationService] Erro geral ao solicitar permissão:", e);
      return { granted: false, error: "Erro interno: " + (e.message || "Desconhecido") };
    }
  },

  /**
   * Converte chave VAPID base64 para Uint8Array
   */
  urlBase64ToUint8Array: (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
  
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
  
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
};
