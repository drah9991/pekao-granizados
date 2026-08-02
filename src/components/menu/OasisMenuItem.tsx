import { motion } from "framer-motion";
import { MenuItem } from "@/hooks/useDigitalMenu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OasisMenuItemProps {
  item: MenuItem;
  theme?: 'classic' | 'loggro';
}

export function OasisMenuItem({ item, theme = 'classic' }: OasisMenuItemProps) {
  const isOutOfStock = item.stock_status === 'out_of_stock';
  const isLowStock = item.stock_status === 'low_stock';
  const isSignature = item.is_starred;

  if (theme === 'loggro') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative p-4 md:p-5 rounded-3xl border transition-all duration-300 flex items-center gap-4 h-fit md:h-36 bg-white",
          isOutOfStock 
            ? "border-slate-200 bg-slate-50/50 grayscale opacity-60" 
            : "border-cyan-200 hover:border-cyan-400 hover:shadow-[0_4px_20px_rgba(6,182,212,0.08)]",
          isSignature && !isOutOfStock ? "shadow-[0_0_15px_rgba(6,182,212,0.05)] border-cyan-300" : ""
        )}
      >
        {/* Image Container */}
        {item.images && item.images.length > 0 ? (
          <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden shrink-0 border border-slate-100 bg-[#FAF9F6] p-1 flex items-center justify-center shadow-inner">
             <img 
               src={item.images[0]} 
               alt={item.name}
               className="w-full h-full object-contain rounded-xl"
             />
             {isOutOfStock && (
               <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-xs">
                 <span className="text-rose-500 font-black text-[10px] uppercase border-2 border-rose-500/50 px-2 py-0.5 rounded-lg font-space-grotesk tracking-widest">Agotado</span>
               </div>
             )}
          </div>
        ) : (
          <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-inner">
            <span className="text-3xl">🍹</span>
          </div>
        )}

        {/* Content details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-1">
          <div>
            <div className="flex justify-between items-start">
              <h3 className="text-sm md:text-base font-black text-slate-800 font-sans tracking-tight leading-snug">
                {item.name}
              </h3>
              {isSignature && !isOutOfStock && (
                <Badge variant="outline" className="bg-cyan-500/10 text-cyan-600 border-cyan-300 font-space-grotesk text-[8px] uppercase tracking-widest shrink-0 ml-2">
                  Destacado
                </Badge>
              )}
            </div>
            
            {item.description && (
              <p className="text-slate-500 text-[11px] font-medium leading-normal mt-1 line-clamp-2">
                {item.description}
              </p>
            )}
          </div>

          <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs md:text-sm font-black font-space-grotesk text-slate-800">
                $ {item.price.toLocaleString('es-CO')}
              </span>
              <span className={cn(
                "text-[9px] font-extrabold px-2 py-0.5 rounded-full font-space-grotesk tracking-wider",
                isOutOfStock
                  ? "bg-rose-100 text-rose-700"
                  : isLowStock
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              )}>
                {isOutOfStock ? "0 disp." : `${item.available_qty ?? 0} disp.`}
              </span>
            </div>

            <button 
              type="button"
              className="bg-[#48D5EA] hover:bg-[#06B6D4] text-white px-5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all font-space-grotesk h-7 flex items-center justify-center"
            >
              Ver
            </button>
          </div>

          {isLowStock && !isOutOfStock && (
            <p className="text-amber-500 text-[9px] font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
              Pocas unidades ({item.available_qty ?? 0})
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  // Classic Chalkboard Item
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
               <span className="text-red-500 font-marker text-sm uppercase rotate-[-15deg] border-2 border-red-500/50 px-2 py-1 rounded-lg font-space-grotesk">Agotado</span>
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
          <div className="text-right shrink-0 ml-4 flex flex-col items-end">
            <span className="text-xl md:text-2xl font-black font-space-grotesk text-orange-400">
              ${item.price.toLocaleString()}
            </span>
            <span className={cn(
              "text-[9px] font-bold uppercase tracking-widest font-space-grotesk mt-0.5 px-2 py-0.5 rounded-full border",
              isOutOfStock 
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                : isLowStock 
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            )}>
              {isOutOfStock ? "Agotado (0 disp.)" : `${item.available_qty ?? 0} disp.`}
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
            Pocas unidades ({item.available_qty ?? 0} disp.)
          </p>
        )}
      </div>
    </motion.div>
  );
}
