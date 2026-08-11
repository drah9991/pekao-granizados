import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";

interface OasisMenuHeaderProps {
  storeName?: string;
  theme?: 'classic' | 'loggro';
  onThemeChange?: (theme: 'classic' | 'loggro') => void;
  canChangeTheme?: boolean;
  stores?: { id: string; name: string }[];
  activeStoreId?: string | null;
  onStoreChange?: (storeId: string) => void;
}

export function OasisMenuHeader({ 
  storeName, 
  theme = 'classic', 
  onThemeChange, 
  canChangeTheme,
  stores = [],
  activeStoreId,
  onStoreChange
}: OasisMenuHeaderProps) {
  
  const renderStoreDropdown = () => {
    if (!stores || stores.length <= 1) return null;

    return (
      <div className="relative inline-block text-left z-50">
        <select
          value={activeStoreId || ""}
          onChange={(e) => onStoreChange && onStoreChange(e.target.value)}
          className={`appearance-none bg-black/30 border border-white/10 hover:border-white/20 text-white rounded-xl px-4 py-1.5 pr-8 text-[11px] font-bold uppercase tracking-wider cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-space-grotesk ${
            theme === "loggro" 
              ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 focus:ring-rose-500 focus:border-rose-500" 
              : "bg-zinc-950/80 border-white/10 text-white focus:ring-cyan-500"
          }`}
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id} className={theme === "loggro" ? "text-slate-800 bg-white" : "text-white bg-zinc-950"}>
              {s.name}
            </option>
          ))}
        </select>
        <span className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] ${theme === "loggro" ? "text-slate-600" : "text-white/60"}`}>
          ▼
        </span>
      </div>
    );
  };

  if (theme === 'loggro') {
    return (
      <header className="w-full bg-[#FCF8F5] border-b border-slate-200/50 py-4 px-4 md:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 z-40 relative">
        {/* Left Side: Logo */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center bg-rose-500 text-white font-bold p-1 rounded-xl text-md w-9 h-9 shadow-md relative">
              <span className="text-sm">🍽️</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xl font-black tracking-tight text-slate-800 font-sans uppercase">loggro</span>
              <span className="text-[9px] uppercase font-black text-rose-500 tracking-wider font-space-grotesk mt-0.5">restobar</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canChangeTheme && onThemeChange && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onThemeChange('classic')}
                className="border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 text-[10px] font-bold uppercase tracking-wider rounded-xl h-8 flex items-center gap-1 bg-white px-2.5 sm:px-3 sm:ml-6"
              >
                <Palette className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Ver Clásico</span>
              </Button>
            )}
          </div>
        </div>

        {/* Center/Right switcher & links */}
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 md:gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200/50">
          {renderStoreDropdown()}
          <div className="flex items-center gap-4">
            <a href="#menu" className="text-xs font-black uppercase tracking-widest text-[#06B6D4] hover:text-[#0891B2] transition-colors font-space-grotesk">
              Menú
            </a>
            <a href="#contacto" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-colors font-space-grotesk">
              Contacto
            </a>
          </div>
        </div>
      </header>
    );
  }

  // Classic Chalkboard Theme
  return (
    <header className="py-12 border-b border-white/5 relative overflow-hidden mb-12">
      {/* Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
      
      <div className="container max-w-7xl mx-auto relative z-10 flex flex-col items-center justify-center text-center px-4">
        {/* Top Controls Container */}
        <div className="flex flex-col xs:flex-row items-center gap-3 mb-6">
          {/* Theme Change Toggle for Admin */}
          {canChangeTheme && onThemeChange && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onThemeChange('loggro')}
              className="border-white/10 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest rounded-xl h-8 flex items-center gap-1"
            >
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              Tema: Moderno (Loggro)
            </Button>
          )}

          {renderStoreDropdown()}
        </div>

        {/* Dynamic Banner */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-8 inline-block rotate-[-2deg] bg-cyan-500 text-zinc-950 font-black uppercase tracking-widest text-xs md:text-sm px-6 py-2 rounded-sm shadow-[0_0_20px_rgba(6,182,212,0.4)]"
        >
          Descuentos Especiales del Día
        </motion.div>

        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-marker text-white tracking-widest mb-6 break-words max-w-full"
          style={{ textShadow: '2px 4px 10px rgba(0,0,0,0.5)' }}
        >
          {storeName || "PUNTO PLAY PAUSA"}
        </motion.h1>

        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-lg sm:text-2xl md:text-3xl font-caveat text-orange-400 max-w-2xl mx-auto leading-relaxed"
        >
          Granizados de la Casa, Cócteles & Más. 
          <br/>
          Hechos con amor, servidos con estilo.
        </motion.p>
      </div>
    </header>
  );
}
