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

  return (    <div className="w-full lg:w-[30rem] glass-pro border-t lg:border-t-0 lg:border-l border-white/5 p-6 md:p-10 flex flex-col h-full relative z-10 animate-pro-in">
      {/* Header Cart */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20">
            <Receipt className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3 font-dm-sans uppercase">
            Orden
            <span className="bg-white/5 text-primary text-[10px] font-bold px-2 py-1 rounded-md border border-white/5">
              {cart.reduce((acc, item) => acc + item.quantity, 0)} items
            </span>
          </h2>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClearCart}
          className="text-muted-foreground/40 hover:text-rose-500 hover:bg-rose-500/5 transition-all text-[10px] font-bold uppercase tracking-wider font-dm-sans"
        >
          Vaciar
        </Button>
      </div>

      {/* Customer Area */}
      <div className="mb-10">
        <div className="flex gap-3 items-center">
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
              "h-14 px-4 flex flex-col gap-1 rounded-xl border transition-all font-dm-sans",
              isAnonymous 
                ? "bg-primary text-white border-primary shadow-glow" 
                : "bg-white/[0.02] border-white/5 text-muted-foreground/60 hover:text-foreground"
            )}
          >
            {isAnonymous ? <UserIcon size={18} /> : <UserX size={18} />}
            <span className="text-[8px] font-bold uppercase tracking-widest">Público</span>
          </Button>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-auto -mx-2 px-2 mb-10 no-scrollbar space-y-3">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 select-none py-10">
              <div className="p-12 border border-dashed border-white/10 rounded-3xl flex flex-col items-center text-center">
                <Receipt className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm font-semibold text-foreground mb-1 font-dm-sans uppercase tracking-widest">Selecciona productos</p>
                <p className="text-[10px] text-muted-foreground/60 uppercase font-medium tracking-tight">El carrito está esperando tu próxima venta</p>
              </div>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="group relative bg-white/[0.02] border border-white/5 rounded-2xl p-4 transition-all duration-300 hover:bg-white/[0.05] hover:border-primary/20 animate-pro-in">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-bold text-foreground text-sm truncate mb-1 font-dm-sans pr-2">{item.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.size && (
                      <span className="bg-primary/10 text-primary text-[8px] uppercase font-bold px-1.5 py-0.5 rounded-md border border-primary/10 font-dm-sans">
                        {item.size}
                      </span>
                    )}
                  </div>
                </div>
                <p className="font-bold text-base text-foreground font-dm-sans">
                  {formatCOP(item.price * item.quantity)}
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-1">
                <div className="flex items-center bg-black/20 rounded-xl p-1 gap-1 border border-white/5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => updateQuantity(item.id, -1)}
                    className="h-8 w-8 hover:bg-white/5 hover:text-white rounded-lg transition-all"
                  >
                    <Minus className="w-3.5 h-3.5 text-primary" />
                  </Button>
                  <span className="font-bold text-sm w-8 text-center text-foreground font-dm-sans">{item.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => updateQuantity(item.id, 1)}
                    className="h-8 w-8 hover:bg-white/5 hover:text-white rounded-lg transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 text-primary" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                  className="h-8 w-8 text-muted-foreground/30 hover:text-rose-500 hover:bg-rose-500/5 transition-all rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer / Summary Area */}
      <div className="space-y-6 pt-6 border-t border-white/5">
        {/* Discount Area - Minimalist */}
        <div className="flex items-center justify-between gap-4 px-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 font-dm-sans">Descuento</span>
            <div className="flex items-center gap-2">
                <div className="flex items-center bg-white/[0.03] rounded-lg border border-white/5 overflow-hidden">
                  <Input
                    type="number"
                    placeholder="0"
                    className="h-8 w-16 bg-transparent border-none text-right font-bold focus-visible:ring-0 px-2 text-foreground font-dm-sans text-xs"
                    value={discount || ""}
                    onChange={(e) => {
                       const val = parseFloat(e.target.value) || 0;
                       setDiscount(val);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDiscountType(discountType === "percent" ? "fixed" : "percent")}
                    className="h-8 w-8 px-0 text-[10px] font-bold border-l border-white/5 text-primary"
                  >
                    {discountType === "percent" ? "%" : "$"}
                  </Button>
                </div>
            </div>
        </div>

        {/* Totals Section */}
        <div className="space-y-3 py-8 px-8 bg-white/[0.02] rounded-2xl border border-white/5 relative overflow-hidden">
          <div className="flex justify-between items-center opacity-40">
            <span className="text-[10px] font-bold uppercase tracking-widest font-dm-sans">Subtotal</span>
            <span className="text-sm font-bold text-foreground font-dm-sans">{formatCOP(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
             <div className="flex justify-between items-center opacity-40">
                <span className="text-[10px] font-bold uppercase tracking-widest font-dm-sans">Descuento</span>
                <span className="text-sm font-bold text-rose-400 font-dm-sans">-{formatCOP(discountAmount)}</span>
             </div>
          )}
          <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-4">
            <span className="text-base font-extrabold text-primary uppercase tracking-tight font-dm-sans">Total</span>
            <span className="text-3xl lg:text-5xl font-black text-foreground font-dm-sans tracking-tighter">
              {formatCOP(total)}
            </span>
          </div>
        </div>

        {/* Payment Methods - Iconic Grid */}
        <div className="grid grid-cols-3 gap-4">
           <Button 
             variant="outline" 
             onClick={() => onQuickPayment('cash')}
             className="h-20 bg-white/[0.02] border-white/5 rounded-2xl flex flex-col gap-2 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group font-dm-sans"
           >
              <Wallet size={20} className="text-emerald-500 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Efectivo</span>
           </Button>
           <Button 
             variant="outline" 
             onClick={() => onQuickPayment('card')}
             className="h-20 bg-white/[0.02] border-white/5 rounded-2xl flex flex-col gap-2 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group font-dm-sans"
           >
              <CreditCard size={20} className="text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Tarjeta</span>
           </Button>
           <Button 
             variant="outline" 
             onClick={() => onQuickPayment('transfer')}
             className="h-20 bg-white/[0.02] border-white/5 rounded-2xl flex flex-col gap-2 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all group font-dm-sans"
           >
              <Smartphone size={20} className="text-purple-500 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Transf.</span>
           </Button>
        </div>

        {/* Final Action */}
        <Button
          className="w-full h-20 lg:h-24 text-xl font-bold bg-primary text-white hover:shadow-glow transition-all active:scale-[0.98] rounded-2xl gap-4 relative overflow-hidden group font-dm-sans shadow-lg"
          onClick={onCheckout}
        >
          <Receipt className="w-6 h-6 lg:w-8 lg:h-8" />
          <div className="flex flex-col items-start leading-none">
            <span className="uppercase tracking-widest text-base">Completar Pedido</span>
            <span className="text-[9px] opacity-60 font-medium tracking-tight">Imprimir recibo y finalizar</span>
          </div>
        </Button>
      </div>
    </div>
  );
}
