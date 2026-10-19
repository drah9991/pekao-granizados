export type StaffRole = 'admin' | 'manager' | 'cashier' | 'driver';

export type AccessKind = 'staff' | 'customer';

export interface Access {
  userId: string;
  email: string | null;
  name: string | null;
  kind: AccessKind;
  roles: StaffRole[];
  storeId: string | null;
  isSuperadmin: boolean;
}

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  cashier: 'Cajero',
  driver: 'Domiciliario',
};

function hasAnyRole(access: Access, roles: StaffRole[]): boolean {
  return access.isSuperadmin || access.roles.some((role) => roles.includes(role));
}

// Reflejan las políticas RLS; la base de datos es quien realmente autoriza.
export const canManageMenu = (access: Access): boolean => hasAnyRole(access, ['admin', 'manager']);
export const canVoidSales = (access: Access): boolean => hasAnyRole(access, ['admin', 'manager']);
export const canEditStore = (access: Access): boolean => hasAnyRole(access, ['admin']);
