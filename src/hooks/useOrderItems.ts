import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useOrderItems = (orderId: string | null) => {
  return useQuery({
    queryKey: ['order-items', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id, 
          qty, 
          price, 
          subtotal, 
          name,
          product:products(category)
        `)
        .eq('order_id', orderId);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!orderId,
    staleTime: 5 * 60_000, // 5 minutes
  });
};
