import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth

interface BrandingContextType {
  logoUrl: string | null;
  primaryColor: string;
  isLoadingBranding: boolean;
  refreshBranding: () => void;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoading: isLoadingAuth } = useAuth(); // Use useAuth hook
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string>("#0EA5E9"); // Default primary color
  const [isLoadingBranding, setIsLoadingBranding] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // To manually trigger refresh

  const fetchBrandingSettings = async () => {
    setIsLoadingBranding(true);
    try {
      if (isLoadingAuth) {
        // Wait for auth to load
        return;
      }

      if (!user) {
        // If no user, use default branding and stop loading
        setLogoUrl(null);
        setPrimaryColor("#0EA5E9");
        document.documentElement.style.setProperty('--brand-primary-color', "#0EA5E9");
        setIsLoadingBranding(false);
        return;
      }

      // User is authenticated, proceed to fetch store and branding
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }
      
      if (!profile?.store_id) {
        setLogoUrl(null);
        setPrimaryColor("#0EA5E9");
        document.documentElement.style.setProperty('--brand-primary-color', "#0EA5E9");
        setIsLoadingBranding(false);
        return;
      }

      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('config')
        .eq('id', profile.store_id)
        .maybeSingle();

      if (storeError) {
        throw storeError;
      }

      if (store?.config) {
        const config = store.config as any;
        const brandingConfig = config.branding;
        if (brandingConfig) {
          setLogoUrl(brandingConfig.logo_url || null);
          setPrimaryColor(brandingConfig.primary_color || "#0EA5E9");
          document.documentElement.style.setProperty('--brand-primary-color', brandingConfig.primary_color || "#0EA5E9");
        } else {
          setLogoUrl(null);
          setPrimaryColor("#0EA5E9");
          document.documentElement.style.setProperty('--brand-primary-color', "#0EA5E9");
        }
      } else {
        setLogoUrl(null);
        setPrimaryColor("#0EA5E9");
        document.documentElement.style.setProperty('--brand-primary-color', "#0EA5E9");
      }
    } catch (error: any) {
      console.error('Error loading branding settings:', error);
      toast.error('Error al cargar la configuración de marca: ' + error.message);
      setLogoUrl(null);
      setPrimaryColor("#0EA5E9");
      document.documentElement.style.setProperty('--brand-primary-color', "#0EA5E9");
    } finally {
      setIsLoadingBranding(false);
    }
  };

  useEffect(() => {
    if (!isLoadingAuth) { // Only fetch branding once auth state is known
      fetchBrandingSettings();
    }
  }, [refreshKey, user, isLoadingAuth]); // Re-fetch when refreshKey, user, or auth loading state changes

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