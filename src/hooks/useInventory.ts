import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export interface Product {
  id: string;
  name: string;
  type: string | null;
  category: string | null;
  price: number;
  cost: number | null;
  unit_measure: string | null;
}

export interface StockItem {
  id: string;
  product_id: string;
  store_id: string;
  qty: number;
  min_qty: number;
  products: Product | null;
  stores: { name: string } | null;
}

export interface Movement {
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
  products: { name: string } | null;
}

export interface AddedItem {
  productId: string;
  name: string;
  qty: number;
  total: number;
}

/**
 * Hook con toda la lógica de estado y datos de la página de Inventario,
 * extraído de src/pages/Inventory.tsx sin cambios de comportamiento.
 */
export function useInventory() {
  const { storeId, user } = useAuth();

  // Left Panel: Stock
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [stockPage, setStockPage] = useState(1);
  const [stockLimit] = useState(10);
  const [totalStockCount, setTotalStockCount] = useState(0);

  // Right Panel: Movements
  const [movements, setMovements] = useState<Movement[]>([]);
  const [movementFilterType, setMovementFilterType] = useState<string>("all");
  const [movementFilterSupplier, setMovementFilterSupplier] = useState<string>("all");
  const [movementFilterInvoice, setMovementFilterInvoice] = useState("");
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [dbSuppliers, setDbSuppliers] = useState<{ id: string; name: string }[]>([]);

  // Dialog State
  const [modalOpen, setModalOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Inputs
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [tipo, setTipo] = useState("Entrada - Compra");
  const [facturaNo, setFacturaNo] = useState("");
  const [nota, setNota] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [selectedProductForItem, setSelectedProductForItem] = useState("");
  const [itemQty, setItemQty] = useState("");
  const [itemTotal, setItemTotal] = useState("");
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
  const [totalPagado, setTotalPagado] = useState("");
  const [saleDeCaja, setSaleDeCaja] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all initial data
  const fetchData = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      // 1. Fetch Store Stock Items joined with products and stores
      const { data: stockData, error: stockErr } = await supabase
        .from("store_stock")
        .select(`
          id,
          product_id,
          store_id,
          qty,
          min_qty,
          products:product_id (
            id, name, type, category, price, cost, unit_measure
          ),
          stores:store_id (
            name
          )
        `)
        .eq("store_id", storeId);

      if (stockErr) throw stockErr;

      const formattedStock = (stockData || []).map(item => ({
        id: item.id,
        product_id: item.product_id,
        store_id: item.store_id,
        qty: Number(item.qty),
        min_qty: Number(item.min_qty),
        products: Array.isArray(item.products) ? item.products[0] : item.products,
        stores: Array.isArray(item.stores) ? item.stores[0] : item.stores
      })) as StockItem[];

      setStockItems(formattedStock);

      // Extract unique categories
      const cats = Array.from(new Set(formattedStock.map(i => i.products?.category || i.products?.type || "OTROS").filter(Boolean)));
      setCategories(cats);

      // 2. Fetch Movements
      const { data: moveData, error: moveErr } = await supabase
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

      if (moveErr) throw moveErr;

      const formattedMove = (moveData || []).map(item => ({
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
        products: Array.isArray(item.products) ? item.products[0] : item.products
      })) as unknown as Movement[];

      setMovements(formattedMove);

      // Extract unique suppliers
      const sups = Array.from(new Set(formattedMove.map(m => m.supplier_name).filter(Boolean)));
      setSuppliers(sups as string[]);

      // 3. Fetch all active products (for dropdown select)
      const { data: prodData } = await supabase
        .from("products")
        .select("id, name, type, category, price, cost, unit_measure")
        .eq("active", true)
        .order("name", { ascending: true });

      setAllProducts(prodData || []);

      // 4. Fetch all suppliers from database
      const { data: supsData } = await supabase
        .from("suppliers")
        .select("id, name")
        .order("name", { ascending: true });
      setDbSuppliers(supsData || []);
    } catch (err) {
      console.error("Error loading inventory:", err);
      toast.error("Error al cargar datos de inventario");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  // Filtering Stock
  const filteredStock = stockItems.filter(item => {
    const matchesCategory = selectedCategory === "all" ||
      (item.products?.category || item.products?.type || "OTROS") === selectedCategory;
    const matchesSearch = !searchQuery ||
      item.products?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filtering Movements
  const filteredMovements = movements.filter(m => {
    const matchesType = movementFilterType === "all" || m.type.includes(movementFilterType);
    const matchesSupplier = movementFilterSupplier === "all" || m.supplier_name === movementFilterSupplier;
    const matchesInvoice = !movementFilterInvoice || m.invoice_no?.toLowerCase().includes(movementFilterInvoice.toLowerCase());
    return matchesType && matchesSupplier && matchesInvoice;
  });

  // Calculate items count and slices
  const totalStockItemsValue = filteredStock.reduce((acc, curr) => acc + (curr.qty * (curr.products?.cost || 0)), 0);
  const totalMovementSum = filteredMovements.reduce((acc, curr) => acc + (curr.total_price || 0), 0);
  const stockItemsPaginated = filteredStock.slice((stockPage - 1) * stockLimit, stockPage * stockLimit);

  // Add Item to creation list
  const handleAddItemToMovement = () => {
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
      {
        productId: prod.id,
        name: prod.name,
        qty: Number(itemQty),
        total: totalVal
      }
    ]);

    setSelectedProductForItem("");
    setItemQty("");
    setItemTotal("");
  };

  const handleRemoveAddedItem = (idx: number) => {
    setAddedItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Calculate Total of purchase items in dialog
  const calculatedPurchaseTotal = addedItems.reduce((acc, curr) => acc + curr.total, 0);
  const calculatedDebe = Math.max(0, calculatedPurchaseTotal - (Number(totalPagado) || 0));

  // Save Movement
  const handleSaveMovement = async () => {
    if (addedItems.length === 0) {
      toast.error("Añada al menos un ítem al movimiento");
      return;
    }
    if (!storeId) return;

    setIsSaving(true);
    try {
      // Loop through items and register movement
      for (const item of addedItems) {
        // 1. Insert Movement Record
        const { error: moveErr } = await supabase
          .from("movements")
          .insert({
            product_id: item.productId,
            store_id: storeId,
            qty: tipo.startsWith("Entrada") ? item.qty : -item.qty,
            type: tipo.startsWith("Entrada") ? "entry" : "exit",
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

        // 2. Adjust Stock qty in store_stock
        const { data: existingStock } = await supabase
          .from("store_stock")
          .select("id, qty")
          .eq("product_id", item.productId)
          .eq("store_id", storeId)
          .maybeSingle();

        if (existingStock) {
          const newQty = tipo.startsWith("Entrada")
            ? Number(existingStock.qty) + item.qty
            : Math.max(0, Number(existingStock.qty) - item.qty);

          const { error: updateErr } = await supabase
            .from("store_stock")
            .update({ qty: newQty })
            .eq("id", existingStock.id);

          if (updateErr) throw updateErr;
        } else {
          // If no existing stock record, insert one for entry movements
          if (tipo.startsWith("Entrada")) {
            const { error: insertErr } = await supabase
              .from("store_stock")
              .insert({
                product_id: item.productId,
                store_id: storeId,
                qty: item.qty,
                min_qty: 0
              });
            if (insertErr) throw insertErr;
          }
        }
      }

      // If saleDeCaja is checked and we have a cost, record cash register movement or expense
      if (saleDeCaja && calculatedPurchaseTotal > 0) {
        // Insert expense record
        await supabase
          .from("expenses" as any)
          .insert({
            store_id: storeId,
            amount: Number(totalPagado) || calculatedPurchaseTotal,
            description: `Compra Proveedor: ${proveedor || "N/A"}. Fac: ${facturaNo || "N/A"}`,
            category: "Mercancía / Insumos",
            created_at: new Date().toISOString()
          } as any);
      }

      toast.success("Movimiento registrado con éxito");
      setModalOpen(false);
      setAddedItems([]);
      setFacturaNo("");
      setNota("");
      setProveedor("");
      setTotalPagado("");
      setSaleDeCaja(false);
      fetchData();
    } catch (err: any) {
      console.error("Error registering movement:", err);
      toast.error(err.message || "Error al registrar el movimiento");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    // Stock panel
    categories,
    selectedCategory, setSelectedCategory,
    searchQuery, setSearchQuery,
    stockPage, setStockPage,
    stockLimit,
    filteredStock,
    stockItemsPaginated,
    totalStockItemsValue,
    totalStockCount, setTotalStockCount,

    // Movements panel
    movementFilterType, setMovementFilterType,
    movementFilterSupplier, setMovementFilterSupplier,
    movementFilterInvoice, setMovementFilterInvoice,
    suppliers,
    filteredMovements,
    totalMovementSum,

    // Dialog
    modalOpen, setModalOpen,
    allProducts,
    loading,
    fecha, setFecha,
    tipo, setTipo,
    facturaNo, setFacturaNo,
    nota, setNota,
    proveedor, setProveedor,
    dbSuppliers,
    selectedProductForItem, setSelectedProductForItem,
    itemQty, setItemQty,
    itemTotal, setItemTotal,
    addedItems,
    handleAddItemToMovement,
    handleRemoveAddedItem,
    calculatedPurchaseTotal,
    calculatedDebe,
    totalPagado, setTotalPagado,
    saleDeCaja, setSaleDeCaja,
    isSaving,
    handleSaveMovement,
  };
}
