import { OrderWithDetails, OrderItem } from "@/types/sales";
import { formatCOP } from "@/lib/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export const printReceipt = (order: OrderWithDetails, storeName?: string) => {
  const printWindow = window.open('', '_blank', 'width=300,height=600');
  if (!printWindow) {
    toast.error("El bloqueador de ventanas emergentes impidió la impresión");
    return;
  }

  const items = (order.items as unknown as OrderItem[]) || [];
  const dateStr = format(new Date(order.created_at!), "dd/MM/yyyy HH:mm", { locale: es });

  printWindow.document.write(`
    <html>
      <head>
        <title>Recibo - ${order.id}</title>
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
        <div class="text-center bold" style="font-size: 16px;">${(storeName || "Oasis Eón Hub").toUpperCase()}</div>
        <div class="text-center">ORDEN: #${order.id.slice(0, 8).toUpperCase()}</div>
        <div class="text-center">${dateStr}</div>
        <div class="border-bottom"></div>
        <div class="bold">PRODUCTOS:</div>
        ${items.map(item => `
          <div class="item-row">
            <div>${item.qty}x ${item.name} (${item.size || 'Original'})</div>
            <div class="flex-between">
              <span>  @ ${formatCOP(item.price)}</span>
              <span>${formatCOP(item.qty * item.price)}</span>
            </div>
          </div>
        `).join('')}
        <div class="border-bottom"></div>
        <div class="flex-between bold">
          <span>SUBTOTAL:</span>
          <span>${formatCOP(order.total - (order.delivery_fee || 0))}</span>
        </div>
        ${order.delivery_fee ? `
          <div class="flex-between">
            <span>DOMICILIO:</span>
            <span>${formatCOP(order.delivery_fee)}</span>
          </div>
        ` : ''}
        <div class="flex-between bold" style="font-size: 14px;">
          <span>TOTAL:</span>
          <span>${formatCOP(order.total)}</span>
        </div>
        <div class="border-bottom"></div>
        <div>CLIENTE: ${order.customer_details?.name || "VENTA MOSTRADOR"}</div>
        <div>PAGO: ${((order as Record<string, unknown>).payment_method || ((order as Record<string, unknown>).payment as Record<string, unknown>)?.method || "EFECTIVO").toString().toUpperCase()}</div>
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
