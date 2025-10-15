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
  { id: "1", name: "Granizado Fresa", price: 3.5, category: "Clásicos" },
  { id: "2", name: "Granizado Limón", price: 3.5, category: "Clásicos" },
  { id: "3", name: "Granizado Frambuesa", price: 4.0, category: "Premium" },
  { id: "4", name: "Granizado Mango", price: 4.0, category: "Premium" },
  { id: "5", name: "Granizado Mix", price: 4.5, category: "Especiales" },
  { id: "6", name: "Granizado Cola", price: 3.5, category: "Clásicos" },
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
      <div className="h-full flex">
        {/* Products Grid */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Punto de Venta</h1>
            <Input 
              placeholder="Buscar productos..." 
              className="max-w-md"
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Button
                key={product.id}
                variant="pos"
                onClick={() => addToCart(product)}
                className="flex flex-col items-start justify-between"
              >
                <div className="w-full">
                  <Badge variant="secondary" className="mb-2">
                    {product.category}
                  </Badge>
                  <p className="font-bold text-left">{product.name}</p>
                </div>
                <p className="text-primary font-bold text-lg">${product.price.toFixed(2)}</p>
              </Button>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="w-96 bg-card border-l border-border p-6 flex flex-col">
          <h2 className="text-2xl font-bold mb-6">Carrito</h2>

          <div className="flex-1 overflow-auto mb-6 space-y-3">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Carrito vacío
              </p>
            ) : (
              cart.map((item) => (
                <Card key={item.id} className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-primary font-bold">
                          ${item.price.toFixed(2)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="h-8 w-8"
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
                          className="h-8 w-8"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="font-bold w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="h-8 w-8"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="font-bold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="space-y-4">
            <Card className="shadow-card gradient-card">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Total</span>
                  <span className="text-3xl font-bold text-primary">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-14"
                onClick={handleCheckout}
              >
                <DollarSign className="mr-2" />
                Efectivo
              </Button>
              <Button
                className="h-14"
                onClick={handleCheckout}
              >
                <CreditCard className="mr-2" />
                Tarjeta
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
