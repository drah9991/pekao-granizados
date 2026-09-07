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
    <div className="space-y-4 pt-4 border-t border-border/60">
      {/* Discount Area - Minimalist */}
      <div className="flex items-center justify-between gap-4 px-1">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground font-dm-sans">Descuento</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/40 rounded-xl border border-border/80 overflow-hidden shadow-inner">
            <Input
              type="number"
              placeholder="0"
              className="h-8 w-20 bg-transparent border-none text-right font-bold focus-visible:ring-0 px-2 text-foreground font-dm-sans text-xs"
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
              className="h-8 w-8 px-0 text-xs font-black border-l border-border/60 text-primary hover:bg-primary/10"
              aria-label="Cambiar tipo de descuento"
            >
              {discountType === "percent" ? "%" : "$"}
            </Button>
          </div>
        </div>
      </div>

      {/* Totals Section - Prominent Hero Card */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-card/90 p-4 sm:p-5 shadow-lg shadow-primary/5">
        <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-primary/20 blur-2xl" />

        {/* Breakdown Row */}
        <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground pb-2.5 border-b border-border/40">
          <span className="uppercase tracking-wider">Subtotal</span>
          <span className="font-bold text-foreground tabular-nums text-sm">{formatCOP(subtotal)}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between items-center text-xs font-semibold text-rose-500 pt-2 pb-1 border-b border-border/40">
            <span className="uppercase tracking-wider">Descuento</span>
            <span className="font-bold tabular-nums text-sm">-{formatCOP(discountAmount)}</span>
          </div>
        )}

        {/* Hero Total Display - Largest and Most Visible */}
        <div className="pt-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black uppercase tracking-widest text-primary font-dm-sans bg-primary/15 px-2.5 py-1 rounded-full border border-primary/25">
              <Receipt className="w-3.5 h-3.5" /> Total a Pagar
            </span>
          </div>
          <div className="text-right mt-1">
            <span className="text-4xl sm:text-5xl font-black text-foreground font-dm-sans tracking-tight tabular-nums drop-shadow-sm block leading-none">
              {formatCOP(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Methods - 2x2 Large Tactile Grid */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-dm-sans block px-1">
          Método de Pago Rápido
        </span>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Efectivo */}
          <button
            type="button"
            onClick={() => onQuickPayment('cash')}
            className="group relative flex items-center gap-3 p-3 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 transition-all duration-150 active:scale-[0.97] text-left shadow-sm min-h-[72px]"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-emerald-500/30 transition-transform">
              <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-xs sm:text-sm uppercase tracking-wide leading-tight">Efectivo</div>
              <div className="text-[10px] text-muted-foreground font-medium truncate mt-0.5">Pago directo</div>
            </div>
          </button>

          {/* Tarjeta */}
          <button
            type="button"
            onClick={() => onQuickPayment('card')}
            className="group relative flex items-center gap-3 p-3 rounded-2xl border-2 border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 active:bg-sky-500/30 text-sky-600 dark:text-sky-400 transition-all duration-150 active:scale-[0.97] text-left shadow-sm min-h-[72px]"
          >
            <div className="w-11 h-11 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-sky-500/30 transition-transform">
              <CreditCard className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-xs sm:text-sm uppercase tracking-wide leading-tight">Tarjeta</div>
              <div className="text-[10px] text-muted-foreground font-medium truncate mt-0.5">Datáfono</div>
            </div>
          </button>

          {/* Transferencia */}
          <button
            type="button"
            onClick={() => onQuickPayment('transfer')}
            className="group relative flex items-center gap-3 p-3 rounded-2xl border-2 border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 active:bg-purple-500/30 text-purple-600 dark:text-purple-400 transition-all duration-150 active:scale-[0.97] text-left shadow-sm min-h-[72px]"
          >
            <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-purple-500/30 transition-transform">
              <Smartphone className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-xs sm:text-sm uppercase tracking-wide leading-tight">Transfer.</div>
              <div className="text-[10px] text-muted-foreground font-medium truncate mt-0.5">Nequi / Davi</div>
            </div>
          </button>

          {/* Dividir Cuenta */}
          <button
            type="button"
            onClick={onSplitPayment}
            className="group relative flex items-center gap-3 p-3 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-600 dark:text-amber-400 transition-all duration-150 active:scale-[0.97] text-left shadow-sm min-h-[72px]"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-amber-500/30 transition-transform">
              <Split className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-xs sm:text-sm uppercase tracking-wide leading-tight">Dividir</div>
              <div className="text-[10px] text-muted-foreground font-medium truncate mt-0.5">Varios pagos</div>
            </div>
          </button>
        </div>
      </div>

      {/* Final Action */}
      <Button
        className="w-full h-14 sm:h-16 text-base sm:text-lg font-black uppercase tracking-wider bg-primary text-primary-foreground hover:opacity-95 transition-all active:scale-[0.98] rounded-2xl gap-3 relative overflow-hidden group font-dm-sans shadow-lg shadow-primary/20"
        onClick={onCheckout}
      >
        <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
        <div className="flex flex-col items-start leading-none">
          <span>Completar Pedido</span>
          <span className="text-[10px] opacity-75 font-medium tracking-normal mt-0.5">Cobro y ticket</span>
        </div>
      </Button>
    </div>
  );
}
