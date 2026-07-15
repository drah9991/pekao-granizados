import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Search, Plus, Filter, FileSpreadsheet, ArrowRightLeft, History } from "lucide-react";

interface Product {
  id: string;
  name: string;
  type: string | null;
  category: string | null;
  price: number;
  cost: number | null;
  unit_measure: string | null;
}

interface StockItem {
  id: string;
  product_id: string;
  store_id: string;
  qty: number;
  min_qty: number;
  products: Product | null;
  stores: { name: string } | null;
}

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
  products: { name: string } | null;
}

export default function Inventory() {
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
  const [addedItems, setAddedItems] = useState<{ productId: string; name: string; qty: number; total: number }[]>([]);
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

  return (
    <Layout>
      <div className="min-h-screen bg-transparent text-foreground p-6 lg:p-10 space-y-10">
        {/* Header and buttons bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent italic uppercase font-space-grotesk">
              INVENTARIO CENTRAL
            </h1>
            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
              Gestión de Stock y Movimientos
            </p>
          </div>
          <div className="flex gap-4">
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest px-6 h-12 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" /> Nuevo movimiento
            </Button>
            <Button
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-slate-300 font-black text-xs uppercase tracking-widest px-6 h-12 rounded-xl"
            >
              <History className="w-4 h-4 mr-2" /> Ver Logs de Inventario
            </Button>
          </div>
        </div>

        {/* Dashboard Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT PANEL: INVENTARIO */}
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-6 shadow-pro">
            <h2 className="text-base font-black text-slate-300 uppercase tracking-widest border-b border-white/5 pb-2">
              INVENTARIO
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white uppercase font-bold">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10">
                  <SelectItem value="all" className="text-xs">Todas las Categorías</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat} className="text-xs uppercase">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 pl-10 bg-white/5 border-white/10 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/40">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-3 px-4">Negocio</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4">Nombre Ítem</th>
                    <th className="py-3 px-4">Unidad</th>
                    <th className="py-3 px-4 text-center">Cant. Actual</th>
                    <th className="py-3 px-4 text-right">Costo Unit. Prom</th>
                    <th className="py-3 px-4 text-right">Costo Total Prom</th>
                    <th className="py-3 px-4 text-center">Stock Mín.</th>
                  </tr>
                </thead>
                <tbody>
                  {stockItemsPaginated.map((item) => (
                    <tr key={item.id} className="border-b border-white/5 text-xs hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-300">{item.stores?.name}</td>
                      <td className="py-3 px-4 text-slate-400 uppercase text-[10px]">{item.products?.category || item.products?.type || "OTROS"}</td>
                      <td className="py-3 px-4 font-bold text-slate-100">{item.products?.name}</td>
                      <td className="py-3 px-4 text-slate-400">{item.products?.unit_measure || "un"}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-200">{item.qty}</td>
                      <td className="py-3 px-4 text-right text-slate-300">${(item.products?.cost || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-slate-200 font-bold">${(item.qty * (item.products?.cost || 0)).toLocaleString()}</td>
                      <td className="py-3 px-4 text-center text-slate-400">{item.min_qty}</td>
                    </tr>
                  ))}
                  {filteredStock.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 text-xs italic uppercase">
                        No hay productos cargados en inventario
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination & Excel */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div className="flex gap-2">
                <Button
                  onClick={() => setStockPage(1)}
                  disabled={stockPage === 1}
                  variant="outline"
                  className="h-9 px-3 rounded-lg text-[10px] border-white/10 text-slate-300"
                >
                  Primero
                </Button>
                <Button
                  onClick={() => setStockPage(prev => Math.max(1, prev - 1))}
                  disabled={stockPage === 1}
                  variant="outline"
                  className="h-9 px-3 rounded-lg text-[10px] border-white/10 text-slate-300"
                >
                  Anterior
                </Button>
                <Button
                  onClick={() => setStockPage(prev => Math.min(Math.ceil(filteredStock.length / stockLimit), prev + 1))}
                  disabled={stockPage >= Math.ceil(filteredStock.length / stockLimit)}
                  variant="outline"
                  className="h-9 px-3 rounded-lg text-[10px] border-white/10 text-slate-300"
                >
                  Siguiente
                </Button>
                <Button
                  onClick={() => setStockPage(Math.ceil(filteredStock.length / stockLimit) || 1)}
                  disabled={stockPage >= Math.ceil(filteredStock.length / stockLimit)}
                  variant="outline"
                  className="h-9 px-3 rounded-lg text-[10px] border-white/10 text-slate-300"
                >
                  Último
                </Button>
              </div>

              <div className="text-[10px] text-slate-400 uppercase font-black">
                Total: {filteredStock.length} - Página: {stockPage} / {Math.ceil(filteredStock.length / stockLimit) || 1}
              </div>

              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase h-10 px-5 rounded-xl gap-2 border-none">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </Button>
            </div>
          </div>

          {/* RIGHT PANEL: MOVIMIENTOS INVENTARIO */}
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-6 shadow-pro">
            <h2 className="text-base font-black text-slate-300 uppercase tracking-widest border-b border-white/5 pb-2">
              MOVIMIENTOS INVENTARIO
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select value={movementFilterType} onValueChange={setMovementFilterType}>
                <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white uppercase font-bold">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10">
                  <SelectItem value="all">-- Tipo --</SelectItem>
                  <SelectItem value="entry">Entrada</SelectItem>
                  <SelectItem value="exit">Salida</SelectItem>
                </SelectContent>
              </Select>

              <Select value={movementFilterSupplier} onValueChange={setMovementFilterSupplier}>
                <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white uppercase font-bold">
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10">
                  <SelectItem value="all">-- Proveedor --</SelectItem>
                  {suppliers.map(sup => (
                    <SelectItem key={sup} value={sup}>{sup}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Nº Factura..."
                value={movementFilterInvoice}
                onChange={(e) => setMovementFilterInvoice(e.target.value)}
                className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white"
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/40">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-3 px-4">Fecha Movimiento</th>
                    <th className="py-3 px-4">Fecha Creación</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4">Proveedor</th>
                    <th className="py-3 px-4">Fact. No.</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.slice(0, 10).map((m) => (
                    <tr key={m.id} className="border-b border-white/5 text-xs hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 px-4 text-slate-300">
                        {m.movement_date ? new Date(m.movement_date).toLocaleDateString() : "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {m.created_at ? new Date(m.created_at).toLocaleString() : "-"}
                      </td>
                      <td className="py-3 px-4 font-bold">
                        <span className={m.type === "entry" ? "text-emerald-500" : "text-rose-500"}>
                          {m.type === "entry" ? "Entrada - Compra" : "Salida - Ajuste"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-200">
                        ${(m.total_price || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{m.supplier_name || "-"}</td>
                      <td className="py-3 px-4 text-slate-400">{m.invoice_no || "-"}</td>
                    </tr>
                  ))}
                  {filteredMovements.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 text-xs italic uppercase">
                        No hay movimientos registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="text-xs font-black uppercase text-slate-300">
                Total movimientos: ${totalMovementSum.toLocaleString()}
              </div>

              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase h-10 px-5 rounded-xl gap-2 border-none">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </Button>
            </div>
          </div>

        </div>

        {/* CREATION DIALOG */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="bg-slate-950 border-white/10 text-white rounded-3xl max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <DialogHeader className="border-b border-white/5 pb-4">
              <DialogTitle className="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-primary" /> Movimiento Inventario
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Fecha */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha*</Label>
                  <Input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white"
                  />
                </div>

                {/* Tipo */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo*</Label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white font-bold uppercase">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-white/10">
                      <SelectItem value="Entrada - Compra" className="text-xs">Entrada - Compra</SelectItem>
                      <SelectItem value="Entrada - Devolución" className="text-xs">Entrada - Devolución</SelectItem>
                      <SelectItem value="Entrada - Ajuste" className="text-xs">Entrada - Ajuste</SelectItem>
                      <SelectItem value="Entrada - Otro" className="text-xs">Entrada - Otro</SelectItem>
                      <SelectItem value="Salida - Devolución" className="text-xs">Salida - Devolución</SelectItem>
                      <SelectItem value="Salida - Ajuste" className="text-xs">Salida - Ajuste</SelectItem>
                      <SelectItem value="Salida - Otro" className="text-xs">Salida - Otro</SelectItem>
                      <SelectItem value="Salida - Merma" className="text-xs">Salida - Merma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Factura No */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Factura No.</Label>
                  <Input
                    value={facturaNo}
                    onChange={(e) => setFacturaNo(e.target.value)}
                    placeholder="Factura No."
                    className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white"
                  />
                </div>

                {/* Proveedor */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Proveedor</Label>
                  <Select value={proveedor || "none"} onValueChange={(val) => setProveedor(val === "none" ? "" : val)}>
                    <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white">
                      <SelectValue placeholder="Seleccione un proveedor" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-white/10 text-white">
                      <SelectItem value="none" className="text-xs uppercase">Sin proveedor / Ninguno</SelectItem>
                      {dbSuppliers.map(s => (
                        <SelectItem key={s.id} value={s.name} className="text-xs uppercase">{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Nota */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nota</Label>
                <Textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Nota..."
                  className="bg-white/5 border-white/10 rounded-xl text-xs text-white min-h-[60px]"
                />
              </div>

              {/* Added Items Section */}
              <div className="border-t border-white/5 pt-4 space-y-4">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">
                  Productos
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  {/* Select product */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Seleccionar Producto</Label>
                    <Select value={selectedProductForItem} onValueChange={setSelectedProductForItem}>
                      <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white">
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-950 border-white/10 max-h-48 overflow-y-auto">
                        {allProducts.map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cantidad</Label>
                    <Input
                      type="number"
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                      placeholder="0"
                      className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white"
                    />
                  </div>

                  {/* Total */}
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total (Opcional)</Label>
                      <Input
                        type="number"
                        value={itemTotal}
                        onChange={(e) => setItemTotal(e.target.value)}
                        placeholder="Total"
                        className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleAddItemToMovement}
                      className="bg-primary hover:bg-primary/95 text-white h-11 w-11 rounded-xl flex items-center justify-center p-0 flex-shrink-0"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Added items list table */}
                {addedItems.length > 0 && (
                  <div className="border border-white/5 rounded-xl overflow-hidden bg-slate-950/40">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                          <th className="py-2.5 px-4">Producto</th>
                          <th className="py-2.5 px-4 text-center">Cantidad</th>
                          <th className="py-2.5 px-4 text-right">Total</th>
                          <th className="py-2.5 px-4 w-12 text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {addedItems.map((item, idx) => (
                          <tr key={idx} className="border-b border-white/5 text-xs hover:bg-white/[0.01]">
                            <td className="py-2.5 px-4 font-bold text-slate-200">{item.name}</td>
                            <td className="py-2.5 px-4 text-center font-bold">{item.qty}</td>
                            <td className="py-2.5 px-4 text-right font-bold text-slate-200">${item.total.toLocaleString()}</td>
                            <td className="py-2.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => setAddedItems(prev => prev.filter((_, i) => i !== idx))}
                                className="text-rose-500 hover:text-rose-600 font-bold"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Bottom box info and total details */}
              <div className="border-t border-white/5 pt-4 space-y-4">
                <p className="text-[11px] font-bold italic text-rose-500 uppercase tracking-wider font-space-grotesk text-center">
                  Su caja asignada es: Caja Principal
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center max-w-sm mx-auto">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pagado</Label>
                    <Input
                      type="number"
                      value={totalPagado}
                      onChange={(e) => setTotalPagado(e.target.value)}
                      placeholder="0"
                      className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1 text-center sm:text-left">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Debe</div>
                    <div className="text-lg font-black text-rose-500">${calculatedDebe.toLocaleString()}</div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-200">
                    <input
                      type="checkbox"
                      checked={saleDeCaja}
                      onChange={(e) => setSaleDeCaja(e.target.checked)}
                      className="rounded border-white/10 bg-white/5 text-primary focus:ring-0 focus:ring-offset-0"
                    />
                    <span>Sale de caja</span>
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-3 border-t border-white/5 pt-4">
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="flex-1 h-11 border-white/10 text-slate-300 hover:bg-white/10 text-xs font-black uppercase rounded-xl"
              >
                Cerrar
              </Button>
              <Button
                onClick={handleSaveMovement}
                disabled={isSaving || addedItems.length === 0}
                className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase rounded-xl border-none shadow-glow-pro"
              >
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}