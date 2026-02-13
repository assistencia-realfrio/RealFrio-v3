
export const notificationService = {
  /**
   * Dispara uma notificação nativa do sistema
   */
  notify: async (title: string, body: string, url: string = '/') => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      // Tentar via Service Worker para suporte a background
      const registration = await navigator.serviceWorker.ready;
      if (registration) {
        registration.showNotification(title, {
          body,
          icon: '/rf-icon-192-v5.png',
          badge: '/rf-favicon-v5.png',
          vibrate: [200, 100, 200],
          data: { url: window.location.origin + '/#' + url }
        } as any);
      } else {
        // Fallback para notificação simples de foreground
        new Notification(title, { body, icon: '/rf-icon-192-v5.png' });
      }
    }
  },

  /**
   * Solicita permissão ao utilizador
   */
  requestPermission: async () => {
    if (!("Notification" in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
};
