export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  processing: 'En preparación',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export interface OrderSummary {
  id: string;
  createdAt: string;
  status: OrderStatus;
  total: number;
  orderType: string | null;
  customerName: string | null;
}

export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  subtotal: number;
}

export interface OrderDetail extends OrderSummary {
  subtotal: number;
  tax: number;
  customerPhone: string | null;
  cancellationReason: string | null;
  items: OrderItem[];
}

export interface DailySummary {
  orderCount: number;
  pendingCount: number;
  completedTotal: number;
  cancelledCount: number;
}

export interface AdminProduct {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  isPublic: boolean;
  type: string | null;
  category: string | null;
}

export type ProductPatch = Partial<{ price: number; active: boolean; is_public: boolean }>;

export interface StoreInfo {
  id: string;
  name: string;
  address: string | null;
  currency: string | null;
  taxRate: number | null;
}

export interface TeamMember {
  id: string;
  name: string | null;
  phone: string | null;
  roles: string[];
}
