import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CashReconciliationRow {
  id: string;
  store_id: string;
  cashier_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_amount: number;
  closing_amount: number | null;
  status: string;
  notes: string | null;
  store?: { name: string } | null;
  profile?: { name: string } | null;
  [key: string]: unknown;
}

export interface CashierOption {
  id: string;
  name: string;
}

export interface StoreOption {
  id: string;
  name: string;
}

export function useCashReconciliations() {
  // Filters
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // 30 days ago
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [selectedCaja, setSelectedCaja] = useState<string>("all");
  const [selectedResponsable, setSelectedResponsable] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("all");

  // Data State
  const [turns, setTurns] = useState<CashReconciliationRow[]>([]);
  const [cashiers, setCashiers] = useState<CashierOption[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch Filters Metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      // Cashiers (profiles)
      const { data: cashierData } = await supabase.from("profiles").select("id, name");
      if (cashierData) setCashiers(cashierData);

      // Stores
      const { data: storeData } = await supabase.from("stores").select("id, name");
      if (storeData) setStores(storeData);
    };
    fetchMetadata();
  }, []);

  // Fetch Reconciliations
  const fetchReconciliations = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("cash_turns")
        .select(`
          *,
          profile:cashier_id(name),
          store:store_id(name)
        `, { count: "exact" });

      if (fromDate) {
        query = query.gte("opened_at", `${fromDate}T00:00:00Z`);
      }
      if (toDate) {
        query = query.lte("opened_at", `${toDate}T23:59:59Z`);
      }
      if (selectedCaja !== "all") {
        query = query.eq("store_id", selectedCaja);
      }
      if (selectedResponsable !== "all") {
        query = query.eq("cashier_id", selectedResponsable);
      }
      if (selectedState !== "all") {
        query = query.eq("status", selectedState);
      }

      // Pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .order("opened_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setTurns(data || []);
      setTotalCount(count || 0);
    } catch (e: any) {
      toast.error("Error al cargar cuadres de caja: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, selectedCaja, selectedResponsable, selectedState, currentPage, pageSize]);

  useEffect(() => {
    fetchReconciliations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, selectedCaja, selectedResponsable, selectedState]);

  // Close an arbitrary historical turn by id (not necessarily the currently
  // tracked "active turn" from useTurn/useTurnStore).
  const closeTurnById = useCallback(async (turnId: string, amount: number, notes: string) => {
    try {
      const { error } = await supabase
        .from("cash_turns")
        .update({
          status: "closed",
          closing_amount: amount,
          closed_at: new Date().toISOString(),
          notes: notes
        })
        .eq("id", turnId);

      if (error) throw error;

      await fetchReconciliations();
      toast.success("Turno cerrado exitosamente");
      return true;
    } catch (e: any) {
      toast.error("Error al cerrar turno: " + e.message);
      return false;
    }
  }, [fetchReconciliations]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    // filters
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    selectedCaja,
    setSelectedCaja,
    selectedResponsable,
    setSelectedResponsable,
    selectedState,
    setSelectedState,
    // metadata
    cashiers,
    stores,
    // list
    turns,
    loading,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    fetchReconciliations,
    closeTurnById
  };
}
