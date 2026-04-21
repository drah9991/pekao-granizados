import { Enums } from "@/integrations/supabase/types";

export interface StockItem {
  id: string;
  product_id: string;
  store_id: string;
  qty: number;
  min_qty: number;
  updated_at: string;
  product: {
    name: string;
    sku: string | null;
    price: number;
    cost: number | null;
    active: boolean;
    type: Enums<'product_type'>;
  };
  store: {
    name: string;
  };
}

export interface Store {
  id: string;
  name: string;
}

export const productTypeOptions: { value: Enums<'product_type'> | "all"; label: string }[] = [
  { value: "all", label: "TODOS LOS TIPOS" },
  { value: "granizado", label: "GRANIZADOS" },
  { value: "topping", label: "TOPPINGS" },
  { value: "sachet", label: "SACHETS" },
  { value: "sweet", label: "DULCES" },
];
