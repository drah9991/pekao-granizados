import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Save, MapPin, Phone, Mail, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function BusinessSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [storeId, setStoreId] = useState<string>("");
  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [currency, setCurrency] = useState("COP");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [socialMedia, setSocialMedia] = useState({
    instagram: "",
    facebook: "",
    whatsapp: ""
  });

  useEffect(() => {
    loadBusinessSettings();
  }, []);

  const loadBusinessSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('store_id, full_name') // Include full_name for consistency, though not used here
        .eq('id', user.id)
        .single();

      if (!profile?.store_id) return;
      setStoreId(profile.store_id);

      const { data: store } = await supabase
        .from('stores')
        .select('*')
        .eq('id', profile.store_id)
        .single();

      if (store) {
        setStoreName(store.name || "");
        setAddress(store.address || "");
        setTaxRate(store.tax_rate?.toString() || "0");
        setCurrency(store.currency || "COP");
        
        const config = store.config as any;
        if (config?.business) {
          setPhone(config.business.phone || "");
          setEmail(config.business.email || "");
          setSocialMedia({
            instagram: config.business.social_media?.instagram || "",
            facebook: config.business.social_media?.facebook || "",
            whatsapp: config.business.social_media?.whatsapp || ""
          });
        }
      }
    } catch (error) {
      console.error('Error loading business settings:', error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { data: store } = await supabase
        .from('stores')
        .select('config')
        .eq('id', storeId)
        .single();

      const currentConfig = (store?.config as any) || {};

      const { error } = await supabase
        .from('stores')
        .update({
          name: storeName,
          address: address,
          tax_rate: parseFloat(taxRate),
          currency: currency,
          config: {
            ...currentConfig,
            business: {
              phone,
              email,
              social_media: socialMedia
            }
          }
        })
        .eq('id', storeId);

      if (error) throw error;

      toast.success('Configuración del negocio actualizada');
    } catch (error: any) {
      console.error('Error saving business settings:', error);
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Configuración del Negocio</h2>
        <p className="text-muted-foreground">
          Información general de tu sucursal
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Información General
            </CardTitle>
            <CardDescription>
              Datos principales de tu negocio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store-name">Nombre de la Tienda</Label>
              <Input
                id="store-name"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Pekao Granizados - Sucursal Centro"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Dirección
              </Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Calle 123 #45-67, Barrio Centro"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax-rate" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  IVA (%)
                </Label>
                <Input
                  id="tax-rate"
                  type="number"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="19"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Input
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="COP"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-secondary" />
              Contacto y Redes Sociales
            </CardTitle>
            <CardDescription>
              Información de contacto para recibos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+57 300 123 4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contacto@pekaogranizados.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Redes Sociales</Label>
              <Input
                value={socialMedia.instagram}
                onChange={(e) => setSocialMedia({...socialMedia, instagram: e.target.value})}
                placeholder="@pekaogranizados"
                className="mb-2"
              />
              <Input
                value={socialMedia.facebook}
                onChange={(e) => setSocialMedia({...socialMedia, facebook: e.target.value})}
                placeholder="facebook.com/pekaogranizados"
                className="mb-2"
              />
              <Input
                value={socialMedia.whatsapp}
                onChange={(e) => setSocialMedia({...socialMedia, whatsapp: e.target.value})}
                placeholder="+57 300 123 4567"
              />
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