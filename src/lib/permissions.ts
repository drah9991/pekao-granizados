/**
 * Permisos de acciones sensibles del POS. Reflejan las reglas de la base de
 * datos (que es quien realmente autoriza); aquí solo se usan para ocultar o
 * deshabilitar acciones que el usuario no puede hacer.
 */

export interface PermissionSubject {
  userRole: string | null | undefined;
  isSuperAdmin: boolean;
}

/** Roles que pueden sumar cantidades al inventario (entradas, recargas, preparaciones). */
const STOCK_INCREASE_ROLES = ["admin", "manager"];

export function canAddStock({ userRole, isSuperAdmin }: PermissionSubject): boolean {
  return isSuperAdmin || (userRole != null && STOCK_INCREASE_ROLES.includes(userRole));
}

/** Igual que rls_can_access_store: admin y superadmin operan en cualquier sede. */
export function canChooseAnyStore({ userRole, isSuperAdmin }: PermissionSubject): boolean {
  return isSuperAdmin || userRole === "admin";
}

/**
 * Sedes que se ofrecen al iniciar sesión. Admin y superadmin eligen entre todas;
 * el resto del personal solo tiene la de su perfil (la asigna un admin).
 */
export function storesForLogin<T extends { id: string }>(
  stores: T[],
  subject: PermissionSubject & { profileStoreId: string | null | undefined }
): T[] {
  if (canChooseAnyStore(subject)) return stores;
  return stores.filter((store) => store.id === subject.profileStoreId);
}

/** Un tipo de movimiento de inventario suma cantidades si es una entrada. */
export function isStockIncreaseMovement(movementType: string): boolean {
  return movementType.trim().toLowerCase().startsWith("entrada");
}

export const STOCK_INCREASE_DENIED_MESSAGE = "Solo administradores y gerentes pueden sumar cantidades al inventario.";
