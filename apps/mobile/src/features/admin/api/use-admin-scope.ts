import { useAccess } from '@/features/auth/api/use-access';
import type { Access } from '@/features/auth/types';
import { STORE_ID } from '@/lib/config';

interface AdminScope {
  access: Access | null;
  /** Sede del perfil del personal; si no tiene, la sede configurada en la app. */
  storeId: string;
}

export function useAdminScope(): AdminScope {
  const { data: access } = useAccess();
  return { access: access ?? null, storeId: access?.storeId ?? STORE_ID };
}
