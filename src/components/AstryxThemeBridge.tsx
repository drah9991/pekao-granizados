import type { ReactNode } from "react";
import { useTheme } from "next-themes";
import { InternationalizationProvider } from "@astryxdesign/core/i18n";
import esES from "@astryxdesign/core/locales/es-ES.generated.js";
import { Theme } from "@astryxdesign/core/theme";
import { toAstryxMode } from "@/lib/astryxMode";
// Ruta relativa a propósito: `astryx doctor` no resuelve el alias "@/" al buscar este módulo.
import { themes, defaultThemeSlug } from "../astryx-themes";

// es-CO: textos de Astryx en español (catálogo es-ES) con formatos de número y fecha de Colombia.
const LOCALE = "es-CO";
const MESSAGES = { [LOCALE]: esES };

type Props = {
  children: ReactNode;
};

/** Monta el tema de Astryx con el modo claro/oscuro de next-themes y los textos en español. */
export function AstryxThemeBridge({ children }: Props) {
  const { resolvedTheme } = useTheme();

  return (
    <InternationalizationProvider locale={LOCALE} messages={MESSAGES}>
      <Theme theme={themes[defaultThemeSlug]} mode={toAstryxMode(resolvedTheme)}>
        {children}
      </Theme>
    </InternationalizationProvider>
  );
}
