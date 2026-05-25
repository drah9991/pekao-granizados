import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCOP } from "@/lib/currency";
import { 
  Database, 
  Wifi, 
  WifiOff, 
  Clock, 
  CloudUpload, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  Trash2,
  Calendar
} from "lucide-react";
import type { OfflineOrder } from "@/lib/OfflineService";
import { cn } from "@/lib/utils";

interface SyncDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pendingOrders: OfflineOrder[];
  isOnline: boolean;
  isProcessing: boolean;
  onSync: () => Promise<void>;
  checkPendingOrders: () => Promise<void>;
}

export default function SyncDrawer({
  isOpen,
  onClose,
  pendingOrders,
  isOnline,
  isProcessing,
  onSync,
  checkPendingOrders
}: SyncDrawerProps) {

  React.useEffect(() => {
    if (isOpen) {
      checkPendingOrders();
    }
  }, [isOpen]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md bg-background/95 backdrop-blur-xl border-l border-white/10 flex flex-col p-0 h-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/5 space-y-4">
          <SheetHeader className="text-left">
            <div className="flex items-center gap-2 text-primary">
              <Database className="h-5 w-5 drop-shadow-glow" />
              <SheetTitle className="font-space-grotesk font-black uppercase italic tracking-tight text-lg text-foreground">
                Sincronización <span className="text-primary text-glow">Offline</span>
              </SheetTitle>
            </div>
            <SheetDescription className="text-xs text-muted-foreground font-dm-sans">
              Audita y sincroniza las transacciones almacenadas localmente en IndexedDB.
            </SheetDescription>
          </SheetHeader>

          {/* Connection Status Bar */}
          <div className={cn(
            "flex items-center justify-between p-3 rounded-xl border transition-all duration-300 font-dm-sans text-xs font-bold",
            isOnline 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
              : "bg-amber-500/10 border-amber-500/20 text-amber-500"
          )}>
            <div className="flex items-center gap-2">
              {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4 animate-pulse" />}
              <span className="uppercase tracking-wider">
                {isOnline ? "Conexión Estable (Online)" : "Sin Conexión (Offline)"}
              </span>
            </div>
            <Badge variant="outline" className={cn(
              "text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 border-none shadow-sm",
              isOnline ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-500"
            )}>
              {isOnline ? "Listo" : "En Espera"}
            </Badge>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {pendingOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-glow-pro">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black font-space-grotesk uppercase italic tracking-wider text-foreground">
                  Cola de Sincronización Vacía
                </h3>
                <p className="text-[11px] text-muted-foreground max-w-[280px]">
                  Todas las transacciones se encuentran debidamente registradas y sincronizadas en la nube.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 py-3 bg-muted/40 border-b border-white/5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 italic font-space-grotesk">
                <span>Transacciones pendientes ({pendingOrders.length})</span>
                <span className="text-amber-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Almacenadas en local
                </span>
              </div>

              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-4 pb-8">
                  {pendingOrders.map((order, idx) => {
                    const payload = order.payload;
                    const items = payload.items || [];
                    const paymentMethod = payload.payment?.method || "efectivo";

                    return (
                      <div 
                        key={order.id} 
                        className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl p-4 transition-all duration-300 shadow-sm"
                      >
                        {/* Order Header */}
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black font-space-grotesk text-primary italic uppercase tracking-wider">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className="text-[9px] text-muted-foreground/50 flex items-center gap-1 font-bold mt-0.5">
                              <Calendar className="w-3 h-3 text-muted-foreground/30" />
                              {formatDate(order.timestamp)}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[9px] font-black bg-amber-500/10 text-amber-500 border-amber-500/20 px-2 py-0.5 uppercase tracking-widest italic">
                            Unsynced
                          </Badge>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-1.5 mb-3.5">
                          {items.map((item: any, itemIdx: number) => (
                            <div key={itemIdx} className="flex justify-between items-start text-xs font-dm-sans">
                              <span className="text-muted-foreground/80 font-medium leading-tight text-wrap max-w-[70%]">
                                <span className="text-foreground/90 font-bold mr-1.5">{item.quantity}x</span>
                                {item.name}
                              </span>
                              <span className="text-foreground/70 font-semibold shrink-0">
                                {formatCOP(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Order Footer summary */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                              Método de Pago
                            </span>
                            <span className="text-[10px] font-black uppercase text-foreground/80 font-space-grotesk tracking-wide mt-0.5">
                              {paymentMethod === "split" ? "Dividido" : paymentMethod}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                              Total Venta
                            </span>
                            <span className="text-sm font-black text-foreground font-space-grotesk italic tracking-tighter mt-0.5 text-glow">
                              {formatCOP(payload.total)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Footer */}
        {pendingOrders.length > 0 && (
          <div className="p-6 border-t border-white/5 bg-background/50 backdrop-blur-md space-y-3">
            {!isOnline && (
              <div className="flex items-center gap-2 text-[10px] text-amber-500 font-bold uppercase tracking-wider bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-xl justify-center font-dm-sans">
                <AlertTriangle className="h-4 w-4 shrink-0 animate-bounce" />
                <span>Requiere Internet para Sincronizar</span>
              </div>
            )}
            <Button
              onClick={onSync}
              disabled={isProcessing || !isOnline}
              className={cn(
                "w-full h-14 rounded-2xl font-space-grotesk font-black uppercase italic tracking-wider text-[11px] transition-all duration-300 gap-2.5 shadow-pro",
                isOnline 
                  ? "bg-primary hover:bg-primary/95 text-white hover:scale-[1.01] active:scale-[0.99] shadow-glow" 
                  : "bg-muted border border-white/5 text-muted-foreground/40 cursor-not-allowed"
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>Sincronizando Órdenes...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="h-4.5 w-4.5" />
                  <span>Sincronizar {pendingOrders.length} Órdenes Ahora</span>
                </>
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
