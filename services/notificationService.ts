
export const notificationService = {
  /**
   * Dispara uma notificação de forma resiliente.
   */
  notify: async (title: string, body: string, url: string = '/') => {
    console.log(`[NotificationService] Intento: ${title}`);

    if (!("Notification" in window)) return false;

    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return false;
    }

    try {
      // 1. Prioridade Máxima: Enviar para o Service Worker via Canal de Mensagens
      // Este método é o mais robusto em Mobile/PWA porque o SW tem "privilégios" de sistema
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          body,
          url: window.location.origin + '/#' + url
        });
        console.log("[NotificationService] Comando enviado para o Service Worker.");
        return true;
      }

      // 2. Fallback: Se o controlador não estiver pronto, tentar via registro direto
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        // Fix: Cast options to any because the 'vibrate' property is sometimes missing from standard NotificationOptions type definitions
        await registration.showNotification(title, {
          body,
          icon: '/rf-icon-192-v5.png',
          badge: '/rf-favicon-v5.png',
          vibrate: [200, 100, 200],
          data: { url: window.location.origin + '/#' + url }
        } as any);
        return true;
      }
    } catch (e) {
      console.error("[NotificationService] Falha técnica no disparo:", e);
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
        await navigator.serviceWorker.register('/sw.js?v=5.0');
        await navigator.serviceWorker.ready;
      } catch (e) {
        console.error("Erro no registro do SW:", e);
      }
    }
    
    return permission === "granted";
  }
};
