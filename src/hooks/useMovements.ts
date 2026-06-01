import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Movement {
    id: string;
    type: string;
    qty: number;
    reason: string | null;
    created_at: string;
    product: { name: string } | null;
    user: { name: string | null } | null;
}

export function useMovements(storeId: string | null) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (storeId) {
      fetchMovements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("movements")
        .select(`
          id,
          type,
          qty,
          reason,
          created_at,
          product:products(name)
        `)
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setMovements((data as unknown as Movement[]) || []);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      console.error("Error fetching movements:", error);
      toast.error("Error al cargar movimientos: " + msg);
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = movements.filter((mov) => {
    const matchesSearch =
      !searchQuery ||
      (mov.product?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mov.reason || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mov.user?.name || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === "all" || 
      mov.type === selectedType || 
      (selectedType === "in" && mov.type === "entry") ||
      (selectedType === "out" && mov.type === "exit");
    return matchesSearch && matchesType;
  });

  return {
    movements,
    filteredMovements,
    searchQuery,
    setSearchQuery,
    selectedType,
    setSelectedType,
    loading,
    refreshMovements: fetchMovements
  };
}
