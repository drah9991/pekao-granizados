import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Product } from "@/lib/pos-types"; // Topping interface removed
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

interface ProductCustomizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAddToCart: (product: Product, sizeId: string, toppingIds: string[]) => void;
}

type Size = Tables<'sizes'>;
type ToppingProduct = Product; // Toppings are now products

export default function ProductCustomizationDialog({
  isOpen,
  onClose,
  product,
  onAddToCart,
}: ProductCustomizationDialogProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
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
      setSelectedSize(null); // Reset to default when dialog opens
      setSelectedToppings([]);
    }
  }, [isOpen, userStoreId]);

  const fetchUserStoreId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuario no autenticado.");
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (profile?.store_id) {
        setUserStoreId(profile.store_id);
      } else {
        toast.warning("No se encontró un ID de tienda para el usuario. No podrás personalizar productos.");
      }
    } catch (error: any) {
      console.error("Error fetching user's store ID:", error);
      toast.error("Error al obtener ID de tienda: " + error.message);
    }
  };

  const fetchCustomizationData = async () => {
    setLoadingData(true);
    try {
      // Fetch sizes
      const { data: sizesData, error: sizesError } = await supabase
        .from('sizes')
        .select('*')
        .eq('store_id', userStoreId!)
        .order('multiplier', { ascending: true });

      if (sizesError) throw sizesError;
      setAvailableSizes(sizesData || []);
      if (sizesData && sizesData.length > 0) {
        setSelectedSize(sizesData[0].id); // Set first size as default
      }

      // Fetch toppings (products of type 'topping')
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
      toast.error("Error al cargar opciones de personalización: " + error.message);
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddToCart = () => {
    if (product && selectedSize) {
      onAddToCart(product, selectedSize, selectedToppings);
      onClose();
    } else {
      toast.error("Por favor, selecciona un tamaño.");
    }
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            {product.emoji || '🥤'} Personalizar {product.name}
          </DialogTitle>
          <DialogDescription>
            Selecciona el tamaño y agrega toppings a tu granizado
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Tamaños */}
            {availableSizes.length > 0 && (
              <div>
                <Label className="text-base font-semibold mb-3 block">Tamaño</Label>
                <RadioGroup value={selectedSize || ''} onValueChange={setSelectedSize}>
                  {availableSizes.map((size) => (
                    <div key={size.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-smooth">
                      <RadioGroupItem value={size.id} id={size.id} />
                      <Label htmlFor={size.id} className="flex-1 cursor-pointer font-medium">
                        {size.name}
                      </Label>
                      <span className="text-sm font-bold text-primary">
                        {formatCurrency(product.price * size.multiplier)}
                      </span>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Toppings */}
            {availableToppings.length > 0 && (
              <div>
                <Label className="text-base font-semibold mb-3 block">Toppings</Label>
                <div className="space-y-2">
                  {availableToppings.map((topping) => (
                    <div key={topping.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-smooth">
                      <Checkbox
                        id={topping.id}
                        checked={selectedToppings.includes(topping.id)}
                        onCheckedChange={(checked) => {
                          setSelectedToppings(
                            checked
                              ? [...selectedToppings, topping.id]
                              : selectedToppings.filter((id) => id !== topping.id)
                          );
                        }}
                      />
                      <Label htmlFor={topping.id} className="flex-1 cursor-pointer font-medium">
                        {topping.name}
                      </Label>
                      <span className="text-sm font-bold text-primary">+{formatCurrency(topping.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleAddToCart} className="gradient-primary" disabled={!selectedSize}>
            Agregar {formatCurrency(finalPrice)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}