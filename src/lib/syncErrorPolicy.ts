/**
 * Qué hacer con una venta de la cola offline cuando process_sale responde con
 * error. Lo usan usePOS y el service worker (src/sw.ts), por eso no importa
 * nada del navegador ni alias "@/".
 *
 * Una venta de la cola ya se cobró: nunca se descarta. Si la base la rechaza
 * queda como "failed" (visible para reintentar o revisar), no se borra.
 */

export type SyncOutcome = "synced" | "failed" | "retry";

export interface SyncErrorInfo {
  code?: string;
  status?: number;
  message?: string;
}

/** Única restricción UNIQUE que indica "la venta ya existe" (process_sale busca por esta clave). */
const IDEMPOTENCY_CONSTRAINT = "orders_idempotency_key_key";

/** Errores de la base que no se arreglan reintentando la misma venta. */
const PERMANENT_ERROR_CODES = new Set(["P0001", "42501"]);
const PERMANENT_ERROR_CLASSES = ["22", "23"];

/** Respuestas HTTP transitorias: red, sesión vencida, permisos sin código, límite o servidor. */
const TRANSIENT_STATUSES = new Set([0, 401, 403, 408, 429]);

export function classifySyncError({ code = "", status = 0, message = "" }: SyncErrorInfo): SyncOutcome {
  // La idempotency_key es UNIQUE: la venta ya está registrada. Otro 23505 significa que NO se registró.
  if (code === "23505") return message.includes(IDEMPOTENCY_CONSTRAINT) ? "synced" : "failed";

  // Sin EXECUTE sobre la función (token anon o vencido): no es un rechazo de la venta.
  if (code === "42501" && message.includes("permission denied for function")) return "retry";

  // Sin respuesta del servidor (red caída o timeout del cliente). postgrest-js pone en
  // `code` el código numérico del DOMException (23 TimeoutError, 20 AbortError), que
  // no es un SQLSTATE: no hay que leerlo como "clase 23 = violación de integridad".
  const isSqlState = /^[0-9A-Z]{5}$/.test(code);
  if (status === 0 && !isSqlState) return "retry";

  if (PERMANENT_ERROR_CODES.has(code) || PERMANENT_ERROR_CLASSES.some((cls) => code.startsWith(cls))) {
    return "failed";
  }

  if (TRANSIENT_STATUSES.has(status) || status >= 500) return "retry";
  if (status === 400 || status === 409) return "failed";

  return "retry";
}
