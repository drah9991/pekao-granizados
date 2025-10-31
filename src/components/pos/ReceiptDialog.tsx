import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CartItem } from "@/lib/pos-types";
import { formatCurrency } from "@/lib/formatters"; // Import the formatter

interface ReceiptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lastOrder: {
    id: string;
    total: number;
    created_at: string;
    change: number;
    items: CartItem[];
  } | null;
}

export default function ReceiptDialog({ isOpen, onClose, lastOrder }: ReceiptDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">¡Venta Exitosa! 🎉</DialogTitle>
        </DialogHeader>

        {lastOrder && (
          <div className="space-y-4 py-4">
            <div className="text-center p-6 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Pagado</p>
              <p className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {formatCurrency(lastOrder.total)}
              </p>
              {lastOrder.change > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">Cambio Devuelto</p>
                  <p className="text-2xl font-bold text-accent">
                    {formatCurrency(lastOrder.change)}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-sm text-muted-foreground">Detalle del Pedido:</p>
              {lastOrder.items && Array.isArray(lastOrder.items) && lastOrder.items
                .filter((item: CartItem) => item && typeof item.price === 'number' && typeof item.quantity === 'number')
                .map((item: CartItem, index: number) => (
                  <div key={index} className="flex justify-between text-sm p-2 bg-muted/30 rounded">
                    <span>{item.quantity}x {item.name}</span>
                    <span className="font-bold">{formatCurrency(item.price * item.quantity)}</span>
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