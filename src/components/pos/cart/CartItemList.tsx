import type { CartItem, Product } from "@/lib/pos-types";
import { formatCOP } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, Receipt } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CartItemListProps {
  cart: CartItem[];
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  availableSizes?: any[];
  availableToppings?: Product[];
  updateItemCustomization?: (id: string, sizeId: string, toppingIds: string[]) => void;
}

export function CartItemList({ 
  cart, 
  updateQuantity, 
  removeItem,
  availableSizes = [],
  availableToppings = [],
  updateItemCustomization
}: CartItemListProps) {
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
          {cart.map((item) => {
            const showSizeOptions = item.productType !== 'sachet' && item.productType !== 'sweet';
            
            return (
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
                    
                    {/* Badges/Toppings display row */}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {item.size && !showSizeOptions && (
                        <span className="bg-primary/20 text-primary-foreground text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border border-primary/30 font-dm-sans shadow-sm">
                          {item.size}
                        </span>
                      )}
                      
                      {/* Active toppings as interactive click-to-remove badges */}
                      {item.toppings?.map((topping) => (
                        <button
                          key={topping.id}
                          onClick={() => {
                            const currentSizeObj = availableSizes.find(s => s.name === item.size);
                            const sizeId = currentSizeObj?.id || "";
                            const newToppingIds = item.toppings?.filter(t => t.id !== topping.id).map(t => t.id) || [];
                            updateItemCustomization?.(item.id, sizeId, newToppingIds);
                          }}
                          className="bg-white/10 hover:bg-rose-500/20 hover:text-rose-300 text-white/90 text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border border-white/20 hover:border-rose-500/30 transition-all font-dm-sans flex items-center gap-1 group/topping active:scale-95"
                          title="Click para quitar topping"
                        >
                          <span>{topping.name}</span>
                          <span className="text-white/40 group-hover/topping:text-rose-400 font-extrabold ml-0.5 text-[8px]">×</span>
                        </button>
                      ))}

                      {/* Add toppings popover */}
                      {availableToppings.length > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="bg-primary/20 hover:bg-primary/30 text-primary text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border border-primary/30 hover:border-primary/40 transition-all font-dm-sans flex items-center gap-1 active:scale-95">
                              <Plus className="w-2.5 h-2.5" /> Topping
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 bg-slate-950/95 border-white/10 backdrop-blur-md p-3 text-white rounded-xl shadow-xl z-50">
                            <h4 className="font-bold text-xs uppercase tracking-wider mb-2 text-white/60 font-dm-sans">Agregar Toppings</h4>
                            <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
                              {availableToppings.map((topping) => {
                                const isSelected = item.toppings?.some(t => t.id === topping.id) || false;
                                return (
                                  <button
                                    key={topping.id}
                                    onClick={() => {
                                      const currentSizeObj = availableSizes.find(s => s.name === item.size);
                                      const sizeId = currentSizeObj?.id || "";
                                      let newToppingIds = item.toppings?.map(t => t.id) || [];
                                      if (isSelected) {
                                        newToppingIds = newToppingIds.filter(id => id !== topping.id);
                                      } else {
                                        newToppingIds = [...newToppingIds, topping.id];
                                      }
                                      updateItemCustomization?.(item.id, sizeId, newToppingIds);
                                    }}
                                    className={cn(
                                      "w-full flex items-center justify-between p-2 rounded-lg text-xs font-semibold font-dm-sans transition-all active:scale-[0.98]",
                                      isSelected
                                        ? "bg-primary/20 text-primary border border-primary/30"
                                        : "bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-transparent"
                                    )}
                                  >
                                    <span>{topping.name}</span>
                                    <span className={isSelected ? "text-primary-foreground font-black" : "text-white/40"}>
                                      +{formatCOP(topping.price)}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>

                    {/* Inline Size selection pills */}
                    {showSizeOptions && availableSizes.length > 0 && (
                      <div className="flex flex-col gap-1 mt-3 pt-2.5 border-t border-white/5">
                        <span className="text-[9px] uppercase font-bold tracking-wider text-white/40 font-dm-sans">Tamaño</span>
                        <div className="flex flex-wrap gap-1">
                          {availableSizes.map((size) => {
                            const isSelected = item.size === size.name;
                            return (
                              <button
                                key={size.id}
                                onClick={() => {
                                  updateItemCustomization?.(item.id, size.id, item.toppings?.map(t => t.id) || []);
                                }}
                                className={cn(
                                  "text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all duration-150 active:scale-95 font-dm-sans",
                                  isSelected
                                    ? "bg-primary/30 text-primary border-primary/50 shadow-[0_0_10px_rgba(var(--primary),0.2)]"
                                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
                                )}
                              >
                                {size.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}
