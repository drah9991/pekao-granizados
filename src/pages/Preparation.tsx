import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Beaker, Plus, History, ArrowRight, FlaskConical, Scale, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface InventoryItem {
  id: string;
  name: string;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  type: string;
  recipe?: any;
  base_volume?: number;
  unit_measure?: string;
}

interface Size {
  id: string;
  name: string;
  multiplier: number;
}

interface PreparationLog {
  id: string;
  created_at: string;
  qty: number;
  reason: string;
  inventory_items: { name: string };
  type?: string;
  product_id?: string;
}

export default function Preparation() {
  const { storeId, user } = useAuth();
  const [mixtures, setMixtures] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [logs, setLogs] = useState<PreparationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEmptying, setIsEmptying] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [liters, setLiters] = useState<string>("");
  const [currentMixtureStock, setCurrentMixtureStock] = useState<number | null>(null);
  const [currentMixtureId, setCurrentMixtureId] = useState<string | null>(null);
  const [currentMixtureName, setCurrentMixtureName] = useState<string | null>(null);

  const selectedFlavor = products.find(p => p.id === selectedProductId);

  useEffect(() => {
    if (selectedProductId) {
      fetchCurrentMixtureStock();
    } else {
      setCurrentMixtureStock(null);
      setCurrentMixtureId(null);
      setCurrentMixtureName(null);
    }
  }, [selectedProductId]);

  const fetchCurrentMixtureStock = async () => {
    try {
      const { data: recipeData } = await supabase
        .from("recipes")
        .select("inventory_item_id")
        .eq("product_id", selectedProductId)
        .limit(1);

      if (recipeData && recipeData.length > 0) {
        const itemId = recipeData[0].inventory_item_id;
        setCurrentMixtureId(itemId);

        const { data: invData } = await supabase
          .from("inventory_items")
          .select("stock, name")
          .eq("id", itemId)
          .single();

        if (invData) {
          setCurrentMixtureStock(invData.stock);
          setCurrentMixtureName(invData.name);
        }

      } else {
        setCurrentMixtureStock(null);
        setCurrentMixtureId(null);
        setCurrentMixtureName(null);
      }
    } catch (err) {
      console.error("Error fetching current mixture stock:", err);
    }
  };

  useEffect(() => {
    if (storeId) {
      fetchData();
    }
  }, [storeId]);

  useEffect(() => {
    if (storeId) {
      fetchRecentLogs(selectedProductId);
    }
  }, [selectedProductId, storeId]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchMixtures(),
      fetchProducts(),
      fetchSizes(),
      fetchRecentLogs()
    ]);
    setLoading(false);
  };

  const fetchMixtures = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, stock")
        .eq("store_id", storeId)
        .eq("is_mixture", true);
      if (error) throw error;
      setMixtures(data || []);
    } catch (error: any) {
      console.error("Error fetching mixtures:", error);
    }
  };

  const handleAutoLink = async () => {
    if (!selectedProductId || !selectedFlavor) return;
    
    setIsProcessing(true);
    try {
      const { data: invItem, error: invError } = await supabase
        .from("inventory_items")
        .insert({
          store_id: storeId,
          name: `Tanque ${selectedFlavor.name}`,
          unit: 'ml',
          stock: 0,
          is_mixture: true
        })
        .select()
        .single();
      
      if (invError) throw invError;
      
      const { error: recipeError } = await supabase
        .from("recipes")
        .insert({
          product_id: selectedProductId,
          inventory_item_id: invItem.id,
          quantity_required: 4
        });
        
      if (recipeError) throw recipeError;
      
      toast.success("¡Tanque vinculado correctamente!");
      fetchCurrentMixtureStock();
      fetchMixtures();
    } catch (error: any) {
      console.error("Error linking tank:", error);
      toast.error("Error al vincular: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: typesData } = await supabase
        .from("product_types_config")
        .select("code")
        .eq("track_mixture_inventory", true);

      const trackableCodes = (typesData || []).map(t => t.code);
      if (trackableCodes.length === 0) {
         trackableCodes.push("granizado");
      }

      const { data, error } = await supabase
        .from("products")
        .select("id, name, type, base_volume, unit_measure, recipe")
        .eq("store_id", storeId)
        .in("type", trackableCodes)
        .eq("active", true);
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchSizes = async () => {
    try {
      const { data, error } = await supabase
        .from("sizes")
        .select("id, name, multiplier")
        .eq("store_id", storeId)
        .order("multiplier", { ascending: true });
      if (error) throw error;
      setSizes(data || []);
    } catch (error: any) {
      console.error("Error fetching sizes:", error);
    }
  };

  const fetchRecentLogs = async (productId?: string) => {
    try {
      let query = supabase
        .from("movements")
        .select(`
          id,
          created_at,
          qty,
          reason,
          type,
          product_id,
          products:product_id (name)
        `)
        .eq("store_id", storeId)
        .or('reason.ilike.%Preparación%,reason.ilike.%VACIADO%');

      if (productId) {
        query = query.eq("product_id", productId);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setLogs(data as any[] || []);
    } catch (error: any) {
      console.error("Error fetching logs:", error);
    }
  };

  const handleDeletePreparation = async (log: any) => {
    if (!confirm(`¿Estás seguro de eliminar este registro de ${(log.qty / 1000)}L? El stock se descontará automáticamente.`)) return;

    try {
      const { data: recipeData } = await supabase
        .from("recipes")
        .select("inventory_item_id")
        .eq("product_id", log.product_id)
        .limit(1);

      if (recipeData && recipeData.length > 0) {
        const invId = recipeData[0].inventory_item_id;
        
        const { error: stockError } = await supabase.rpc('adjust_inventory_item_stock', {
          item_id: invId,
          quantity: -log.qty
        });

        if (stockError) throw stockError;

        const { error: deleteError } = await supabase
          .from("movements")
          .delete()
          .eq("id", log.id);

        if (deleteError) throw deleteError;

        toast.success("Registro eliminado y stock ajustado");
        fetchRecentLogs(selectedProductId);
        fetchCurrentMixtureStock();
      }
    } catch (error: any) {
      console.error("Error deleting log:", error);
      toast.error("Error al eliminar: " + error.message);
    }
  };

  const handleEmptyTank = async () => {
    if (!selectedProductId) return;
    const selectedFlavor = products.find(f => f.id === selectedProductId);

    if (!confirm(`¿Estás seguro de vaciar el tanque de ${selectedFlavor?.name}? Esto pondrá el stock en 0 y no se puede deshacer.`)) return;

    try {
      setIsEmptying(true);

      const { data: recipeData, error: recipeError } = await supabase
        .from("recipes")
        .select("inventory_item_id")
        .eq("product_id", selectedProductId)
        .limit(1);

      if (recipeError) throw recipeError;

      if (!recipeData || recipeData.length === 0) {
        toast.error("Este producto no tiene una receta vinculada.");
        return;
      }

      const mixtureId = recipeData[0].inventory_item_id;

      const { data: currentItem, error: fetchError } = await supabase
        .from('inventory_items')
        .select('stock, name')
        .eq('id', mixtureId)
        .single();

      if (fetchError) throw fetchError;

      const currentStockBefore = currentItem?.stock || 0;

      if (currentStockBefore === 0) {
        toast.info("El tanque ya está vacío.");
        return;
      }

      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({ stock: 0, updated_at: new Date().toISOString() })
        .eq("id", mixtureId);

      if (updateError) throw updateError;

      const { error: movementError } = await supabase.from("movements").insert({
        product_id: selectedProductId,
        store_id: storeId,
        qty: currentStockBefore,
        type: "exit",
        reason: `VACIADO DE TANQUE: ${selectedFlavor?.name} (${(currentStockBefore / 1000).toFixed(1)}L)`,
        user_id: user?.id
      });

      if (movementError) throw movementError;

      toast.success(`Tanque vaciado correctamente (${(currentStockBefore / 1000).toFixed(1)}L retirados)`);

      setCurrentMixtureStock(0);
      fetchMixtures();
      fetchRecentLogs(selectedProductId);

    } catch (error: any) {
      console.error("Error al vaciar tanque:", error);
      toast.error("Error al vaciar tanque: " + error.message);
    } finally {
      setIsEmptying(false);
    }
  };

  const handleRegisterPreparation = async () => {
    if (!selectedProductId || !liters || parseFloat(liters) <= 0) {
      toast.error("Selecciona un sabor e ingresa los litros preparados");
      return;
    }

    const { data: recipeData } = await supabase
      .from("recipes")
      .select("inventory_item_id")
      .eq("product_id", selectedProductId)
      .limit(1);

    if (!recipeData || recipeData.length === 0) {
      toast.error("Este producto no tiene una receta vinculada");
      return;
    }

    const inventoryItemId = recipeData[0].inventory_item_id;
    const volumeMl = parseFloat(liters) * 1000;
    const product = products.find(p => p.id === selectedProductId);
    
    setIsProcessing(true);
    try {
      const { error: stockError } = await supabase.rpc('adjust_inventory_item_stock', {
        item_id: inventoryItemId,
        quantity: volumeMl
      });

      if (stockError) throw stockError;

      const { error: movementError } = await supabase
        .from("movements")
        .insert({
          product_id: selectedProductId,
          store_id: storeId,
          qty: volumeMl,
          type: "entry",
          reason: `Preparación Lote: ${liters}L para ${product?.name}`,
          user_id: user?.id
        });

      if (movementError) throw movementError;

      toast.success(`Se han añadido ${liters}L a la mezcla de ${product?.name}`);
      setSelectedProductId("");
      setLiters("");
      fetchMixtures();
      fetchRecentLogs();
    } catch (error: any) {
      console.error("Error registering preparation:", error);
      toast.error("Error al registrar: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="p-6 md:p-8 space-y-10"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-white/5 relative">
          <div className="absolute -left-10 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/50 to-transparent rounded-full shadow-glow-pro" />
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black font-space-grotesk italic tracking-tighter uppercase text-foreground mb-2 flex items-center gap-4">
              <FlaskConical className="w-8 h-8 md:w-10 md:h-10 text-primary drop-shadow-glow" />
              PREPARACIÓN <span className="text-primary text-glow italic">DE MEZCLA</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 font-space-grotesk italic">
               Batch Production & Volume Intelligence v2.0
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="glass-pro border-white/10 shadow-pro rounded-[2.5rem] overflow-hidden group">
            <CardHeader className="bg-primary/5 border-b border-white/5 py-10 relative overflow-hidden">
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
               <CardTitle className="font-space-grotesk italic uppercase tracking-tighter text-xl lg:text-2xl flex items-center gap-2 relative z-10">
                 <Beaker className="w-6 h-6 text-primary" />
                 Nueva Preparación
               </CardTitle>
               <CardDescription className="text-primary/60 font-black uppercase text-[10px] tracking-widest relative z-10">
                  Indica el volumen total preparado para sumarlo al stock
               </CardDescription>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 ml-2 italic">SELECCIONAR SABOR (SISTEMA)</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="h-14 lg:h-16 rounded-2xl bg-muted/40 border-border focus:border-primary/50 text-base lg:text-lg font-black font-space-grotesk italic uppercase tracking-wider text-foreground transition-all shadow-inner">
                    <SelectValue placeholder="Elige un granizado..." />
                  </SelectTrigger>
                  <SelectContent className="glass-pro border-border">
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id} className="font-black font-space-grotesk italic uppercase tracking-wider text-xs">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedFlavor && (
                <div className="space-y-4 animate-pro-in">
                  <div className="p-6 bg-muted/40 border border-border rounded-[2rem] relative overflow-hidden group/stock">
                     <div className="absolute top-0 right-0 w-32 h-full bg-primary/5 -skew-x-12 translate-x-32 group-hover/stock:translate-x-0 transition-transform duration-700" />
                     <div className="relative z-10 flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-primary italic">Stock Actual en Tanque</p>
                          <div className="flex items-center gap-4">
                            <p className="text-xl lg:text-3xl font-black font-space-grotesk italic tracking-tighter text-foreground">
                              {currentMixtureStock !== null 
                                ? (
                                  <>
                                    {(currentMixtureStock / 1000).toFixed(1)} <span className="text-sm opacity-40">L</span>
                                    <span className="text-xs text-primary/40 ml-3 italic">
                                      ({(currentMixtureStock / 29.57).toFixed(1)} oz)
                                    </span>
                                  </>
                                ) : (
                                   <span className="text-sm font-black text-red-500 uppercase tracking-widest animate-pulse">🔴 SIN TANQUE VINCULADO</span>
                                 )}
                            </p>
                          </div>
                        </div>
                        {currentMixtureStock === null ? (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleAutoLink}
                            className="h-12 px-6 rounded-xl border-primary/50 text-primary hover:bg-primary/10 font-black uppercase text-[10px] tracking-widest transition-all shadow-glow-pro"
                          >
                            Vincular Ahora
                          </Button>
                        ) : currentMixtureStock > 0 && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleEmptyTank}
                            className="h-10 px-6 rounded-xl appetite-accent-muted border-none font-black uppercase text-[9px] tracking-widest transition-all"
                          >
                            VACÍAR
                          </Button>
                        )}
                     </div>
                  </div>
                  
                  {currentMixtureName && (
                    <p className="text-[9px] text-muted-foreground/40 font-black uppercase tracking-[0.4em] px-4 font-space-grotesk italic">
                      Insumo: <span className="text-primary">{currentMixtureName}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 ml-2 italic">VOLUMEN PREPARADO (LITROS)</Label>
                <div className="relative group">
                  <Input 
                    type="number" 
                    step="0.5" 
                    placeholder="0.0" 
                    className="h-14 lg:h-16 rounded-2xl bg-muted/40 border-border focus:border-primary/50 text-2xl lg:text-4xl font-black font-space-grotesk italic tracking-tighter px-6 pr-16 text-foreground transition-all shadow-inner"
                    value={liters}
                    onChange={(e) => setLiters(e.target.value)}
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-black text-primary group-focus-within:text-white transition-colors font-space-grotesk italic">L</span>
                </div>
                <p className="text-[10px] text-muted-foreground/40 px-2 font-black uppercase tracking-widest italic">
                  {liters ? `Conversión: ${(parseFloat(liters) * 1000).toLocaleString()} ML` : 'Factor: 1 Litro = 1000 ML'}
                </p>
              </div>

              {liters && selectedProductId && (
                <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/20 space-y-6 animate-pro-in relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Scale className="w-20 h-20 text-primary" />
                  </div>
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                       <Scale className="w-5 h-5 text-primary" />
                       <span className="font-black uppercase tracking-[0.3em] text-[10px] text-primary italic">Intelligence Yield Projection</span>
                    </div>
                    <Badge className="bg-primary text-white border-none font-black uppercase tracking-widest text-[9px] h-6 px-3 shadow-glow-pro italic">
                       {selectedFlavor?.base_volume ? `${selectedFlavor.base_volume}${selectedFlavor.unit_measure}` : '4OZ BASE'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 relative z-10">
                     <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                        <span className="text-[9px] uppercase font-black text-muted-foreground/40 tracking-widest italic">Lote</span>
                        <p className="text-2xl font-black font-space-grotesk italic text-foreground">{liters}L</p>
                     </div>
                     <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                        <span className="text-[9px] uppercase font-black text-muted-foreground/40 tracking-widest italic">ml Eq.</span>
                        <p className="text-2xl font-black font-space-grotesk italic text-foreground">{(parseFloat(liters) * 1000).toLocaleString()}</p>
                     </div>
                  </div>

                  <div className="p-6 bg-muted/60 rounded-[2rem] border border-border space-y-4 relative z-10">
                    <p className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest text-center italic">PRODUCCIÓN ESTIMADA POR TAMAÑO</p>
                    <div className="grid grid-cols-1 gap-3">
                    {sizes.length > 0 ? (
                      sizes.map(size => {
                        const baseVol = selectedFlavor?.base_volume || 4;
                        const unitFactor = selectedFlavor?.unit_measure === 'ml' ? 1 : 29.57;
                        const volumePerCupMl = baseVol * unitFactor * size.multiplier;
                        const qty = Math.floor((parseFloat(liters) * 1000) / volumePerCupMl);
                        
                        return (
                          <div key={size.id} className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border group hover:border-primary/50 transition-all dim-layering">
                             <div className="flex items-center gap-3">
                                <span className="font-black text-white text-xs uppercase tracking-wider italic font-space-grotesk">{size.name}</span>
                                <Badge variant="outline" className="text-[8px] h-4 px-1.5 opacity-30 border-border text-foreground font-black">{size.multiplier.toFixed(1)}x</Badge>
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="font-black text-primary text-2xl font-space-grotesk italic">{qty}</span>
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest italic">VASOS</span>
                             </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 bg-primary/5 rounded-2xl border border-dashed border-primary/20 text-center">
                        <p className="text-[9px] text-primary font-black uppercase tracking-widest italic">Configurar tamaños en Ajustes</p>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleRegisterPreparation}
                disabled={isProcessing || !liters || !selectedProductId}
                className="w-full h-16 lg:h-20 rounded-[2rem] bg-foreground text-background hover:bg-primary hover:text-primary-foreground font-black uppercase tracking-[0.4em] text-sm italic font-space-grotesk transition-all shadow-glow-pro active:scale-95 group overflow-hidden relative"
              >
                <span className="relative z-10">{isProcessing ? "PROCESANDO LOTE..." : "CONFIRMAR PRODUCCIÓN"}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-pro border-white/10 shadow-pro rounded-[2.5rem] overflow-hidden h-fit flex flex-col">
            <CardHeader className="bg-white/5 border-b border-white/5 py-10 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <CardTitle className="font-space-grotesk italic uppercase tracking-tighter text-xl lg:text-2xl flex items-center gap-2">
                    <History className="w-6 h-6 text-muted-foreground/40" />
                    Historial Reciente
                  </CardTitle>
                  <CardDescription className="text-white/40 font-black uppercase text-[10px] tracking-widest">
                    Últimos registros de producción verificados
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              {loading ? (
                <div className="p-20 text-center">
                  <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4 shadow-pro" />
                  <p className="text-primary font-black animate-pulse tracking-[0.3em] uppercase text-[10px]">Data Stream Active</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="p-20 text-center">
                  <History className="w-16 h-16 text-muted-foreground/5 mx-auto mb-4" />
                  <p className="text-muted-foreground/20 font-black uppercase tracking-widest text-[10px] italic">No hay registros de producción pendientes</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {logs.map((log) => (
                    <div key={log.id} className="p-6 flex items-center justify-between hover:bg-muted/40 transition-all group relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-all" />
                      <div className="space-y-1 relative z-10">
                        <p className="font-black text-xs uppercase tracking-widest text-foreground italic font-space-grotesk group-hover:text-primary transition-colors">
                          {log.reason?.replace('Preparación Lote: ', '') || (log as any).products?.name || "Registro General"}
                        </p>
                        <p className="text-[9px] text-muted-foreground/30 font-black uppercase tracking-widest italic">
                          {format(new Date(log.created_at), "d MMMM, HH:mm", { locale: es })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 relative z-10">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "font-black text-[10px] uppercase tracking-widest italic h-8 px-3 border-none shadow-pro",
                            log.type === 'exit' 
                                ? "appetite-accent-muted"
                                : "bg-primary/20 text-primary"
                          )}
                        >
                          {log.type === 'exit' ? '-' : '+'} {(log.qty / 1000).toFixed(1)} L
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeletePreparation(log)}
                          className="h-10 w-10 rounded-xl text-muted-foreground/20 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all active:scale-95"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </Layout>
  );
}
