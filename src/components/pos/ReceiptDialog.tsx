import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CartItem } from "@/lib/pos-types";
import { formatCOP } from "@/lib/currency"; // Import the formatter
import type { Customer } from "@/components/pos/CustomerSelection";

interface ReceiptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lastOrder: {
    id: string;
    total: number;
    subtotal?: number;
    tip_amount?: number;
    created_at: string;
    change: number;
    items: CartItem[];
    customer?: Customer | null;
    paymentMethod?: string;
    splitDetails?: { cash: number; transfer: number };
    discountAmount?: number;
    deliveryData?: {
      type: 'pickup' | 'delivery';
      fee: number;
      address: string;
      phone: string;
    };
  } | null;
}

export default function ReceiptDialog({ isOpen, onClose, lastOrder }: ReceiptDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">¡Venta Exitosa! 🎉</DialogTitle>
          <DialogDescription className="sr-only">Comprobante de venta exitosa detallando los productos adquiridos.</DialogDescription>
        </DialogHeader>

        {lastOrder && (
          <div className="space-y-4 py-4">
            <div className="text-center p-6 bg-muted/50 rounded-lg">
              {/* Retirado sección de propina */}
              <p className="text-sm text-foreground font-semibold mb-1">Total Pagado</p>
              <p className="text-4xl font-bold text-primary mb-2">
                {formatCOP(lastOrder.total)}
              </p>
              
              <div className="flex flex-col gap-1 items-center justify-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Método de Pago</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold capitalize">
                    {lastOrder.paymentMethod === 'cash' && '💵 Efectivo'}
                    {lastOrder.paymentMethod === 'card' && '💳 Tarjeta'}
                    {lastOrder.paymentMethod === 'transfer' && '📱 Transferencia'}
                    {lastOrder.paymentMethod === 'qr' && '🤳 QR'}
                    {lastOrder.paymentMethod === 'split' && '🌓 Mixto (Efe + Tra)'}
                  </span>
                </div>
              </div>

              {lastOrder.paymentMethod === 'split' && lastOrder.splitDetails && (
                <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/50 p-2 rounded border border-border/30">
                    <p className="text-muted-foreground mb-0.5">Efectivo</p>
                    <p className="font-bold text-foreground">{formatCOP(lastOrder.splitDetails.cash)}</p>
                  </div>
                  <div className="bg-white/50 p-2 rounded border border-border/30">
                    <p className="text-muted-foreground mb-0.5">Transferencia</p>
                    <p className="font-bold text-blue-600">{formatCOP(lastOrder.splitDetails.transfer)}</p>
                  </div>
                </div>
              )}

              {lastOrder.change > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">Cambio Devuelto</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCOP(lastOrder.change)}
                  </p>
                </div>
              )}
            </div>

            {/* Discount and Subtotal Info */}
            {(lastOrder.discountAmount ?? 0) > 0 && (
              <div className="bg-muted p-3 rounded-lg border border-border text-sm flex justify-between items-center text-muted-foreground">
                <div className="flex flex-col">
                  <span className="font-semibold">Subtotal</span>
                  <span className="font-semibold text-emerald-500">Descuento</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="font-medium">{formatCOP(lastOrder.subtotal ?? 0)}</span>
                  <span className="font-medium text-emerald-500">-{formatCOP(lastOrder.discountAmount!)}</span>
                </div>
              </div>
            )}

            {/* Delivery Info */}
            {lastOrder.deliveryData?.type === 'delivery' && (
              <div className="bg-primary/10 p-3 rounded-lg border border-primary/20 text-sm space-y-1.5 animate-in fade-in slide-in-from-top-2">
                <p className="font-bold text-primary flex items-center gap-1.5 uppercase text-[10px] tracking-tight">
                  🚀 Para Entrega a Domicilio
                </p>
                <p className="text-foreground leading-snug">{lastOrder.deliveryData.address}</p>
                {lastOrder.deliveryData.phone && (
                  <p className="text-xs text-muted-foreground">📞 Contacto: {lastOrder.deliveryData.phone}</p>
                )}
                {lastOrder.deliveryData.fee > 0 && (
                  <p className="text-xs text-primary font-medium">Servicio: {formatCOP(lastOrder.deliveryData.fee)}</p>
                )}
              </div>
            )}

            {/* Customer Info */}
            {lastOrder.customer && lastOrder.customer.id !== 'generic' ? (
              <div className="bg-muted p-3 rounded-lg border border-border text-sm">
                <p className="font-semibold text-primary mb-1">Cliente:</p>
                <p className="font-medium text-base">{lastOrder.customer.name}</p>
                <div className="grid grid-cols-2 gap-1 mt-1 text-xs text-muted-foreground w-full">
                  {lastOrder.customer.document_id && <span>CC: {lastOrder.customer.document_id}</span>}
                  {lastOrder.customer.phone && <span>Tel: {lastOrder.customer.phone}</span>}
                  {lastOrder.customer.email && <span className="col-span-2">Email: {lastOrder.customer.email}</span>}
                </div>
              </div>
            ) : (
              <div className="bg-muted p-2 rounded-lg border border-border text-xs text-center text-muted-foreground">
                Consumidor Final
              </div>
            )}

            <div className="space-y-3">
              <p className="font-semibold text-sm text-foreground border-b pb-1">Detalle del Pedido:</p>
              {lastOrder.items && Array.isArray(lastOrder.items) && lastOrder.items
                .filter((item: CartItem) => item && typeof item.price === 'number' && typeof item.quantity === 'number')
                .map((item: CartItem, index: number) => (
                  <div key={item.name} className="flex justify-between text-sm py-1 border-b border-border/30 last:border-0">
                    <div className="flex flex-col">
                      <span className="font-medium">{item.quantity}x {item.name} {item.size && <span className="text-muted-foreground font-normal">({item.size})</span>}</span>
                      {item.toppings && item.toppings.length > 0 && (
                        <span className="text-xs text-muted-foreground pl-4 mt-0.5 whitespace-pre-wrap">
                          + {(item.toppings || []).map(t => t.name).join(', ')}
                        </span>
                      )}
                    </div>
                    <span className="font-bold shrink-0 ml-4">{formatCOP(item.price * item.quantity)}</span>
                  </div>
                ))
              }
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>Orden #{lastOrder.id.slice(0, 8)}</p>
              <p>{new Date(lastOrder.created_at).toLocaleString('es')}</p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose} className="w-full gradient-primary">
            Nueva Venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}