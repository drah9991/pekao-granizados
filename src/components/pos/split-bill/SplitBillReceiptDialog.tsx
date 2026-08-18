import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCOP } from "@/lib/currency";
import type { SplitClient } from "@/hooks/useSplitBill";

interface SplitBillReceiptDialogProps {
  client: SplitClient;
  onClose: () => void;
}

/**
 * Diálogo de comprobante de pago individual mostrado al finalizar una
 * cuenta dividida, extraído de SplitBillDialog.tsx sin cambios de
 * comportamiento.
 */
export function SplitBillReceiptDialog({ client, onClose }: SplitBillReceiptDialogProps) {
  const order = client.orderData;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85dvh] overflow-y-auto custom-scrollbar p-6">
        <DialogHeader>
          <DialogTitle className="text-xl text-center font-bold">Comprobante de Pago</DialogTitle>
          <DialogDescription className="text-center text-xs">
            {client.name} - Cuenta Dividida
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3 text-sm">
          <div className="text-center p-4 bg-muted/40 rounded-xl">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Total Pagado</p>
            <p className="text-3xl font-black text-primary">{formatCOP(client.amount)}</p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">
              Método: {client.paymentMethod === 'cash' && '💵 Efectivo'}
              {client.paymentMethod === 'card' && '💳 Tarjeta'}
              {client.paymentMethod === 'transfer' && '📱 Transferencia'}
              {client.paymentMethod === 'qr' && '🤳 QR'}
              {client.paymentMethod === 'split' && '🌓 Mixto (Efe + Tra)'}
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-xs uppercase text-muted-foreground border-b pb-1">Detalle de Productos:</p>
            {client.items.map((item, index) => (
              <div key={index} className="flex justify-between text-xs py-1">
                <span>{Math.round(item.quantity * 100) / 100}x {item.name}</span>
                <span className="font-bold">{formatCOP(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-dashed border-white/10 text-center text-xs text-muted-foreground space-y-1">
            <p>Orden #{order.id.slice(0, 8)}</p>
            <p>{new Date(order.created_at).toLocaleString('es')}</p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full gradient-primary">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
