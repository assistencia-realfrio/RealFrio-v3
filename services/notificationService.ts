
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
  requestPermission: async () => {
    if (!("Notification" in window)) return false;
    
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === "granted" && 'serviceWorker' in navigator) {
        // Registrar com um timestamp para evitar cache agressivo no telemóvel
        const registration = await navigator.serviceWorker.register(`/sw.js?v=${Date.now()}`);
        await navigator.serviceWorker.ready;
        
        // Forçar o service worker a assumir o controlo se houver um novo
        if (registration.active) {
          registration.active.postMessage({ type: 'SKIP_WAITING' });
        }
        
        console.log("[NotificationService] Service Worker pronto e registado.");
      }
      
      return permission === "granted";
    } catch (e) {
      console.error("[NotificationService] Erro ao solicitar permissão:", e);
      return false;
    }
  }
};
