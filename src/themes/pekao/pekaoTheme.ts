import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

/**
 * Tema Astryx de Pekao: hereda de neutral y toma colores, fuentes y radios de la app.
 *
 * Los colores apuntan a las variables de la app en vez de copiar sus valores:
 * - `--background`, `--foreground`, etc. (src/index.css) cambian con la clase `dark`.
 * - `--brand-primary-color` lo pone BrandingContext según la marca de cada sede.
 * Así Astryx y el resto de la app comparten una sola fuente de verdad.
 *
 * Tras editarlo: `npx astryx theme build src/themes/pekao/pekaoTheme.ts`.
 */
const FONT_FALLBACKS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const app = (variable: string) => `oklch(var(${variable}))`;
const BRAND = "var(--brand-primary-color, oklch(0.55 0.2 260))";
const brandMix = (percent: number) => `color-mix(in oklch, ${BRAND} ${percent}%, transparent)`;

/**
 * Colores de categoría (p. ej. los métodos de pago del POS): fondo translúcido y borde del color
 * vivo, como en la app. Los de neutral son tonos apagados que en oscuro se ven terrosos.
 * `text` es [claro, oscuro] para mantener contraste en ambos modos.
 */
const CATEGORY_COLORS: Record<string, { base: string; text: [string, string] }> = {
  green: { base: "#10b981", text: ["#047857", "#34d399"] },
  blue: { base: "#0ea5e9", text: ["#0369a1", "#38bdf8"] },
  purple: { base: "#a855f7", text: ["#7e22ce", "#c084fc"] },
  orange: { base: "#f59e0b", text: ["#b45309", "#fbbf24"] },
};

const categoryTokens = Object.fromEntries(
  Object.entries(CATEGORY_COLORS).flatMap(([name, { base, text }]) => [
    [`--color-background-${name}`, `color-mix(in oklch, ${base} 14%, transparent)`],
    [`--color-border-${name}`, `color-mix(in oklch, ${base} 45%, transparent)`],
    [`--color-text-${name}`, text],
    [`--color-icon-${name}`, text],
  ]),
);

const categoryCardBorders = Object.fromEntries(
  Object.keys(CATEGORY_COLORS).map((name) => [
    `variant:${name}`,
    { borderWidth: "2px", borderStyle: "solid", borderColor: `var(--color-border-${name})` },
  ]),
);

export const pekaoTheme = defineTheme({
  name: "pekao",
  extends: neutralTheme,
  // `typography` reemplaza entera la de neutral (también la usa su adaptación táctil), así que se
  // repite su escala y solo cambia la familia. La fuente la carga la app con @fontsource.
  typography: {
    scale: { base: 14, ratio: 1.2 },
    body: { family: "Plus Jakarta Sans", fallbacks: FONT_FALLBACKS },
    heading: { family: "Plus Jakarta Sans", fallbacks: FONT_FALLBACKS, weights: { 3: "bold", 4: "bold" } },
    code: {
      family: "ui-monospace",
      fallbacks: '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
  },
  tokens: {
    "--color-background-body": app("--background"),
    "--color-background-surface": app("--card"),
    "--color-background-card": app("--card"),
    "--color-background-popover": app("--popover"),
    "--color-background-muted": app("--muted"),

    "--color-text-primary": app("--foreground"),
    "--color-text-secondary": app("--muted-foreground"),
    "--color-icon-primary": app("--foreground"),
    "--color-icon-secondary": app("--muted-foreground"),

    "--color-border": app("--border"),

    "--color-accent": BRAND,
    "--color-accent-muted": brandMix(20),
    "--color-text-accent": BRAND,
    "--color-icon-accent": BRAND,
    "--color-on-accent": "oklch(1 0 0)",
    "--focus-outline-color": BRAND,
    "--color-error": app("--destructive"),

    ...categoryTokens,

    // Pekao usa esquinas suaves (--radius: 1.25rem en la app).
    "--radius-inner": "0.5rem",
    "--radius-element": "1rem",
    "--radius-container": "1.25rem",

    // Controles grandes de 56 px (h-14 en la app) para pantallas táctiles de caja.
    "--size-element-lg": "3.5rem",
  },
  // Rasgos de marca de los primitivos: etiquetas y acciones principales en mayúsculas, cursiva
  // y muy espaciadas.
  components: {
    "field-label": {
      base: {
        textTransform: "uppercase",
        fontStyle: "italic",
        fontWeight: "900",
        letterSpacing: "0.2em",
        fontSize: "0.625rem",
        color: "var(--color-text-secondary)",
      },
    },
    button: {
      "variant:primary": {
        textTransform: "uppercase",
        fontStyle: "italic",
        fontWeight: "900",
        letterSpacing: "0.25em",
        boxShadow: `0 0 30px ${brandMix(35)}`,
      },
      "size:lg": {
        fontSize: "0.6875rem",
      },
    },
    card: categoryCardBorders,
    // Interruptores activos (p. ej. cliente "Público" en el POS) con el color de la marca.
    // Clave de propiedad y no de estado: el componente pone data-is-pressed="true" y la clave de
    // estado `isPressed` genera [data-is-pressed="isPressed"], que nunca coincide (Astryx 0.7.15).
    "toggle-button": {
      "isPressed:true": {
        backgroundColor: BRAND,
        color: "oklch(1 0 0)",
        boxShadow: `0 0 20px ${brandMix(35)}`,
      },
    },
    // Selector de modo (p. ej. Acceso / Registro): píldora rellena con el color de la marca.
    "segmented-control-item": {
      base: {
        textTransform: "uppercase",
        fontStyle: "italic",
        fontWeight: "900",
        letterSpacing: "0.15em",
        fontSize: "0.6875rem",
      },
      selected: {
        backgroundColor: BRAND,
        color: "oklch(1 0 0)",
        boxShadow: `0 0 20px ${brandMix(35)}`,
      },
    },
  },
});
