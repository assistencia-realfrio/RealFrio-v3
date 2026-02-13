
export const notificationService = {
  /**
   * Dispara uma notificação de forma resiliente.
   */
  notify: async (title: string, body: string, url: string = '/') => {
    console.log(`[NotificationService] Solicitação de alerta: ${title}`);

    if (!("Notification" in window)) {
      console.warn("Navegador não suporta notificações.");
      return false;
    }

    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return false;
    }

    const options = {
      body,
      icon: '/rf-icon-192-v5.png',
      badge: '/rf-favicon-v5.png',
      vibrate: [200, 100, 200],
      tag: 'rf-alert-' + Math.random(),
      renotify: true,
      data: { url: window.location.origin + '/#' + url }
    };

    // detetar se é mobile (Android/iOS)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    try {
      // 1. Tentar SEMPRE via Service Worker primeiro (O único método fiável em Android)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, options);
          console.log("[NotificationService] Exibida com sucesso via Service Worker.");
          return true;
        }
      }
    } catch (swError) {
      console.error("[NotificationService] Erro no Service Worker:", swError);
    }

    // 2. Fallback apenas para Desktop (ou se o SW falhar por algum motivo raro)
    if (!isMobile) {
      try {
        new Notification(title, options);
        return true;
      } catch (e) {
        console.error("[NotificationService] Erro na API Nativa:", e);
      }
    }

    return false;
  },

  /**
   * Solicita permissão e garante que o SW está ativo
   */
  requestPermission: async () => {
    if (!("Notification" in window)) return false;
    
    const permission = await Notification.requestPermission();
    
    // Se permitir, registar imediatamente o Service Worker se ainda não estiver
    if (permission === "granted" && 'serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js?v=4.1');
      } catch (e) {
        console.error("Erro ao registar SW no pedido de permissão", e);
      }
    }
    
    return permission === "granted";
  }
};
