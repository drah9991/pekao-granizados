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
  maxStock?: number;
  isGranizado?: boolean;
  mixtureStock?: number;
  baseVolume?: number;
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
}

export interface PricingRule {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  active: boolean;
  type: string;
  target_type: string;
  target_id: string | null;
  discount_type: string;
  discount_value: number;
  start_time: string | null;
  end_time: string | null;
  days_of_week: number[] | null;
  created_at: string;
}

export interface Size {
  id: string;
  name: string;
  multiplier: number;
}
