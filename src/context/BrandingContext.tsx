/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export interface AppTheme {
  id: string;
  name: string;
  primaryColor: string;
  borderColor?: string;
  description: string;
  hslBase: { h: number; s: number; l: number };
}

export const APP_THEMES: AppTheme[] = [
  { 
    id: 'pekao-cyber', 
    name: '🟣 Pekao Cyber', 
    primaryColor: '#9d00ff', 
    borderColor: '#ff00aa', 
    description: 'Estética tecnológica nocturna con acentos violeta y magenta neón',
    hslBase: { h: 280, s: 100, l: 50 }
  },
  { 
    id: 'click-snack-pro', 
    name: '🔵 Click & Snack Hub', 
    primaryColor: '#0ea5e9', 
    borderColor: '#00e5ff', 
    description: 'Estética Deep Space, ideal para la zona gamer y centro de copiado',
    hslBase: { h: 200, s: 95, l: 45 }
  },
  { 
    id: 'sunset-mango', 
    name: '🍊 Sunset Mango', 
    primaryColor: '#ff5722', 
    borderColor: '#ffeb3b', 
    description: 'Tonos cálidos y veraniegos ideales para jugos y granizados',
    hslBase: { h: 15, s: 100, l: 55 }
  },
  { 
    id: 'nature-fresh', 
    name: '🟢 Nature Fresh', 
    primaryColor: '#10b981', 
    borderColor: '#84cc16', 
    description: 'Frescura orgánica con tonos verdes esmeralda y salvia',
    hslBase: { h: 142, s: 70, l: 45 }
  },
  { 
    id: 'ice-spark', 
    name: '❄️ Ice Spark', 
    primaryColor: '#06b6d4', 
    borderColor: '#3b82f6', 
    description: 'Estilo frío y refrescante con acentos turquesa ártico',
    hslBase: { h: 188, s: 90, l: 50 }
  }
];

interface BrandingContextType {
  logoUrl: string | null;
  primaryColor: string;
  borderColor: string;
  isLoadingBranding: boolean;
  refreshBranding: () => void;
  brandName: string | null;
  themeId: string;
  changeTheme: (themeId: string) => Promise<boolean>;
  appThemes: AppTheme[];
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

// Color utility helpers for Atomic Branding
const hexToHsl = (hex: string): { h: number, s: number, l: number } => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const applyAtomicPalette = (primaryHex: string, borderHex?: string, selectedThemeId?: string) => {
  const root = document.documentElement;
  
  // Buscar el tema correspondiente
  const theme = APP_THEMES.find(t => t.id === selectedThemeId) || APP_THEMES[0];
  const { h, s, l } = theme.hslBase;

  // Inyectar variables requeridas por el usuario
  root.style.setProperty('--primary-color', primaryHex);
  root.style.setProperty('--primary-hsl', `${h} ${s}% ${l}%`);

  // Inyectar variables HSL existentes en el proyecto para compatibilidad
  root.style.setProperty('--brand-primary-h', `${h}`);
  root.style.setProperty('--brand-primary-s', `${s}`); // Raw number
  root.style.setProperty('--brand-primary-l', `${l}`); // Raw number
  
  // Secondary (Analogous - 30 degrees shift)
  root.style.setProperty('--brand-secondary-h', `${(h + 30) % 360}`);
  
  // Accent (Complementary - 180 degrees shift, or theme custom accent)
  if (selectedThemeId === 'sunset-mango') {
    root.style.setProperty('--brand-accent-h', '45'); // Naranja-Amarillo cálido
  } else if (selectedThemeId === 'click-snack-pro') {
    root.style.setProperty('--brand-accent-h', '180'); // Turquesa
  } else if (selectedThemeId === 'nature-fresh') {
    root.style.setProperty('--brand-accent-h', '84'); // Verde manzana
  } else if (selectedThemeId === 'ice-spark') {
    root.style.setProperty('--brand-accent-h', '210'); // Azul
  } else {
    root.style.setProperty('--brand-accent-h', '320'); // Magenta
  }
  
  // Surface Tone (Mathematically derived)
  root.style.setProperty('--brand-surface-s', `${Math.min(s, 15)}`);
  root.style.setProperty('--brand-surface-l-light', `98`);
  root.style.setProperty('--brand-surface-l-dark', `6`);
  
  // Apply raw hex for backward compatibility
  root.style.setProperty('--brand-primary-color', primaryHex);

  // Border logic
  if (borderHex) {
    root.style.setProperty('--brand-border-color', borderHex);
  } else {
    root.style.setProperty('--brand-border-color', `hsla(${h}, ${s}%, ${l}%, 0.2)`);
  }

  // Personalización extra para fondos dinámicos (Aurora Mesh Colors)
  if (selectedThemeId === 'sunset-mango') {
    root.style.setProperty('--aurora-1', 'hsla(15, 100%, 60%, 0.15)');
    root.style.setProperty('--aurora-2', 'hsla(45, 100%, 50%, 0.15)');
    root.style.setProperty('--aurora-3', 'hsla(340, 100%, 60%, 0.10)');
  } else if (selectedThemeId === 'click-snack-pro') {
    root.style.setProperty('--aurora-1', 'hsla(200, 100%, 40%, 0.15)');
    root.style.setProperty('--aurora-2', 'hsla(180, 100%, 50%, 0.12)');
    root.style.setProperty('--aurora-3', 'hsla(220, 100%, 60%, 0.10)');
  } else if (selectedThemeId === 'nature-fresh') {
    root.style.setProperty('--aurora-1', 'hsla(142, 100%, 40%, 0.15)');
    root.style.setProperty('--aurora-2', 'hsla(84, 100%, 50%, 0.12)');
    root.style.setProperty('--aurora-3', 'hsla(160, 100%, 45%, 0.10)');
  } else if (selectedThemeId === 'ice-spark') {
    root.style.setProperty('--aurora-1', 'hsla(188, 100%, 45%, 0.15)');
    root.style.setProperty('--aurora-2', 'hsla(210, 100%, 50%, 0.12)');
    root.style.setProperty('--aurora-3', 'hsla(230, 100%, 60%, 0.10)');
  } else {
    // Default Pekao Cyber
    root.style.setProperty('--aurora-1', 'hsla(280, 100%, 60%, 0.15)');
    root.style.setProperty('--aurora-2', 'hsla(320, 100%, 50%, 0.12)');
    root.style.setProperty('--aurora-3', 'hsla(240, 100%, 50%, 0.15)');
  }
};

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const { user, storeId, isLoading: isLoadingAuth } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string>("#9d00ff");
  const [borderColor, setBorderColor] = useState<string>("");
  const [brandName, setBrandName] = useState<string | null>(null);
  const [themeId, setThemeIdState] = useState<string>(() => {
    return localStorage.getItem('pekao-theme-id') || 'pekao-cyber';
  });
  const [isLoadingBranding, setIsLoadingBranding] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchBrandingSettings = async () => {
    setIsLoadingBranding(true);
    try {
      if (isLoadingAuth) return;

      let finalHex = "#9d00ff";
      let finalBorder = "";
      let finalLogo = null;
      let finalTheme = "pekao-cyber";

      let targetStoreId = storeId;

      if (!targetStoreId) {
        try {
          const { data: firstStore } = await supabase
            .from('stores')
            .select('id, name')
            .limit(1)
            .maybeSingle();
          if (firstStore) {
            targetStoreId = firstStore.id;
          }
        } catch (err) {
          console.log("Could not fetch default store for anonymous branding:", err);
        }
      }

      let storeData = null;

      if (targetStoreId) {
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('config, name')
          .eq('id', targetStoreId)
          .maybeSingle();

        if (storeError) throw storeError;
        storeData = store;

        if (store?.config) {
          const config = store.config as Record<string, any>;
          const brandingConfig = config.branding as Record<string, any> | undefined;
          if (brandingConfig) {
            finalHex = brandingConfig.primary_color || "#9d00ff";
            finalBorder = brandingConfig.border_color || "";
            finalLogo = brandingConfig.logo_url || null;
            finalTheme = brandingConfig.theme_id || "pekao-cyber";
          }
        }
      }

      setLogoUrl(finalLogo);
      setPrimaryColor(finalHex);
      setBorderColor(finalBorder);
      setBrandName(storeData ? storeData.name : null);
      setThemeIdState(finalTheme);
      localStorage.setItem('pekao-theme-id', finalTheme);
      applyAtomicPalette(finalHex, finalBorder, finalTheme);

    } catch (error: unknown) {
      console.error('Error loading branding settings:', error);
      applyAtomicPalette("#9d00ff", "", themeId);
      setBrandName(null);
    } finally {
      setIsLoadingBranding(false);
    }
  };

