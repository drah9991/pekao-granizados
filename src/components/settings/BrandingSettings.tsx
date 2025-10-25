import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Palette, Save, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function BrandingSettings() {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [currentLogo, setCurrentLogo] = useState<string>("");
  const [primaryColor, setPrimaryColor] = useState("#0EA5E9");
  const [isLoading, setIsLoading] = useState(false);
  const [storeId, setStoreId] = useState<string>("");

  useEffect(() => {
    loadBrandingSettings();
  }, []);

  const loadBrandingSettings = async () => {
    try {
      // Get user's store
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('store_id, full_name') // Include full_name for consistency, though not used here
        .eq('id', user.id)
        .single();

      if (!profile?.store_id) return;
      setStoreId(profile.store_id);

      // Get store config
      const { data: store } = await supabase
        .from('stores')
        .select('config')
        .eq('id', profile.store_id)
        .single();

      if (store?.config) {
        const config = store.config as any;
        if (config.branding?.logo_url) {
          setCurrentLogo(config.branding.logo_url);
          setLogoPreview(config.branding.logo_url);
        }
        if (config.branding?.primary_color) {
          setPrimaryColor(config.branding.primary_color);
        }
      }
    } catch (error) {
      console.error('Error loading branding:', error);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      let logoUrl = currentLogo;

      // Upload logo if changed
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${storeId}-logo-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('branding')
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('branding')
          .getPublicUrl(fileName);
        
        logoUrl = publicUrl;
      }

      // Update store config
      const { data: store } = await supabase
        .from('stores')
        .select('config')
        .eq('id', storeId)
        .single();

      const currentConfig = (store?.config as any) || {};
      
      const { error: updateError } = await supabase
        .from('stores')
        .update({
          config: {
            ...currentConfig,
            branding: {
              ...currentConfig.branding,
              logo_url: logoUrl,
              primary_color: primaryColor,
            }
          }
        })
        .eq('id', storeId);

      if (updateError) throw updateError;

      setCurrentLogo(logoUrl);
      toast.success('Configuración de marca actualizada');
      
      // Apply color to CSS variables
      document.documentElement.style.setProperty('--primary', primaryColor);
      
    } catch (error: any) {
      console.error('Error saving branding:', error);
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Apariencia de tu Marca</h2>
        <p className="text-muted-foreground">
          Personaliza el logo y los colores de tu sistema
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              Logo del Negocio
            </CardTitle>
            <CardDescription>
              Sube el logo de Pekao Granizados (PNG, JPG o SVG)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              {logoPreview && (
                <div className="w-48 h-48 rounded-xl border-2 border-dashed border-muted-foreground/30 overflow-hidden bg-muted/20 flex items-center justify-center p-4">
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              
              <Label 
                htmlFor="logo-upload" 
                className="cursor-pointer w-full"
              >
                <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl hover:border-primary hover:bg-primary/5 transition-smooth">
                  <Upload className="w-5 h-5" />
                  <span className="font-medium">
                    {logoFile ? 'Cambiar Logo' : 'Subir Logo'}
                  </span>
                </div>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-secondary" />
              Color Primario
            </CardTitle>
            <CardDescription>
              Selecciona el color principal de tu marca
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label htmlFor="primary-color">Color Primario</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="primary-color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-20 h-20 cursor-pointer rounded-xl border-2"
                />
                <div className="flex-1 space-y-2">
                  <Input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#0EA5E9"
                    className="font-mono"
                  />
                  <p className="text-sm text-muted-foreground">
                    Este color se aplicará a botones, enlaces y acentos
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border-2 space-y-3">
              <p className="text-sm font-semibold">Vista Previa:</p>
              <div className="flex gap-3 flex-wrap">
                <Button 
                  style={{ backgroundColor: primaryColor }}
                  className="text-white"
                >
                  Botón Primario
                </Button>
                <Button variant="outline" style={{ borderColor: primaryColor, color: primaryColor }}>
                  Botón Outline
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={isLoading}
          className="gradient-primary text-white px-8"
        >
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  );
}