import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Minus, Plus, Trash2, CreditCard, DollarSign, Receipt, Percent, Tag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Topping {
  id: string;
  name: string;
  price: number;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  toppings?: Topping[];
  customizationId?: string;
}

const sizes = [
  { id: "small", name: "Pequeño", multiplier: 0.8 },
  { id: "medium", name: "Mediano", multiplier: 1 },
  { id: "large", name: "Grande", multiplier: 1.3 },
];

const availableToppings: Topping[] = [
  { id: "condensed", name: "Leche Condensada", price: 0.5 },
  { id: "fruit", name: "Fruta Extra", price: 0.8 },
  { id: "cream", name: "Crema Batida", price: 0.6 },
  { id: "syrup", name: "Jarabe Especial", price: 0.4 },
];

const products = [
  { id: "1", name: "Granizado Fresa", price: 3.5, category: "Clásicos", emoji: "🍓", color: "from-pink-400 to-red-400" },
  { id: "2", name: "Granizado Limón", price: 3.5, category: "Clásicos", emoji: "🍋", color: "from-yellow-300 to-yellow-500" },
  { id: "3", name: "Granizado Frambuesa", price: 4.0, category: "Premium", emoji: "🫐", color: "from-purple-400 to-pink-500" },
  { id: "4", name: "Granizado Mango", price: 4.0, category: "Premium", emoji: "🥭", color: "from-orange-400 to-yellow-400" },
  { id: "5", name: "Granizado Mix", price: 4.5, category: "Especiales", emoji: "🌈", color: "from-blue-400 via-purple-400 to-pink-400" },
  { id: "6", name: "Granizado Cola", price: 3.5, category: "Clásicos", emoji: "🥤", color: "from-amber-700 to-amber-900" },
];

