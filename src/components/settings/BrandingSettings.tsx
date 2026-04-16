import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Palette, Save, Image as ImageIcon, Store as StoreIcon, Plus, Loader2, Check, Zap, Eye, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBranding } from "@/context/BrandingContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function BrandingSettings() {
  const { refreshBranding } = useBranding();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [currentLogo, setCurrentLogo] = useState<string>("");
  const [primaryColor, setPrimaryColor] = useState("#0EA5E9");
  const [borderColor, setBorderColor] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [hasStore, setHasStore] = useState(false);
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");

  useEffect(() => {
    loadBrandingSettings();
  }, []);

  const loadBrandingSettings = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile?.store_id) {
        setStoreId(profile.store_id);
        setHasStore(true);

        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('config')
          .eq('id', profile.store_id)
          .maybeSingle();

        if (storeError) throw storeError;

        if (store?.config) {
          const config = store.config as any;
          if (config.branding?.logo_url) {
            setCurrentLogo(config.branding.logo_url);
            setLogoPreview(config.branding.logo_url);
          }
          if (config.branding?.primary_color) {
            setPrimaryColor(config.branding.primary_color);
          }
          if (config.branding?.border_color) {
            setBorderColor(config.branding.border_color);
          }
        }
      } else {
        setHasStore(false);
        setStoreId(null);
      }
    } catch (error: any) {
      console.error('Error loading branding:', error);
      toast.error('Error al cargar la configuración de marca: ' + error.message);
    } finally {
      setIsLoading(false);
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
    if (!storeId) {
      toast.error("Primero debes crear o seleccionar una tienda.");
      return;
    }

    setIsLoading(true);
    try {
      let logoUrl = currentLogo;

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

      const { data: store, error: fetchStoreError } = await supabase
        .from('stores')
        .select('config')
        .eq('id', storeId)
        .maybeSingle();

      if (fetchStoreError) throw fetchStoreError;

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
              border_color: borderColor,
            }
          }
        })
        .eq('id', storeId);

      if (updateError) throw updateError;

      setCurrentLogo(logoUrl);
      toast.success('Identidad de marca actualizada exitosamente');
      
      document.documentElement.style.setProperty('--brand-primary-color', primaryColor);
      if (borderColor) {
        document.documentElement.style.setProperty('--brand-border-color', borderColor);
      }
      refreshBranding();
      
    } catch (error: any) {
      console.error('Error saving branding:', error);
      toast.error('Fallo técnico al guardar: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) {
      toast.error("El nombre del nodo no puede estar vacío.");
      return;
    }
    setIsCreatingStore(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado.");

      const { data: newStore, error: storeError } = await supabase
        .from('stores')
        .insert({ name: newStoreName.trim() })
        .select('id')
        .single();

      if (storeError) throw storeError;
      if (!newStore) throw new Error("No se pudo crear la sucursal.");

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ store_id: newStore.id })
        .eq('id', user.id);

      if (profileUpdateError) throw profileUpdateError;

      toast.success(`Nodo "${newStoreName}" indexado y asignado.`);
      setNewStoreName("");
      await loadBrandingSettings();
      refreshBranding();
    } catch (error: any) {
      console.error('Error creating store:', error);
      toast.error('Error en expansión de red: ' + error.message);
    } finally {
      setIsCreatingStore(false);
    }
  };

  if (isLoading && !hasStore) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <Loader2 className="w-12 h-12 animate-spin text-primary shadow-glow-pro" />
        <p className="text-[10px] font-black uppercase tracking-widest text-primary italic animate-pulse">Sincronizando Identidad...</p>
      </div>
    );
  }

  if (!hasStore) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto"
      >
        <Card className="bg-[#1C1F26] border border-dashed border-white/20 rounded-[3rem] p-12 text-center shadow-pro glass-pro relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="w-24 h-24 bg-white/5 rounded-[2rem] border border-white/10 flex items-center justify-center mx-auto mb-8 shadow-pro group-hover:scale-110 transition-all">
                <StoreIcon className="w-10 h-10 text-white/20" />
            </div>
            <CardTitle className="text-3xl font-black italic uppercase font-space-grotesk tracking-tight mb-4">Nodo No Detectado</CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-10 max-w-xs mx-auto leading-relaxed italic">
              Para configurar el ADN visual, primero es necesario indexar una sucursal en el ecosistema digital.
            </CardDescription>
            <div className="max-w-sm mx-auto space-y-6">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">NOMBRE DEL NUEVO NODO</Label>
                <Input
                    placeholder="EJ: PEKAO CENTRO MATRIX"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value.toUpperCase())}
                    disabled={isCreatingStore}
                    className="h-16 bg-white/5 border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest italic font-space-grotesk focus:ring-primary/20 transition-all border shadow-pro"
                />
              </div>
              <Button
                onClick={handleCreateStore}
                disabled={isCreatingStore || !newStoreName.trim()}
                className="h-16 w-full rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest shadow-glow-pro hover:shadow-primary/40 transition-all font-space-grotesk gap-3"
              >
                {isCreatingStore ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {isCreatingStore ? "INDEXANDO..." : "CREAR NODO MAESTRO"}
              </Button>
            </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-black italic uppercase font-space-grotesk tracking-tight text-white leading-none">Global DNA Branding</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mt-1 italic">Personalización Atómica de Interfaz</p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 px-4 h-9 rounded-full border border-white/10 font-black text-[9px] text-white/40 italic uppercase tracking-widest leading-none">
            <Zap className="w-4 h-4 text-amber-500" /> Sincronización v2.0
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Logo Card - Bento Wide */}
        <Card className="lg:col-span-12 bg-[#1C1F26] border border-white/5 rounded-[3rem] shadow-pro glass-pro overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-125 transition-transform duration-1000">
              <ImageIcon className="w-32 h-32 text-primary" />
          </div>
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary shadow-glow-pro">
                    <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                   <CardTitle className="text-xl font-black italic uppercase font-space-grotesk tracking-widest text-white">Visual Identity Assets</CardTitle>
                   <CardDescription className="text-[9px] font-bold text-white/20 uppercase tracking-widest italic tracking-widest">Logo Maestro • Alpha Channel Support</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="relative group/preview">
                  <div className={cn(
                    "w-64 h-64 rounded-[2.5rem] border-2 border-dashed border-white/10 overflow-hidden flex items-center justify-center p-8 transition-all duration-700",
                    logoPreview ? "bg-white/[0.02] border-primary/20" : "bg-white/5"
                  )}>
                    <AnimatePresence mode="wait">
                        {logoPreview ? (
                            <motion.img 
                                key={logoPreview}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                src={logoPreview} 
                                alt="Logo preview" 
                                className="max-w-full max-h-full object-contain filter drop-shadow-2xl"
                            />
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center gap-3 opacity-20"
                            >
                                <Upload className="w-8 h-8" />
                                <span className="text-[9px] font-black uppercase tracking-widest italic">Waiting Data...</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                  </div>
                  {logoPreview && (
                      <Button
                        variant="ghost" size="icon" 
                        onClick={() => {setLogoFile(null); setLogoPreview("");}}
                        className="absolute -top-3 -right-3 w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all shadow-pro backdrop-blur-md opacity-0 group-hover/preview:opacity-100"
                      >
                          <Trash2 className="w-4 h-4" />
                      </Button>
                  )}
              </div>
              
              <div className="flex-1 space-y-8 w-full">
                  <div className="space-y-4 rounded-[2rem] bg-white/[0.02] border border-white/5 p-8">
                      <div className="flex items-center gap-3 mb-2">
                          <Check className="w-4 h-4 text-emerald-500" />
                          <p className="text-[10px] font-black text-white/60 uppercase italic tracking-widest font-space-grotesk leading-none">Especificaciones Técnicas</p>
                      </div>
                      <p className="text-[10px] text-white/30 font-bold uppercase italic leading-relaxed">
                          Formatos admitidos: PNG (Transparente), SVG (Vectorial) o JPG de alta densidad. El sistema optimizará el recurso para todas las interfaces de punto de venta.
                      </p>
                      
                      <Label htmlFor="logo-upload" className="cursor-pointer block pt-4">
                        <div className="flex items-center justify-center gap-4 p-6 border-2 border-dashed border-white/10 rounded-2xl hover:border-primary/50 hover:bg-primary/10 transition-all group/upload shadow-pro">
                          <Upload className="w-5 h-5 text-white/20 group-hover/upload:text-primary transition-colors" />
                          <span className="text-[10px] font-black uppercase italic tracking-[0.3em] text-white/40 group-hover/upload:text-white transition-colors">
                            {logoFile ? 'Actualizar Recurso' : 'Vincular Assets de Marca'}
                          </span>
                        </div>
                        <Input id="logo-upload" type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                      </Label>
                  </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Card - Bento Tall */}
        <Card className="xl:col-span-5 bg-[#1C1F26] border border-white/5 rounded-[3rem] shadow-pro glass-pro overflow-hidden">
          <CardHeader className="p-8">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-500 shadow-glow-pro" style={{ color: primaryColor, backgroundColor: `${primaryColor}20` }}>
                    <Palette className="w-5 h-5" />
                </div>
                <div>
                   <CardTitle className="text-xl font-black italic uppercase font-space-grotesk tracking-widest text-white">Chroma Core</CardTitle>
                   <CardDescription className="text-[9px] font-bold text-white/20 uppercase tracking-widest italic">Acento Cromático Global</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-8">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-8 p-6 bg-white/[0.02] rounded-[2rem] border border-white/5 shadow-inner">
                <div className="relative group">
                    <Input
                      id="primary-color"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-24 h-24 cursor-pointer rounded-3xl border-none p-0 bg-transparent shadow-pro"
                    />
                    <div className="absolute inset-0 pointer-events-none rounded-3xl border-2 border-white/10 group-hover:border-white/30 transition-all" />
                </div>
                <div className="flex-1 space-y-3">
                  <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 font-space-grotesk italic">HEXADECIMAL CODE</Label>
                  <div className="relative">
                      <Input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#0EA5E9"
                        className="h-12 bg-white/5 border-white/10 rounded-xl font-mono text-sm font-black text-indigo-400 uppercase italic tracking-widest focus:ring-primary/20 shadow-pro"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-glow-pro" style={{ backgroundColor: primaryColor }} />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest italic ml-1">Simulación UX/UI</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      style={{ backgroundColor: primaryColor }}
                      className="h-14 rounded-xl text-[9px] font-black uppercase italic tracking-widest text-white shadow-pro border-none hover:scale-105 transition-transform"
                    >
                      Primary Flow
                    </Button>
                    <Button variant="outline" style={{ borderColor: `${primaryColor}40`, color: primaryColor }} className="h-14 rounded-xl text-[9px] font-black uppercase italic tracking-widest bg-transparent hover:bg-white/5 transition-all">
                      Secondary Vector
                    </Button>
                  </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Border Config Card */}
        <Card className="xl:col-span-12 bg-[#1C1F26] border border-white/5 rounded-[3rem] shadow-pro glass-pro overflow-hidden">
          <CardHeader className="p-8">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-500 shadow-glow-pro" style={{ color: borderColor || primaryColor, borderColor: borderColor || primaryColor + '40' }}>
                    <Zap className="w-5 h-5" />
                </div>
                <div>
                   <CardTitle className="text-xl font-black italic uppercase font-space-grotesk tracking-widest text-white">Edge Matrix</CardTitle>
                   <CardDescription className="text-[9px] font-bold text-white/20 uppercase tracking-widest italic">Bordes de Componentes</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-center gap-8 p-6 bg-white/[0.02] rounded-[2rem] border border-white/5 shadow-inner">
                <div className="relative group">
                    <Input
                      id="border-color"
                      type="color"
                      value={borderColor || primaryColor}
                      onChange={(e) => setBorderColor(e.target.value)}
                      className="w-24 h-24 cursor-pointer rounded-3xl border-none p-0 bg-transparent shadow-pro"
                    />
                    <div className="absolute inset-0 pointer-events-none rounded-3xl border-2 border-white/10 group-hover:border-white/30 transition-all" />
                </div>
                <div className="flex-1 space-y-3">
                  <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 font-space-grotesk italic">HEX BORDER CODE</Label>
                  <div className="relative">
                      <Input
                        type="text"
                        value={borderColor}
                        onChange={(e) => setBorderColor(e.target.value)}
                        placeholder="Automático"
                        className="h-12 bg-white/5 border-white/10 rounded-xl font-mono text-sm font-black text-indigo-400 uppercase italic tracking-widest focus:ring-primary/20 shadow-pro"
                      />
                      {borderColor && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-glow-pro" style={{ backgroundColor: borderColor }} />}
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-white/5 rounded-2xl border border-white/5 flex flex-col justify-center">
                <p className="text-[10px] text-white/40 font-bold uppercase italic leading-relaxed">
                  <span className="text-primary mr-1">TÉCNICA GLOW:</span> Si dejas el código vacío, el sistema activará el algoritmo de derivadas, usando una versión traslúcida del acento principal.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Global Preview - Bento Wide */}
        <Card className="xl:col-span-7 bg-[#1C1F26] border border-white/5 rounded-[3rem] shadow-pro glass-pro overflow-hidden relative">
            <div className="absolute inset-0 opacity-[0.03] transition-opacity duration-1000 pointer-events-none" style={{ backgroundColor: primaryColor }} />
            <CardHeader className="p-8">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-500 shadow-glow-pro">
                        <Eye className="w-5 h-5" />
                    </div>
                    <div>
                       <CardTitle className="text-xl font-black italic uppercase font-space-grotesk tracking-widest text-white">Real-Time Simulator</CardTitle>
                       <CardDescription className="text-[9px] font-bold text-white/20 uppercase tracking-widest italic">Previsualización de Entorno</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8 pt-0">
                <div className="rounded-[2.5rem] bg-[#0A0B0F] border p-10 h-full relative overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[300px]" style={{ borderColor: borderColor || (primaryColor + '40') }}>
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="absolute -left-10 top-20 w-40 h-40 bg-primary/10 rounded-full blur-[80px] pointer-events-none" style={{ backgroundColor: `${primaryColor}20` }} />
                    
                    <div className="flex flex-col items-center gap-10 relative z-10 w-full">
                        <AnimatePresence mode="wait">
                            {logoPreview ? (
                                <motion.img 
                                    key={logoPreview}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    src={logoPreview} 
                                    className="h-24 object-contain filter drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                                />
                            ) : (
                                <div className="h-20 w-64 bg-white/5 rounded-2xl animate-pulse flex items-center justify-center border border-white/5">
                                    <span className="text-[8px] font-black text-white/10 uppercase italic tracking-[0.5em]">No Image Found</span>
                                </div>
                            )}
                        </AnimatePresence>
                        
                        <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                            <div className="h-1 bg-white/5 rounded-full" />
                            <div className="h-1 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
                            <div className="h-1 bg-white/5 rounded-full" />
                        </div>
                        
                        <div className="text-center">
                            <h4 className="text-xs font-black font-space-grotesk text-white/40 uppercase tracking-[0.4em] italic">Dashboard Alpha V2</h4>
                            <p className="text-[8px] font-bold text-white/20 uppercase italic tracking-widest mt-2">{storeId || 'UNAUTHORIZED_NODE'}</p>
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
          className="h-16 px-12 rounded-2xl bg-indigo-500 text-white font-black italic uppercase tracking-widest text-[10px] hover:shadow-glow-pro transition-all gap-4 border-none shadow-pro group font-space-grotesk"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" /> }
          {isLoading ? 'SINCRONIZANDO...' : 'REFORJAR IDENTIDAD ✓'}
        </Button>
      </div>
    </motion.div>
  );
}