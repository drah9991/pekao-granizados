import { motion } from "framer-motion";
import { MenuItem } from "@/hooks/useDigitalMenu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PekaoMenuItem({ item }: { item: MenuItem }) {
  const isOutOfStock = item.stock_status === 'out_of_stock';
  const isLowStock = item.stock_status === 'low_stock';
  const isSignature = item.is_starred; // Assuming is_starred acts as signature

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] border transition-all duration-500 flex items-center gap-4",
        isOutOfStock 
          ? "bg-zinc-900/50 border-white/5 grayscale opacity-50" 
          : "bg-zinc-900/80 border-white/10 hover:bg-zinc-800/80 hover:border-cyan-500/30",
        isSignature && !isOutOfStock ? "shadow-[0_0_30px_rgba(6,182,212,0.1)] border-cyan-500/20" : ""
      )}
    >
      {/* Chalk texture overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none rounded-[2rem]"></div>

      {item.images && item.images.length > 0 ? (
        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black/40">
           <img 
             src={item.images[0]} 
             alt={item.name}
             className="w-full h-full object-cover"
           />
           {isOutOfStock && (
             <div className="absolute inset-0 bg-zinc-950/80 flex items-center justify-center backdrop-blur-sm">
               <span className="text-red-500 font-marker text-sm uppercase rotate-[-15deg] border-2 border-red-500/50 px-2 py-1 rounded-lg">Agotado</span>
             </div>
           )}
        </div>
      ) : (
        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-xl bg-zinc-800/50 flex items-center justify-center shrink-0 border border-white/5">
          <span className="text-4xl">🍹</span>
        </div>
      )}

      <div className="flex-1 min-w-0 z-10 relative">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-xl md:text-3xl font-caveat text-white tracking-wide leading-none group-hover:text-cyan-400 transition-colors">
              {item.name}
            </h3>
            {isSignature && (
              <Badge variant="outline" className="mt-2 bg-cyan-500/10 text-cyan-400 border-cyan-500/20 font-space-grotesk text-[9px] uppercase tracking-widest">
                Signature
              </Badge>
            )}
          </div>
          <div className="text-right shrink-0 ml-4">
            <span className="text-xl md:text-2xl font-black font-space-grotesk text-orange-400">
              ${item.price.toLocaleString()}
            </span>
          </div>
        </div>
        
        {item.description && (
          <p className="text-zinc-400 text-xs md:text-sm font-space-grotesk leading-relaxed mt-3 line-clamp-2">
            {item.description}
          </p>
        )}

        {isLowStock && !isOutOfStock && (
          <p className="text-yellow-500/80 text-[10px] font-bold uppercase tracking-widest mt-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
            Pocas unidades
          </p>
        )}
      </div>
    </motion.div>
  );
}
