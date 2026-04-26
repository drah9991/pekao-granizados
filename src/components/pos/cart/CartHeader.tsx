import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CartHeaderProps {
  itemCount: number;
  onClearCart: () => void;
}

export function CartHeader({ itemCount, onClearCart }: CartHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 md:mb-10">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20">
          <Receipt className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3 font-dm-sans uppercase">
          Orden
          <span className="bg-white/5 text-primary text-[10px] font-bold px-2 py-1 rounded-md border border-white/5 tabular-nums">
            {itemCount} items
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
  );
}
