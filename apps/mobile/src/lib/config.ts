const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireUuid(name: string, value: string | undefined): string {
  if (!value || !UUID_PATTERN.test(value)) {
    throw new Error(`${name} debe ser el UUID de una sede. Revisa .env.local (ver .env.example).`);
  }
  return value;
}

/** Sede cuyo menú ve el cliente y a la que llegan sus pedidos. */
export const STORE_ID = requireUuid('EXPO_PUBLIC_STORE_ID', process.env.EXPO_PUBLIC_STORE_ID);
