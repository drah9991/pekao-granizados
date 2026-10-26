/**
 * Fechas de negocio en hora de Bogotá (UTC-5, sin horario de verano).
 *
 * La base guarda timestamptz en UTC y el ~80 % de las ventas ocurre entre las
 * 19:00 y las 24:00, que en UTC ya es el día siguiente. Los filtros "desde/hasta"
 * por día deben armarse con estos límites, no con `T00:00:00Z` ni con
 * `toISOString().split("T")[0]`.
 */

const BOGOTA_OFFSET = "-05:00";
const DAY_MS = 24 * 60 * 60 * 1000;

const bogotaFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Día (YYYY-MM-DD) en Bogotá de un instante. */
export function bogotaDateKey(date: Date = new Date()): string {
  return bogotaFormatter.format(date);
}

/** Día (YYYY-MM-DD) en Bogotá de hace `days` días. */
export function bogotaDaysAgo(days: number, now: Date = new Date()): string {
  return bogotaDateKey(new Date(now.getTime() - days * DAY_MS));
}

/** Inicio del día en Bogotá, para usar con `.gte(...)`. */
export function bogotaDayStart(ymd: string): string {
  return `${ymd}T00:00:00${BOGOTA_OFFSET}`;
}

/** Inicio del día siguiente en Bogotá, para usar con `.lt(...)` (incluye todo el día). */
export function bogotaNextDayStart(ymd: string): string {
  const next = new Date(Date.parse(`${ymd}T12:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
  return bogotaDayStart(next);
}
