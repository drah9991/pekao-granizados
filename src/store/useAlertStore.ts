import { create } from 'zustand';

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface AlertToast {
  id: string;
  message: string;
  severity: AlertSeverity;
  duration?: number;
}

export interface CriticalBanner {
  message: string;
  ctaText?: string;
  onCtaClick?: () => void;
  isVisible: boolean;
}

export interface BlockingModal {
  title: string;
  description: string;
  isVisible: boolean;
  data?: any;
}

interface AlertState {
  // Toasts
  toasts: AlertToast[];
  addToast: (toast: Omit<AlertToast, 'id'>) => void;
  removeToast: (id: string) => void;

  // Critical Banner
  banner: CriticalBanner;
  setBanner: (banner: Partial<CriticalBanner>) => void;
  hideBanner: () => void;

  // Blocking Modal
  modal: BlockingModal;
  showModal: (modal: Omit<BlockingModal, 'isVisible'>) => void;
  hideModal: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }].sort((a, b) => {
        const priority = { CRITICAL: 0, WARNING: 1, INFO: 2 };
        return priority[a.severity] - priority[b.severity];
      }),
    }));
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  banner: {
    message: '',
    isVisible: false,
  },
  setBanner: (banner) =>
    set((state) => ({
      banner: { ...state.banner, ...banner, isVisible: true },
    })),
  hideBanner: () =>
    set((state) => ({
      banner: { ...state.banner, isVisible: false },
    })),

  modal: {
    title: '',
    description: '',
    isVisible: false,
  },
  showModal: (modal) =>
    set(() => ({
      modal: { ...modal, isVisible: true },
    })),
  hideModal: () =>
    set((state) => ({
      modal: { ...state.modal, isVisible: false },
    })),
}));
