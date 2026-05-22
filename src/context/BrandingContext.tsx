import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface BrandingContextType {
  logoUrl: string | null;
  primaryColor: string;
  borderColor: string;
  isLoadingBranding: boolean;
  refreshBranding: () => void;
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

const applyAtomicPalette = (primaryHex: string, borderHex?: string) => {
  const { h, s, l } = hexToHsl(primaryHex);
  const root = document.documentElement;

  // Primary Vars (Raw fragments for Atomic Design)
  root.style.setProperty('--brand-primary-h', `${h}`);
  root.style.setProperty('--brand-primary-s', `${s}`); // Raw number
  root.style.setProperty('--brand-primary-l', `${l}`); // Raw number
  
  // Secondary (Analogous - 30 degrees shift)
  root.style.setProperty('--brand-secondary-h', `${(h + 30) % 360}`);
  
  // Accent (Complementary - 180 degrees shift)
  root.style.setProperty('--brand-accent-h', `${(h + 180) % 360}`);
  
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
    // Fallback: Use primary color with low opacity for border
    root.style.setProperty('--brand-border-color', `hsla(${h}, ${s}%, ${l}%, 0.2)`);
  }
};

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const { user, storeId, isLoading: isLoadingAuth } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string>("#700de7");
  const [borderColor, setBorderColor] = useState<string>("");
  const [isLoadingBranding, setIsLoadingBranding] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchBrandingSettings = async () => {
    setIsLoadingBranding(true);
    try {
      if (isLoadingAuth) return;

      let finalHex = "#700de7";
      let finalBorder = "";
      let finalLogo = null;

      if (user && storeId) {
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('config')
          .eq('id', storeId)
          .maybeSingle();

        if (storeError) throw storeError;

        if (store?.config) {
          const config = store.config as any;
          const brandingConfig = config.branding;
          if (brandingConfig) {
            finalHex = brandingConfig.primary_color || "#700de7";
            finalBorder = brandingConfig.border_color || "";
            finalLogo = brandingConfig.logo_url || null;
          }
        }
      }

      setLogoUrl(finalLogo);
      setPrimaryColor(finalHex);
      setBorderColor(finalBorder);
      applyAtomicPalette(finalHex, finalBorder);

    } catch (error: any) {
      console.error('Error loading branding settings:', error);
      toast.error('Error al cargar la configuración de marca');
      applyAtomicPalette("#700de7");
    } finally {
      setIsLoadingBranding(false);
    }
  };

  useEffect(() => {
    if (!isLoadingAuth) {
      fetchBrandingSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, user, isLoadingAuth]);

  // Actualizar dinámicamente el favicon de la aplicación con la URL del logo de la marca
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      link.href = logoUrl || '/favicon.ico';
    } else {
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.href = logoUrl || '/favicon.ico';
      document.head.appendChild(newLink);
    }
  }, [logoUrl]);

  const refreshBranding = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <BrandingContext.Provider value={{ logoUrl, primaryColor, borderColor, isLoadingBranding, refreshBranding }}>
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