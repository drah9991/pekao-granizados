import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StockItem, Store } from "@/types/inventory";
import { Enums } from "@/integrations/supabase/types";
import { useAuth } from "@/context/AuthContext";
import { syncRecipeStock } from "@/lib/recipe-stock-sync";

interface Movement {
  id: string;
  created_at: string | null;
  movement_date: string | null;
  type: string;
  qty: number;
  reason: string | null;
  invoice_no: string | null;
  supplier_name: string | null;
  total_price: number | null;
  total_paid: number | null;
  debe: number | null;
  product: { name: string } | null;
}

interface PurchaseProduct {
  id: string;
  name: string;
  cost: number | null;
}

interface PurchaseLineItem {
  productId: string;
  name: string;
  qty: number;
  total: number;
}

export function useInventory() {
  const { storeId, user } = useAuth();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterProductType, setFilterProductType] = useState<Enums<'product_type'> | "all">("all");
  const [loading, setLoading] = useState(true);

  // Adjust dialog state
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "subtract">("add");
  const [adjustmentQty, setAdjustmentQty] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Movements ledger state
  const [movements, setMovements] = useState<Movement[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [movementFilterType, setMovementFilterType] = useState<string>("all");
  const [movementFilterSupplier, setMovementFilterSupplier] = useState<string>("all");
  const [movementFilterInvoice, setMovementFilterInvoice] = useState("");

  // Purchase entry dialog state
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<PurchaseProduct[]>([]);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [tipo, setTipo] = useState("Entrada - Compra");
  const [facturaNo, setFacturaNo] = useState("");
  const [nota, setNota] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [selectedProductForItem, setSelectedProductForItem] = useState("");
  const [itemQty, setItemQty] = useState("");
  const [itemTotal, setItemTotal] = useState("");
  const [addedItems, setAddedItems] = useState<PurchaseLineItem[]>([]);
  const [totalPagado, setTotalPagado] = useState("");
  const [saleDeCaja, setSaleDeCaja] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchStores = async () => {
    const { data, error } = await supabase
      .from("stores")
      .select("id, name")
      .order("name");
    if (error) {
      toast.error("Error al cargar sucursales");
      return;
    }
    setStores(data || []);
  };

  const fetchStockData = async () => {
    if (!storeId) return;
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
        .eq("store_id", storeId)
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
    } catch (error: unknown) {
      console.error("Error fetching stock:", error);
      toast.error("Error al cargar inventario");
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    if (!storeId) return;
    try {
      const { data, error } = await supabase
        .from("movements")
        .select(`
          id,
          created_at,
          movement_date,
          type,
          qty,
          reason,
          invoice_no,
          supplier_name,
          total_price,
          total_paid,
          debe,
          products:product_id (
            name
          )
        `)
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setMovements(
        (data || []).map(item => ({
          id: item.id,
          created_at: item.created_at,
          movement_date: item.movement_date,
          type: item.type,
          qty: Number(item.qty),
          reason: item.reason,
          invoice_no: item.invoice_no,
          supplier_name: item.supplier_name,
          total_price: Number(item.total_price || 0),
          total_paid: Number(item.total_paid || 0),
          debe: Number(item.debe || 0),
          product: Array.isArray(item.products) ? item.products[0] : item.products,
        })) as unknown as Movement[]
      );
    } catch (error) {
      console.error("Error fetching movements:", error);
      toast.error("Error al cargar movimientos de inventario");
    }
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("id, name").order("name");
    setSuppliers(data || []);
  };

  const fetchAllProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, cost")
      .eq("active", true)
      .order("name");
    setAllProducts(data || []);
  };

  useEffect(() => {
    if (!storeId) return;
    fetchStores();
    fetchStockData();
    fetchMovements();
    fetchSuppliers();
    fetchAllProducts();

    // Realtime subscription to keep Inventory synchronized across screens
    const channel = supabase.channel(`inventory-sync-${storeId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'store_stock',
        filter: `store_id=eq.${storeId}`
      }, () => {
        fetchStockData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const handleAdjustStock = async () => {
    if (!selectedItem || !adjustmentQty || parseFloat(adjustmentQty) <= 0) {
      toast.error("Ingresa una cantidad válida");
      return;
    }
    if (!storeId) return;

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

      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { error: movementError } = await supabase
        .from("movements")
        .insert({
          product_id: selectedItem.product_id,
          store_id: storeId || selectedItem.store_id,
          qty: adjustmentType === "add" ? qty : -qty,
          type: adjustmentType === "add" ? "entry" : "exit",
          reason: adjustmentReason || `Ajuste manual (${adjustmentType === "add" ? "entrada" : "salida"})`,
          user_id: authUser?.id,
        });

      if (movementError) throw movementError;

      // Keep mixture/tank inventory (recipes) in sync with this manual adjustment
      await syncRecipeStock(
        selectedItem.product_id,
        storeId,
        adjustmentType === "add" ? qty : -qty
      );

      toast.success("Métrica sincronizada correctamente");
      setAdjustDialog(false);
      fetchStockData();
      fetchMovements();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Fallo en sincronización: " + msg);
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

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const matchesType = movementFilterType === "all" || m.type.includes(movementFilterType);
      const matchesSupplier = movementFilterSupplier === "all" || m.supplier_name === movementFilterSupplier;
      const matchesInvoice = !movementFilterInvoice || m.invoice_no?.toLowerCase().includes(movementFilterInvoice.toLowerCase());
      return matchesType && matchesSupplier && matchesInvoice;
    });
  }, [movements, movementFilterType, movementFilterSupplier, movementFilterInvoice]);

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

  const calculatedPurchaseTotal = useMemo(
    () => addedItems.reduce((acc, curr) => acc + curr.total, 0),
    [addedItems]
  );
  const calculatedDebe = Math.max(0, calculatedPurchaseTotal - (Number(totalPagado) || 0));

  const addPurchaseItem = () => {
    if (!selectedProductForItem) {
      toast.error("Seleccione un producto");
      return;
    }
    if (!itemQty || Number(itemQty) <= 0) {
      toast.error("Ingrese una cantidad válida");
      return;
    }

    const prod = allProducts.find(p => p.id === selectedProductForItem);
    if (!prod) return;

    const totalVal = Number(itemTotal) || (Number(itemQty) * (prod.cost || 0));

    setAddedItems(prev => [
      ...prev,
      { productId: prod.id, name: prod.name, qty: Number(itemQty), total: totalVal }
    ]);

    setSelectedProductForItem("");
    setItemQty("");
    setItemTotal("");
  };

  const removePurchaseItem = (idx: number) => {
    setAddedItems(prev => prev.filter((_, i) => i !== idx));
  };

  const resetPurchaseForm = () => {
    setAddedItems([]);
    setFacturaNo("");
    setNota("");
    setProveedor("");
    setTotalPagado("");
    setSaleDeCaja(false);
  };

  const registerPurchase = async () => {
    if (addedItems.length === 0) {
      toast.error("Añada al menos un ítem al movimiento");
      return;
    }
    if (!storeId) return;

    setIsSaving(true);
    try {
      for (const item of addedItems) {
        const isEntry = tipo.startsWith("Entrada");
        const signedQty = isEntry ? item.qty : -item.qty;

        const { error: moveErr } = await supabase
          .from("movements")
          .insert({
            product_id: item.productId,
            store_id: storeId,
            qty: signedQty,
            type: isEntry ? "entry" : "exit",
            reason: nota || `Movimiento de tipo: ${tipo}`,
            invoice_no: facturaNo || null,
            supplier_name: proveedor || null,
            total_price: item.total,
            total_paid: Number(totalPagado) || 0,
            debe: calculatedDebe,
            sale_from_cash: saleDeCaja,
            movement_date: new Date(fecha).toISOString(),
            user_id: user?.id
          });

        if (moveErr) throw moveErr;

        const { data: existingStock } = await supabase
          .from("store_stock")
          .select("id, qty")
          .eq("product_id", item.productId)
          .eq("store_id", storeId)
          .maybeSingle();

        if (existingStock) {
          const newQty = isEntry
            ? Number(existingStock.qty) + item.qty
            : Math.max(0, Number(existingStock.qty) - item.qty);

          const { error: updateErr } = await supabase
            .from("store_stock")
            .update({ qty: newQty })
            .eq("id", existingStock.id);

          if (updateErr) throw updateErr;
        } else if (isEntry) {
          const { error: insertErr } = await supabase
            .from("store_stock")
            .insert({ product_id: item.productId, store_id: storeId, qty: item.qty, min_qty: 0 });
          if (insertErr) throw insertErr;
        }

        // Keep mixture/tank inventory (recipes) in sync with this purchase/movement
        await syncRecipeStock(item.productId, storeId, signedQty);
      }

      if (saleDeCaja && calculatedPurchaseTotal > 0) {
        await supabase
          .from("expenses")
          .insert({
            store_id: storeId,
            amount: Number(totalPagado) || calculatedPurchaseTotal,
            expense_date: fecha,
            description: `Compra Proveedor: ${proveedor || "N/A"}. Fac: ${facturaNo || "N/A"}`,
            category: "Mercancía / Insumos",
          });
      }

      toast.success("Movimiento registrado con éxito");
      setPurchaseDialogOpen(false);
      resetPurchaseForm();
      fetchStockData();
      fetchMovements();
    } catch (err: unknown) {
      console.error("Error registering movement:", err);
      const msg = err instanceof Error ? err.message : "Error al registrar el movimiento";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
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
    },
    movements,
    filteredMovements,
    suppliers,
    movementFilters: {
      type: movementFilterType,
      setType: setMovementFilterType,
      supplier: movementFilterSupplier,
      setSupplier: setMovementFilterSupplier,
      invoice: movementFilterInvoice,
      setInvoice: setMovementFilterInvoice,
    },
    purchaseDialog: {
      isOpen: purchaseDialogOpen,
      setIsOpen: setPurchaseDialogOpen,
      allProducts,
      fecha,
      setFecha,
      tipo,
      setTipo,
      facturaNo,
      setFacturaNo,
      nota,
      setNota,
      proveedor,
      setProveedor,
      selectedProductForItem,
      setSelectedProductForItem,
      itemQty,
      setItemQty,
      itemTotal,
      setItemTotal,
      addedItems,
      addItem: addPurchaseItem,
      removeItem: removePurchaseItem,
      totalPagado,
      setTotalPagado,
      saleDeCaja,
      setSaleDeCaja,
      calculatedPurchaseTotal,
      calculatedDebe,
      isSaving,
      submit: registerPurchase,
    }
  };
}
