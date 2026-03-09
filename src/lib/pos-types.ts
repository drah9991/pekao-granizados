import { Enums } from "@/integrations/supabase/types";
import type { Json } from "@/integrations/supabase/types";

export interface CartItem {
  id: string;
  name: string;
  productId: string;
  price: number;
  quantity: number;
  size?: string;
  sizeMultiplier?: number;
  toppings?: Product[];
  customizationId?: string;
  originalPrice?: number;
  discountMessage?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string | null;
  type: Enums<'product_type'>;
  sku: string | null;
  description: string | null;
  active: boolean | null;
  images: string[] | null;
  variants: Json | null;
  recipe: Json | null;
  is_public: boolean | null;
  created_at: string | null;
  store_id: string | null;
  cost: number | null;
}

export interface Size {
  id: string;
  name: string;
  multiplier: number;
}
