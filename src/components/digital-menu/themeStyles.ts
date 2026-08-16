export interface ThemeStyles {
  bg: string;
  primary: string;
  text: string;
  font: string;
  style: string;
}

export interface CustomThemeInput {
  bgColor: string;
  primaryColor: string;
  textColor: string;
  bgStyle: string;
  font: string;
}

// Función para obtener los estilos aplicados al tema actual
export function getThemeStyles(themeId: string, custom: CustomThemeInput): ThemeStyles {
  if (themeId === "tema-1") {
    return { bg: "#09090b", primary: "#9d00ff", text: "#ffffff", font: "font-space-grotesk", style: "classic" };
  }
  if (themeId === "tema-2") {
    return { bg: "#0b0f19", primary: "#0ea5e9", text: "#f8fafc", font: "font-sans", style: "liso" };
  }
  if (themeId === "tema-3") {
    return { bg: "#fffbeb", primary: "#ff5722", text: "#78350f", font: "font-caveat", style: "liso" };
  }
  if (themeId === "tema-4") {
    return { bg: "#f0fdf4", primary: "#10b981", text: "#064e3b", font: "font-sans", style: "liso" };
  }
  if (themeId === "tema-5") {
    return { bg: "#f0f9ff", primary: "#06b6d4", text: "#0c4a6e", font: "font-space-grotesk", style: "liso" };
  }
  // Personalizado
  return {
    bg: custom.bgColor,
    primary: custom.primaryColor,
    text: custom.textColor,
    font: custom.font === "caveat" ? "font-caveat" : custom.font === "space-grotesk" ? "font-space-grotesk" : "font-sans",
    style: custom.bgStyle
  };
}
