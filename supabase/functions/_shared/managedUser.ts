import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { ManagedUser } from "./userAdminPolicy.ts";

/** Sede, flag de superadmin y roles de un usuario, leídos con el cliente admin. null si no tiene perfil. */
export async function loadManagedUser(admin: SupabaseClient, userId: string): Promise<ManagedUser | null> {
  const [profileResult, rolesResult] = await Promise.all([
    admin.from("profiles").select("store_id, is_superadmin").eq("id", userId).maybeSingle(),
    admin.from("user_roles").select("role").eq("user_id", userId),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (rolesResult.error) throw rolesResult.error;
  if (!profileResult.data) return null;

  return {
    id: userId,
    storeId: profileResult.data.store_id ?? null,
    isSuperadmin: profileResult.data.is_superadmin === true,
    roles: (rolesResult.data ?? []).map((row) => String(row.role)),
  };
}
