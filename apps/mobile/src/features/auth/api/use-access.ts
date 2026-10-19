import type { User } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import { useSessionStore } from '../session-store';
import type { Access, StaffRole } from '../types';

export const accessQueryRoot = ['access'] as const;

interface ProfileRow {
  name: string | null;
  store_id: string | null;
  is_superadmin: boolean | null;
}

/**
 * Un cliente que se registró con confirmación por correo no tenía sesión al
 * registrarse; su ficha de cliente se crea en el primer inicio de sesión con
 * los datos que dejó en los metadatos.
 */
async function ensureCustomerRecord(user: User): Promise<void> {
  const { data: existing, error } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo leer tu cuenta: ${error.message}`);
  if (existing) return;

  const metadata = user.user_metadata ?? {};
  if (metadata.consent_habeas_data !== true || typeof metadata.name !== 'string') return;

  const { error: upsertError } = await supabase.rpc('upsert_my_customer', {
    p_name: metadata.name,
    p_phone: typeof metadata.phone === 'string' ? metadata.phone : null,
    p_consent_habeas_data: true,
  });
  if (upsertError) throw new Error(`No se pudo completar tu registro: ${upsertError.message}`);
}

async function fetchAccess(user: User): Promise<Access> {
  const [profileResult, rolesResult] = await Promise.all([
    supabase.from('profiles').select('name, store_id, is_superadmin').eq('id', user.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', user.id),
  ]);

  if (profileResult.error) throw new Error(`No se pudo leer tu perfil: ${profileResult.error.message}`);
  if (rolesResult.error) throw new Error(`No se pudieron leer tus permisos: ${rolesResult.error.message}`);

  const profile: ProfileRow | null = profileResult.data;
  const roles = (rolesResult.data ?? []).map((row: { role: StaffRole }) => row.role);
  const isSuperadmin = profile?.is_superadmin === true;
  const kind = roles.length > 0 || isSuperadmin ? 'staff' : 'customer';

  if (kind === 'customer') {
    await ensureCustomerRecord(user);
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    name: profile?.name ?? null,
    kind,
    roles,
    storeId: profile?.store_id ?? null,
    isSuperadmin,
  };
}

/** Quién es el usuario actual y qué puede hacer. `data` es null sin sesión. */
export function useAccess() {
  const user = useSessionStore((state) => state.session?.user ?? null);

  return useQuery({
    queryKey: [...accessQueryRoot, user?.id ?? 'anon'],
    queryFn: () => (user ? fetchAccess(user) : null),
    staleTime: Infinity,
  });
}
