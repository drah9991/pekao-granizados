import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Product } from "@/lib/pos-types";
import { formatCOP } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductCustomizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, sizeId: string, toppingIds: string[], quantity: number) => void;
}

type Size = Tables<'sizes'>;
type ToppingProduct = Product;

export default function ProductCustomizationDialog({
  isOpen,
  onClose,
  product,
  onAddToCart,
}: ProductCustomizationDialogProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [availableSizes, setAvailableSizes] = useState<Size[]>([]);
  const [availableToppings, setAvailableToppings] = useState<ToppingProduct[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [userStoreId, setUserStoreId] = useState<string | null>(null);

  useEffect(() => {
    fetchUserStoreId();
  }, []);

  useEffect(() => {
    if (isOpen && userStoreId) {
      fetchCustomizationData();
      setSelectedSize(null);
      setSelectedToppings([]);
      setQuantity(1);
    }
  }, [isOpen, userStoreId]);

  const fetchUserStoreId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (profile?.store_id) setUserStoreId(profile.store_id);
    } catch (error: any) {
      console.error("Error fetching user's store ID:", error);
    }
  };

  const fetchCustomizationData = async () => {
    setLoadingData(true);
    try {
      const { data: sizesData, error: sizesError } = await supabase
        .from('sizes')
        .select('*')
        .eq('store_id', userStoreId!)
        .order('multiplier', { ascending: true });

      if (sizesError) throw sizesError;
      setAvailableSizes(sizesData || []);
      if (sizesData && sizesData.length > 0) {
        setSelectedSize(sizesData[0].id);
      }

      const { data: toppingsData, error: toppingsError } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', userStoreId!)
        .eq('type', 'topping')
        .eq('active', true)
        .order('name', { ascending: true });

      if (toppingsError) throw toppingsError;
      setAvailableToppings(toppingsData as ToppingProduct[] || []);
    } catch (error: any) {
      console.error("Error fetching customization data:", error);
      toast.error("Error al cargar opciones: " + error.message);
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddToCart = () => {
    const isSachet = product?.type === 'sachet';
    if (product && (selectedSize || isSachet)) {
      onAddToCart(product, selectedSize || "", selectedToppings, quantity);
      onClose();
    } else {
      toast.error("Por favor, selecciona un tamaño.");
    }
  };

  const toggleTopping = (id: string) => {
    setSelectedToppings(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  if (!product) return null;

  const currentSize = availableSizes.find(s => s.id === selectedSize);
  const basePrice = product.price * (currentSize?.multiplier || 1);
  const selectedToppingsPrice = availableToppings
    .filter(t => selectedToppings.includes(t.id))
    .reduce((sum, t) => sum + t.price, 0);
  const finalPrice = basePrice + selectedToppingsPrice;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            🥤 Personalizar {product.name}
          </DialogTitle>
          <DialogDescription>
            Selecciona el tamaño y agrega toppings
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Sizes as touch-friendly buttons */}
            {availableSizes.length > 0 && product.type !== 'sachet' && (
              <div>
                <Label className="text-base font-semibold mb-3 block">Tamaño</Label>
                <div className="grid grid-cols-2 gap-3">
                   {(availableSizes || []).map((size) => {
                      const baseVol = Number(product.base_volume) || 4;
                      const unitFactor = product.unit_measure === "ml" ? 1 : 29.57;
                      const sizeVolumeMl = baseVol * size.multiplier * unitFactor;
                      const remainingServings = product.mixtureStock ? Math.floor(product.mixtureStock / sizeVolumeMl) : null;
                      
                      return (
                        <button
                          key={size.id}
                          onClick={() => setSelectedSize(size.id)}
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-150 min-h-[85px] active:scale-95 text-center relative overflow-hidden group",
                            selectedSize === size.id
                              ? "border-primary bg-primary/10 text-primary shadow-md"
                              : "border-border hover:border-muted-foreground/50 bg-muted/20"
                          )}
                        >
                          <span className="font-bold text-sm">
                            {size.name}
                            {product.base_volume && (
                              <span className="ml-1 text-[10px] opacity-70">
                                ({(product.base_volume * size.multiplier).toFixed(0)} {product.unit_measure || 'oz'})
                              </span>
                            )}
                          </span>
                          <span className="text-xs font-black mt-1">
                            {formatCOP(product.price * size.multiplier)}
                          </span>
                          
                          {(product.type === 'granizado' || product.category === 'Granizado') && remainingServings !== null && (
                            <div className={cn(
                              "mt-2 text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full",
                              remainingServings <= 5 ? "bg-red-500/20 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                            )}>
                              {remainingServings} dispon.
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Toppings as large toggle buttons */}
            {availableToppings.length > 0 && (
              <div>
                <Label className="text-base font-semibold mb-3 block">Toppings</Label>
                <div className="space-y-2">
                  {(availableToppings || []).map((topping) => {
                    const isSelected = selectedToppings.includes(topping.id);
                    return (
                      <button
                        key={topping.id}
                        onClick={() => toggleTopping(topping.id)}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-150 min-h-[56px] active:scale-[0.98]",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-muted-foreground/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors",
                            isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                          )}>
                            {isSelected && <Check className="w-4 h-4" />}
                          </div>
                          <span className="font-medium text-sm">{topping.name}</span>
                        </div>
                        <span className="text-sm font-bold text-primary">+{formatCOP(topping.price)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between items-center flex-row">
          <div className="flex items-center gap-4 bg-muted/30 p-1.5 rounded-2xl border border-border">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="h-10 w-10 text-muted-foreground hover:bg-white/10 hover:text-foreground rounded-xl"
            >
              -
            </Button>
            <span className="font-black text-lg w-6 text-center">{quantity}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setQuantity(q => q + 1)}
              className="h-10 w-10 text-primary hover:bg-primary/20 rounded-xl"
            >
              +
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} className="min-h-[48px] rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleAddToCart} className="gradient-primary min-h-[48px] text-base rounded-xl" disabled={!selectedSize && product.type !== 'sachet'}>
              Agregar {formatCOP(finalPrice * quantity)}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
