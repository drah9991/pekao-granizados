import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";
import { IceCream } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarHeaderProps {
  className?: string;
}

export function SidebarHeader({ className }: SidebarHeaderProps) {
  const { storeName } = useAuth();
  const { logoUrl, isLoadingBranding } = useBranding();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className={cn("p-6 border-b border-border/50 relative overflow-hidden bg-muted/20 backdrop-blur-md", className)}>
      <div className="flex items-center gap-4 relative z-10">
        {/* Isotype with Glowing Neon Border */}
        <div className="relative w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center border border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105 shadow-[0_0_15px_rgba(236,72,153,0.15)] group shrink-0">
          <div className="absolute inset-0 bg-primary/5 rounded-xl blur-md group-hover:bg-primary/10 transition-colors" />
          {isLoadingBranding ? (
            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
          ) : logoUrl ? (
            <img 
              src={logoUrl} 
              alt="Sucursal Logo" 
              className="max-w-full max-h-full object-contain p-2 relative z-10" 
              loading="eager"
            />
          ) : (
            <IceCream className="w-6 h-6 text-primary relative z-10 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
          )}
        </div>

        {/* Dynamic Branch/Store Info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-extrabold text-foreground tracking-tight font-space-grotesk truncate uppercase italic" title={storeName || "PUNTO PLAY PAUSA"}>
            {storeName || "PUNTO PLAY PAUSA"}
          </h2>
          <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em] italic mt-0.5 font-space-grotesk">
            Quantum Hub OS
          </p>
        </div>

        {/* Pulsing Live Connection Indicator */}
        <div className="flex items-center" title={isOnline ? "Conexión en vivo activa" : "Modo sin conexión"}>
          <div 
            className={cn(
              "w-2.5 h-2.5 rounded-full relative flex items-center justify-center transition-colors duration-500",
              isOnline ? "bg-emerald-500" : "bg-rose-500"
            )}
          >
            <span 
              className={cn(
                "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
                isOnline ? "bg-emerald-400" : "bg-rose-400"
              )} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
