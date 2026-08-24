import type React from "react";

export type Role = 'admin' | 'cashier' | 'owner' | 'manager' | 'store_manager' | 'driver' | 'customer' | 'superadmin';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  roles: Role[];
  children?: NavItem[];
  type?: 'link' | 'collapsible';
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  roles: Role[];
}
