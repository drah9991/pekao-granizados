import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StockItem, Store } from "@/types/inventory";
import { Enums } from "@/integrations/supabase/types";

export function useInventory() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterProductType, setFilterProductType] = useState<Enums<'product_type'> | "all">("all");
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "subtract">("add");
  const [adjustmentQty, setAdjustmentQty] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchStores = async () => {
    const { data, error } = await supabase
      .from("stores")
      .select("id, name")
      .order("name");
    if (error) {
      toast.error("Error al cargar tiendas");
      return;
    }
    setStores(data || []);
  };

  const fetchStockData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("store_stock")
        .select(`
          id,
          product_id,
          store_id,
          qty,
          min_qty,
          updated_at,
          products:product_id (
            name,
            sku,
            price,
            cost,
            active,
            type
          ),
          stores:store_id (
            name
          )
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map(item => ({
        id: item.id,
        product_id: item.product_id,
        store_id: item.store_id,
        qty: item.qty,
        min_qty: item.min_qty,
        updated_at: item.updated_at,
        product: Array.isArray(item.products) ? item.products[0] : item.products,
        store: Array.isArray(item.stores) ? item.stores[0] : item.stores,
      }));

      setStockItems(formattedData as StockItem[]);
    } catch (error: any) {
      toast.error("Error al cargar inventario");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
    fetchStockData();
  }, []);

  const handleAdjustStock = async () => {
    if (!selectedItem || !adjustmentQty || parseFloat(adjustmentQty) <= 0) {
      toast.error("Ingresa una cantidad válida");
      return;
    }

    const qty = parseFloat(adjustmentQty);
    const newQty = adjustmentType === "add" 
      ? selectedItem.qty + qty 
      : Math.max(0, selectedItem.qty - qty);

    setIsProcessing(true);
    try {
      const { error: stockError } = await supabase
        .from("store_stock")
        .update({ qty: newQty, updated_at: new Date().toISOString() })
        .eq("id", selectedItem.id);

      if (stockError) throw stockError;

      const { data: { user } } = await supabase.auth.getUser();
      const { error: movementError } = await supabase
        .from("movements")
        .insert({
          product_id: selectedItem.product_id,
          store_id: selectedItem.store_id,
          qty: adjustmentType === "add" ? qty : -qty,
          type: adjustmentType === "add" ? "entry" : "exit",
          reason: adjustmentReason || `Ajuste manual (${adjustmentType === "add" ? "entrada" : "salida"})`,
          user_id: user?.id,
        });

      if (movementError) throw movementError;

      toast.success("Métrica sincronizada correctamente");
      setAdjustDialog(false);
      fetchStockData();
    } catch (error: any) {
      toast.error("Fallo en sincronización: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredItems = useMemo(() => {
    return stockItems.filter(item => {
      const matchesStore = selectedStore === "all" || item.store_id === selectedStore;
      const matchesSearch = !searchQuery || 
        item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.store.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLowStock = !filterLowStock || item.qty < item.min_qty;
      const matchesProductType = filterProductType === "all" || item.product.type === filterProductType;
      return matchesStore && matchesSearch && matchesLowStock && matchesProductType;
    });
  }, [stockItems, selectedStore, searchQuery, filterLowStock, filterProductType]);

  const stats = useMemo(() => {
    const lowStockItems = stockItems.filter(item => item.qty < item.min_qty);
    const totalStock = stockItems.reduce((sum, item) => sum + item.qty, 0);
    const activeProducts = new Set(stockItems.map(item => item.product_id)).size;
    return {
      totalStock,
      activeProducts,
      lowStockCount: lowStockItems.length,
      isAnyLowStock: lowStockItems.length > 0
    };
  }, [stockItems]);

  const openAdjustDialog = (item: StockItem) => {
    setSelectedItem(item);
    setAdjustmentQty("");
    setAdjustmentReason("");
    setAdjustmentType("add");
    setAdjustDialog(true);
  };

  return {
    stockItems,
    stores,
    selectedStore,
    setSelectedStore,
    searchQuery,
    setSearchQuery,
    filterLowStock,
    setFilterLowStock,
    filterProductType,
    setFilterProductType,
    loading,
    filteredItems,
    stats,
    refreshStock: fetchStockData,
    adjustDialog: {
      isOpen: adjustDialog,
      setIsOpen: setAdjustDialog,
      selectedItem,
      adjustmentType,
      setAdjustmentType,
      adjustmentQty,
      setAdjustmentQty,
      adjustmentReason,
      setAdjustmentReason,
      isProcessing,
      handleAdjustStock,
      openAdjustDialog
    }
  };
}
