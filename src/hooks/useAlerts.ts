import { useAlertStore } from '@/store/useAlertStore';
import type { AlertSeverity } from '@/store/useAlertStore';
import { toast as sonnerToast } from 'sonner';

export const useAlerts = () => {
  const addToast = useAlertStore((state) => state.addToast);
  const setBanner = useAlertStore((state) => state.setBanner);
  const hideBanner = useAlertStore((state) => state.hideBanner);
  const showModal = useAlertStore((state) => state.showModal);
  const hideModal = useAlertStore((state) => state.hideModal);

  const notify = (message: string, severity: AlertSeverity = 'INFO', duration?: number) => {
    // Add to our global state for queueing/persistence if needed
    addToast({ message, severity, duration });

    // Trigger sonner toast for immediate UI feedback
    switch (severity) {
      case 'CRITICAL':
        sonnerToast.error(message, { 
          duration: duration || 8000,
          style: { background: '#f43f5e', color: 'white', border: 'none' } 
        });
        break;
      case 'WARNING':
        sonnerToast.warning(message, { 
          duration: duration || 6000,
          position: 'top-right'
        });
        break;
      case 'INFO':
        sonnerToast.success(message, { 
          duration: duration || 3000,
          style: { background: '#10b981', color: 'white', border: 'none' }
        });
        break;
    }
  };

  return {
    notifyInfo: (msg: string, dur?: number) => notify(msg, 'INFO', dur),
    notifyWarning: (msg: string, dur?: number) => notify(msg, 'WARNING', dur),
    notifyCritical: (msg: string, dur?: number) => notify(msg, 'CRITICAL', dur),
    
    // Banner control
    showCriticalBanner: (message: string, ctaText?: string, onCtaClick?: () => void) => 
      setBanner({ message, ctaText, onCtaClick }),
    hideCriticalBanner: hideBanner,

    // Modal control
    showBlockingModal: (title: string, description: string, data?: any) =>
      showModal({ title, description, data }),
    hideBlockingModal: hideModal
  };
};
