import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle2, ChevronRight, Store, MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoreItem {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  subscription_status?: string | null;
}

interface StoreSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stores: StoreItem[];
  currentStoreId?: string | null;
  onSelectStore: (storeId: string) => Promise<void>;
  isProcessing: boolean;
}

export function StoreSelectorDialog({
  isOpen,
  onClose,
  stores,
  currentStoreId,
  onSelectStore,
  isProcessing,
}: StoreSelectorDialogProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const handleConfirm = async (id: string) => {
    setSelectedId(id);
    await onSelectStore(id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-950 border border-white/10 shadow-2xl rounded-3xl p-6 text-slate-200 font-space-grotesk dialog-cyberpunk">
        
        {/* Header */}
        <DialogHeader className="text-center space-y-2 pb-4 border-b border-white/10">
          <div className="mx-auto w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center shadow-glow-pro mb-1">
            <Building2 className="w-7 h-7 text-rose-500 animate-pulse" />
          </div>
          <DialogTitle className="text-xl font-black tracking-tight text-white uppercase italic">
            Seleccionar Punto de Venta
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Tu cuenta tiene acceso a múltiples sucursales. Elige la sede donde deseas operar hoy.
          </DialogDescription>
        </DialogHeader>

        {/* Store List Grid */}
        <div className="space-y-3 my-4 max-h-[60vh] overflow-y-auto pr-1">
          {stores.map((store) => {
            const isCurrent = store.id === currentStoreId;
            const isSelectingThis = selectedId === store.id;

            return (
              <button
                key={store.id}
                type="button"
                disabled={isProcessing}
                onClick={() => handleConfirm(store.id)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between group cursor-pointer relative overflow-hidden",
                  isCurrent
                    ? "bg-rose-500/10 border-rose-500/40 text-white shadow-glow-pro"
                    : "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.08] hover:border-white/20"
                )}
              >
                <div className="flex items-center gap-3.5 z-10">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
                    isCurrent
                      ? "bg-rose-500 text-white border-rose-400"
                      : "bg-slate-900 border-white/10 text-slate-400 group-hover:text-white group-hover:border-white/20"
                  )}>
                    <Store className="w-5 h-5" />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-100 italic">
                        {store.name}
                      </h4>
                      {isCurrent && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          ACTIVO
                        </span>
                      )}
                    </div>

                    {(store.address || store.city) && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                        <MapPin className="w-3 h-3 text-slate-500 inline" />
                        {[store.address, store.city].filter(Boolean).join(" • ")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="z-10 flex items-center gap-1 text-xs font-black uppercase tracking-wider text-rose-400 group-hover:translate-x-1 transition-transform">
                  {isSelectingThis ? (
                    <span className="text-[10px] text-slate-400 animate-pulse">Conectando...</span>
                  ) : (
                    <>
                      <span>Entrar</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-widest font-mono">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-rose-500" /> Multi-Tenant Active
          </span>
          <span>{stores.length} Sucursales Disponibles</span>
        </div>

      </DialogContent>
    </Dialog>
  );
}
