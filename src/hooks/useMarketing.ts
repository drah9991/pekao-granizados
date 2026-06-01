import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { typedFrom } from "@/integrations/supabase/types-extensions";
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
      const { data, error } = await typedFrom.pricing_rules()
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
    staleTime: 30_000, // 30s — reglas de precios, cambios moderados
  });

  const saveRuleMutation = useMutation({
    mutationFn: async ({ id, ruleData }: { id?: string; ruleData: Record<string, unknown> }) => {
        setIsProcessing(true);
        if (id) {
            const { error } = await typedFrom.pricing_rules()
                .update(ruleData as Parameters<ReturnType<typeof typedFrom.pricing_rules>['update']>[0])
                .eq("id", id);
            if (error) throw error;
        } else {
            const { error } = await typedFrom.pricing_rules()
                .insert(ruleData as Parameters<ReturnType<typeof typedFrom.pricing_rules>['insert']>[0])
            if (error) throw error;
        }
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["pricing_rules"] });
        toast.success("Operación exitosa.");
    },
    onError: (error: unknown) => {
        const msg = error instanceof Error ? error.message : "Error desconocido";
        toast.error("Error: " + msg);
    },
    onSettled: () => setIsProcessing(false)
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
        const { error } = await typedFrom.pricing_rules()
            .delete()
            .eq("id", id);
        if (error) throw error;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["pricing_rules"] });
        toast.success("Regla eliminada.");
    },
    onError: (error: unknown) => {
        const msg = error instanceof Error ? error.message : "Error desconocido";
        toast.error("Error al eliminar: " + msg);
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
