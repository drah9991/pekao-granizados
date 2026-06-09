import { formatCOP } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Receipt, Wallet, CreditCard, Smartphone, Split } from "lucide-react";

interface CartTotalsProps {
  subtotal: number;
  discount: number;
  setDiscount: (discount: number) => void;
  discountType: "percent" | "fixed";
  setDiscountType: (type: "percent" | "fixed") => void;
  discountAmount: number;
  total: number;
  onQuickPayment: (method: string) => void;
  onCheckout: () => void;
  onSplitPayment: () => void;
}

export function CartTotals({
  subtotal,
  discount,
  setDiscount,
  discountType,
  setDiscountType,
  discountAmount,
  total,
  onQuickPayment,
  onCheckout,
  onSplitPayment
}: CartTotalsProps) {
  return (
    <div className="space-y-6 pt-6 border-t border-white/5">
      {/* Discount Area - Minimalist */}
      <div className="flex items-center justify-between gap-4 px-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-dm-sans">Descuento</span>
          <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted/30 rounded-lg border border-border overflow-hidden">
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
      <div className="space-y-3 py-8 px-8 bg-muted/20 rounded-2xl border border-border relative overflow-hidden">
        <div className="flex justify-between items-center opacity-40">
          <span className="text-[10px] font-bold uppercase tracking-widest font-dm-sans">Subtotal</span>
          <span className="text-sm font-bold text-foreground font-dm-sans tabular-nums">{formatCOP(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
           <div className="flex justify-between items-center opacity-40">
              <span className="text-[10px] font-bold uppercase tracking-widest font-dm-sans">Descuento</span>
              <span className="text-sm font-bold text-rose-400 font-dm-sans tabular-nums">-{formatCOP(discountAmount)}</span>
           </div>
        )}
        <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-4">
          <span className="text-base font-extrabold text-primary uppercase tracking-tight font-dm-sans">Total</span>
          <span className="text-3xl lg:text-5xl font-black text-foreground font-dm-sans tracking-tighter tabular-nums">
            {formatCOP(total)}
          </span>
        </div>
      </div>

      {/* Payment Methods - Iconic Grid */}
      <div className="grid grid-cols-4 gap-2">
         <Button 
           variant="outline" 
           onClick={() => onQuickPayment('cash')}
           className="h-20 bg-muted/10 border-border rounded-2xl flex flex-col gap-2 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group font-dm-sans px-1"
         >
            <Wallet size={20} className="text-emerald-500 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Efectivo</span>
         </Button>
         <Button 
           variant="outline" 
           onClick={() => onQuickPayment('card')}
           className="h-20 bg-muted/10 border-border rounded-2xl flex flex-col gap-2 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group font-dm-sans px-1"
         >
            <CreditCard size={20} className="text-blue-500 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Tarjeta</span>
         </Button>
         <Button 
           variant="outline" 
           onClick={() => onQuickPayment('transfer')}
           className="h-20 bg-muted/10 border-border rounded-2xl flex flex-col gap-2 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all group font-dm-sans px-1"
         >
            <Smartphone size={20} className="text-purple-500 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Transf.</span>
         </Button>
         <Button 
           variant="outline" 
           onClick={onSplitPayment}
           className="h-20 bg-muted/10 border-border rounded-2xl flex flex-col gap-2 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group font-dm-sans px-1"
         >
            <Split size={20} className="text-amber-500 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Dividir</span>
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
  );
}
