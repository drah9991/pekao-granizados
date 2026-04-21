export type ExpenseCategory = 
  | "Servicios"
  | "Arriendo"
  | "Insumos"
  | "Mantenimiento"
  | "Personal"
  | "Publicidad"
  | "Otros";

export interface Expense {
  id: string;
  store_id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  expense_date: string;
  created_at: string;
}

export interface ExpenseStats {
  totalAmount: number;
  todayAmount: number;
  monthlyAmount: number;
  categoryDistribution: { category: string; amount: number }[];
}
