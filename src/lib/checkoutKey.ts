/**
 * Clave de idempotencia de un cobro en el POS.
 *
 * Es estable mientras el carrito no cambie: si el cajero recarga la página con
 * la petición colgada y vuelve a cobrar el mismo carrito, process_sale recibe la
 * misma clave y devuelve la venta ya creada en vez de registrar otra. El nonce
 * se renueva al vaciar el carrito, así dos ventas idénticas seguidas no chocan.
 * El método de pago no entra en la huella: cambiarlo no debe abrir un segundo cobro.
 */

export interface CheckoutKeyItem {
  id: string;
  quantity: number;
  price: number;
}

export interface CheckoutKeyInput {
  items: CheckoutKeyItem[];
  total: number;
  customerId: string | null;
}

/** FNV-1a de 32 bits: solo distingue carritos dentro de un mismo nonce. */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildCheckoutKey(nonce: string, { items, total, customerId }: CheckoutKeyInput): string {
  const fingerprint = JSON.stringify({
    items: items.map(({ id, quantity, price }) => [id, quantity, price]),
    total,
    customerId,
  });
  return `${nonce}-${fnv1a(fingerprint)}`;
}
