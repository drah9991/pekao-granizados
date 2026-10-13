import React from 'react';
import { Toaster as SonnerToaster } from 'sonner';
import { useNotificationStore, captureErrorDetails, type NotificationLevel } from '@/stores/notificationStore';
import { toast as sonnerToast } from 'sonner';

// Global error handler that captures all errors
export function setupGlobalErrorHandling() {
  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);

    const { addNotification } = useNotificationStore.getState();
    addNotification({
      level: 'error',
      title: 'Error no manejado',
      message: 'Ocurrió un error inesperado en la aplicación',
      details: captureErrorDetails(event.reason),
      context: {
        type: 'unhandledRejection',
      },
    });

    sonnerToast.error('Error inesperado', {
      description: 'Revisa el centro de notificaciones para más detalles',
    });
  });

  // Capture console errors in production
  if (!import.meta.env.DEV) {
    const originalError = console.error;
    console.error = (...args) => {
      originalError(...args);

      const { addNotification } = useNotificationStore.getState();
      addNotification({
        level: 'error',
        title: 'Error en consola',
        message: args[0]?.toString() || 'Error desconocido',
        details: args.map(a => captureErrorDetails(a)).join('\n'),
        context: {
          type: 'consoleError',
        },
      });
    };
  }
}

// Hook to use toast with notification center integration
export function useToast() {
  const { addNotification } = useNotificationStore();

  const showToast = (
    level: NotificationLevel,
    title: string,
    message?: string,
    options?: {
      details?: string;
      context?: Record<string, any>;
      duration?: number;
      persistent?: boolean; // If true, only saves to notification center without toast
    }
  ) => {
    // Save to notification center
    addNotification({
      level,
      title,
      message: message || '',
      details: options?.details,
      context: options?.context,
    });

    // Show toast unless persistent
    if (!options?.persistent) {
      const toastFn = level === 'error' ? sonnerToast.error
        : level === 'warning' ? sonnerToast.warning
        : level === 'success' ? sonnerToast.success
        : sonnerToast.info;

      toastFn(title, {
        description: message,
        duration: options?.duration || 8000, // 8 segundos por defecto (antes 4000)
      });
    }
  };

  return {
    success: (title: string, message?: string, options?: any) =>
      showToast('success', title, message, options),
    error: (title: string, message?: string, options?: any) =>
      showToast('error', title, message, options),
    warning: (title: string, message?: string, options?: any) =>
      showToast('warning', title, message, options),
    info: (title: string, message?: string, options?: any) =>
      showToast('info', title, message, options),
  };
}

// Toast container component
export function ToastContainer() {
  return (
    <SonnerToaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'border-border !bg-white dark:!bg-slate-900 !text-slate-900 dark:!text-slate-100',
          title: '!text-slate-900 dark:!text-slate-100 !font-semibold',
          description: '!text-slate-600 dark:!text-slate-400',
          error: '!bg-white dark:!bg-slate-900 !border-red-500 dark:!border-red-400',
          success: '!bg-white dark:!bg-slate-900 !border-green-500 dark:!border-green-400',
          warning: '!bg-white dark:!bg-slate-900 !border-yellow-500 dark:!border-yellow-400',
          info: '!bg-white dark:!bg-slate-900 !border-blue-500 dark:!border-blue-400',
        },
      }}
    />
  );
}
