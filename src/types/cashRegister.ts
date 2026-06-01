export interface CashSummary {
  cash: number;
  transfer: number;
  card: number;
  qr: number;
  total: number;
}

export interface OrderRecord {
  id: string;
  total: number;
  created_at: string;
  payment: Record<string, unknown>;
  user: { name: string | null } | null;
}

export interface CashTurn {
  id: string;
  opened_at: string;
  closed_at: string | null;
  status: 'open' | 'closed' | 'paused';
  cashier_id: string;
  store_id: string;
  profiles?: { name: string | null };
}
