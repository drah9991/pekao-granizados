import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, Save, MapPin, Phone, Mail, DollarSign, Globe, Zap, Hash, 
  Plus, Loader2, Check, Trash2, Eye, Calendar, User, FileText, Settings, Coins, LayoutGrid
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type SettingsSubTab = "business" | "document" | "resolutions" | "payments" | "objectives" | "advanced" | "currency" | "integrations" | "cajas";

export default function BusinessSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>("business");
  
  // Base Data
  const [storeId, setStoreId] = useState<string>("");
  
  // TAB: Negocio
  const [storeName, setStoreName] = useState("");
  const [nitDoc, setNitDoc] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("Colombia");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  
  // Flags Operativos
  const [flagBillingElectronic, setFlagBillingElectronic] = useState(false);
  const [flagIngredients, setFlagIngredients] = useState(true);
  const [flagMesas, setFlagMesas] = useState(true);
  const [flagDelivery, setFlagDelivery] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // TAB: Documento
  const [docType, setDocType] = useState("Factura");
  const [docPrefix, setDocPrefix] = useState("");
  const [docStartNumber, setDocStartNumber] = useState("1");
  const [docTipPercentage, setDocTipPercentage] = useState("0");
  const [docNameInDoc, setDocNameInDoc] = useState("NIT/Doc");
  const [docNote1, setDocNote1] = useState("");
  const [docNote2, setDocNote2] = useState("");
  const [docNote3, setDocNote3] = useState("");
  const [docTemplate, setDocTemplate] = useState("Tiquete");
  const [docFontSize, setDocFontSize] = useState("12px");
  
  // Checkboxes Documento
  const [showPrintWindow, setShowPrintWindow] = useState(true);
  const [showDocLogo, setShowDocLogo] = useState(false);
  const [showTotalInLetters, setShowTotalInLetters] = useState(false);
  const [useTurns, setUseTurns] = useState(false);
  const [printAnotherPage, setPrintAnotherPage] = useState(true);
  const [showPriceBeforeTax, setShowPriceBeforeTax] = useState(false);

  // TAB: Resoluciones (Historial mock para visualización idéntica)
  const [resolutionsHistory, setResolutionsHistory] = useState<any[]>([
    { fecha: "2026-07-09", usuario: "Richard Roa", tipo: "Creación", descripcion: "Resolución de facturación habilitada automáticamente" }
  ]);

  // TAB: Medios de pago
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["Efectivo", "T. Crédito", "T. Débito", "Transferencia"]);
  const [newPaymentName, setNewPaymentName] = useState("");

  // TAB: Objetivos
  const [objectiveToday, setObjectiveToday] = useState("0");
  const [objective7Days, setObjective7Days] = useState("0");
  const [objective30Days, setObjective30Days] = useState("0");
  const [objectiveYear, setObjectiveYear] = useState("0");

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
        
        const config = store.config as Record<string, any> || {};
        
        // Mapeo Negocio
        const business = config.business || {};
        setNitDoc(business.nit_doc || "90000000");
        setContactName(business.contact_name || "Richard Joaquin Roa Gomez");
        setEmail(business.email || "rroa2513@gmail.com");
        setCountry(business.country || "Colombia");
        setState(business.state || "");
        setCity(business.city || "");
        setPhone(business.phone || "3107112503");
        setWebsite(business.website || "");
        setLogoPreview(business.logo_url || null);

        setFlagBillingElectronic(!!business.billing_electronic);
        setFlagIngredients(business.ingredients !== false);
        setFlagMesas(business.mesas !== false);
        setFlagDelivery(!!business.delivery);

        // Mapeo Documento
        const doc = config.document || {};
        setDocType(doc.type || "Factura");
        setDocPrefix(doc.prefix || "");
        setDocStartNumber(doc.start_number?.toString() || "1");
        setDocTipPercentage(doc.tip_percentage?.toString() || "0");
        setDocNameInDoc(doc.name_in_doc || "NIT/Doc");
        setDocNote1(doc.note_1 || "");
        setDocNote2(doc.note_2 || "");
        setDocNote3(doc.note_3 || "");
        setDocTemplate(doc.template || "Tiquete");
        setDocFontSize(doc.font_size || "12px");

        setShowPrintWindow(doc.show_print_window !== false);
        setShowDocLogo(!!doc.show_logo);
        setShowTotalInLetters(!!doc.show_total_letters);
        setUseTurns(!!doc.use_turns);
        setPrintAnotherPage(doc.print_another_page !== false);
        setShowPriceBeforeTax(!!doc.show_price_before_tax);

        // Mapeo Medios de pago
        if (config.payment_methods_list) {
          setPaymentMethods(config.payment_methods_list);
        }

        // Mapeo Objetivos
        const obj = config.objectives || {};
        setObjectiveToday(obj.today?.toString() || "0");
        setObjective7Days(obj.seven_days?.toString() || "0");
        setObjective30Days(obj.thirty_days?.toString() || "0");
        setObjectiveYear(obj.year?.toString() || "0");
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

      const currentConfig = (store?.config as Record<string, any>) || {};

      const updatedConfig = {
        ...currentConfig,
        business: {
          nit_doc: nitDoc,
          contact_name: contactName,
          email,
          country,
          state,
          city,
          phone,
          website,
          billing_electronic: flagBillingElectronic,
          ingredients: flagIngredients,
          mesas: flagMesas,
          delivery: flagDelivery,
          logo_url: logoPreview
        },
        document: {
          type: docType,
          prefix: docPrefix,
          start_number: parseInt(docStartNumber) || 1,
          tip_percentage: parseFloat(docTipPercentage) || 0,
          name_in_doc: docNameInDoc,
          note_1: docNote1,
          note_2: docNote2,
          note_3: docNote3,
          template: docTemplate,
          font_size: docFontSize,
          show_print_window: showPrintWindow,
          show_logo: showDocLogo,
          show_total_letters: showTotalInLetters,
          use_turns: useTurns,
          print_another_page: printAnotherPage,
          show_price_before_tax: showPriceBeforeTax
        },
        payment_methods_list: paymentMethods,
        objectives: {
          today: parseFloat(objectiveToday) || 0,
          seven_days: parseFloat(objective7Days) || 0,
          thirty_days: parseFloat(objective30Days) || 0,
          year: parseFloat(objectiveYear) || 0
        }
      };

      const { error } = await supabase
        .from('stores')
        .update({
          name: storeName.toUpperCase(),
          address: address.toUpperCase(),
          config: updatedConfig
        })
        .eq('id', storeId);

      if (error) throw error;
      toast.success('Configuración sincronizada con éxito.');
    } catch (error: unknown) {
      console.error('Error saving business settings:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Fallo al guardar: ' + message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPaymentMethod = () => {
    if (!newPaymentName.trim()) return;
    if (paymentMethods.includes(newPaymentName.trim())) {
      toast.warning("El medio de pago ya existe.");
      return;
    }
    setPaymentMethods(prev => [...prev, newPaymentName.trim()]);
    setNewPaymentName("");
    toast.success("Medio de pago agregado localmente.");
  };

  const handleRemovePaymentMethod = (name: string) => {
    setPaymentMethods(prev => prev.filter(m => m !== name));
  };

  if (isLoading && !storeId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <Loader2 className="w-12 h-12 animate-spin text-primary shadow-glow-pro" />
        <p className="text-[10px] font-black uppercase tracking-widest text-primary italic animate-pulse">Indexando Módulo de Control...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Barra superior de Sub-Pestañas horizontales */}
      <div className="flex gap-1.5 border-b border-white/5 pb-4 overflow-x-auto no-scrollbar">
        {[
          { value: "business", label: "Negocio", icon: Building2 },
          { value: "document", label: "Documento", icon: FileText },
          { value: "resolutions", label: "Resoluciones", icon: Settings },
          { value: "payments", label: "Medios de pago", icon: Coins },
          { value: "objectives", label: "Objetivos", icon: TargetIcon },
          { value: "advanced", label: "Avanzado", icon: Settings },
          { value: "currency", label: "Moneda", icon: DollarSign },
          { value: "integrations", label: "Integraciones", icon: Zap },
          { value: "cajas", label: "Cajas", icon: LayoutGrid },
        ].map((tab) => {
          const isActive = activeSubTab === tab.value;
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveSubTab(tab.value as SettingsSubTab)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl font-space-grotesk text-[10px] uppercase font-black tracking-widest italic transition-all shrink-0 cursor-pointer",
                isActive 
                  ? "bg-primary text-white shadow-glow-pro" 
                  : "text-muted-foreground hover:text-white bg-white/5 border border-white/5 hover:border-white/10"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* SUBTAB: NEGOCIO */}
        {activeSubTab === "business" && (
          <motion.div 
            key="business"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            <Card className="bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <CardHeader className="p-0 pb-4 mb-6 border-b border-white/5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground">Información del Negocio</CardTitle>
                  <CardDescription className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest italic leading-none font-space-grotesk mt-1">Configura la razón social y datos de contacto de tu sucursal</CardDescription>
                </div>
                <div className="text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded italic font-space-grotesk">
                  Plan Actual: UNIVERSAL
                </div>
              </CardHeader>
              <CardContent className="p-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Nombre del Negocio *</Label>
                    <Input value={storeName} onChange={(e) => setStoreName(e.target.value.toUpperCase())} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">NIT / Doc *</Label>
                    <Input value={nitDoc} onChange={(e) => setNitDoc(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Contacto</Label>
                    <Input value={contactName} onChange={(e) => setContactName(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Dirección</Label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">País</Label>
                    <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-foreground">
                      <option value="Colombia">Colombia</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Departamento</Label>
                    <Input value={state} onChange={(e) => setState(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" placeholder="Ej: Antioquia" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Ciudad</Label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" placeholder="Ej: Medellín" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Teléfono</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Página Web</Label>
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" placeholder="https://" />
                  </div>
                </div>

                {/* Checkboxes Operativos */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="bill-elec" checked={flagBillingElectronic} onChange={(e) => setFlagBillingElectronic(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary cursor-pointer" />
                    <Label htmlFor="bill-elec" className="text-xs text-slate-300 cursor-pointer font-bold">Maneja Facturación Electrónica con Loggro Proveedor Tecnológico</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="ingredients-check" checked={flagIngredients} onChange={(e) => setFlagIngredients(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary cursor-pointer" />
                    <Label htmlFor="ingredients-check" className="text-xs text-slate-300 cursor-pointer font-bold">Productos con ingredientes</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="tables-check" checked={flagMesas} onChange={(e) => setFlagMesas(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary cursor-pointer" />
                    <Label htmlFor="tables-check" className="text-xs text-slate-300 cursor-pointer font-bold">Utilizo mesas</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="delivery-check" checked={flagDelivery} onChange={(e) => setFlagDelivery(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary cursor-pointer" />
                    <Label htmlFor="delivery-check" className="text-xs text-slate-300 cursor-pointer font-bold">Envío a domicilio</Label>
                  </div>
                </div>

                {/* Cargar Logo */}
                <div className="space-y-2 pt-4 border-t border-white/5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Cargar logo</Label>
                  <div className="flex items-center gap-4">
                    <Input type="file" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setLogoPreview(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
                    {logoPreview && (
                      <img src={logoPreview} alt="Logo" className="w-16 h-10 object-contain border border-white/10 rounded-lg p-1 bg-white/5" />
                    )}
                  </div>
                  <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest">Recomendada: 90x60. Refresque la página después de guardar para ver los cambios.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* SUBTAB: DOCUMENTO */}
        {activeSubTab === "document" && (
          <motion.div 
            key="document"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            <Card className="bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <CardHeader className="p-0 pb-4 mb-6 border-b border-white/5">
                <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground">Parámetros de Documento de Venta</CardTitle>
                <CardDescription className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest italic leading-none font-space-grotesk mt-1">Configura prefijos, notas y la visualización de la factura/tiquete</CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Tipo de documento</Label>
                    <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-foreground">
                      <option value="Factura">Factura</option>
                      <option value="Tiquete POS">Tiquete POS</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Prefijo</Label>
                    <Input value={docPrefix} onChange={(e) => setDocPrefix(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300"># de inicio</Label>
                    <Input type="number" value={docStartNumber} onChange={(e) => setDocStartNumber(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">% de propina sugerida</Label>
                    <Input type="number" value={docTipPercentage} onChange={(e) => setDocTipPercentage(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Nombre de documento en documento</Label>
                    <Input value={docNameInDoc} onChange={(e) => setDocNameInDoc(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Nota 1</Label>
                    <Input value={docNote1} onChange={(e) => setDocNote1(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" placeholder="Nota de pie de página" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Nota 2</Label>
                    <Input value={docNote2} onChange={(e) => setDocNote2(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Nota 3</Label>
                    <Input value={docNote3} onChange={(e) => setDocNote3(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Plantilla</Label>
                    <select value={docTemplate} onChange={(e) => setDocTemplate(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-foreground">
                      <option value="Tiquete">Tiquete (80mm)</option>
                      <option value="Carta">Carta (A4)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Tamaño texto items</Label>
                    <select value={docFontSize} onChange={(e) => setDocFontSize(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-foreground">
                      <option value="10px">10px</option>
                      <option value="12px">12px</option>
                      <option value="14px">14px</option>
                    </select>
                  </div>
                </div>

                {/* Checkboxes Documento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="show-print" checked={showPrintWindow} onChange={(e) => setShowPrintWindow(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary cursor-pointer" />
                    <Label htmlFor="show-print" className="text-xs text-slate-300 cursor-pointer font-bold">Mostrar ventana de impresión</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="show-logo" checked={showDocLogo} onChange={(e) => setShowDocLogo(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary cursor-pointer" />
                    <Label htmlFor="show-logo" className="text-xs text-slate-300 cursor-pointer font-bold">Mostrar Logo</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="total-letters" checked={showTotalInLetters} onChange={(e) => setShowTotalInLetters(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary cursor-pointer" />
                    <Label htmlFor="total-letters" className="text-xs text-slate-300 cursor-pointer font-bold">Mostrar total en letras</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="use-turns-check" checked={useTurns} onChange={(e) => setUseTurns(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary cursor-pointer" />
                    <Label htmlFor="use-turns-check" className="text-xs text-slate-300 cursor-pointer font-bold">Utilizar turnos</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="print-other" checked={printAnotherPage} onChange={(e) => setPrintAnotherPage(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary cursor-pointer" />
                    <Label htmlFor="print-other" className="text-xs text-slate-300 cursor-pointer font-bold">Imprimir en otra página</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="before-tax" checked={showPriceBeforeTax} onChange={(e) => setShowPriceBeforeTax(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary cursor-pointer" />
                    <Label htmlFor="before-tax" className="text-xs text-slate-300 cursor-pointer font-bold">Mostrar valor de productos antes de impuestos</Label>
                  </div>
                </div>

                <div className="flex justify-center pt-4">
                  <Button variant="outline" className="border-white/10 bg-white/5 font-space-grotesk text-xs uppercase tracking-widest px-6 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Vista Previa
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* SUBTAB: RESOLUCIONES */}
        {activeSubTab === "resolutions" && (
          <motion.div 
            key="resolutions"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            <Card className="bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <CardHeader className="p-0 pb-4 mb-6 border-b border-white/5">
                <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground">Historial de Movimientos de Resoluciones</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-muted-foreground uppercase text-[9px] font-black tracking-wider">
                      <th className="pb-3">Fecha</th>
                      <th className="pb-3">Usuario</th>
                      <th className="pb-3">Tipo de Movimiento</th>
                      <th className="pb-3">Descripción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {resolutionsHistory.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.01]">
                        <td className="py-3.5 font-mono text-slate-400">{item.fecha}</td>
                        <td className="py-3.5 font-bold text-slate-300">{item.usuario}</td>
                        <td className="py-3.5 font-bold text-primary">{item.tipo}</td>
                        <td className="py-3.5 text-slate-400">{item.descripcion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* SUBTAB: MEDIOS DE PAGO */}
        {activeSubTab === "payments" && (
          <motion.div 
            key="payments"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            <Card className="bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <CardHeader className="p-0 pb-4 mb-6 border-b border-white/5">
                <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground">Medios de Pago</CardTitle>
                <CardDescription className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest italic leading-none font-space-grotesk mt-1">Configura y personaliza las alternativas de cobro en tu terminal</CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div className="flex gap-2 max-w-md">
                  <Input 
                    value={newPaymentName} 
                    onChange={(e) => setNewPaymentName(e.target.value)} 
                    placeholder="Ej: Transferencia, Nequi, etc." 
                    className="bg-slate-900 border-white/10 rounded-lg text-xs"
                  />
                  <Button onClick={handleAddPaymentMethod} className="bg-primary text-white uppercase tracking-widest font-space-grotesk text-xs px-4 rounded-lg">
                    <Plus className="w-4 h-4 mr-1" /> Agregar
                  </Button>
                </div>

                <div className="space-y-2 max-w-md pt-2">
                  {paymentMethods.map((method) => (
                    <div key={method} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                      <span className="text-xs font-bold text-slate-300">{method}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemovePaymentMethod(method)}
                        className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* SUBTAB: OBJETIVOS */}
        {activeSubTab === "objectives" && (
          <motion.div 
            key="objectives"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            <Card className="bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <CardHeader className="p-0 pb-4 mb-6 border-b border-white/5">
                <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground">Metas y Objetivos de Facturación</CardTitle>
                <CardDescription className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest italic leading-none font-space-grotesk mt-1">Establece objetivos de venta para tu sucursal</CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Facturado Hoy</Label>
                  <Input type="number" value={objectiveToday} onChange={(e) => setObjectiveToday(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Últimos 7 días</Label>
                  <Input type="number" value={objective7Days} onChange={(e) => setObjective7Days(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Últimos 30 días</Label>
                  <Input type="number" value={objective30Days} onChange={(e) => setObjective30Days(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Año actual</Label>
                  <Input type="number" value={objectiveYear} onChange={(e) => setObjectiveYear(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* SUBTABS COMPLEMENTARIOS: AVANZADO, MONEDA, INTEGRACIONES, CAJAS */}
        {["advanced", "currency", "integrations", "cajas"].includes(activeSubTab) && (
          <motion.div 
            key={activeSubTab}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            <Card className="bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <CardHeader className="p-0 pb-4 mb-6 border-b border-white/5">
                <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground">
                  {activeSubTab === "advanced" && "Parámetros Avanzados"}
                  {activeSubTab === "currency" && "Formato de Moneda"}
                  {activeSubTab === "integrations" && "Módulos e Integraciones ERP"}
                  {activeSubTab === "cajas" && "Terminales de Caja"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 py-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                  Módulo configurado de forma predeterminada para esta sucursal.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón de Sincronización */}
      <div className="flex justify-end pt-6 border-t border-white/5">
        <Button 
          onClick={handleSave} 
          disabled={isLoading}
          className="h-14 px-8 rounded-xl bg-primary text-white font-space-grotesk text-[10px] uppercase font-black tracking-widest hover:opacity-90 shadow-glow-pro"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Sincronizando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar cambios
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

// Target icon custom SVG definition
function TargetIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}