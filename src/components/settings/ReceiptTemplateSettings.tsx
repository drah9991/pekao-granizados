import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Receipt, Save, Eye, Layout, Type, ShieldCheck, Zap, Instagram, QrCode, Globe, Smartphone, User, Calendar, Hash, Calculator, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TemplateData {
  header: {
    show_logo: boolean;
    show_store_name: boolean;
    show_address: boolean;
    show_phone: boolean;
  };
  body: {
    show_date: boolean;
    show_order_number: boolean;
    show_cashier: boolean;
    show_items: boolean;
    show_totals: boolean;
  };
  footer: {
    message: string;
    show_social_media: boolean;
    show_qr_survey: boolean;
    qr_survey_url: string;
  };
}

export default function ReceiptTemplateSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [storeId, setStoreId] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");
  const [templateData, setTemplateData] = useState<TemplateData>({
    header: {
      show_logo: true,
      show_store_name: true,
      show_address: true,
      show_phone: true,
    },
    body: {
      show_date: true,
      show_order_number: true,
      show_cashier: true,
      show_items: true,
      show_totals: true,
    },
    footer: {
      message: "¡Gracias por tu compra!",
      show_social_media: false,
      show_qr_survey: false,
      qr_survey_url: "",
    },
  });

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
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

      const { data: template } = await supabase
        .from('receipt_templates')
        .select('*')
        .eq('store_id', profile.store_id)
        .eq('is_default', true)
        .maybeSingle();

      if (template) {
        setTemplateId(template.id);
        setTemplateData(template.template_data as TemplateData);
      }
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSyncing(true);
    try {
      if (templateId) {
        const { error } = await supabase
          .from('receipt_templates')
          .update({ template_data: templateData, updated_at: new Date().toISOString() })
          .eq('id', templateId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('receipt_templates')
          .insert([{
            store_id: storeId,
            name: 'Plantilla Principal',
            template_data: templateData,
            is_default: true,
          }]);

        if (error) throw error;
      }

      toast.success('Arquitectura de recibo sincronizada ✓');
      loadTemplate();
    } catch (error: unknown) {
      console.error('Error saving template:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Fallo técnico en persistencia: ' + message);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateTemplateSection = (section: 'header' | 'body' | 'footer', field: string, value: boolean | string) => {
    setTemplateData({
      ...templateData,
      [section]: {
        ...templateData[section],
        [field]: value,
      },
    });
  };

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
            <Loader2 className="w-12 h-12 animate-spin text-primary shadow-glow-pro" />
            <p className="text-[10px] font-black uppercase tracking-widest text-primary italic animate-pulse">Indexando Layout de Impresión...</p>
        </div>
    );
  }

  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-10"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 pb-10">
        <div>
          <h2 className="text-3xl font-black italic uppercase font-space-grotesk tracking-tight text-white leading-none">Thermal Receipt Architect</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mt-1 italic leading-relaxed">Configuración de Layout y Protocolos Fiscales</p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 px-4 h-10 rounded-full border border-white/10 font-black text-[9px] text-white/40 italic uppercase tracking-widest leading-none">
            <Layout className="w-4 h-4 text-primary" /> Template Engine v2.0
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
        {/* Configuration Bento */}
        <div className="xl:col-span-12 lg:col-span-7 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Header Settings */}
            <Card className="bg-[#1C1F26] border border-white/5 rounded-[3rem] shadow-pro glass-pro p-10 group overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
                  <Type className="w-24 h-24 text-primary" />
              </div>
              <CardHeader className="p-0 pb-8 border-b border-white/5 mb-8 bg-transparent">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary shadow-glow-pro">
                        <Type className="w-5 h-5" />
                    </div>
                    <div>
                       <CardTitle className="text-lg font-black italic uppercase font-space-grotesk tracking-widest text-white">Header Core</CardTitle>
                       <CardDescription className="text-[8px] font-bold text-white/20 uppercase tracking-widest italic leading-none">Elementos Superiores</CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                {[
                  { id: "show-logo", label: "LOGOTIPO CORPO", field: "show_logo" },
                  { id: "show-store-name", label: "RAZÓN SOCIAL", field: "show_store_name" },
                  { id: "show-address", label: "HUB DE UBICACIÓN", field: "show_address" },
                  { id: "show-phone", label: "VECTOR CONTACTO", field: "show_phone" },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl group/toggle hover:bg-white/[0.04] transition-colors">
                    <Label htmlFor={item.id} className="text-[9px] font-black uppercase italic tracking-widest text-white/40 group-hover/toggle:text-white transition-colors">{item.label}</Label>
                    <Switch
                      id={item.id}
                      checked={templateData.header[item.field as keyof typeof templateData.header]}
                      onCheckedChange={(checked) => updateTemplateSection('header', item.field, checked)}
                      className="scale-90 data-[state=checked]:bg-primary"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Body Settings */}
            <Card className="bg-[#1C1F26] border border-white/5 rounded-[3.5rem] shadow-pro glass-pro p-10 group overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
                  <Calculator className="w-24 h-24 text-indigo-400" />
              </div>
              <CardHeader className="p-0 pb-8 border-b border-white/5 mb-8 bg-transparent">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 shadow-glow-pro font-space-grotesk">
                        <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                       <CardTitle className="text-lg font-black italic uppercase font-space-grotesk tracking-widest text-white">Transactional Body</CardTitle>
                       <CardDescription className="text-[8px] font-bold text-white/20 uppercase tracking-widest italic leading-none">Datos de Transacción</CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                {[
                  { id: "show-date", label: "TIMESTAMP DE VENTA", field: "show_date" },
                  { id: "show-order", label: "VECTOR DE PEDIDO #", field: "show_order_number" },
                  { id: "show-cashier", label: "IDENTIDAD CAJERO", field: "show_cashier" },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl group/toggle hover:bg-white/[0.04] transition-colors">
                    <Label htmlFor={item.id} className="text-[9px] font-black uppercase italic tracking-widest text-white/40 group-hover/toggle:text-white transition-colors">{item.label}</Label>
                    <Switch
                      id={item.id}
                      checked={templateData.body[item.field as keyof typeof templateData.body]}
                      onCheckedChange={(checked) => updateTemplateSection('body', item.field, checked)}
                      className="scale-90 data-[state=checked]:bg-indigo-500"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Footer Settings */}
            <Card className="bg-[#1C1F26] border border-white/5 rounded-[3.5rem] shadow-pro glass-pro p-10 group overflow-hidden relative lg:col-span-1 md:col-span-2">
              <CardHeader className="p-0 pb-8 border-b border-white/5 mb-8 bg-transparent">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-500 shadow-glow-pro">
                        <Zap className="w-5 h-5" />
                    </div>
                    <div>
                       <CardTitle className="text-lg font-black italic uppercase font-space-grotesk tracking-widest text-white">Footer Assets</CardTitle>
                       <CardDescription className="text-[8px] font-bold text-white/20 uppercase tracking-widest italic leading-none">Engagement & Fidelidad</CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="footer-message" className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">MENSAJE DE GRATITUD</Label>
                  <Textarea
                    id="footer-message"
                    value={templateData.footer.message}
                    onChange={(e) => updateTemplateSection('footer', 'message', e.target.value.toUpperCase())}
                    placeholder="¡GRACIAS POR INDEXAR TU COMPRA!"
                    rows={2}
                    className="bg-white/5 border-white/10 rounded-2xl text-[10px] font-black italic tracking-widest focus:ring-primary/20 shadow-pro transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl group/toggle">
                      <Label htmlFor="show-social" className="text-[9px] font-black uppercase italic tracking-widest text-white/40">SOCIAL HUB</Label>
                      <Switch
                        id="show-social"
                        checked={templateData.footer.show_social_media}
                        onCheckedChange={(checked) => updateTemplateSection('footer', 'show_social_media', checked)}
                        className="scale-90"
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl group/toggle">
                      <Label htmlFor="show-qr" className="text-[9px] font-black uppercase italic tracking-widest text-white/40">QR ANALYTICS</Label>
                      <Switch
                        id="show-qr"
                        checked={templateData.footer.show_qr_survey}
                        onCheckedChange={(checked) => updateTemplateSection('footer', 'show_qr_survey', checked)}
                        className="scale-90"
                      />
                    </div>
                </div>

                <AnimatePresence>
                  {templateData.footer.show_qr_survey && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 pt-4 border-t border-white/5"
                    >
                      <Label htmlFor="qr-url" className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">URL ENCUESTA DE EXPERIENCIA</Label>
                      <Input
                        id="qr-url"
                        value={templateData.footer.qr_survey_url}
                        onChange={(e) => updateTemplateSection('footer', 'qr_survey_url', e.target.value)}
                        placeholder="HTTPS://FORMS.GLE/ALPHA..."
                        className="h-12 bg-white/5 border-white/10 rounded-xl text-[10px] font-black tracking-widest italic"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Global Preview Sticky - Bento Center */}
        <div className="xl:col-span-12 flex flex-col gap-10">
          <Card className="bg-[#1C1F26] border border-white/5 rounded-[4rem] shadow-pro glass-pro p-12 group relative overflow-hidden flex flex-col lg:flex-row gap-12 items-center lg:items-start">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            
            <div className="lg:w-1/3 space-y-8 flex flex-col justify-center">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-primary/10 rounded-[1.5rem] text-primary shadow-glow-pro">
                        <Eye className="w-8 h-8" />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black italic uppercase font-space-grotesk tracking-tighter text-white">Live Simulator</h3>
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">Vectores de Impresión Térmica</p>
                    </div>
                </div>
                
                <p className="text-[11px] text-white/30 font-bold uppercase italic leading-relaxed tracking-tight">
                    Esta simulación proyecta cómo se comportará la inyección de tinta en el papel térmico de <strong className="text-white/40">80mm Alpha</strong>. El motor adapta dinámicamente el layout según los switches seleccionados.
                </p>
                
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span className="text-[9px] font-black uppercase italic tracking-widest text-emerald-500/80">Aritmética Fiscal Verificada</span>
                    </div>
                    <Button 
                        onClick={handleSave} 
                        disabled={isSyncing}
                        className="h-16 px-12 rounded-[2rem] bg-indigo-500 text-white font-black italic uppercase tracking-widest text-[11px] hover:shadow-glow-pro hover:shadow-indigo-500/40 transition-all gap-4 border-none shadow-pro group font-space-grotesk mt-4"
                    >
                        {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" /> }
                        {isSyncing ? 'SINCRO...' : 'SINCRONIZAR ARQUITECTURA ✓'}
                    </Button>
                </div>
            </div>

            {/* Realistic Thermal Receipt Preview */}
            <div className="lg:w-2/3 flex-1 w-full max-w-sm ml-auto">
              <motion.div 
                layout
                className="bg-[#FFFFFE] text-black font-mono text-[11px] space-y-6 p-10 pb-20 shadow-[0px_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden min-h-[500px]"
                style={{
                  filter: 'contrast(1.2) grayscale(1)',
                  backgroundImage: 'radial-gradient(#00000005 1px, transparent 1px)',
                  backgroundSize: '10px 10px'
                }}
              >
                {/* Paper texture and cut effect */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-b from-gray-200 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full h-8 bg-white" style={{ clipPath: 'polygon(0 0, 5% 40%, 10% 0, 15% 40%, 20% 0, 25% 40%, 30% 0, 35% 40%, 40% 0, 45% 40%, 50% 0, 55% 40%, 60% 0, 65% 40%, 70% 0, 75% 40%, 80% 0, 85% 40%, 90% 0, 95% 40%, 100% 0, 100% 100%, 0 100%)' }} />
                
                {/* Header Section */}
                <div className="text-center space-y-2">
                    {templateData.header.show_logo && (
                    <div className="mb-4">
                        <div className="w-20 h-20 mx-auto border-4 border-black border-double flex items-center justify-center font-black text-xl italic font-space-grotesk tracking-tighter">
                            PK
                        </div>
                        <p className="text-[8px] font-bold mt-1 tracking-[0.4em uppercase italic">ALPHA NODE</p>
                    </div>
                    )}
                    {templateData.header.show_store_name && (
                    <div className="font-black text-lg tracking-tighter italic uppercase leading-none">
                        OASIS EÓN HUB
                    </div>
                    )}
                    {templateData.header.show_address && (
                    <div className="text-[9px] font-bold uppercase tracking-tight">
                        CALLE 123 #45-67, MATRIX HUB
                    </div>
                    )}
                    {templateData.header.show_phone && (
                    <div className="text-[9px] font-bold uppercase">
                        COM: +57 300 123 4567
                    </div>
                    )}
                </div>
                
                <div className="border-t border-black border-dashed my-6 opacity-30"></div>
                
                {/* Transaction Metadata */}
                <div className="space-y-1 font-bold">
                    {templateData.body.show_date && (
                    <div className="flex justify-between items-center px-2">
                        <span>TIMESTAMP:</span>
                        <span>15/12/26 14:30</span>
                    </div>
                    )}
                    {templateData.body.show_order_number && (
                    <div className="flex justify-between items-center px-2">
                        <span>VECTOR ID:</span>
                        <span className="bg-black text-white px-2 py-0.5">#1001-A</span>
                    </div>
                    )}
                    {templateData.body.show_cashier && (
                    <div className="flex justify-between items-center px-2">
                        <span>CORE OPERATOR:</span>
                        <span>JUAN PÉREZ</span>
                    </div>
                    )}
                </div>
                
                <div className="border-t border-black border-dashed my-6 opacity-30"></div>
                
                {/* Items and Ledger */}
                {templateData.body.show_items && (
                  <div className="space-y-4 px-2">
                    <div className="space-y-1">
                        <div className="flex justify-between font-black uppercase italic">
                            <span>1x GRANIZADO FRESA (M)</span>
                            <span>$8,000</span>
                        </div>
                        <div className="flex justify-between text-[9px] pl-4 opacity-70 italic font-bold">
                            <span>+ LECHE CONDENSADA XT</span>
                            <span>$1,000</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between font-black uppercase italic">
                            <span>1x TOPPING OREO CRUSH</span>
                            <span>$1,500</span>
                        </div>
                    </div>
                  </div>
                )}
                
                <div className="border-t-2 border-black border-double my-6"></div>
                
                {/* Financial Calculus */}
                {templateData.body.show_totals && (
                  <div className="space-y-2 px-2 font-black">
                    <div className="flex justify-between items-center text-[10px]">
                      <span>SUBTOTAL OPERATIVO:</span>
                      <span>$10,500</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span>IVA (19.00%):</span>
                      <span>$1,995</span>
                    </div>
                    <div className="flex justify-between items-center text-xl italic font-space-grotesk pt-2 border-t border-black border-dashed">
                      <span>TOTAL:</span>
                      <span>$12,495</span>
                    </div>
                  </div>
                )}
                
                <div className="border-t border-black border-dashed my-6 opacity-30"></div>
                
                {/* Footer and Engagement */}
                <div className="text-center space-y-6 px-4">
                  <div className="font-black italic uppercase tracking-tight text-[10px] leading-relaxed">
                    "{templateData.footer.message}"
                  </div>
                  
                  <div className="space-y-4">
                    {templateData.footer.show_social_media && (
                      <div className="flex flex-col items-center gap-1 border border-black p-3 bg-black/[0.02]">
                        <div className="flex items-center gap-2">
                            <Instagram className="w-4 h-4" />
                             <span className="font-black tracking-widest text-[9px]">@OASISEONHUB</span>
                        </div>
                        <p className="text-[7px] font-bold opacity-50">SYNC YOUR EXPERIENCE</p>
                      </div>
                    )}

                    {templateData.footer.show_qr_survey && (
                      <div className="flex flex-col items-center gap-3 pt-4 border-t border-black border-dashed">
                        <div className="w-24 h-24 p-2 border-2 border-black border-double flex items-center justify-center bg-white">
                           <QrCode className="w-16 h-16 opacity-80" />
                        </div>
                        <div className="text-[7px] font-black uppercase tracking-[0.3em]">FEEDBACK PROTOCOL ACTIVE</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-6 font-bold text-[8px] opacity-20 tracking-widest">
                     POWERED BY OASIS EÓN OS v2.0-PRO
                  </div>
                </div>
              </motion.div>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}