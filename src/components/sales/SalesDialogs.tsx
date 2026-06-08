import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { OrderWithDetails, OrderStatus, orderStatusOptions, OrderItem } from "@/types/sales";
import { formatCOP } from "@/lib/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Printer, X, CheckCircle2, AlertTriangle, User, Phone, MapPin, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderDetailsDialogProps {
  order: OrderWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onPrint: (order: OrderWithDetails) => void;
}

export function OrderDetailsDialog({ order, isOpen, onClose, onPrint }: OrderDetailsDialogProps) {
  const statusInfo = order ? (orderStatusOptions.find(s => s.value === order.status) || orderStatusOptions[0]) : orderStatusOptions[0];
  const items = order ? ((order.items as unknown as OrderItem[]) || []) : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-background border-border/40 rounded-[3rem] p-0 overflow-hidden shadow-pro">
        {!order ? (
           <div className="p-10 flex justify-center items-center min-h-[400px]">
             <span className="text-white animate-pulse">Cargando detalles...</span>
           </div>
        ) : (
          <div className="w-full flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>Detalles de la Orden #{order.id ? order.id.slice(0, 8).toUpperCase() : ''}</DialogTitle>
          </DialogHeader>
        <div className="p-10 border-b border-border/30 bg-muted/40 relative">
          <Badge className={cn("absolute top-10 right-10 rounded-full px-6 py-2 text-[10px] font-black uppercase tracking-widest italic shadow-glow-pro border-none", statusInfo.bgClass, statusInfo.textClass)}>
            {statusInfo.label}
          </Badge>
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] italic font-space-grotesk">Orden de Venta</span>
            <h2 className="text-4xl font-black font-space-grotesk italic tracking-tighter text-foreground">#{order.id ? order.id.slice(0, 8).toUpperCase() : 'N/A'}</h2>
            <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-4 mt-2">
              <span className="text-[10px] font-extrabold text-[#00F3FF] uppercase tracking-widest italic">{order.created_at ? format(new Date(order.created_at), "PPP p", { locale: es }) : ''}</span>
            </div>
            </div>
          </div>
        </div>

        <div className="p-10 space-y-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-foreground font-space-grotesk">Cliente e Información</h4>
              </div>
              <div className="space-y-4 bg-muted/30 p-6 rounded-[2rem] border border-border/20 shadow-pro">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-extrabold text-[#00F3FF]/80 uppercase tracking-widest italic">Nombre</span>
                    <span className="text-[12px] font-black font-space-grotesk uppercase italic text-foreground">{order.customer_details?.name || "Venta Mostrador"}</span>
                  </div>
                </div>
                {order.customer_details?.phone && (
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-teal-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-extrabold text-[#00F3FF]/80 uppercase tracking-widest italic">Teléfono</span>
                      <span className="text-[12px] font-black font-space-grotesk uppercase italic text-foreground">{order.customer_details.phone}</span>
                    </div>
                  </div>
                )}
                {order.delivery_address && (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-extrabold text-[#00F3FF]/80 uppercase tracking-widest italic">Dirección de Envío</span>
                      <span className="text-[12px] font-black font-space-grotesk uppercase italic text-foreground">{order.delivery_address}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-foreground font-space-grotesk">Método de Pago</h4>
              </div>
              <div className="bg-muted/30 p-8 rounded-[2rem] border border-border/20 shadow-pro flex items-center justify-center flex-col gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <ReceiptText className="w-7 h-7 text-emerald-400" />
                </div>
                <div className="text-center">
                  <span className="text-[14px] font-black font-space-grotesk uppercase italic text-foreground tracking-tighter">{((order.payment as Record<string, unknown>)?.method as string)?.toUpperCase() || "EFECTIVO"}</span>
                  <p className="text-[9px] font-extrabold text-[#00F3FF]/80 uppercase tracking-widest italic mt-1">Transacción Verificada</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <h4 className="text-[11px] font-black uppercase tracking-widest text-foreground font-space-grotesk">Productos en la Orden</h4>
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.name} className="flex justify-between items-center p-6 bg-muted/40 rounded-[1.5rem] border border-border/20 hover:border-primary/30 transition-all shadow-pro group">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-[14px] font-black font-space-grotesk italic text-primary group-hover:scale-110 transition-transform">
                      {item.qty}x
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-black font-space-grotesk uppercase italic text-foreground tracking-tight">{item.name}</span>
                      <span className="text-[9px] font-extrabold text-[#00F3FF]/80 uppercase tracking-widest italic">{item.size || "Original"} — {formatCOP(item.price)}/u</span>
                    </div>
                  </div>
                  <span className="text-[14px] font-black font-space-grotesk italic text-foreground tracking-tighter">{formatCOP(item.qty * item.price)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-10 border-t border-border/30 bg-muted/40 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-[#00F3FF] uppercase tracking-[0.3em] italic">Total Recaudado</span>
            <span className="text-3xl font-black font-space-grotesk italic text-foreground tracking-tighter">{formatCOP(order.total)}</span>
            {order.subtotal + (order.delivery_fee || 0) > order.total && (
              <span className="text-[10px] font-bold text-emerald-500 uppercase mt-1">Ahorro: {formatCOP(order.subtotal + (order.delivery_fee || 0) - order.total)}</span>
            )}
          </div>
          <Button onClick={() => onPrint(order)} className="h-16 px-10 rounded-[1.5rem] bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-glow-pro text-[10px] font-black uppercase tracking-widest italic font-space-grotesk flex items-center gap-3">
            <Printer className="w-4 h-4" />
            REIMPRIMIR RECIBO
          </Button>
        </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface CancelOrderDialogProps {
  order: OrderWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (order: OrderWithDetails, reason: string) => void;
}

export function CancelOrderDialog({ order, isOpen, onClose, onConfirm }: CancelOrderDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (!reason.trim()) return;
    if (order) onConfirm(order, reason.trim());
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) { setReason(""); onClose(); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md bg-background border-red-500/20 rounded-[2.5rem] p-10 shadow-pro text-center max-h-[90dvh] overflow-y-auto custom-scrollbar">
        {!order ? (
           <div className="py-10 flex justify-center items-center">
             <span className="text-[#00F3FF] animate-pulse">Cargando...</span>
           </div>
        ) : (
          <div className="w-full flex flex-col">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto mb-8 animate-pulse shadow-glow-pro">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <DialogHeader>
          <DialogTitle className="text-2xl font-black font-space-grotesk italic text-foreground tracking-tighter text-center uppercase">Confirmar Cancelación</DialogTitle>
          <DialogDescription className="text-[11px] font-bold text-white uppercase tracking-widest italic text-center mt-4">
            ¿ESTÁS SEGURO DE CANCELAR LA ORDEN <span className="text-red-500 font-black">#{order.id ? order.id.slice(0, 8).toUpperCase() : 'N/A'}</span>? ESTA ACCIÓN NO SE PUEDE DESHACER Y AFECTARÁ LOS REPORTES DE CAJA Y EL INVENTARIO.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6">
          <label className="text-[9px] font-black text-[#00F3FF] uppercase tracking-[0.3em] italic pl-2 block text-left mb-2">Motivo de Cancelación</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describa el motivo de la cancelación..."
            className="h-24 rounded-2xl bg-muted/40 border-border text-[11px] font-bold italic placeholder:text-white/30 text-white resize-none"
          />
        </div>
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button variant="ghost" onClick={() => { setReason(""); onClose(); }} className="h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest italic font-space-grotesk text-white/80 hover:text-white">
            MANTENER ORDEN
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim()}
            className="h-14 px-8 rounded-2xl bg-red-500 hover:bg-red-600 shadow-glow-pro text-[10px] font-black uppercase tracking-widest italic font-space-grotesk disabled:opacity-40"
          >
            SÍ, CANCELAR VENTA
          </Button>
        </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface EditOrderDialogProps {
  order: OrderWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderId: string, updates: Partial<OrderWithDetails>) => void;
}

export function EditOrderDialog({ order, isOpen, onClose, onSave }: EditOrderDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background border-border/40 rounded-[2.5rem] p-10 shadow-pro max-h-[90dvh] overflow-y-auto custom-scrollbar">
        {!order ? (
           <div className="py-10 flex justify-center items-center">
             <span className="text-[#00F3FF] animate-pulse">Cargando...</span>
           </div>
        ) : (
          <div className="w-full flex flex-col">
        <DialogHeader className="mb-8">
          <DialogTitle className="text-2xl font-black font-space-grotesk italic text-foreground tracking-tighter uppercase">Gestionar Orden</DialogTitle>
          <DialogDescription className="text-[10px] font-bold text-white/90 uppercase tracking-widest italic">Actualice el estado o información de entrega</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[9px] font-black text-[#00F3FF] uppercase tracking-[0.3em] italic pl-2">Estado de la Orden</label>
            <Select 
              defaultValue={order.status} 
              onValueChange={(val: OrderStatus) => onSave(order.id, { status: val })}
            >
              <SelectTrigger className="h-16 rounded-[1.5rem] bg-muted/40 border-border text-[11px] font-black uppercase tracking-widest italic font-space-grotesk shadow-pro">
                <SelectValue placeholder="SELECCIONAR ESTADO" />
              </SelectTrigger>
              <SelectContent className="glass-pro border-border rounded-2xl">
                {orderStatusOptions.filter(o => o.value !== 'all').map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-[10px] font-black uppercase tracking-widest italic">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mt-10">
          <Button onClick={onClose} className="w-full h-16 rounded-[1.5rem] bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-glow-pro text-[10px] font-black uppercase tracking-widest italic font-space-grotesk flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4" />
            GUARDAR CAMBIOS
          </Button>
        </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