  const changeTheme = async (newThemeId: string): Promise<boolean> => {
    const themeInfo = APP_THEMES.find(t => t.id === newThemeId);
    if (!themeInfo) return false;

    // 1. Guardar de inmediato localmente para respuesta instantánea
    setThemeIdState(newThemeId);
    setPrimaryColor(themeInfo.primaryColor);
    setBorderColor(themeInfo.borderColor || "");
    localStorage.setItem('pekao-theme-id', newThemeId);
    applyAtomicPalette(themeInfo.primaryColor, themeInfo.borderColor || "", newThemeId);

    // 2. Intentar guardar en base de datos si tenemos una tienda cargada
    const targetStoreId = storeId;
    if (targetStoreId) {
      try {
        const { data: store } = await supabase
          .from('stores')
          .select('config')
          .eq('id', targetStoreId)
          .maybeSingle();
        
        const currentConfig = (store?.config as Record<string, any>) || {};
        const brandingConfig = (currentConfig.branding as Record<string, any>) || {};
        
        const updatedConfig = {
          ...currentConfig,
          branding: {
            ...brandingConfig,
            theme_id: newThemeId,
            primary_color: themeInfo.primaryColor,
            border_color: themeInfo.borderColor || ""
          }
        };

        const { error } = await supabase
          .from('stores')
          .update({ config: updatedConfig })
          .eq('id', targetStoreId);

        if (error) throw error;
        toast.success(`Tema "${themeInfo.name}" guardado con éxito.`);
        return true;
      } catch (err) {
        console.error("Error saving theme to database:", err);
        toast.error("El tema se aplicó localmente pero no se pudo sincronizar en la nube.");
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    if (!isLoadingAuth) {
      fetchBrandingSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, user, isLoadingAuth]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    const finalFavicon = logoUrl || "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🥤</text></svg>";
    
    if (link) {
      link.href = finalFavicon;
    } else {
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.href = finalFavicon;
      document.head.appendChild(newLink);
    }
  }, [logoUrl]);

  const refreshBranding = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <BrandingContext.Provider value={{ 
      logoUrl, 
      primaryColor, 
      borderColor, 
      isLoadingBranding, 
      refreshBranding, 
      brandName,
      themeId,
      changeTheme,
      appThemes: APP_THEMES
    }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};