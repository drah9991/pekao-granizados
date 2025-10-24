import { CartItem, Product } from "@/lib/pos-types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Trash2, Percent, Tag, Receipt } from "lucide-react";
import { products as staticProducts } from "@/lib/pos-data";

interface CartSummaryProps {
  cart: CartItem[];
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  subtotal: number;
  discount: number;
  setDiscount: (discount: number) => void;
  discountType: "percent" | "fixed";
  setDiscountType: (type: "percent" | "fixed") => void;
  discountAmount: number;
  total: number;
  onCheckout: () => void;
}

export default function CartSummary({
  cart,
  updateQuantity,
  removeItem,
  subtotal,
  discount,
  setDiscount,
  discountType,
  setDiscountType,
  discountAmount,
  total,
  onCheckout,
}: CartSummaryProps) {
  return (
    <div className="w-full lg:w-96 bg-card border-t lg:border-t-0 lg:border-l-2 border-border p-4 md:p-6 flex flex-col max-h-[40vh] lg:max-h-full">
      <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 bg-gradient-primary bg-clip-text text-transparent">
        Carrito
      </h2>

      <div className="flex-1 overflow-auto mb-4 md:mb-6 space-y-3">
        {cart.length === 0 ? (
          <div className="text-center py-8 md:py-12">
            <div className="text-5xl md:text-6xl mb-3">🛒</div>
            <p className="text-muted-foreground text-sm md:text-base">Carrito vacío</p>
          </div>
        ) : (
          cart.map((item) => {
            const product = staticProducts.find(p => p.id.split('-')[0] === item.id.split('-')[0]);
            
            return (
              <Card key={item.id} className="border-2 shadow-card hover:shadow-elevated transition-smooth">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2 flex-1">
                      <div className="text-2xl">{product?.emoji}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm md:text-base">{item.name}</p>
                        {item.size && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {item.size}
                          </Badge>
                        )}
                        {item.toppings && item.toppings.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            + {item.toppings.map(t => t.name).join(", ")}
                          </p>
                        )}
                        <p className="text-sm text-primary font-bold mt-1">
                          ${item.price.toFixed(2)} c/u
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="h-9 w-9 border-2 hover:border-primary hover:text-primary"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="font-bold text-lg w-10 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="h-9 w-9 border-2 hover:border-primary hover:text-primary"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="font-bold text-lg md:text-xl">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="space-y-3 md:space-y-4">
        {/* Descuento */}
        <Card className="border-2">
          <CardContent className="p-3 md:p-4">
            <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Descuento
            </Label>
            <div className="flex gap-2 mt-2">
              <div className="flex-1 flex gap-2">
                <Input
                  type="number"
                  placeholder="0"
                  value={discount || ""}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="border-2"
                />
                <Button
                  variant={discountType === "percent" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setDiscountType("percent")}
                  className="h-10 w-10"
                >
                  <Percent className="w-4 h-4" />
                </Button>
                <Button
                  variant={discountType === "fixed" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setDiscountType("fixed")}
                  className="h-10 w-10"
                >
                  $
                </Button>
              </div>
            </div>
            {discount > 0 && (
              <p className="text-xs text-accent font-medium mt-2">
                Descuento: -${discountAmount.toFixed(2)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Total */}
        <Card className="shadow-elevated border-2 border-primary/20">
          <CardContent className="p-4 md:p-5 gradient-card">
            <div className="space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-accent font-medium">
                  <span>Descuento</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-lg md:text-xl font-semibold">Total</span>
                <span className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full h-14 md:h-16 text-base md:text-lg font-semibold gradient-primary hover:shadow-glow transition-smooth"
          onClick={onCheckout}
        >
          <Receipt className="mr-2 w-5 h-5" />
          Procesar Pago
        </Button>
      </div>
    </div>
  );
}