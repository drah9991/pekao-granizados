import { Tables } from "@/integrations/supabase/types";

export type Order = Tables<'orders'>;
export type OrderStatus = "pending" | "completed" | "cancelled" | "processing" | "delivered";

export interface OrderWithDetails extends Order {
  creator_profile: { name: string | null } | null;
  customer_details: {
    name: string | null;
    document_id?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  order_type?: 'pickup' | 'delivery';
  delivery_fee?: number;
  delivery_address?: string | null;
  delivery_phone?: string | null;
}

export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  product_id?: string;
  size?: string;
  size_multiplier?: number;
}

export const orderStatusOptions: { 
  value: OrderStatus | "all"; 
  label: string; 
  color: string; 
  bgClass: string; 
  textClass: string; 
  glowClass: string 
}[] = [
  { value: "all", label: "Todos", color: "bg-gray-500", bgClass: "bg-muted", textClass: "text-muted-foreground", glowClass: "" },
  { value: "pending", label: "Pendiente", color: "bg-yellow-500", bgClass: "bg-amber-500/10", textClass: "text-amber-500", glowClass: "shadow-glow-pro" },
  { value: "completed", label: "Completado", color: "bg-green-500", bgClass: "bg-emerald-500/10", textClass: "text-emerald-500", glowClass: "shadow-glow-pro" },
  { value: "cancelled", label: "Cancelado", color: "bg-red-500", bgClass: "bg-red-500/10", textClass: "text-red-500", glowClass: "shadow-glow-pro" },
  { value: "processing", label: "En proceso", color: "bg-blue-500", bgClass: "bg-blue-500/10", textClass: "text-blue-500", glowClass: "shadow-glow-pro" },
  { value: "delivered", label: "Entregado", color: "bg-purple-500", bgClass: "bg-violet-500/10", textClass: "text-violet-500", glowClass: "shadow-glow-pro" },
];
