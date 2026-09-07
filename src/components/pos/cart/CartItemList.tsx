import type { CartItem, Product } from "@/lib/pos-types";
import { formatCOP } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, Receipt } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { calculateItemPrice } from "@/lib/pricing";
import { startTransition } from "react";

interface CartItemListProps {
  cart: CartItem[];
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  availableSizes?: { id: string; name: string; multiplier: number }[];
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
    <div className="px-2 space-y-4">
      {cart.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center opacity-30 select-none py-10 my-10"
        >
          <div className="p-8 md:p-12 border border-dashed border-white/10 rounded-3xl flex flex-col items-center text-center">
            <Receipt className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-semibold text-foreground mb-1 font-dm-sans uppercase tracking-widest">Selecciona productos</p>
            <p className="text-[10px] text-muted-foreground/60 uppercase font-medium tracking-tight">El carrito está esperando tu próxima venta</p>
          </div>
        </motion.div>
      ) : (
        <AnimatePresence initial={false}>
          {cart.map((item, index) => {
            const showSizeOptions = item.productType !== 'sachet' && item.productType !== 'sweet';
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95, overflow: "hidden" }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="group relative bg-card/90 dark:bg-card/70 border border-border/70 dark:border-white/10 rounded-xl p-2 shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-200 backdrop-blur-md flex items-center gap-2"
              >
                {/* 1. Image */}
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-12 h-12 object-cover aspect-square rounded-lg border border-border/80 shadow-sm shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-surface-subtle border border-border flex items-center justify-center text-muted-foreground/40 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 opacity-70"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                  </div>
                )}

                {/* 2. Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="inline-flex items-center justify-center px-1 py-0.5 rounded text-[9px] font-black font-mono bg-primary/10 text-primary border border-primary/20 shrink-0 leading-none">
                      #{index + 1}
                    </span>
                    <p className="font-bold text-foreground text-sm font-dm-sans leading-tight truncate" title={item.name}>
                      {item.name}
                    </p>
                  </div>
                  
                  {/* Badges / Toppings */}
                  <div className="flex flex-wrap gap-1">
                    {item.size && !showSizeOptions && (
                      <span className="bg-primary/20 text-primary-foreground text-[8px] uppercase font-bold px-1.5 py-0.5 rounded border border-primary/30 font-dm-sans leading-none flex items-center">
                        {item.size}
                      </span>
                    )}
                    
                    {item.toppings?.map((topping) => (
                      <button
                        key={topping.id}
                        onClick={() => {
                          const sizeId = availableSizes.find(s => s.name === item.size)?.id || "";
                          const newToppingIds = item.toppings?.filter(t => t.id !== topping.id).map(t => t.id) || [];
                          startTransition(() => updateItemCustomization?.(item.id, sizeId, newToppingIds));
                        }}
                        className="bg-muted hover:bg-rose-500/20 hover:text-rose-600 dark:hover:text-rose-300 text-foreground/90 text-[8px] uppercase font-bold px-1.5 py-0.5 rounded border border-border transition-all flex items-center gap-0.5 leading-none"
                      >
                        {topping.name} <span className="text-muted-foreground ml-0.5 text-[8px]">×</span>
                      </button>
                    ))}

                    {availableToppings.length > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="bg-primary/10 hover:bg-primary/20 text-primary text-[8px] uppercase font-bold px-1.5 py-0.5 rounded border border-primary/20 transition-all flex items-center gap-0.5 leading-none">
                            <Plus className="w-2 h-2" /> Top
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 bg-popover/95 border-border backdrop-blur-md p-2 text-popover-foreground rounded-xl shadow-xl z-50">
                          <h4 className="font-bold text-[10px] uppercase tracking-wider mb-2 text-muted-foreground font-dm-sans px-1">Agregar Toppings</h4>
                          <div className="space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                            {availableToppings.map((topping) => {
                              const isSelected = item.toppings?.some(t => t.id === topping.id) || false;
                              return (
                                <button
                                  key={topping.id}
                                  onClick={() => {
                                    const sizeId = availableSizes.find(s => s.name === item.size)?.id || "";
                                    let newToppingIds = item.toppings?.map(t => t.id) || [];
                                    if (isSelected) {
                                      newToppingIds = newToppingIds.filter(id => id !== topping.id);
                                    } else {
                                      newToppingIds = [...newToppingIds, topping.id];
                                    }
                                    startTransition(() => updateItemCustomization?.(item.id, sizeId, newToppingIds));
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between p-1.5 rounded-lg text-[10px] font-semibold font-dm-sans transition-all active:scale-[0.98]",
                                    isSelected
                                      ? "bg-primary/20 text-primary border border-primary/30"
                                      : "bg-transparent hover:bg-muted text-foreground/80 hover:text-foreground"
                                  )}
                                >
                                  <span>{topping.name}</span>
                                  <span className={isSelected ? "text-primary font-black" : "text-muted-foreground"}>
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

                  {/* Size selection */}
                  {showSizeOptions && availableSizes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {availableSizes.map((size) => {
                        const isSelected = item.size === size.name;
                        const mockProductForSize: Product = {
                          id: item.productId,
                          price: item.productPrice ?? item.price,
                          category: item.productCategory || null,
                          type: (item.productType || 'granizado') as any,
                          variants: item.variants || null,
                        } as Product;
                        
                        const sizePricing = calculateItemPrice(mockProductForSize, size as any, [], []);
                        if (sizePricing.enabled === false) return null;

                        return (
                          <button
                            key={size.id}
                            onClick={() => {
                              startTransition(() => updateItemCustomization?.(item.id, size.id, item.toppings?.map(t => t.id) || []));
                            }}
                            className={cn(
                              "text-[8px] font-bold px-1.5 py-0.5 rounded border transition-all duration-150 leading-none",
                              isSelected
                                ? "bg-primary/20 text-primary border-primary/40 shadow-sm"
                                : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                            )}
                          >
                            {size.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Quantity Controls */}
                <div className="flex items-center bg-muted/50 dark:bg-muted/30 rounded-lg p-0.5 border border-border/50 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => startTransition(() => updateQuantity(item.id, -1))} className="h-6 w-6 rounded-md hover:bg-background">
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="font-black text-[11px] w-5 text-center tabular-nums">{item.quantity}</span>
                  <Button variant="ghost" size="icon" onClick={() => startTransition(() => updateQuantity(item.id, 1))} className="h-6 w-6 rounded-md text-primary hover:bg-primary/10">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>

                {/* 4. Price & Delete */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex flex-col items-end justify-center min-w-[55px]">
                    <p className="font-black text-sm text-foreground font-dm-sans tabular-nums leading-none">
                      {formatCOP(item.price * item.quantity)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-[8px] text-muted-foreground/60 font-bold uppercase mt-0.5">
                        {formatCOP(item.price)}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startTransition(() => removeItem(item.id))}
                    className="h-8 w-8 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg shrink-0 ml-1"
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
