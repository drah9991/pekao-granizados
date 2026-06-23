import type { Enums } from "@/integrations/supabase/types";
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
  maxStock?: number;
  isGranizado?: boolean;
  mixtureStock?: number;
  baseVolume?: number;
  productPrice?: number;
  productType?: string;
  productCategory?: string | null;
  variants?: any;
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
  stock?: number;
  base_volume?: number | null;
  unit_measure?: string | null;
  mixtureStock?: number;
  has_recipe?: boolean;
  category_id?: string | null;
  category_relation?: Category | null;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  color_hex: string | null;
  is_active: boolean | null;
  store_id?: string | null;
  created_at?: string | null;
}

export interface Size {
  id: string;
  name: string;
  multiplier: number;
}
