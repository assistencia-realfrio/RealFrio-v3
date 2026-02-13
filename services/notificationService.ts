
export const notificationService = {
  /**
   * Dispara uma notificação.
   */
  notify: async (title: string, body: string, url: string = '/') => {
    console.log(`[NotificationService] A tentar enviar: ${title}`);

    if (!("Notification" in window)) {
      console.error("Este navegador não suporta notificações.");
      return;
    }

    if (Notification.permission !== "granted") {
      console.warn("Permissão de notificação não concedida. Estado atual:", Notification.permission);
      return;
    }

    try {
      // 1. Tentar via Service Worker (Obrigatório para PWAs e Android/iOS em background)
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        console.log("[NotificationService] A usar Service Worker para exibir.");
        await registration.showNotification(title, {
          body,
          icon: '/rf-icon-192-v5.png',
          badge: '/rf-favicon-v5.png',
          vibrate: [200, 100, 200],
          data: { url: window.location.origin + '/#' + url }
        } as any);
        return;
      }
    } catch (swError) {
      console.error("[NotificationService] Erro via Service Worker:", swError);
    }

    // 2. Fallback: Notificação nativa clássica (Apenas funciona com a tab aberta)
    try {
      console.log("[NotificationService] A usar fallback nativo.");
      new Notification(title, { 
        body, 
        icon: '/rf-icon-192-v5.png'
      });
    } catch (e) {
      console.error("[NotificationService] Falha total ao exibir notificação:", e);
    }
  },

  requestPermission: async () => {
    if (!("Notification" in window)) return false;
    
    if (Notification.permission === "denied") {
      alert("As notificações foram bloqueadas no seu navegador. Por favor, clique no cadeado junto ao endereço do site e permita as 'Notificações'.");
      return false;
    }

    const permission = await Notification.requestPermission();
    console.log("[NotificationService] Resultado do pedido de permissão:", permission);
    return permission === "granted";
  }
};
