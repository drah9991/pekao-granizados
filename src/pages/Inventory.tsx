import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Package, MapPin, TrendingDown, TrendingUp, AlertTriangle, Search, Filter, Plus, Minus, Tag, ListChecks, Beaker, ShieldCheck, Zap, Layers, RefreshCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCOP } from "@/lib/currency";
import { Enums } from "@/integrations/supabase/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MixManagement from "@/components/inventory/MixManagement";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface StockItem {
  id: string;
  product_id: string;
  store_id: string;
  qty: number;
  min_qty: number;
  updated_at: string;
  product: {
    name: string;
    sku: string | null;
    price: number;
    cost: number | null;
    active: boolean;
    type: Enums<'product_type'>;
  };
  store: {
    name: string;
  };
}

interface Store {
  id: string;
  name: string;
}

const productTypeOptions: { value: Enums<'product_type'> | "all"; label: string }[] = [
  { value: "all", label: "TODOS LOS TIPOS" },
  { value: "granizado", label: "GRANIZADOS" },
  { value: "topping", label: "TOPPINGS" },
  { value: "sachet", label: "SACHETS" },
  { value: "sweet", label: "DULCES" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  }
};

export default function Inventory() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterProductType, setFilterProductType] = useState<Enums<'product_type'> | "all">("all");
  const [loading, setLoading] = useState(true);
  const { storeId: userStoreId } = useAuth();
  
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "subtract">("add");
  const [adjustmentQty, setAdjustmentQty] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchStores();
    fetchStockData();
  }, []);

  const fetchStores = async () => {
    const { data, error } = await supabase
      .from("stores")
      .select("id, name")
      .order("name");
    if (error) {
      console.error("Error fetching stores:", error);
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
      console.error("Error fetching stock data:", error);
      toast.error("Error al cargar inventario");
    } finally {
      setLoading(false);
    }
  };

  const openAdjustDialog = (item: StockItem) => {
    setSelectedItem(item);
    setAdjustmentQty("");
    setAdjustmentReason("");
    setAdjustmentType("add");
    setAdjustDialog(true);
  };

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

      const { error: movementError } = await supabase
        .from("movements")
        .insert({
          product_id: selectedItem.product_id,
          store_id: selectedItem.store_id,
          qty: adjustmentType === "add" ? qty : -qty,
          type: adjustmentType === "add" ? "entry" : "exit",
          reason: adjustmentReason || `Ajuste manual (${adjustmentType === "add" ? "entrada" : "salida"})`,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        });

      if (movementError) throw movementError;

      toast.success("Métrica sincronizada correctamente");
      setAdjustDialog(false);
      fetchStockData();
    } catch (error: any) {
      console.error("Error adjusting stock:", error);
      toast.error("Fallo en sincronización: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredItems = stockItems.filter(item => {
    const matchesStore = selectedStore === "all" || item.store_id === selectedStore;
    const matchesSearch = !searchQuery || 
      item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.store.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLowStock = !filterLowStock || item.qty < item.min_qty;
    const matchesProductType = filterProductType === "all" || item.product.type === filterProductType;
    
    return matchesStore && matchesSearch && matchesLowStock && matchesProductType;
  });

  const lowStockItems = stockItems.filter(item => item.qty < item.min_qty);
  const totalStock = stockItems.reduce((sum, item) => sum + item.qty, 0);
  const activeProducts = new Set(stockItems.map(item => item.product_id)).size;

  return (
    <Layout>
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="min-h-screen bg-transparent text-foreground p-6 lg:p-10 space-y-10"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center shadow-glow-pro group-hover:scale-110 transition-all duration-700 overflow-hidden relative">
                    <Package className="w-10 h-10 text-primary relative z-10" />
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
                </div>
                <div>
                    <h1 className="text-4xl lg:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent italic uppercase font-space-grotesk">
                    Supply Matrix
                    </h1>
                    <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
                    Inventory & Supply Logic • Global Intelligence v2.0
                    </p>
                </div>
            </div>
            <div className="flex gap-4">
               <Button
                variant="outline"
                className="h-14 px-8 rounded-2xl bg-muted border border-border font-black italic uppercase tracking-widest text-[10px] hover:bg-muted/80 transition-all gap-3"
                onClick={fetchStockData}
              >
                <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} /> Sincronizar
              </Button>
            </div>
        </motion.div>

        {/* Global Overview Bento */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-muted border border-border rounded-[3rem] shadow-pro glass-pro p-10 group overflow-hidden relative">
                <div className="flex items-center justify-between mb-8 relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground italic font-space-grotesk">VOLUMEN FÍSICO</span>
                    <Zap className="w-5 h-5 text-primary shadow-glow-pro" />
                </div>
                <div className="flex items-baseline gap-2 relative z-10">
                    <div className="text-4xl sm:text-5xl lg:text-6xl font-black italic font-space-grotesk text-foreground tabular-nums tracking-tighter">{totalStock}</div>
                    <div className="text-primary font-black uppercase text-[10px] italic">Units in Orbit</div>
                </div>
                <div className="mt-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest italic relative z-10">Indexación total de almacén global</div>
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
            </Card>

            <Card className="bg-muted border border-border rounded-[3rem] shadow-pro glass-pro p-10 group overflow-hidden relative">
                <div className="flex items-center justify-between mb-8 relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground italic font-space-grotesk">CATÁLOGO ACTIVO</span>
                    <Layers className="w-5 h-5 text-indigo-400 shadow-glow-pro" />
                </div>
                <div className="flex items-baseline gap-2 relative z-10">
                    <div className="text-4xl sm:text-5xl lg:text-6xl font-black italic font-space-grotesk text-indigo-400 tabular-nums tracking-tighter">{activeProducts}</div>
                    <div className="text-indigo-400 font-black uppercase text-[10px] italic">SKUs Verified</div>
                </div>
                <div className="mt-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest italic relative z-10">Integridad rotacional del catálogo maestro</div>
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors" />
            </Card>

            <Card className={cn(
                "bg-muted border rounded-[3rem] shadow-pro glass-pro p-10 group overflow-hidden relative transition-all duration-700",
                lowStockItems.length > 0 ? "border-rose-500/30 bg-rose-500/[0.02]" : "border-border"
            )}>
                <div className="flex items-center justify-between mb-8 relative z-10">
                    <span className={cn("text-[10px] font-black uppercase tracking-[0.3em] italic font-space-grotesk", lowStockItems.length > 0 ? "text-rose-500" : "text-muted-foreground")}>NODOS CRÍTICOS</span>
                    <AlertTriangle className={cn("w-5 h-5 shadow-glow-pro", lowStockItems.length > 0 ? "text-rose-500 animate-pulse" : "text-muted-foreground/50")} />
                </div>
                <div className="flex items-baseline gap-2 relative z-10">
                    <div className={cn("text-4xl sm:text-5xl lg:text-6xl font-black italic font-space-grotesk tabular-nums tracking-tighter", lowStockItems.length > 0 ? "text-rose-500" : "text-foreground")}>{lowStockItems.length}</div>
                    <div className={cn("font-black uppercase text-[10px] italic", lowStockItems.length > 0 ? "text-rose-500" : "text-muted-foreground")}>Risk Points</div>
                </div>
                <div className="mt-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest italic relative z-10">Monitoreo de umbral de reabastecimiento</div>
                {lowStockItems.length > 0 && <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl" />}
            </Card>
        </motion.div>

        {/* Tactical Search & Filters */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row gap-6">
            <div className="relative group flex-1">
                <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                <Input
                    placeholder="LOCALIZAR SUMINISTRO POR NOMBRE O SKU..."
                    className="pl-16 h-16 bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk focus:border-primary/50 focus:ring-primary/20 shadow-pro transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            
            <div className="flex flex-wrap gap-4">
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                    <SelectTrigger className="w-[200px] h-16 bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk transition-all shadow-pro focus:ring-primary/20">
                    <SelectValue placeholder="NODOS DE RED" />
                    </SelectTrigger>
                    <SelectContent className="glass-pro border-border rounded-3xl">
                        <SelectItem value="all" className="text-[10px] font-black uppercase italic">TODAS LAS TIENDAS</SelectItem>
                        {stores.map((store) => (
                            <SelectItem key={store.id} value={store.id} className="text-[10px] font-black uppercase italic">
                            {store.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={filterProductType} onValueChange={(value: Enums<'product_type'> | "all") => setFilterProductType(value)}>
                    <SelectTrigger className="w-[180px] h-16 bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk transition-all shadow-pro focus:ring-primary/20">
                    <SelectValue placeholder="FILTRO DE TIPO" />
                    </SelectTrigger>
                    <SelectContent className="glass-pro border-border rounded-3xl">
                    {productTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-[10px] font-black uppercase italic">
                        {option.label}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>

                <Button
                    onClick={() => setFilterLowStock(!filterLowStock)}
                    className={cn(
                        "h-16 px-10 rounded-[1.5rem] font-black italic uppercase tracking-widest text-[10px] transition-all gap-4 border-2 font-space-grotesk",
                        filterLowStock 
                            ? "bg-rose-500 text-white border-rose-400 shadow-glow-pro scale-105" 
                            : "bg-muted border-border text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    )}
                >
                    <AlertTriangle className="w-4 h-4" />
                    Vista Crítica
                </Button>
            </div>
        </motion.div>

        {/* Main Workspace Tabs */}
        <motion.div variants={itemVariants}>
            <Tabs defaultValue="inventory" className="w-full space-y-10">
                <div className="flex items-center justify-between border-b border-border pb-2">
                    <TabsList className="bg-transparent h-12 gap-10">
                        <TabsTrigger value="inventory" className="bg-transparent border-none p-0 text-muted-foreground/40 data-[state=active]:text-primary data-[state=active]:shadow-none font-black italic uppercase tracking-[0.2em] font-space-grotesk text-sm relative group">
                            Stock de Almacén
                            <div className="absolute -bottom-2 left-0 w-0 h-1 bg-primary transition-all duration-500 group-data-[state=active]:w-full rounded-full shadow-glow-pro" />
                        </TabsTrigger>
                        <TabsTrigger value="mixes" className="bg-transparent border-none p-0 text-muted-foreground/40 data-[state=active]:text-primary data-[state=active]:shadow-none font-black italic uppercase tracking-[0.2em] font-space-grotesk text-sm relative group">
                            Preparación de Mezclas
                            <div className="absolute -bottom-2 left-0 w-0 h-1 bg-primary transition-all duration-500 group-data-[state=active]:w-full rounded-full shadow-glow-pro" />
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="inventory" className="space-y-10 focus:outline-none">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-6">
                            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-glow-pro" />
                            <p className="text-primary font-black uppercase tracking-[0.4em] text-[10px] italic font-space-grotesk animate-pulse">Escaneando Registro de Movimientos...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                            <AnimatePresence mode="popLayout">
                                {filteredItems.map((item, idx) => {
                                    const isLowStock = item.qty < item.min_qty;
                                    return (
                                        <motion.div
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: idx * 0.02, type: "spring", damping: 20 }}
                                            className={cn(
                                                "bg-muted border rounded-[3rem] p-10 glass-pro group relative overflow-hidden transition-all duration-500",
                                                isLowStock ? "border-rose-500/30 bg-rose-500/[0.03] shadow-glow-pro" : "border-border hover:border-primary/20 hover:bg-muted/80 shadow-pro"
                                            )}
                                        >
                                            <div className="flex flex-col gap-8 relative z-10">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500",
                                                            isLowStock ? "bg-rose-500/20 border-rose-500/30 text-rose-500" : "bg-primary/10 border-primary/20 text-primary"
                                                        )}>
                                                            <Tag className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg lg:text-xl font-black italic font-space-grotesk text-foreground tracking-tighter leading-none group-hover:text-primary transition-colors truncate pr-2">
                                                                {item.product.name}
                                                            </h3>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <span className={cn("w-1.5 h-1.5 rounded-full shadow-glow-pro", isLowStock ? "bg-rose-500 animate-pulse" : "bg-emerald-500")} />
                                                                <span className={cn("text-[9px] font-black uppercase italic tracking-widest", isLowStock ? "text-rose-500" : "text-muted-foreground font-bold")}>
                                                                    {isLowStock ? "ALERTA: BAJO STOCK" : "NIVEL ÓPTIMO"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" size="icon" className="w-10 h-10 rounded-xl bg-muted/50 border border-border hover:border-primary/40 hover:text-primary transition-all"
                                                        onClick={() => openAdjustDialog(item)}
                                                    >
                                                        <Zap className="w-4 h-4" />
                                                    </Button>
                                                </div>

                                                <div className="flex items-center justify-between gap-6 py-6 border-y border-border">
                                                    <div className="text-center flex-1">
                                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] italic mb-2">Disponible</p>
                                                        <p className={cn("text-3xl sm:text-4xl lg:text-5xl font-black font-space-grotesk italic tracking-tighter", isLowStock ? "text-rose-500" : "text-foreground")}>
                                                            {item.qty}
                                                        </p>
                                                    </div>
                                                    <div className="w-px h-12 bg-border shrink-0" />
                                                    <div className="text-center flex-1">
                                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] italic mb-2">Umbral Mín.</p>
                                                        <p className="text-2xl font-black font-space-grotesk italic tracking-tighter">
                                                            {item.min_qty}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="w-3 h-3 text-muted-foreground" />
                                                            <span className="text-[9px] font-black italic uppercase text-muted-foreground tracking-widest">{item.store.name}</span>
                                                        </div>
                                                        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest px-2 py-0 border-white/20 text-foreground bg-white/5">
                                                            {item.product.type}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-baseline justify-between pt-2">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Valuación Unit.</span>
                                                        <span className="text-xs font-black italic font-space-grotesk text-primary">{formatCOP(item.product.price)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {isLowStock && (
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -translate-y-16 translate-x-16" />
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="mixes" className="focus:outline-none">
                    <MixManagement storeId={userStoreId || stores[0]?.id} />
                </TabsContent>
            </Tabs>
        </motion.div>

        {/* Tactical Adjustment Dialog */}
        <Dialog open={adjustDialog} onOpenChange={setAdjustDialog}>
            <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto custom-scrollbar glass-pro border-border rounded-[3rem] text-foreground shadow-pro">
                <DialogHeader className="mb-6">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-glow-pro transition-colors",
                            adjustmentType === "add" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                        )}>
                            {adjustmentType === "add" ? <Plus className="w-6 h-6" /> : <Minus className="w-6 h-6" />}
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">
                                Sincronización de Stock
                            </DialogTitle>
                            <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">
                                {selectedItem?.product.name} • Protocolo de Ajuste Manual
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {selectedItem && (
                    <div className="space-y-8 py-4">
                        <div className="grid grid-cols-2 gap-6">
                            <Button
                                onClick={() => setAdjustmentType("add")}
                                className={cn(
                                    "h-20 rounded-3xl font-black italic uppercase tracking-widest text-[11px] transition-all gap-3 border-2 font-space-grotesk shadow-pro",
                                    adjustmentType === "add" ? "bg-emerald-500 text-primary-foreground border-emerald-400 shadow-emerald-500/20" : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
                                )}
                            >
                                <TrendingUp className="w-5 h-5" /> Ingesta (+ Saldo)
                            </Button>
                            <Button
                                onClick={() => setAdjustmentType("subtract")}
                                className={cn(
                                    "h-20 rounded-3xl font-black italic uppercase tracking-widest text-[11px] transition-all gap-3 border-2 font-space-grotesk shadow-pro",
                                    adjustmentType === "subtract" ? "bg-rose-500 text-primary-foreground border-rose-400 shadow-rose-500/20" : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
                                )}
                            >
                                <TrendingDown className="w-5 h-5" /> Egreso (- Saldo)
                            </Button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">CANTIDAD OPERATIVA</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={adjustmentQty}
                                    onChange={(e) => setAdjustmentQty(e.target.value)}
                                    className="h-16 bg-muted/40 border-border rounded-2xl text-2xl font-black italic font-space-grotesk focus:ring-primary/20 text-center"
                                />
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">MOTIVO DE REGISTRO</Label>
                                <Textarea
                                    placeholder="DETALLE DE MOVIMIENTO (EJ. REABASTECIMIENTO, MERMA, SEGUIMIENTO)..."
                                    value={adjustmentReason}
                                    onChange={(e) => setAdjustmentReason(e.target.value.toUpperCase())}
                                    className="bg-muted/40 border-border rounded-2xl text-xs font-black italic focus:ring-primary/20 min-h-[120px] uppercase p-6"
                                />
                            </div>
                        </div>

                        <div className="p-10 border border-white/5 bg-white/[0.02] rounded-[2.5rem] relative overflow-hidden group">
                            <div className="flex items-center justify-between relative z-10">
                                <div>
                                    <p className="text-[10px] font-black text-muted-foreground/20 uppercase tracking-widest mb-1 italic">PROYECCIÓN FINAL</p>
                                    <div className="text-5xl font-black font-space-grotesk italic tracking-tighter text-foreground">
                                        {adjustmentQty ? 
                                            (adjustmentType === "add" ? selectedItem.qty + parseFloat(adjustmentQty) : Math.max(0, selectedItem.qty - parseFloat(adjustmentQty))) 
                                            : selectedItem.qty}
                                        <span className="text-sm text-primary font-bold not-italic ml-2 animate-pulse">UNITS</span>
                                    </div>
                                </div>
                                <ShieldCheck className="w-12 h-12 text-primary opacity-20 group-hover:opacity-40 transition-opacity" />
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-4 pt-6">
                    <Button
                        variant="ghost"
                        onClick={() => setAdjustDialog(false)}
                        disabled={isProcessing}
                        className="flex-1 h-16 rounded-2xl text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/40 hover:text-foreground hover:bg-muted"
                    >
                        CANCELAR OPERACIÓN
                    </Button>
                    <Button
                        onClick={handleAdjustStock}
                        disabled={isProcessing || !adjustmentQty}
                        className="flex-[2] h-16 rounded-2xl bg-primary text-primary-foreground font-black italic uppercase tracking-widest shadow-glow-pro hover:bg-primary/80 transition-all font-space-grotesk"
                    >
                        {isProcessing ? "SINCRONIZANDO..." : "VALIDAR Y AJUSTAR ✓"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </motion.div>
    </Layout>
  );
}