export default function POS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<typeof products[0] | null>(null);
  const [customizeDialog, setCustomizeDialog] = useState(false);
  const [selectedSize, setSelectedSize] = useState("medium");
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [receiptDialog, setReceiptDialog] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const openCustomization = (product: typeof products[0]) => {
    setSelectedProduct(product);
    setSelectedSize("medium");
    setSelectedToppings([]);
    setCustomizeDialog(true);
  };

  const addToCart = (customized?: boolean) => {
    if (!selectedProduct) return;

    const size = sizes.find(s => s.id === selectedSize);
    const toppings = availableToppings.filter(t => selectedToppings.includes(t.id));
    const basePrice = selectedProduct.price * (size?.multiplier || 1);
    const toppingsPrice = toppings.reduce((sum, t) => sum + t.price, 0);
    const finalPrice = basePrice + toppingsPrice;

    const customizationId = customized ? `${selectedProduct.id}-${Date.now()}` : selectedProduct.id;
    
    const newItem: CartItem = {
      id: customizationId,
      name: selectedProduct.name,
      price: finalPrice,
      quantity: 1,
      size: size?.name,
      toppings: toppings.length > 0 ? toppings : undefined,
      customizationId,
    };

    setCart([...cart, newItem]);
    setCustomizeDialog(false);
    toast.success("Producto agregado al carrito");
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeItem = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = discountType === "percent" ? (subtotal * discount / 100) : discount;
  const total = Math.max(0, subtotal - discountAmount);
  const change = paymentMethod === "cash" ? Math.max(0, parseFloat(amountReceived) - total) : 0;

  const openPaymentDialog = () => {
    if (cart.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    setAmountReceived(total.toFixed(2));
    setPaymentDialog(true);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }

    if (paymentMethod === "cash" && parseFloat(amountReceived) < total) {
      toast.error("El monto recibido es insuficiente");
      return;
    }

    setIsProcessing(true);

    try {
      // Crear orden en la base de datos
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          store_id: "00000000-0000-0000-0000-000000000001", // ID de tienda demo
          subtotal: subtotal,
          tax: 0,
          total: total,
          status: "completed",
          payment: {
            method: paymentMethod,
            amount_received: paymentMethod === "cash" ? parseFloat(amountReceived) : total,
            change: change,
          },
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Crear items de la orden
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        name: item.name,
        price: item.price,
        qty: item.quantity,
        subtotal: item.price * item.quantity,
        tax: 0,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      setLastOrder({
        ...orderData,
        items: cart,
        change,
      });

      toast.success("¡Venta procesada exitosamente!");
      setPaymentDialog(false);
      setReceiptDialog(true);
      setCart([]);
      setDiscount(0);
      setAmountReceived("");
    } catch (error: any) {
      console.error("Error processing sale:", error);
      toast.error("Error al procesar la venta: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="h-full flex flex-col lg:flex-row">
        {/* Products Grid */}
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-hero bg-clip-text text-transparent">
              Punto de Venta
            </h1>
            <Input 
              placeholder="🔍 Buscar productos..." 
              className="max-w-md text-base border-2"
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => openCustomization(product)}
                className="group relative h-32 md:h-40 rounded-2xl border-2 border-border overflow-hidden transition-smooth hover:shadow-elevated hover:-translate-y-1 hover:border-primary"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${product.color} opacity-80`} />
                <div className="relative h-full p-4 flex flex-col items-start justify-between text-white">
                  <div className="w-full flex items-start justify-between">
                    <Badge variant="secondary" className="text-xs font-semibold bg-white/90 text-foreground hover:bg-white">
                      {product.category}
                    </Badge>
                    <div className="text-3xl md:text-4xl">{product.emoji}</div>
                  </div>
                  <div className="w-full">
                    <p className="font-bold text-left text-sm md:text-base mb-1">{product.name}</p>
                    <p className="font-bold text-left text-xl md:text-2xl">${product.price.toFixed(2)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cart */}
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
                const product = products.find(p => p.id === item.id);
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
                                + {item.toppings.filter(t => t).map(t => t.name).join(", ")}
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
              onClick={openPaymentDialog}
            >
              <Receipt className="mr-2 w-5 h-5" />
              Procesar Pago
            </Button>
          </div>
        </div>
      </div>

      {/* Diálogo de Personalización */}
      <Dialog open={customizeDialog} onOpenChange={setCustomizeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              {selectedProduct?.emoji} Personalizar {selectedProduct?.name}
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
                      ${(selectedProduct!.price * size.multiplier).toFixed(2)}
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
                    <span className="text-sm font-bold text-primary">+${topping.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCustomizeDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => addToCart(true)} className="gradient-primary">
              Agregar al Carrito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Pago */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Procesar Pago</DialogTitle>
            <DialogDescription>
              Total a pagar: ${total.toFixed(2)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Método de Pago */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Método de Pago</Label>
              <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-muted/50 transition-smooth border-2">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1 font-medium">
                    <DollarSign className="w-5 h-5 text-secondary" />
                    Efectivo
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-muted/50 transition-smooth border-2">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1 font-medium">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Tarjeta
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Monto Recibido (solo para efectivo) */}
            {paymentMethod === "cash" && (
              <div>
                <Label htmlFor="amount" className="text-base font-semibold mb-2 block">
                  Monto Recibido
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="text-2xl font-bold border-2 h-14"
                  placeholder="0.00"
                />
                {parseFloat(amountReceived) >= total && (
                  <div className="mt-4 p-4 bg-accent/10 border-2 border-accent rounded-lg">
                    <p className="text-sm text-muted-foreground">Cambio a devolver</p>
                    <p className="text-3xl font-bold text-accent">
                      ${change.toFixed(2)}
                    </p>
                  </div>
                )}
                {parseFloat(amountReceived) > 0 && parseFloat(amountReceived) < total && (
                  <p className="text-sm text-destructive mt-2">
                    Falta: ${(total - parseFloat(amountReceived)).toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPaymentDialog(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button onClick={handleCheckout} className="gradient-primary" disabled={isProcessing}>
              {isProcessing ? "Procesando..." : "Confirmar Pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Recibo */}
      <Dialog open={receiptDialog} onOpenChange={setReceiptDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">¡Venta Exitosa! 🎉</DialogTitle>
          </DialogHeader>

          {lastOrder && (
            <div className="space-y-4 py-4">
              <div className="text-center p-6 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Pagado</p>
                <p className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  ${lastOrder.total.toFixed(2)}
                </p>
                {lastOrder.change > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">Cambio Devuelto</p>
                    <p className="text-2xl font-bold text-accent">
                      ${lastOrder.change.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-sm text-muted-foreground">Detalle del Pedido:</p>
                {lastOrder.items.map((item: CartItem, index: number) => (
                  <div key={index} className="flex justify-between text-sm p-2 bg-muted/30 rounded">
                    <span>{item.quantity}x {item.name}</span>
                    <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>Orden #{lastOrder.id.slice(0, 8)}</p>
                <p>{new Date(lastOrder.created_at).toLocaleString('es')}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setReceiptDialog(false)} className="w-full gradient-primary">
              Nueva Venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
