export type AstryxMode = "light" | "dark" | "system";

/**
 * next-themes es la fuente de verdad del modo claro/oscuro (clase `dark` en <html>).
 * Astryx necesita el mismo modo para sincronizar `data-theme` y `color-scheme`.
 * Antes de que next-themes resuelva el tema, Astryx sigue al sistema.
 */
export function toAstryxMode(resolvedTheme: string | undefined): AstryxMode {
  if (resolvedTheme === "dark" || resolvedTheme === "light") return resolvedTheme;
  return "system";
}
