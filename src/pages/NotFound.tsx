import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Terminal, AlertCircle, Home, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: Access denied to path:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-aurora animate-aurora relative overflow-hidden p-6">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-2xl w-full"
      >
        <div className="glass-pro border-white/10 shadow-pro rounded-[3rem] overflow-hidden">
          {/* Terminal Header */}
          <div className="bg-muted/60 px-8 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/50" />
              <div className="w-3 h-3 rounded-full bg-amber-500/50" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">
              <Terminal size={14} /> System Status: 404
            </div>
          </div>

          <div className="p-10 md:p-16 space-y-10 text-center">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
              <AlertCircle className="w-24 h-24 text-primary relative z-10 mx-auto" />
            </div>

            <div className="space-y-4">
              <h1 className="text-6xl md:text-8xl font-black font-space-grotesk italic tracking-tighter text-foreground uppercase leading-none">
                PATH <span className="text-primary text-glow">LOST</span>
              </h1>
              <p className="text-[12px] font-black uppercase tracking-[0.5em] text-muted-foreground/60 italic max-w-md mx-auto leading-relaxed">
                El vector <span className="text-primary/80">"{location.pathname}"</span> no existe en el núcleo de datos.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                onClick={() => navigate("/")}
                className="h-14 px-10 rounded-2xl bg-primary text-primary-foreground font-black italic uppercase tracking-widest text-[11px] shadow-glow-pro hover:scale-105 transition-all gap-3"
              >
                <Home size={18} /> Re-entry Root
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                className="h-14 px-10 rounded-2xl bg-white/5 border-white/10 text-foreground font-black italic uppercase tracking-widest text-[11px] hover:bg-white/10 transition-all gap-3"
              >
                <RefreshCcw size={18} /> Refresh Link
              </Button>
            </div>
          </div>

          <div className="bg-primary/5 px-8 py-6 border-t border-white/5">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/40 italic text-center">
              Punto Play Pausa POS • Secure Environment v2.0.4 • 404_NULL_POINTER
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
