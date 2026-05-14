import { CartItem } from "@/lib/pos-types";
import { formatCOP } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, Receipt } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CartItemListProps {
  cart: CartItem[];
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
}

export function CartItemList({ cart, updateQuantity, removeItem }: CartItemListProps) {
  return (
    <div className="flex-1 overflow-auto -mx-2 px-2 mb-6 md:mb-10 no-scrollbar space-y-3">
      {cart.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="h-full flex flex-col items-center justify-center opacity-30 select-none py-10"
        >
          <div className="p-8 md:p-12 border border-dashed border-white/10 rounded-3xl flex flex-col items-center text-center">
            <Receipt className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-semibold text-foreground mb-1 font-dm-sans uppercase tracking-widest">Selecciona productos</p>
            <p className="text-[10px] text-muted-foreground/60 uppercase font-medium tracking-tight">El carrito está esperando tu próxima venta</p>
          </div>
        </motion.div>
      ) : (
        <AnimatePresence initial={false}>
          {cart.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95, overflow: "hidden" }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="group relative bg-gradient-to-br from-white/[0.06] to-white/[0.01] border border-white/10 rounded-2xl p-4 transition-colors duration-300 hover:from-white/[0.08] hover:to-white/[0.02] hover:border-primary/40 hover:shadow-[0_0_20px_rgba(var(--primary),0.1)] backdrop-blur-md"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="font-bold text-white text-base mb-1.5 font-dm-sans leading-tight break-words drop-shadow-sm">{item.name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {item.size && (
                      <span className="bg-primary/20 text-primary-foreground text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border border-primary/30 font-dm-sans shadow-sm">
                        {item.size}
                      </span>
                    )}
                    {item.toppings?.map((topping, idx) => (
                      <span key={topping.name} className="bg-white/10 text-white/90 text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border border-white/20 font-dm-sans flex items-center gap-1">
                        <Plus className="w-2.5 h-2.5" /> {topping.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right whitespace-nowrap pl-2 flex flex-col items-end justify-start">
                  <p className="font-black text-lg text-white font-dm-sans drop-shadow-sm tabular-nums">
                    {formatCOP(item.price * item.quantity)}
                  </p>
                  {item.quantity > 1 && (
                    <p className="text-[10px] text-white/50 font-bold font-dm-sans mt-0.5 uppercase tracking-wider tabular-nums">
                      {formatCOP(item.price)} c/u
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-1">
                <div className="flex items-center bg-black/40 rounded-xl p-1 gap-1 border border-white/10 shadow-inner">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => updateQuantity(item.id, -1)}
                    className="h-8 w-8 hover:bg-white/10 hover:text-white rounded-lg transition-all text-white/70"
                  >
                    <Minus className="w-4 h-4 text-white" />
                  </Button>
                  <span className="font-black text-sm w-8 text-center text-white font-dm-sans tabular-nums">{item.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => updateQuantity(item.id, 1)}
                    className="h-8 w-8 hover:bg-primary/20 hover:text-primary rounded-lg transition-all text-white/70"
                  >
                    <Plus className="w-4 h-4 text-primary drop-shadow-md" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                  className="h-9 w-9 text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition-all rounded-xl border border-transparent hover:border-rose-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
