import { CartItem, Product } from "@/lib/pos-types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Trash2, Percent, Tag, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

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
  const [allProducts, setAllProducts] = useState<Tables<'products'>[]>([]);
  const [userStoreId, setUserStoreId] = useState<string | null>(null);

  useEffect(() => {
    fetchUserStoreId();
  }, []);

  useEffect(() => {
    if (userStoreId) {
      fetchAllProducts();
    }
  }, [userStoreId]);

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
      }
    } catch (error: any) {
      console.error("Error fetching user's store ID:", error);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq('store_id', userStoreId!)
        .eq('active', true);

      if (error) throw error;
      setAllProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching all products:", error);
    }
  };

  return (
    <div className="w-full lg:w-96 bg-card border-t lg:border-t-0 lg:border-l-2 border-border p-4 md:p-6 flex flex-col max-h-[40vh] lg:max-h-full">
      <h2 className="text-2xl md:text-3xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
        Carrito
      </h2>

      <div className="flex-1 overflow-auto mb-4 space-y-3">
        {cart.length === 0 ? (
          <div className="text-center py-8 md:py-12">
            <div className="text-5xl md:text-6xl mb-3">🛒</div>
            <p className="text-muted-foreground text-sm md:text-base">Carrito vacío</p>
          </div>
        ) : (
          cart.map((item) => (
            <Card key={item.id} className="border-2 shadow-card">
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.name}</p>
                    {item.size && (
                      <Badge variant="outline" className="text-[10px] mt-0.5">
                        {item.size}
                      </Badge>
                    )}
                    {item.toppings && item.toppings.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        + {item.toppings.map(t => t.name).join(", ")}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(item.id, -1)}
                      className="h-10 w-10 border-2 hover:border-primary hover:text-primary active:scale-95"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="font-bold text-lg w-10 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(item.id, 1)}
                      className="h-10 w-10 border-2 hover:border-primary hover:text-primary active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="font-bold text-lg">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="space-y-3">
        {/* Discount */}
        <Card className="border-2">
          <CardContent className="p-3">
            <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Descuento
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="number"
                placeholder="0"
                value={discount || ""}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="border-2 flex-1"
              />
              <Button
                variant={discountType === "percent" ? "default" : "outline"}
                size="icon"
                onClick={() => setDiscountType("percent")}
                className="h-10 w-10 min-w-[40px]"
              >
                <Percent className="w-4 h-4" />
              </Button>
              <Button
                variant={discountType === "fixed" ? "default" : "outline"}
                size="icon"
                onClick={() => setDiscountType("fixed")}
                className="h-10 w-10 min-w-[40px]"
              >
                $
              </Button>
            </div>
            {discount > 0 && (
              <p className="text-xs text-accent font-medium mt-2">
                Descuento: -{formatCurrency(discountAmount)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Total */}
        <Card className="shadow-elevated border-2 border-primary/20">
          <CardContent className="p-4 gradient-card">
            <div className="space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-accent font-medium">
                  <span>Descuento</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full h-16 text-lg font-semibold gradient-primary hover:shadow-glow transition-all active:scale-[0.98]"
          onClick={onCheckout}
        >
          <Receipt className="mr-2 w-6 h-6" />
          Procesar Pago
        </Button>
      </div>
    </div>
  );
}
