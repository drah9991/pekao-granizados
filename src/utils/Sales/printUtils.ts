import { OrderWithDetails, OrderItem } from "@/types/sales";
import { formatCOP } from "@/lib/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

/**
 * Sanitizes a value for safe HTML injection via document.write.
 * Prevents DOM-based XSS by escaping all HTML special characters.
 */
function escapeHtml(value: unknown): string {
  const str = String(value ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export const printReceipt = (order: OrderWithDetails, storeName?: string) => {
  const printWindow = window.open('', '_blank', 'width=300,height=600');
  if (!printWindow) {
    toast.error("El bloqueador de ventanas emergentes impidió la impresión");
    return;
  }

  const items = (order.items as unknown as OrderItem[]) || [];
  const dateStr = format(new Date(order.created_at!), "dd/MM/yyyy HH:mm", { locale: es });
  const safeStoreName = escapeHtml((storeName || "Punto Play Pausa").toUpperCase());
  const safeOrderId = escapeHtml(order.id.slice(0, 8).toUpperCase());
  const safeCustomer = escapeHtml(order.customer_details?.name || "VENTA MOSTRADOR");
  const rawPayment = (
    (order as Record<string, unknown>).payment_method ||
    ((order as Record<string, unknown>).payment as Record<string, unknown>)?.method ||
    "EFECTIVO"
  );
  const safePayment = escapeHtml(String(rawPayment).toUpperCase());

  printWindow.document.write(`
    <html>
      <head>
        <title>Recibo - ${safeOrderId}</title>
        <style>
          @page { margin: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            line-height: 1.2;
            width: 80mm;
            margin: 0;
            padding: 10px;
          }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .border-bottom { border-bottom: 1px dashed #000; margin: 10px 0; }
          .flex-between { display: flex; justify-content: space-between; }
          .item-row { margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="text-center bold" style="font-size: 16px;">${safeStoreName}</div>
        <div class="text-center">ORDEN: #${safeOrderId}</div>
        <div class="text-center">${escapeHtml(dateStr)}</div>
        <div class="border-bottom"></div>
        <div class="bold">PRODUCTOS:</div>
        ${items.map(item => `
          <div class="item-row">
            <div>${escapeHtml(item.qty)}x ${escapeHtml(item.name)} (${escapeHtml(item.size || 'Original')})</div>
            <div class="flex-between">
              <span>  @ ${escapeHtml(formatCOP(item.price))}</span>
              <span>${escapeHtml(formatCOP(item.qty * item.price))}</span>
            </div>
          </div>
        `).join('')}
        <div class="border-bottom"></div>
        <div class="flex-between bold">
          <span>SUBTOTAL:</span>
          <span>${escapeHtml(formatCOP(order.total - (order.delivery_fee || 0)))}</span>
        </div>
        ${order.delivery_fee ? `
          <div class="flex-between">
            <span>DOMICILIO:</span>
            <span>${escapeHtml(formatCOP(order.delivery_fee))}</span>
          </div>
        ` : ''}
        <div class="flex-between bold" style="font-size: 14px;">
          <span>TOTAL:</span>
          <span>${escapeHtml(formatCOP(order.total))}</span>
        </div>
        <div class="border-bottom"></div>
        <div>CLIENTE: ${safeCustomer}</div>
        <div>PAGO: ${safePayment}</div>
        <div class="border-bottom"></div>
        <div class="text-center bold">¡GRACIAS POR SU COMPRA!</div>
        <script>
          window.onload = () => {
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
