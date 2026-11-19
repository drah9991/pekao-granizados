import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import type { CartItem } from "@/lib/pos-types";
import { formatCOP } from "@/lib/currency";
import type { Customer } from "@/components/pos/CustomerSelection";

interface ReceiptOrder {
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
    type: "pickup" | "delivery";
    fee: number;
    address: string;
    phone: string;
  };
}

interface ReceiptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lastOrder: ReceiptOrder | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "💵 Efectivo",
  card: "💳 Tarjeta",
  transfer: "📱 Transferencia",
  qr: "🤳 QR",
  split: "🌓 Mixto (Efe + Tra)",
};

const isValidLine = (item: CartItem) => item && typeof item.price === "number" && typeof item.quantity === "number";

function PaymentSummary({ order }: { order: ReceiptOrder }) {
  return (
    <Card variant="muted" padding={4}>
      <VStack gap={2} hAlign="center">
        <Text weight="semibold">Total Pagado</Text>
        <Text type="display-3" weight="bold" color="accent">{formatCOP(order.total)}</Text>
        <Text type="supporting">Método de Pago</Text>
        <Text weight="semibold">{PAYMENT_LABELS[order.paymentMethod ?? ""] ?? ""}</Text>
        {order.paymentMethod === "split" && order.splitDetails && (
          <Grid columns={2} gap={2}>
            <VStack gap={0.5}>
              <Text type="supporting">Efectivo</Text>
              <Text weight="bold">{formatCOP(order.splitDetails.cash)}</Text>
            </VStack>
            <VStack gap={0.5}>
              <Text type="supporting">Transferencia</Text>
              <Text weight="bold">{formatCOP(order.splitDetails.transfer)}</Text>
            </VStack>
          </Grid>
        )}
        {order.change > 0 && (
          <VStack gap={0.5} hAlign="center">
            <Text type="supporting">Cambio Devuelto</Text>
            <Text type="large" weight="bold" color="accent">{formatCOP(order.change)}</Text>
          </VStack>
        )}
      </VStack>
    </Card>
  );
}

function CustomerSummary({ customer }: { customer?: Customer | null }) {
  if (!customer || customer.id === "generic") {
    return <Text type="supporting">Consumidor Final</Text>;
  }
  return (
    <Card variant="muted" padding={3}>
      <VStack gap={0.5}>
        <Text type="supporting" color="accent">Cliente:</Text>
        <Text weight="semibold">{customer.name}</Text>
        {customer.document_id && <Text type="supporting">CC: {customer.document_id}</Text>}
        {customer.phone && <Text type="supporting">Tel: {customer.phone}</Text>}
        {customer.email && <Text type="supporting">Email: {customer.email}</Text>}
      </VStack>
    </Card>
  );
}

export default function ReceiptDialog({ isOpen, onClose, lastOrder }: ReceiptDialogProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={handleOpenChange} width={448} maxHeight="90dvh">
      {/* Layout: el contenido se desplaza y "Nueva Venta" queda siempre visible abajo. */}
      <Layout
        header={<DialogHeader title="¡Venta Exitosa! 🎉" onOpenChange={handleOpenChange} />}
        footer={
          <LayoutFooter hasDivider>
            <Button label="Nueva Venta" variant="primary" size="lg" width="100%" onClick={onClose} />
          </LayoutFooter>
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              {lastOrder && (
                <>
                  <PaymentSummary order={lastOrder} />
      
                  {(lastOrder.discountAmount ?? 0) > 0 && (
                    <HStack justify="between">
                      <VStack gap={0.5}>
                        <Text type="supporting">Subtotal</Text>
                        <Text type="supporting">Descuento</Text>
                      </VStack>
                      <VStack gap={0.5} hAlign="end">
                        <Text>{formatCOP(lastOrder.subtotal ?? 0)}</Text>
                        <Text>-{formatCOP(lastOrder.discountAmount ?? 0)}</Text>
                      </VStack>
                    </HStack>
                  )}
      
                  {lastOrder.deliveryData?.type === "delivery" && (
                    <Card variant="purple" padding={3}>
                      <VStack gap={0.5}>
                        <Text type="label">🚀 Para Entrega a Domicilio</Text>
                        <Text>{lastOrder.deliveryData.address}</Text>
                        {lastOrder.deliveryData.phone && (
                          <Text type="supporting">📞 Contacto: {lastOrder.deliveryData.phone}</Text>
                        )}
                        {lastOrder.deliveryData.fee > 0 && (
                          <Text type="supporting">Servicio: {formatCOP(lastOrder.deliveryData.fee)}</Text>
                        )}
                      </VStack>
                    </Card>
                  )}
      
                  <CustomerSummary customer={lastOrder.customer} />
      
                  <List
                    hasDividers
                    density="compact"
                    header={<Text weight="semibold">Detalle del Pedido:</Text>}
                  >
                    {(Array.isArray(lastOrder.items) ? lastOrder.items : []).filter(isValidLine).map((item) => (
                      // id y no name: el mismo producto puede ir en varias líneas con distinta personalización.
                      <ListItem
                        key={item.id}
                        label={`${item.quantity}x ${item.name}${item.size ? ` (${item.size})` : ""}`}
                        description={item.toppings?.length ? `+ ${item.toppings.map((t) => t.name).join(", ")}` : undefined}
                        endContent={<Text weight="bold">{formatCOP(item.price * item.quantity)}</Text>}
                      />
                    ))}
                  </List>
      
                  <VStack gap={0.5} hAlign="center">
                    <Text type="supporting">Orden #{lastOrder.id.slice(0, 8)}</Text>
                    <Text type="supporting">{new Date(lastOrder.created_at).toLocaleString("es")}</Text>
                  </VStack>
                </>
              )}
            </VStack>
          </LayoutContent>
        }
      />
    </Dialog>
  );
}
