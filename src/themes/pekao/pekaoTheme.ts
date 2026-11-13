import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

/**
 * Tema Astryx de Pekao: hereda de neutral y toma los colores, fuentes y radios de la app
 * (tokens de src/index.css). Cada token es [modo claro, modo oscuro].
 *
 * Tras editarlo: `npx astryx theme build src/themes/pekao/pekaoTheme.ts`.
 */
const FONT_FALLBACKS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const PRIMARY: [string, string] = ["oklch(0.58 0.23 260)", "oklch(0.55 0.2 260)"];
const FOREGROUND: [string, string] = ["oklch(0.21 0.04 220)", "oklch(0.98 0.01 240)"];

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
    "--color-background-body": ["oklch(0.98 0.01 240)", "oklch(0.15 0.02 240)"],
    "--color-background-surface": ["oklch(1 0 0)", "oklch(0.18 0.02 240)"],
    "--color-background-card": ["oklch(1 0 0)", "oklch(0.18 0.02 240)"],
    "--color-background-popover": ["oklch(1 0 0)", "oklch(0.16 0.02 240)"],
    "--color-background-muted": ["oklch(0.96 0.01 240)", "oklch(0.2 0.02 240)"],

    "--color-text-primary": FOREGROUND,
    "--color-text-secondary": ["oklch(0.45 0.03 240)", "oklch(0.65 0.02 240)"],
    "--color-icon-primary": FOREGROUND,
    "--color-icon-secondary": ["oklch(0.45 0.03 240)", "oklch(0.65 0.02 240)"],

    "--color-border": ["oklch(0.92 0.01 240)", "oklch(0.24 0.02 240)"],

    "--color-accent": PRIMARY,
    "--color-on-accent": ["oklch(0.99 0 0)", "oklch(1 0 0)"],
    "--color-error": ["oklch(0.62 0.21 29)", "oklch(0.62 0.21 29)"],

    // Pekao usa esquinas suaves (--radius: 1.25rem en la app).
    "--radius-inner": "0.5rem",
    "--radius-element": "0.875rem",
    "--radius-container": "1.25rem",
  },
});
