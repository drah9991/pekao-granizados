import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Product, Topping } from "@/lib/pos-types";
import { sizes, availableToppings } from "@/lib/pos-data";
import { formatCurrency } from "@/lib/formatters"; // Import the formatter

interface ProductCustomizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAddToCart: (product: Product, sizeId: string, toppingIds: string[]) => void;
}

export default function ProductCustomizationDialog({
  isOpen,
  onClose,
  product,
  onAddToCart,
}: ProductCustomizationDialogProps) {
  const [selectedSize, setSelectedSize] = useState("medium");
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedSize("medium"); // Reset to default when dialog opens
      setSelectedToppings([]);
    }
  }, [isOpen]);

  const handleAddToCart = () => {
    if (product) {
      onAddToCart(product, selectedSize, selectedToppings);
      onClose();
    }
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            {product.emoji} Personalizar {product.name}
          </DialogTitle>
          <DialogDescription>
            Selecciona el tamaño y agrega toppings a tu granizado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tamaños */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Tamaño</Label>
            <RadioGroup value={selectedSize} onValueChange={setSelectedSize}>
              {sizes.map((size) => (
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

          {/* Toppings */}
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
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleAddToCart} className="gradient-primary">
            Agregar al Carrito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}