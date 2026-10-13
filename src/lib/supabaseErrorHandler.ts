import { supabase } from '@/integrations/supabase/client';
import { useNotificationStore, captureErrorDetails } from '@/stores/notificationStore';
import { toast } from 'sonner';

// Wrapper para queries de Supabase que captura errores automáticamente
export async function supabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  context?: {
    component?: string;
    action?: string;
    silent?: boolean; // Si true, no muestra toast, solo guarda en notificaciones
  }
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await queryFn();

    if (result.error) {
      const { addNotification } = useNotificationStore.getState();

      // Determinar el nivel basado en el código de error
      let level: 'error' | 'warning' = 'error';
      if (result.error.code === 'PGRST116') { // No results
        level = 'warning';
      }

      addNotification({
        level,
        title: 'Error en consulta de base de datos',
        message: result.error.message || 'Error desconocido',
        details: captureErrorDetails(result.error),
        context: {
          ...context,
          errorCode: result.error.code,
          hint: result.error.hint,
        },
      });

      if (!context?.silent) {
        toast.error('Error en base de datos', {
          description: result.error.message,
        });
      }
    }

    return result;
  } catch (error) {
    const { addNotification } = useNotificationStore.getState();

    addNotification({
      level: 'error',
      title: 'Error inesperado en consulta',
      message: 'Ocurrió un error al ejecutar la consulta',
      details: captureErrorDetails(error),
      context,
    });

    if (!context?.silent) {
      toast.error('Error inesperado', {
        description: 'Revisa el centro de notificaciones para más detalles',
      });
    }

    return { data: null, error };
  }
}

// Hook para queries con mejor manejo de errores
export function useSupabaseErrorHandler() {
  const { addNotification } = useNotificationStore();

  const handleError = (
    error: any,
    context?: {
      component?: string;
      action?: string;
      title?: string;
      silent?: boolean;
    }
  ) => {
    addNotification({
      level: 'error',
      title: context?.title || 'Error en la aplicación',
      message: error?.message || 'Error desconocido',
      details: captureErrorDetails(error),
      context: {
        component: context?.component,
        action: context?.action,
        errorCode: error?.code,
        hint: error?.hint,
      },
    });

    if (!context?.silent) {
      toast.error(context?.title || 'Error', {
        description: error?.message || 'Ha ocurrido un error',
      });
    }
  };

  return { handleError };
}
