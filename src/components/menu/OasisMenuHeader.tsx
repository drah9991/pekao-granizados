import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";

interface OasisMenuHeaderProps {
  storeName?: string;
  theme?: 'classic' | 'loggro';
  onThemeChange?: (theme: 'classic' | 'loggro') => void;
  canChangeTheme?: boolean;
}

export function OasisMenuHeader({ 
  storeName, 
  theme = 'classic', 
  onThemeChange, 
  canChangeTheme 
}: OasisMenuHeaderProps) {
  
  if (theme === 'loggro') {
    return (
      <header className="w-full bg-[#FCF8F5] border-b border-slate-200/50 py-4 px-6 md:px-12 flex items-center justify-between z-40 relative">
        {/* Left Side: Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center bg-rose-500 text-white font-bold p-1 rounded-xl text-md w-9 h-9 shadow-md relative">
            <span className="text-sm">🍽️</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xl font-black tracking-tight text-slate-800 font-sans uppercase">loggro</span>
            <span className="text-[9px] uppercase font-black text-rose-500 tracking-wider font-space-grotesk mt-0.5">restobar</span>
          </div>

          {canChangeTheme && onThemeChange && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onThemeChange('classic')}
              className="ml-6 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 text-[10px] font-bold uppercase tracking-wider rounded-xl h-8 flex items-center gap-1 bg-white"
            >
              <Palette className="w-3.5 h-3.5" />
              Ver Clásico
            </Button>
          )}
        </div>

        {/* Right Side: Links */}
        <div className="flex items-center gap-6">
          <a href="#menu" className="text-xs font-black uppercase tracking-widest text-[#06B6D4] hover:text-[#0891B2] transition-colors font-space-grotesk">
            Menú
          </a>
          <a href="#contacto" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-colors font-space-grotesk">
            Contacto
          </a>
        </div>
      </header>
    );
  }

  // Classic Chalkboard Theme
  return (
    <header className="py-12 border-b border-white/5 relative overflow-hidden mb-12">
      {/* Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
      
      <div className="container max-w-7xl mx-auto relative z-10 flex flex-col items-center justify-center text-center">
        {/* Theme Change Toggle for Admin */}
        {canChangeTheme && onThemeChange && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onThemeChange('loggro')}
            className="mb-6 border-white/10 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest rounded-xl h-8 flex items-center gap-1"
          >
            <Palette className="w-3.5 h-3.5 text-cyan-400" />
            Tema: Moderno (Loggro)
          </Button>
        )}

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
          className="text-6xl md:text-8xl lg:text-9xl font-marker text-white tracking-widest mb-6"
          style={{ textShadow: '2px 4px 10px rgba(0,0,0,0.5)' }}
        >
          {storeName || "PUNTO PLAY PAUSA"}
        </motion.h1>

        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-xl md:text-3xl font-caveat text-orange-400 max-w-2xl mx-auto leading-relaxed"
        >
          Granizados de la Casa, Cócteles & Más. 
          <br/>
          Hechos con amor, servidos con estilo.
        </motion.p>
      </div>
    </header>
  );
}
