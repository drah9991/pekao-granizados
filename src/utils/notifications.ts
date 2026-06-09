/**
 * Pekao POS - PWA & Browser Local Notification Utilities
 */

/**
 * Requests permission from the user to display notifications.
 * @returns Promise<boolean> indicating if permission was granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("Este navegador no soporta notificaciones de escritorio.");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

/**
 * Sends a local browser/PWA notification if permission is granted.
 * @param title The title of the notification.
 * @param options Additional notification options (body, icon, tag, etc.).
 */
export async function sendLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    // Standard default options
    const defaultOptions: NotificationOptions = {
      icon: "/pwa-192.png",
      badge: "/favicon.ico",
      silent: false,
      tag: "pekao-pos-alert",
      ...options,
    };

    // If a service worker is active, trigger notification through it (recommended for PWAs)
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration) {
          await registration.showNotification(title, defaultOptions);
          return;
        }
      } catch (error) {
        console.warn("Error triggering notification via Service Worker, falling back to new Notification():", error);
      }
    }

    // Fallback to standard client-side Notification
    new Notification(title, defaultOptions);
  } else {
    console.log("No se pudo enviar la notificación. Permiso actual:", Notification.permission);
  }
}
