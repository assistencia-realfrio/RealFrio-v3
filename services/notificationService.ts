
export const notificationService = {
  /**
   * Dispara uma notificação de forma resiliente.
   */
  notify: async (title: string, body: string, url: string = '/') => {
    console.log(`[NotificationService] Iniciando disparo: ${title}`);

    if (!("Notification" in window)) {
      alert("Erro: Este navegador não suporta notificações de sistema.");
      return false;
    }

    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Erro: Permissão de notificações negada. Ative-as nas definições do browser.");
        return false;
      }
    }

    const options = {
      body,
      icon: '/rf-icon-192-v5.png',
      badge: '/rf-favicon-v5.png',
      vibrate: [200, 100, 200],
      tag: 'rf-notification-' + Date.now(),
      data: { url: window.location.origin + '/#' + url }
    };

    let success = false;

    // 1. Tentar via Service Worker (Obrigatório para Mobile/PWA)
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.showNotification) {
        await registration.showNotification(title, options);
        console.log("[NotificationService] Disparado via SW.");
        success = true;
      }
    } catch (swError) {
      console.warn("[NotificationService] Erro no Service Worker:", swError);
    }

    // 2. Fallback Nativo (Apenas funciona se a tab estiver aberta/foreground)
    try {
      if (!success) {
        new Notification(title, options);
        console.log("[NotificationService] Disparado via API Nativa.");
        success = true;
      }
    } catch (e) {
      console.error("[NotificationService] Falha total no disparo:", e);
    }

    if (!success) {
      alert("O sistema tentou enviar o alerta mas o seu dispositivo bloqueou a exibição.");
    }

    return success;
  },

  /**
   * Solicita permissão e garante que o SW está ativo
   */
  requestPermission: async () => {
    if (!("Notification" in window)) return false;
    
    if (Notification.permission === "denied") {
      alert("As notificações foram bloqueadas. Clique no ícone do cadeado na barra de endereços para reativar.");
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
};
