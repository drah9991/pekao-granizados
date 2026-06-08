import { Tables } from "@/integrations/supabase/types";

export type Order = Tables<'orders'>;
export type OrderStatus = "pending" | "completed" | "cancelled" | "processing";

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
  items?: OrderItem[];
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
  { value: "all", label: "Todos", color: "bg-gray-500", bgClass: "bg-muted/40 border border-white/10", textClass: "text-white font-black", glowClass: "" },
  { value: "pending", label: "Pendiente", color: "bg-yellow-500", bgClass: "bg-amber-500/15 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]", textClass: "text-amber-400 font-black", glowClass: "shadow-glow-pro" },
  { value: "completed", label: "Completado", color: "bg-green-500", bgClass: "bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]", textClass: "text-emerald-400 font-black", glowClass: "shadow-glow-pro" },
  { value: "cancelled", label: "Cancelado", color: "bg-red-500", bgClass: "bg-rose-500/15 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.15)]", textClass: "text-rose-400 font-black", glowClass: "shadow-glow-pro" },
  { value: "processing", label: "En proceso", color: "bg-blue-500", bgClass: "bg-sky-500/15 border border-sky-500/40 shadow-[0_0_15px_rgba(14,165,233,0.15)]", textClass: "text-sky-400 font-black", glowClass: "shadow-glow-pro" },
];
