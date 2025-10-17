import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Trash2, CreditCard, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

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

  const addToCart = (product: typeof products[0]) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
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

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    toast.success(`Venta procesada: $${total.toFixed(2)}`);
    setCart([]);
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
                onClick={() => addToCart(product)}
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
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-2 flex-1">
                          <div className="text-2xl">{product?.emoji}</div>
                          <div className="flex-1">
                            <p className="font-semibold text-sm md:text-base">{item.name}</p>
                            <p className="text-sm text-primary font-bold">
                              ${item.price.toFixed(2)}
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
                      <div className="flex items-center justify-between">
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
            <Card className="shadow-elevated border-2 border-primary/20">
              <CardContent className="p-4 md:p-5 gradient-card">
                <div className="flex justify-between items-center">
                  <span className="text-lg md:text-xl font-semibold">Total</span>
                  <span className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-14 md:h-16 text-base md:text-lg font-semibold border-2 hover:border-secondary hover:bg-secondary hover:text-secondary-foreground transition-smooth"
                onClick={handleCheckout}
              >
                <DollarSign className="mr-2 w-5 h-5" />
                Efectivo
              </Button>
              <Button
                className="h-14 md:h-16 text-base md:text-lg font-semibold gradient-primary hover:shadow-glow transition-smooth"
                onClick={handleCheckout}
              >
                <CreditCard className="mr-2 w-5 h-5" />
                Tarjeta
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
