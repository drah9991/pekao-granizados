/**
 * Quién puede editar o borrar la cuenta de otro usuario (update-user, delete-user).
 *
 * Módulo puro, sin imports de Deno: lo usan las edge functions y lo prueba vitest.
 * Antes bastaba con tener rol de gestión para tocar cualquier cuenta de cualquier sede,
 * incluidas las de admins y superadmins.
 */

export interface ManagedUser {
  id: string;
  storeId: string | null;
  isSuperadmin: boolean;
  roles: string[];
}

export type UserAdminAction = "update" | "delete";

export type UserAdminDecision =
  | { allowed: true }
  | { allowed: false; reason: "self_delete" | "no_role" | "privileged_target" | "other_store" };

type DeniedReason = Extract<UserAdminDecision, { allowed: false }>["reason"];

export const FORBIDDEN_MESSAGES: Record<DeniedReason, string> = {
  self_delete: "Cannot delete your own account via this function",
  no_role: "Forbidden: User does not have sufficient permissions",
  privileged_target: "Forbidden: Only an admin can manage admins, and only a superadmin can manage superadmins",
  other_store: "Forbidden: The user belongs to another store",
};

const MANAGEMENT_ROLES = ["admin", "manager", "store_manager"];

const isSuperadmin = (user: ManagedUser): boolean =>
  user.isSuperadmin || user.roles.includes("super_admin");

export function canManageUser(
  caller: ManagedUser,
  target: ManagedUser,
  action: UserAdminAction,
): UserAdminDecision {
  if (action === "delete" && caller.id === target.id) return { allowed: false, reason: "self_delete" };
  if (isSuperadmin(caller)) return { allowed: true };
  if (!caller.roles.some((role) => MANAGEMENT_ROLES.includes(role))) return { allowed: false, reason: "no_role" };
  if (isSuperadmin(target)) return { allowed: false, reason: "privileged_target" };
  if (!caller.storeId || target.storeId !== caller.storeId) return { allowed: false, reason: "other_store" };
  if (target.roles.includes("admin") && !caller.roles.includes("admin")) {
    return { allowed: false, reason: "privileged_target" };
  }
  return { allowed: true };
}
