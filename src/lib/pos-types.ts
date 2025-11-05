import { Enums } from "@/integrations/supabase/types";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  toppings?: Product[]; // Toppings are now products
  customizationId?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string | null;
  emoji?: string; // Optional emoji for display
  color?: string; // Optional color for display
  type: Enums<'product_type'>; // New type field
  sku: string | null;
  description: string | null;
  active: boolean | null;
  images: string[] | null;
  variants: Json | null;
  recipe: Json | null;
  is_public: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  store_id: string | null;
  cost: number | null;
}

export interface Size {
  id: string;
  name: string;
  multiplier: number;
}