import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export function useMarketing() {
  const { storeId } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: rules, isLoading } = useQuery({
    queryKey: ["pricing_rules", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await (supabase as any)
        .from("pricing_rules")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });

  const saveRuleMutation = useMutation({
    mutationFn: async ({ id, ruleData }: { id?: string; ruleData: any }) => {
        setIsProcessing(true);
        if (id) {
            const { error } = await (supabase as any)
                .from("pricing_rules")
                .update(ruleData)
                .eq("id", id);
            if (error) throw error;
        } else {
            const { error } = await (supabase as any)
                .from("pricing_rules")
                .insert([ruleData]);
            if (error) throw error;
        }
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["pricing_rules"] });
        toast.success("Operación exitosa.");
    },
    onError: (error: any) => {
        toast.error("Error: " + error.message);
    },
    onSettled: () => setIsProcessing(false)
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
        const { error } = await (supabase as any)
            .from("pricing_rules")
            .delete()
            .eq("id", id);
        if (error) throw error;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["pricing_rules"] });
        toast.success("Regla eliminada.");
    },
    onError: (error: any) => {
        toast.error("Error al eliminar: " + error.message);
    }
  });

  return {
    rules,
    isLoading,
    isProcessing,
    saveRule: saveRuleMutation.mutateAsync,
    deleteRule: deleteRuleMutation.mutateAsync,
    storeId
  };
}
