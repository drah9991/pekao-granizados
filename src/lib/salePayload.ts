import type { PaymentMethod } from "@/components/pos/PaymentDialog";

/**
 * Validaciones del payload de una venta antes de enviarla o encolarla.
 *
 * Caso real: el botón "Completar pedido" pasaba el evento del clic como método
 * de pago. El evento arrastra el DOM y el árbol de React (estructura circular):
 * JSON.stringify fallaba, la venta no llegaba al servidor y tampoco podía
 * guardarse en la cola offline, así que se perdía al recargar.
 */

const PAYMENT_METHODS: readonly PaymentMethod[] = ["cash", "card", "transfer", "qr", "split"];

/** Método de pago válido; cualquier otro valor (p. ej. un evento) cae a efectivo. */
export function toPaymentMethod(value: unknown): PaymentMethod {
  return PAYMENT_METHODS.includes(value as PaymentMethod) ? (value as PaymentMethod) : "cash";
}

/** true si el valor se puede enviar a la API y guardar en IndexedDB. */
export function isJsonSerializable(value: unknown): boolean {
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}
