
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
    
    const permission = await Notification.requestPermission();
    
    if (permission === "granted" && 'serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js?v=6.0');
        const reg = await navigator.serviceWorker.ready;
        // Se após o registro não houver controlador, forçamos um reload ou claim
        if (!navigator.serviceWorker.controller) {
           console.log("Service worker registrado mas não controla a página ainda.");
        }
      } catch (e) {
        console.error("Erro no registro do SW:", e);
      }
    }
    
    return permission === "granted";
  }
};
