import type { ReactNode } from "react";
import { useTheme } from "next-themes";
import { Theme } from "@astryxdesign/core/theme";
import { toAstryxMode } from "@/lib/astryxMode";
// Ruta relativa a propósito: `astryx doctor` no resuelve el alias "@/" al buscar este módulo.
import { themes, defaultThemeSlug } from "../astryx-themes";

type Props = {
  children: ReactNode;
};

/** Monta el tema de Astryx con el mismo modo claro/oscuro que next-themes. */
export function AstryxThemeBridge({ children }: Props) {
  const { resolvedTheme } = useTheme();

  return (
    <Theme theme={themes[defaultThemeSlug]} mode={toAstryxMode(resolvedTheme)}>
      {children}
    </Theme>
  );
}
