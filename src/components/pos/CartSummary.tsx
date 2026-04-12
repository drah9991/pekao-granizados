import { CartItem, Product } from "@/lib/pos-types";
import CustomerSelection, { Customer } from "@/components/pos/CustomerSelection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Minus, Plus, Trash2, Percent, Tag, Receipt, 
  User as UserIcon, UserX, Wallet, CreditCard, Smartphone,
  RotateCcw
} from "lucide-react";
import { formatCOP } from "@/lib/currency";
import { useState } from "react";
import { cn } from "@/lib/utils";

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
  onQuickPayment: (method: string) => void;
  onClearCart: () => void;
  restoreLastCart?: () => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
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
  onQuickPayment,
  onClearCart,
  selectedCustomer,
  setSelectedCustomer,
}: CartSummaryProps) {
  
  const isAnonymous = selectedCustomer?.id === 'generic';

  const toggleAnonymous = () => {
    if (isAnonymous) {
      setSelectedCustomer(null);
    } else {
      setSelectedCustomer({
        id: 'generic',
        name: 'Público General',
        document_id: '222222222222',
        phone: null,
        email: null
      });
    }
  };

  return (
    <div className="w-full lg:w-[28rem] bg-slate-900 border-t lg:border-t-0 lg:border-l border-white/10 p-4 md:p-6 flex flex-col h-full shadow-2xl relative z-10">
      {/* Header Cart */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-xl text-primary">
            <Receipt className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Pedido actual
            <Badge className="bg-primary text-white border-none rounded-full h-6 w-6 p-0 flex items-center justify-center font-bold">
              {cart.reduce((acc, item) => acc + item.quantity, 0)}
            </Badge>
          </h2>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClearCart}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors gap-2 font-bold uppercase text-[10px] tracking-widest"
        >
          Limpiar
        </Button>
      </div>

      {/* Customer Area */}
      <div className="mb-6 group">
        <div className="flex gap-2 items-center mb-1">
          <div className="flex-1">
             <CustomerSelection
                selectedCustomer={selectedCustomer}
                onCustomerSelected={setSelectedCustomer}
              />
          </div>
          <Button
            type="button"
            variant={isAnonymous ? "default" : "outline"}
            onClick={toggleAnonymous}
            className={cn(
              "h-12 w-20 px-0 flex flex-col gap-0.5 rounded-xl border-2 transition-all",
              isAnonymous ? "gradient-secondary border-secondary shadow-lg" : "bg-white/5 border-white/5 text-muted-foreground hover:text-white"
            )}
          >
            {isAnonymous ? <UserIcon size={16} /> : <UserX size={16} />}
            <span className="text-[9px] font-black uppercase tracking-tighter">Públ. Gral</span>
          </Button>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-auto -mx-2 px-2 mb-6 scrollbar-hide no-scrollbar space-y-3">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
             <div className="p-8 bg-white/5 rounded-[2rem] border-2 border-dashed border-white/10 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4">
                  <Receipt className="w-10 h-10 text-white" />
                </div>
                <p className="text-lg font-bold text-white mb-1">Carrito vacío</p>
                <p className="text-xs text-muted-foreground max-w-[12rem]">Toca un producto del catálogo para agregarlo aquí</p>
             </div>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="group relative bg-white/5 border border-white/5 rounded-2xl p-4 transition-all hover:bg-white/10 hover:shadow-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-bold text-white text-base truncate mb-1">{item.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {item.size && (
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-none text-[10px] uppercase font-black px-1.5 h-5">
                        {item.size}
                      </Badge>
                    )}
                    {item.toppings?.map(t => (
                       <Badge key={t.id} variant="outline" className="text-[9px] border-white/10 text-muted-foreground h-5">
                         {t.name}
                       </Badge>
                    ))}
                  </div>
                </div>
                <p className="font-black text-lg text-white">
                  {formatCOP(item.price * item.quantity)}
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-1 border-t border-white/5 mt-1">
                <div className="flex items-center bg-black/40 rounded-xl p-1 gap-1 border border-white/5 shadow-inner">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => updateQuantity(item.id, -1)}
                    className="h-10 w-10 sm:h-8 sm:w-8 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                  >
                    <Minus className="w-5 h-5 sm:w-4 sm:h-4" />
                  </Button>
                  <span className="font-black text-lg sm:text-sm w-10 sm:w-8 text-center text-white">{item.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => updateQuantity(item.id, 1)}
                    className="h-10 w-10 sm:h-8 sm:w-8 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                  className="h-9 w-9 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer / Summary Area */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        {/* Discount Row */}
        <div className="flex items-center justify-between gap-4">
           <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Descuento</Label>
            <div className="flex flex-col gap-2">
               <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                  <Input
                    type="number"
                    placeholder="0"
                    step={discountType === "fixed" ? "1000" : "0.1"}
                    value={discount || ""}
                    onChange={(e) => {
                       const val = parseFloat(e.target.value) || 0;
                       // Safety Cap at 50% for percent, or 50% of subtotal for fixed
                       if (discountType === "percent" && val > 50) return;
                       if (discountType === "fixed" && val > subtotal * 0.5) return;
                       setDiscount(val);
                    }}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        if (discountType === "fixed") {
                          setDiscount(Math.round(val / 1000) * 1000);
                        } else {
                          setDiscount(parseFloat(val.toFixed(1)));
                        }
                      }
                    }}
                    className="h-9 w-24 bg-transparent border-none text-right font-black focus-visible:ring-0 px-2"
                  />
                  <div className="flex gap-1 h-9">
                    <Button
                      variant={discountType === "percent" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setDiscountType("percent")}
                      className={cn("h-full w-9 rounded-lg transition-all", discountType === "percent" && "gradient-primary border-none text-white")}
                    >
                      <Percent className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={discountType === "fixed" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setDiscountType("fixed")}
                      className={cn("h-full w-9 rounded-lg transition-all", discountType === "fixed" && "gradient-primary border-none text-white shadow-lg")}
                    >
                      <span className="font-bold text-sm">$</span>
                    </Button>
                  </div>
               </div>
               {/* Quick Discount Presets */}
               <div className="flex gap-2">
                 {[5, 10, 15].map(v => (
                    <Button 
                      key={v}
                      variant="outline" 
                      size="sm"
                      onClick={() => { setDiscountType('percent'); setDiscount(v); }}
                      className="h-7 px-3 text-[10px] font-black border-white/10 hover:bg-white/10 uppercase tracking-tighter"
                    >
                      -{v}%
                    </Button>
                 ))}
                 <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => { setDiscount(0); }}
                    className="h-7 px-3 text-[10px] font-black border-white/10 hover:text-destructive uppercase tracking-tighter"
                 >
                    Limpiar
                 </Button>
               </div>
            </div>
        </div>

        {/* Totals */}
        <div className="space-y-1 py-4 px-2 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
          <div className="flex justify-between items-center px-2">
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Subtotal</span>
            <span className="text-sm font-bold text-slate-300">{formatCOP(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center py-2 px-2 border-t border-white/5 mt-1">
            <span className="text-xl font-black text-white uppercase tracking-tighter">Total</span>
            <span className="text-4xl font-black text-white drop-shadow-glow">
              {formatCOP(total)}
            </span>
          </div>
        </div>

        {/* Quick Payment Buttons */}
        <div className="grid grid-cols-3 gap-2">
           <Button 
             variant="outline" 
             onClick={() => onQuickPayment('cash')}
             className="h-12 bg-white/5 border-white/10 rounded-xl flex flex-col gap-0.5 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all group"
           >
              <Wallet size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-black uppercase">Efectivo</span>
           </Button>
           <Button 
             variant="outline" 
             onClick={() => onQuickPayment('card')}
             className="h-12 bg-white/5 border-white/10 rounded-xl flex flex-col gap-0.5 hover:bg-blue-500/20 hover:border-blue-500/40 transition-all group"
           >
              <CreditCard size={16} className="text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-black uppercase">Tarjeta</span>
           </Button>
           <Button 
             variant="outline" 
             onClick={() => onQuickPayment('transfer')}
             className="h-12 bg-white/5 border-white/10 rounded-xl flex flex-col gap-0.5 hover:bg-purple-500/20 hover:border-purple-500/40 transition-all group"
           >
              <Smartphone size={16} className="text-purple-400 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-black uppercase">Nequi / QR</span>
           </Button>
        </div>

        {/* Main Process Button */}
        <Button
          className="w-full h-20 text-xl font-black gradient-primary hover:shadow-glow-primary transition-all active:scale-[0.98] rounded-[2rem] gap-3 relative overflow-hidden"
          onClick={onCheckout}
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-10 transition-opacity" />
          <Receipt className="w-8 h-8" />
          <span className="uppercase tracking-widest">Procesar Pago</span>
          <kbd className="absolute right-6 bottom-4 px-2 py-0.5 text-[10px] bg-black/40 border border-white/20 rounded-lg text-white/60 font-black">Enter</kbd>
        </Button>
      </div>
    </div>
  );
}
