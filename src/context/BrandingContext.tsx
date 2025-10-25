import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BrandingContextType {
  logoUrl: string | null;
  primaryColor: string;
  isLoadingBranding: boolean;
  refreshBranding: () => void;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string>("#0EA5E9"); // Default primary color
  const [isLoadingBranding, setIsLoadingBranding] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // To manually trigger refresh

  const fetchBrandingSettings = async () => {
    setIsLoadingBranding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // If no user, use default branding and stop loading
        setLogoUrl(null);
        setPrimaryColor("#0EA5E9");
        document.documentElement.style.setProperty('--primary', "#0EA5E9");
        setIsLoadingBranding(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.store_id) {
        // If no store_id, use default branding
        setLogoUrl(null);
        setPrimaryColor("#0EA5E9");
        document.documentElement.style.setProperty('--primary', "#0EA5E9");
        setIsLoadingBranding(false);
        return;
      }

      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('config')
        .eq('id', profile.store_id)
        .single();

      if (storeError) throw storeError;

      if (store?.config) {
        const config = store.config as any;
        const brandingConfig = config.branding;
        if (brandingConfig) {
          setLogoUrl(brandingConfig.logo_url || null);
          setPrimaryColor(brandingConfig.primary_color || "#0EA5E9");
          document.documentElement.style.setProperty('--primary', brandingConfig.primary_color || "#0EA5E9");
        } else {
          setLogoUrl(null);
          setPrimaryColor("#0EA5E9");
          document.documentElement.style.setProperty('--primary', "#0EA5E9");
        }
      } else {
        setLogoUrl(null);
        setPrimaryColor("#0EA5E9");
        document.documentElement.style.setProperty('--primary', "#0EA5E9");
      }
    } catch (error: any) {
      console.error('Error loading branding settings:', error);
      toast.error('Error al cargar la configuración de marca: ' + error.message);
      setLogoUrl(null);
      setPrimaryColor("#0EA5E9");
      document.documentElement.style.setProperty('--primary', "#0EA5E9");
    } finally {
      setIsLoadingBranding(false);
    }
  };

  useEffect(() => {
    fetchBrandingSettings();
  }, [refreshKey]); // Re-fetch when refreshKey changes

  const refreshBranding = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <BrandingContext.Provider value={{ logoUrl, primaryColor, isLoadingBranding, refreshBranding }}>
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