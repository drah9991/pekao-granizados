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

  return (    <div className="w-full lg:w-[28rem] glass-pro border-t lg:border-t-0 lg:border-l border-border p-5 md:p-8 flex flex-col h-full shadow-pro relative z-10 animate-pro-in">
      {/* Header Cart */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/20 rounded-2xl text-primary border border-primary/20 shadow-glow-pro group-hover:rotate-6 transition-transform">
            <Receipt className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black tracking-tighter text-foreground flex items-center gap-3 font-space-grotesk italic uppercase">
            CARRITO
            <Badge className="bg-primary text-primary-foreground border-none rounded-lg h-7 px-2 flex items-center justify-center font-black animate-pulse shadow-glow-pro text-xs">
              {cart.reduce((acc, item) => acc + item.quantity, 0)} ITEMS
            </Badge>
          </h2>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClearCart}
          className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all gap-2 font-black uppercase text-[10px] tracking-[0.2em] font-space-grotesk"
        >
          Limpiar
        </Button>
      </div>

      {/* Customer Area */}
      <div className="mb-8">
        <div className="flex gap-2 items-center">
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
              "h-14 w-24 px-0 flex flex-col gap-0.5 rounded-2xl border-2 transition-all font-space-grotesk",
              isAnonymous 
                ? "bg-primary text-primary-foreground border-primary shadow-glow-pro" 
                : "glass-pro border-border/50 text-muted-foreground hover:text-foreground"
            )}
          >
            {isAnonymous ? <UserIcon size={18} /> : <UserX size={18} />}
            <span className="text-[9px] font-black uppercase tracking-widest">Públ. Gral</span>
          </Button>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-auto -mx-2 px-2 mb-8 no-scrollbar space-y-4">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 select-none py-10">
             <div className="p-10 border-2 border-dashed border-border rounded-[3rem] flex flex-col items-center text-center">
                <Receipt className="w-16 h-16 text-primary mb-4 opacity-50" />
                <p className="text-lg font-black text-foreground mb-1 font-space-grotesk uppercase tracking-widest">Carrito Vacío</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Selecciona productos para comenzar</p>
             </div>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="group relative bg-muted/50 border border-border/50 rounded-3xl p-5 transition-all hover:bg-muted hover:border-primary/20 hover:shadow-glow-pro animate-pro-in">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-black text-foreground text-base truncate mb-1 font-space-grotesk uppercase italic tracking-tight pr-2">{item.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.size && (
                      <Badge variant="secondary" className="bg-primary/20 text-primary border border-primary/20 text-[9px] uppercase font-black px-2 h-5 font-space-grotesk">
                        {item.size}
                      </Badge>
                    )}
                    {item.toppings?.map(t => (
                       <Badge key={t.id} variant="outline" className="text-[8px] border-border text-muted-foreground h-5 uppercase font-bold px-1.5">
                         {t.name}
                       </Badge>
                    ))}
                  </div>
                </div>
                <p className="font-black text-xl text-foreground font-space-grotesk italic">
                  {formatCOP(item.price * item.quantity)}
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-border mt-1">
                <div className="flex items-center bg-muted rounded-2xl p-1 gap-1 border border-border shadow-inner">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => updateQuantity(item.id, -1)}
                    className="h-10 w-10 hover:bg-muted hover:text-foreground rounded-xl transition-all"
                  >
                    <Minus className="w-5 h-5 text-primary" />
                  </Button>
                  <span className="font-black text-lg w-10 text-center text-foreground font-space-grotesk">{item.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => updateQuantity(item.id, 1)}
                    className="h-10 w-10 hover:bg-muted hover:text-foreground rounded-xl transition-all"
                  >
                    <Plus className="w-5 h-5 text-primary" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                  className="h-10 w-10 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all rounded-xl"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer / Summary Area */}
      <div className="space-y-6 pt-6 border-t border-border">
        {/* Discount Row */}
        <div className="flex items-center justify-between gap-4">
           <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-space-grotesk">Descuento Especial</Label>
            <div className="flex flex-col gap-2 items-end">
               <div className="flex gap-1 bg-muted/40 p-1 rounded-2xl border border-border shadow-pro">
                  <Input
                    type="number"
                    placeholder="0"
                    step={discountType === "fixed" ? "1000" : "1"}
                    value={discount || ""}
                    onChange={(e) => {
                       const val = parseFloat(e.target.value) || 0;
                       if (discountType === "percent" && val > 99) return;
                       if (discountType === "fixed" && val > subtotal) return;
                       setDiscount(val);
                    }}
                    className="h-10 w-24 bg-transparent border-none text-right font-black focus-visible:ring-0 px-3 text-foreground font-space-grotesk text-lg"
                  />
                  <div className="flex gap-1 h-10">
                    <Button
                      variant={discountType === "percent" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setDiscountType("percent")}
                      className={cn("h-full w-10 rounded-xl transition-all font-black", discountType === "percent" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                    >
                      <Percent className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={discountType === "fixed" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setDiscountType("fixed")}
                      className={cn("h-full w-10 rounded-xl transition-all font-black", discountType === "fixed" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                    >
                      $
                    </Button>
                  </div>
               </div>
               {/* Quick Discount Presets */}
               <div className="flex gap-2">
                 {[5, 10, 20].map(v => (
                    <Button 
                      key={v}
                      variant="outline" 
                      size="sm"
                      onClick={() => { setDiscountType('percent'); setDiscount(v); }}
                      className="h-8 px-4 text-[9px] font-black border-border glass-pro hover:bg-primary/20 uppercase tracking-widest font-space-grotesk rounded-lg"
                    >
                      -{v}%
                    </Button>
                 ))}
                 <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => { setDiscount(0); }}
                    className="h-8 px-4 text-[9px] font-black hover:text-red-400 uppercase tracking-widest font-space-grotesk"
                 >
                    X
                 </Button>
               </div>
            </div>
        </div>

        {/* Totals */}
        <div className="space-y-2 py-6 px-6 glass-pro rounded-[2rem] border border-border shadow-pro relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="flex justify-between items-center opacity-60">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] font-space-grotesk">Subtotal</span>
            <span className="text-base font-black text-foreground font-space-grotesk">{formatCOP(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-border/50">
            <span className="text-sm font-black text-primary uppercase tracking-[0.3em] font-space-grotesk italic">TOTAL</span>
            <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground font-space-grotesk italic drop-shadow-glow">
              {formatCOP(total)}
            </span>
          </div>
        </div>

        {/* Quick Payment Buttons */}
        <div className="grid grid-cols-3 gap-3">
           <Button 
             variant="outline" 
             onClick={() => onQuickPayment('cash')}
             className="h-16 glass-pro border-border rounded-2xl flex flex-col gap-1 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all group font-space-grotesk"
           >
              <Wallet size={20} className="text-emerald-400 group-hover:scale-125 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-widest leading-none">Efectivo</span>
           </Button>
           <Button 
             variant="outline" 
             onClick={() => onQuickPayment('card')}
             className="h-16 glass-pro border-white/5 rounded-2xl flex flex-col gap-1 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all group font-space-grotesk"
           >
              <CreditCard size={20} className="text-blue-400 group-hover:scale-125 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-widest leading-none">Tarjeta</span>
           </Button>
           <Button 
             variant="outline" 
             onClick={() => onQuickPayment('transfer')}
             className="h-16 glass-pro border-border/50 rounded-2xl flex flex-col gap-1 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all group font-space-grotesk"
           >
              <Smartphone size={20} className="text-purple-400 group-hover:scale-125 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-widest leading-none">Transfer</span>
           </Button>
        </div>

        {/* Main Process Button */}
        <Button
          className="w-full h-20 lg:h-24 text-xl lg:text-2xl font-black bg-primary text-primary-foreground hover:shadow-glow-pro transition-all active:scale-[0.98] rounded-[2.5rem] gap-4 relative overflow-hidden border-2 border-primary/20 group font-space-grotesk italic shadow-pro"
          onClick={onCheckout}
        >
          <div className="absolute inset-0 bg-primary-foreground/20 opacity-0 group-hover:opacity-10 transition-opacity" />
          <div className="absolute -inset-x-20 bottom-0 top-0 bg-primary-foreground/10 -skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000" />
          <Receipt className="w-8 h-8 lg:w-10 lg:h-10 drop-shadow-lg" />
          <div className="flex flex-col items-start leading-none">
            <span className="uppercase tracking-widest text-base lg:text-lg">Procesar Venta</span>
            <span className="text-[10px] opacity-60 normal-case font-bold tracking-normal italic">Confirmar e imprimir recibo</span>
          </div>
          <kbd className="absolute right-8 top-1/2 -translate-y-1/2 px-3 py-1 text-[10px] bg-background/40 border border-border rounded-xl text-muted-foreground font-black not-italic shadow-inner hidden sm:block">ENTER</kbd>
        </Button>
      </div>
    </div>
  );
}
