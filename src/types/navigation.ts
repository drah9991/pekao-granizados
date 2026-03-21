export type Role = 'admin' | 'cashier' | 'owner' | 'manager' | 'store_manager' | 'driver' | 'customer';

export interface NavItem {
  label: string;
  href: string;
  icon: any;
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
