import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Save, MapPin, Phone, Mail, DollarSign, Globe, Zap, Hash, Instagram, Facebook, LayoutGrid, Loader2, Link as LinkIcon, Instagram as InstagramIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('store_id')
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
    } finally {
      setIsLoading(false);
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
          name: storeName.toUpperCase(),
          address: address.toUpperCase(),
          tax_rate: parseFloat(taxRate),
          currency: currency.toUpperCase(),
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

      toast.success('Configuración de sucursal sincronizada correctamente');
    } catch (error: any) {
      console.error('Error saving business settings:', error);
      toast.error('Fallo en persistencia: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !storeId) {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
            <Loader2 className="w-12 h-12 animate-spin text-primary shadow-glow-pro" />
            <p className="text-[10px] font-black uppercase tracking-widest text-primary italic animate-pulse">Indexando Datos de Sucursal...</p>
        </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-black italic uppercase font-space-grotesk tracking-tight text-white leading-none">Business Operations</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mt-1 italic">Matriz Legal & Datos de Facturación</p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 px-4 h-9 rounded-full border border-white/10 font-black text-[9px] text-white/40 italic uppercase tracking-widest leading-none">
            <Building2 className="w-4 h-4 text-primary" /> Nodo ID: {storeId?.slice(0, 8)}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* General Info Card */}
        <Card className="xl:col-span-7 bg-[#1C1F26] border border-white/5 rounded-[3rem] shadow-pro glass-pro p-10 group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
              <Building2 className="w-48 h-48 text-primary" />
          </div>
          <CardHeader className="p-0 pb-10 border-b border-white/5 mb-10 bg-transparent">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-glow-pro">
                    <Building2 className="w-6 h-6" />
                </div>
                <div>
                   <CardTitle className="text-xl font-black italic uppercase font-space-grotesk tracking-widest text-white">General Information</CardTitle>
                   <CardDescription className="text-[9px] font-bold text-white/20 uppercase tracking-widest italic tracking-widest leading-none">Datos Estructurales de Sucursal</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-8">
            <div className="space-y-3">
              <Label htmlFor="store-name" className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">RAZÓN SOCIAL / NOMBRE NODO</Label>
              <Input
                id="store-name"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value.toUpperCase())}
                placeholder="EJ: PEKAO GRANIZADOS - CENTRO"
                className="h-16 bg-white/5 border-white/10 rounded-2xl text-[11px] font-black uppercase italic tracking-widest font-space-grotesk focus:ring-primary/20 shadow-pro transition-all"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="address" className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2 flex items-center gap-2">
                <MapPin className="w-3 h-3" /> UBICACIÓN GEOGRÁFICA
              </Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value.toUpperCase())}
                placeholder="CONSIGNAR DIRECCIÓN COMPLETA..."
                rows={3}
                className="bg-white/5 border-white/10 rounded-2xl text-[11px] font-black italic focus:ring-primary/20 transition-all shadow-pro min-h-[120px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="tax-rate" className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2 flex items-center gap-2">
                  <Hash className="w-3 h-3" /> CARGA FISCAL IVA (%)
                </Label>
                <div className="relative">
                    <Input
                        id="tax-rate"
                        type="number"
                        step="0.01"
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                        placeholder="19"
                        className="h-16 bg-white/5 border-white/10 rounded-2xl text-2xl font-black italic font-space-grotesk focus:ring-primary/20 shadow-pro pl-12"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 font-black italic">%</div>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="currency" className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">VECTOR MONETARIO</Label>
                <Input
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  placeholder="EJ: COP"
                  className="h-16 bg-white/5 border-white/10 rounded-2xl text-[11px] font-black uppercase italic tracking-widest font-space-grotesk focus:ring-primary/20 shadow-pro"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact and Social Card */}
        <Card className="xl:col-span-5 bg-[#1C1F26] border border-white/5 rounded-[3rem] shadow-pro glass-pro p-10 flex flex-col group relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors duration-1000" />
          <CardHeader className="p-0 pb-10 border-b border-white/5 mb-10 bg-transparent">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 shadow-glow-pro">
                    <Phone className="w-6 h-6" />
                </div>
                <div>
                   <CardTitle className="text-xl font-black italic uppercase font-space-grotesk tracking-widest text-white">Contact Interface</CardTitle>
                   <CardDescription className="text-[9px] font-bold text-white/20 uppercase tracking-widest italic tracking-widest leading-none">Canales Digitales & Redes</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-8 flex-1">
            <div className="space-y-3">
              <Label htmlFor="phone" className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">LÍNEA TELEFÓNICA</Label>
              <div className="relative">
                <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+57 300 123 4567"
                    className="h-16 bg-white/5 border-white/10 rounded-2xl text-[11px] font-black italic font-space-grotesk focus:ring-amber-500/20 shadow-pro pl-12"
                />
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="email" className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">CORREO ELECTRÓNICO</Label>
              <div className="relative">
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="CONTACTO@PEKAO.COM"
                    className="h-16 bg-white/5 border-white/10 rounded-2xl text-[11px] font-black uppercase italic font-space-grotesk focus:ring-amber-500/20 shadow-pro pl-12"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2 mb-2 block">CONECTIVIDAD SOCIAL</Label>
              <div className="space-y-3">
                  <div className="relative">
                    <Input
                      value={socialMedia.instagram}
                      onChange={(e) => setSocialMedia({...socialMedia, instagram: e.target.value})}
                      placeholder="INSTAGRAM HANDLER"
                      className="h-14 bg-white/5 border-white/10 rounded-xl text-[10px] font-black italic font-space-grotesk pl-12 focus:border-amber-500/50"
                    />
                    <InstagramIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  </div>
                  <div className="relative">
                    <Input
                      value={socialMedia.facebook}
                      onChange={(e) => setSocialMedia({...socialMedia, facebook: e.target.value})}
                      placeholder="FACEBOOK URL"
                      className="h-14 bg-white/5 border-white/10 rounded-xl text-[10px] font-black italic font-space-grotesk pl-12 focus:border-amber-500/50"
                    />
                    <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  </div>
                  <div className="relative">
                    <Input
                      value={socialMedia.whatsapp}
                      onChange={(e) => setSocialMedia({...socialMedia, whatsapp: e.target.value})}
                      placeholder="WHATSAPP BUSINESS"
                      className="h-14 bg-white/5 border-white/10 rounded-xl text-[10px] font-black italic font-space-grotesk pl-12 focus:border-amber-500/50"
                    />
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-6 border-t border-white/5">
        <Button 
          onClick={handleSave} 
          disabled={isLoading}
          className="h-16 px-12 rounded-2xl bg-amber-500 text-white font-black italic uppercase tracking-widest text-[10px] hover:shadow-glow-pro hover:shadow-amber-500/40 transition-all gap-4 border-none shadow-pro group font-space-grotesk"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" /> }
          {isLoading ? 'SINCRO...' : 'SINCRONIZAR NODO ✓'}
        </Button>
      </div>
    </motion.div>
  );
}