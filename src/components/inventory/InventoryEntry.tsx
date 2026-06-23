import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Enums, Tables } from "@/integrations/supabase/types";
import { Package, Plus, Search, Zap, Check, ChevronRight, Filter, Layers, LayoutGrid, Tag, History, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCcw } from "lucide-react";

interface Product {
  id: string;
  name: string;
  type: Enums<'product_type'>;
  sku: string | null;
  price: number;
}

interface InventoryEntryProps {
  storeId?: string;
  onSuccess?: () => void;
}

const productTypeOptions: { value: Enums<'product_type'>; label: string }[] = [
  { value: "granizado", label: "GRANIZADOS" },
  { value: "topping", label: "TOPPINGS" },
  { value: "sachet", label: "SACHETS" },
  { value: "sweet", label: "DULCES" },
  { value: "other", label: "OTROS" },
];

export default function InventoryEntry({ storeId, onSuccess }: InventoryEntryProps) {
  const { user, userRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Enums<'product_type'> | "">("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [qty, setQty] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [activeStoreId, setActiveStoreId] = useState<string>(storeId || "");
  const [allStores, setAllStores] = useState<{id: string, name: string}[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Category, 2: Product, 3: Details

  useEffect(() => {
    fetchProducts();
    if (userRole === 'admin') fetchStores();
  }, [userRole]);

  useEffect(() => {
    if (storeId) setActiveStoreId(storeId);
  }, [storeId]);

  const fetchStores = async () => {
    try {
      const { data } = await supabase.from('stores').select('id, name');
      setAllStores(data || []);
    } catch (err) {
      console.error("Error fetching stores:", err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, type, sku, price")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error: unknown) {
      console.error("Error fetching products:", error);
      toast.error("Error al cargar catálogo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCategory) {
      setFilteredProducts(products.filter(p => p.type === selectedCategory));
    } else {
      setFilteredProducts([]);
    }
  }, [selectedCategory, products]);

  const handleCategorySelect = (category: Enums<'product_type'>) => {
    setSelectedCategory(category);
    setStep(2);
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!selectedProductId || !qty || parseFloat(qty) <= 0 || !activeStoreId) {
      toast.error("Datos incompletos para el registro");
      return;
    }

    setIsProcessing(true);
    try {
      if (!user) throw new Error("No hay sesión activa");
      
      // Explicit role check to warn user before DB fails
      const allowedRoles = ['admin', 'manager', 'owner', 'store_manager'];
      if (userRole && !allowedRoles.includes(userRole as string)) {
        toast.error("Tu rol actual no tiene permisos para modificar inventario.");
        setIsProcessing(false);
        return;
      }

      if (!activeStoreId) {
        toast.error("Selecciona una sucursal para continuar");
        setIsProcessing(false);
        return;
      }

      const qtyNum = parseFloat(qty);

      // 1. Check if stock entry exists
      const { data: existingStock, error: stockFetchError } = await supabase
        .from("store_stock")
        .select("id, qty")
        .eq("product_id", selectedProductId)
        .eq("store_id", activeStoreId)
        .maybeSingle();

      if (stockFetchError) throw stockFetchError;

      // 1. Update store_stock (Product level) using UPSERT
      const { error: upsertError } = await supabase
        .from("store_stock")
        .upsert({
          product_id: selectedProductId,
          store_id: activeStoreId,
          qty: qtyNum + (existingStock?.qty || 0),
          updated_at: new Date().toISOString(),
          min_qty: 10
        }, {
          onConflict: 'store_id,product_id'
        });

      if (upsertError) throw upsertError;

      // 2. Sync with inventory_items (Recipe/Mixture level) if applicable
      // This is crucial for Granizados and products that deduct from tanks
      try {
        const { data: recipes } = await supabase
          .from("recipes")
          .select("inventory_item_id, quantity_required")
          .eq("product_id", selectedProductId);

        if (recipes && recipes.length > 0) {
          for (const recipe of recipes) {
            // Use the security definer RPC to bypass RLS for inventory items
            await supabase.rpc('increment_inventory_stock', {
              p_item_id: recipe.inventory_item_id,
              p_store_id: activeStoreId,
              p_amount: qtyNum * (recipe.quantity_required || 1)
            });
          }
        }
      } catch (recipeErr) {
        console.error("Recipe Sync Error (Non-critical):", recipeErr);
        // We don't block the whole process if recipe sync fails, as store_stock is updated
      }

      // 3. Log movement for audit
      const { error: moveError } = await supabase
        .from("movements")
        .insert({
          product_id: selectedProductId,
          store_id: activeStoreId,
          qty: qtyNum,
          type: "entry",
          reason: reason || "Ingreso manual de inventario",
          user_id: user.id
        });

      if (moveError) {
        console.error("Movement Log Error:", moveError);
        toast.warning("Stock actualizado pero no se pudo registrar el historial.");
      }



      toast.success("Registro de entrada completado");
      resetForm();
      if (onSuccess) onSuccess();
    } catch (error: unknown) {
      console.error("Critical Inventory Entry Error:", error);
      
      const err = error as { code?: string; message?: string };
      let errorMessage = "Fallo en sincronización";
      if (err.code === '42501' || err.message?.includes('row-level security')) {
        errorMessage = `Error de Permisos (RLS): Rol(${userRole || '?'}), Store(${activeStoreId.substring(0,6)}), Product(${selectedProductId.substring(0,6)}) no autorizado.`;
      } else if (error.message) {
        errorMessage += ": " + err.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedCategory("");
    setSelectedProductId("");
    setQty("");
    setReason("");
    setStep(1);
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <div className="space-y-8 animate-pro-in">
      {/* Stepper Header */}
      <div className="flex items-center justify-between px-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
              <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-black italic transition-all duration-500 shadow-pro",
                  step >= 1 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              )}>1</div>
              <div className={cn("h-0.5 w-12 transition-all duration-1000", step >= 2 ? "bg-primary" : "bg-muted")} />
              <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-black italic transition-all duration-500 shadow-pro",
                  step >= 2 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              )}>2</div>
              <div className={cn("h-0.5 w-12 transition-all duration-1000", step >= 3 ? "bg-primary" : "bg-muted")} />
              <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-black italic transition-all duration-500 shadow-pro",
                  step >= 3 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              )}>3</div>
          </div>
          {userRole === 'admin' && (
            <div className="mt-4 min-w-[200px]">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Sucursal Destino (Admin)</Label>
              <Select value={activeStoreId} onValueChange={setActiveStoreId}>
                <SelectTrigger className="h-8 text-[10px] font-bold bg-muted/40 border-white/5">
                  <SelectValue placeholder="Seleccionar Sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {allStores.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-[10px] uppercase font-bold">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetForm}
            className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
            Reiniciar
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6"
          >
            {productTypeOptions.map((cat) => (
              <Card 
                key={cat.value}
                onClick={() => handleCategorySelect(cat.value)}
                className="glass-pro border-white/5 hover:border-primary/40 cursor-pointer transition-all duration-500 group relative overflow-hidden h-40 flex flex-col items-center justify-center gap-4 shadow-pro"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="p-4 rounded-2xl bg-muted group-hover:bg-primary/20 group-hover:scale-110 transition-all text-muted-foreground group-hover:text-primary">
                  <LayoutGrid className="w-8 h-8" />
                </div>
                <span className="text-[10px] font-black italic uppercase tracking-[0.2em] group-hover:text-primary transition-colors">{cat.label}</span>
              </Card>
            ))}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" onClick={() => setStep(1)} className="gap-2 text-muted-foreground hover:text-primary h-8 px-0">
                    <ChevronRight className="w-4 h-4 rotate-180" /> 
                    <span className="text-[10px] font-black uppercase tracking-widest">Volver a Categorías</span>
                </Button>
                <Badge variant="outline" className="border-primary/30 text-primary uppercase italic font-black text-[9px] tracking-widest px-3">
                    {selectedCategory}
                </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.length > 0 ? (
                    filteredProducts.map((p) => (
                        <Card 
                            key={p.id}
                            onClick={() => handleProductSelect(p.id)}
                            className="glass-pro border-white/5 hover:border-primary/40 cursor-pointer transition-all duration-500 p-6 flex items-center justify-between group shadow-pro"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-muted group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary transition-all">
                                    <Tag className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black italic uppercase tracking-tight text-white group-hover:text-primary transition-colors">
                                        {p.name}
                                    </span>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                                        {p.sku || "Sin SKU"}
                                    </span>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-all" />
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/5">
                        <Package className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No hay productos activos en esta categoría</p>
                    </div>
                )}
            </div>
          </motion.div>
        )}

        {step === 3 && selectedProduct && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="glass-pro border-white/5 overflow-hidden rounded-[2.5rem] shadow-pro">
                <CardHeader className="bg-gradient-to-br from-primary/10 to-transparent border-b border-white/5 p-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-primary rounded-[1.5rem] text-white shadow-glow-pro">
                                <ShoppingCart className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black italic uppercase tracking-tighter font-space-grotesk text-white">
                                    {selectedProduct.name}
                                </CardTitle>
                                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-primary/60 italic">
                                    {selectedProduct.type} • SKU: {selectedProduct.sku || "N/A"}
                                </CardDescription>
                            </div>
                        </div>
                        <Button variant="ghost" onClick={() => setStep(2)} className="h-10 w-10 rounded-full hover:bg-white/10">
                            <RefreshCcw className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">CANTIDAD A INGRESAR</Label>
                            <div className="relative group">
                                <Input 
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={qty}
                                    onChange={(e) => setQty(e.target.value)}
                                    className="h-20 bg-white/5 border-white/10 rounded-[1.5rem] text-4xl font-black italic font-space-grotesk focus:ring-primary/20 text-center pr-12"
                                />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-primary/40 font-black italic text-sm">UNITS</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">MOTIVO / NOTA</Label>
                            <Textarea 
                                placeholder="EJ: COMPRA PROVEEDOR, REABASTECIMIENTO..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value.toUpperCase())}
                                className="h-20 bg-white/5 border-white/10 rounded-[1.5rem] text-[10px] font-black italic focus:ring-primary/20 p-4 resize-none uppercase"
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button 
                            onClick={handleSubmit}
                            disabled={isProcessing || !qty || parseFloat(qty) <= 0}
                            className="w-full h-20 rounded-[1.5rem] bg-primary text-white font-black italic uppercase tracking-[0.2em] text-lg shadow-glow-pro hover:bg-primary/80 active:scale-[0.98] transition-all border-2 border-white/10"
                        >
                            {isProcessing ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>SINCRONIZANDO...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Check className="w-6 h-6" />
                                    <span>VALIDAR INGRESO ✓</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RefreshCcw(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
