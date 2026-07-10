import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useDigitalMenu } from "@/hooks/useDigitalMenu";
import { useAuth } from "@/context/AuthContext";
import { OasisMenuHeader } from "@/components/menu/OasisMenuHeader";
import { OasisMenuCategory } from "@/components/menu/OasisMenuCategory";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { useConfigStore } from "@/store/useConfigStore";
import { 
  Phone, Palette, Shield, Building2, Receipt, Ruler, Tag, Bell, Box, 
  Printer, Loader2, Check, Zap, Eye, Trash2, Globe, Clock, CreditCard, 
  User, Checkbox, QrCode, Download, ExternalLink, ChevronDown, ChevronUp,
  Sliders, Laptop, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export default function DigitalMenu() {
  const { storeId, storeName, user, userRole } = useAuth();
  const [searchParams] = useSearchParams();
  const isPreviewMode = searchParams.get("preview") === "true";

  // Si no hay usuario autenticado o está en modo vista previa, renderizar la carta digital de cliente
  const showClientView = !user || isPreviewMode;

  const { categories, reorderCategories, toggleProductVisibility, loading } = useDigitalMenu(
    storeId, 
    !showClientView
  );

  const [activeTab, setActiveTab] = useState<"config" | "products">("config");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedUserToNotify, setSelectedUserToNotify] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Estados del Formulario de Configuración
  const storeConfig = useConfigStore((state) => state.storeConfig) as Record<string, any>;
  const fetchConfig = useConfigStore((state) => state.fetchConfig);
  const updateStoreConfig = useConfigStore((state) => state.updateStoreConfig);

  const [formTheme, setFormTheme] = useState<string>("tema-1");
  const [functionality, setFunctionality] = useState<string>("visualizacion");
  const [kitchenType, setKitchenType] = useState<string>("Jugos y licuados");
  const [commercialName, setCommercialName] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [phones, setPhones] = useState<string>("");
  const [defaultTable, setDefaultTable] = useState<string>("Mesa 1");
  
  // Domicilios & Recogida
  const [deliveryTime, setDeliveryTime] = useState<string>("20 min");
  const [deliveryCost, setDeliveryCost] = useState<string>("");
  const [deliveryMinOrder, setDeliveryMinOrder] = useState<string>("");
  const [pickupTime, setPickupTime] = useState<string>("15 min");
  const [pickupCost, setPickupCost] = useState<string>("");

  // Horarios
  const [hours, setHours] = useState<Record<string, { open: string; close: string }>>({
    lunes: { open: "08:00", close: "22:00" },
    martes: { open: "08:00", close: "22:00" },
    miercoles: { open: "08:00", close: "22:00" },
    jueves: { open: "08:00", close: "22:00" },
    viernes: { open: "08:00", close: "22:00" },
    sabado: { open: "08:00", close: "22:00" },
    domingo: { open: "08:00", close: "22:00" }
  });

  // Medios de pago: Efectivo y Transferencia
  const [paymentCash, setPaymentCash] = useState<boolean>(true);
  const [paymentTransfer, setPaymentTransfer] = useState<boolean>(true);
  const [notifiedUsers, setNotifiedUsers] = useState<string[]>([]);

  // Configuración de Tema Personalizado
  const [customBgColor, setCustomBgColor] = useState<string>("#09090b");
  const [customPrimaryColor, setCustomPrimaryColor] = useState<string>("#9d00ff");
  const [customTextColor, setCustomTextColor] = useState<string>("#ffffff");
  const [customBgStyle, setCustomBgStyle] = useState<string>("classic"); // classic (arrugado) | liso
  const [customFont, setCustomFont] = useState<string>("space-grotesk"); // space-grotesk | sans | caveat

  // Categorías colapsadas para la tab de productos
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (storeId) {
      fetchConfig(storeId);
      const fetchProfiles = async () => {
        const { data } = await supabase.from("profiles").select("id, full_name, email");
        if (data) setProfiles(data);
      };
      fetchProfiles();
    }
  }, [storeId, fetchConfig]);

  // Cargar valores de configuración iniciales
  useEffect(() => {
    if (storeConfig?.digitalMenu) {
      const dm = storeConfig.digitalMenu;
      if (dm.theme_id) setFormTheme(dm.theme_id);
      if (dm.functionality) setFunctionality(dm.functionality);
      if (dm.kitchen_type) setKitchenType(dm.kitchen_type);
      if (dm.commercial_name) setCommercialName(dm.commercial_name);
      if (dm.address) setAddress(dm.address);
      if (dm.phones) setPhones(dm.phones);
      if (dm.default_table) setDefaultTable(dm.default_table);
      
      if (dm.delivery) {
        setDeliveryTime(dm.delivery.estimated_time || "20 min");
        setDeliveryCost(dm.delivery.cost?.toString() || "");
        setDeliveryMinOrder(dm.delivery.min_order?.toString() || "");
      }
      if (dm.pickup) {
        setPickupTime(dm.pickup.estimated_time || "15 min");
        setPickupCost(dm.pickup.cost?.toString() || "");
      }
      if (dm.opening_hours) {
        setHours(dm.opening_hours);
      }
      if (dm.payment_methods) {
        setPaymentCash(!!dm.payment_methods.cash);
        setPaymentTransfer(!!dm.payment_methods.transfer);
      }
      if (dm.notification_users) {
        setNotifiedUsers(dm.notification_users);
      }
      if (dm.custom_theme) {
        setCustomBgColor(dm.custom_theme.bg_color || "#09090b");
        setCustomPrimaryColor(dm.custom_theme.primary_color || "#9d00ff");
        setCustomTextColor(dm.custom_theme.text_color || "#ffffff");
        setCustomBgStyle(dm.custom_theme.bg_style || "liso");
        setCustomFont(dm.custom_theme.font || "sans");
      }
    } else if (storeName) {
      setCommercialName(storeName);
    }
  }, [storeConfig, storeName]);

  // Función para obtener los estilos aplicados al tema actual
  const getThemeStyles = (themeId: string) => {
    if (themeId === "tema-1") {
      return { bg: "#09090b", primary: "#9d00ff", text: "#ffffff", font: "font-space-grotesk", style: "classic" };
    }
    if (themeId === "tema-2") {
      return { bg: "#0b0f19", primary: "#0ea5e9", text: "#f8fafc", font: "font-sans", style: "liso" };
    }
    if (themeId === "tema-3") {
      return { bg: "#fffbeb", primary: "#ff5722", text: "#78350f", font: "font-caveat", style: "liso" };
    }
    if (themeId === "tema-4") {
      return { bg: "#f0fdf4", primary: "#10b981", text: "#064e3b", font: "font-sans", style: "liso" };
    }
    if (themeId === "tema-5") {
      return { bg: "#f0f9ff", primary: "#06b6d4", text: "#0c4a6e", font: "font-space-grotesk", style: "liso" };
    }
    // Personalizado
    return {
      bg: customBgColor,
      primary: customPrimaryColor,
      text: customTextColor,
      font: customFont === "caveat" ? "font-caveat" : customFont === "space-grotesk" ? "font-space-grotesk" : "font-sans",
      style: customBgStyle
    };
  };

  const activeStyles = getThemeStyles(formTheme);

  const handleSaveConfig = async () => {
    if (!storeId) return;
    setIsSaving(true);

    const updatedConfig = {
      ...storeConfig,
      digitalMenu: {
        theme_id: formTheme,
        functionality,
        kitchen_type: kitchenType,
        commercial_name: commercialName,
        country: "Colombia",
        address,
        phones,
        default_table: defaultTable,
        delivery: {
          estimated_time: deliveryTime,
          cost: parseFloat(deliveryCost) || 0,
          min_order: parseFloat(deliveryMinOrder) || 0
        },
        pickup: {
          estimated_time: pickupTime,
          cost: parseFloat(pickupCost) || 0
        },
        opening_hours: hours,
        payment_methods: {
          cash: paymentCash,
          transfer: paymentTransfer
        },
        notification_users: notifiedUsers,
        custom_theme: {
          bg_color: customBgColor,
          primary_color: customPrimaryColor,
          text_color: customTextColor,
          bg_style: customBgStyle,
          font: customFont
        }
      }
    };

    try {
      await updateStoreConfig(storeId, updatedConfig);
      toast.success("Configuración del Menú Digital guardada con éxito.");
    } catch (err) {
      console.error("Error saving digital menu config:", err);
      toast.error("Error al guardar la configuración.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNotifiedUser = () => {
    if (!selectedUserToNotify) return;
    if (notifiedUsers.includes(selectedUserToNotify)) {
      toast.warning("El usuario ya está asignado para recibir notificaciones.");
      return;
    }
    setNotifiedUsers(prev => [...prev, selectedUserToNotify]);
    setSelectedUserToNotify("");
  };

  const handleRemoveNotifiedUser = (id: string) => {
    setNotifiedUsers(prev => prev.filter(uId => uId !== id));
  };

  const businessUrl = `${window.location.origin}/digital-menu?preview=true`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(businessUrl)}`;

  // VISTA DEL CLIENTE (CARTA DIGITAL PÚBLICA CON ESTILOS DINÁMICOS)
  if (showClientView) {
    const isChalkboard = activeStyles.style === "classic";
    const fontClass = activeStyles.font;

    return (
      <div 
        className={cn("min-h-screen overflow-x-hidden relative menu-client-view", fontClass)}
        style={{ backgroundColor: activeStyles.bg, color: activeStyles.text }}
      >
        {/* Dynamic Theme Styles Injected Local to Client View */}
        <style>{`
          .menu-client-view .text-primary {
            color: ${activeStyles.primary} !important;
          }
          .menu-client-view .bg-primary {
            background-color: ${activeStyles.primary} !important;
          }
          .menu-client-view .border-primary {
            border-color: ${activeStyles.primary} !important;
          }
          .menu-client-view .category-tab-active {
            background-color: ${activeStyles.primary} !important;
            color: ${activeStyles.bg === '#fffbeb' || activeStyles.bg === '#f0fdf4' || activeStyles.bg === '#f0f9ff' ? '#ffffff' : '#000000'} !important;
          }
        `}</style>

        {isChalkboard && (
          <div className="fixed inset-0 pointer-events-none opacity-[0.12] mix-blend-overlay z-0" 
               style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/black-paper.png')` }}></div>
        )}

        <OasisMenuHeader 
          storeName={commercialName || storeName} 
          theme="classic" // bypass default headers to force injected theme
          onThemeChange={() => {}} 
          canChangeTheme={false} 
        />

        <main className="container max-w-7xl mx-auto px-4 md:px-8 pb-24 relative z-10">
          {loading ? (
            <div className="space-y-16">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-12 w-64 bg-white/5 rounded-lg mb-8"></div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-32 bg-white/5 rounded-[2rem] border border-white/5"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map((category) => (
                <OasisMenuCategory key={category.code} category={category} theme="classic" />
              ))}
              
              {categories.length === 0 && (
                <div className="text-center py-24">
                  <p className="font-caveat text-3xl opacity-40">
                    No hay productos configurados como públicos para mostrar en el menú.
                  </p>
                </div>
              )}
            </div>
          )}
        </main>

        <footer id="contacto" className="w-full py-10 px-6 md:px-12 mt-16 border-t border-white/5 opacity-80" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
          <div className="container max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest font-space-grotesk">Contacto</h4>
              <div className="flex items-center gap-2 text-sm font-bold opacity-80">
                <Phone className="w-4 h-4" />
                <span>{phones || "3107112503"}</span>
              </div>
            </div>
            
            <div className="flex flex-col items-start md:items-end gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold opacity-60">Hecho para</span>
                <span className="text-xs font-black uppercase tracking-widest text-primary">
                  {commercialName || storeName || "Loggro"}
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // VISTA ADMINISTRATIVA (PANEL DE GESTIÓN DEL MENÚ DIGITAL)
  return (
    <Layout>
      <div className="space-y-8 w-full p-4 md:p-8">
        {/* Cabecera Principal */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-6 pb-6 border-b border-white/5 relative">
          <div className="animate-pro-in">
            <h1 className="text-2xl sm:text-4xl font-black font-space-grotesk italic tracking-tighter uppercase text-foreground mb-2">
              Gestión de <span className="text-primary italic">Menú Digital</span>
            </h1>
            <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-muted-foreground/40 font-space-grotesk italic">
              Configura tu carta pública y la toma de pedidos en línea
            </p>
          </div>
          <Button
            onClick={() => window.open(businessUrl, "_blank")}
            className="flex items-center gap-2 font-space-grotesk text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl border border-primary/20 hover:border-primary/50 shadow-glow-pro"
          >
            <Eye className="w-4 h-4" />
            Vista Previa
          </Button>
        </div>

        {/* Tabs de Navegación del Panel */}
        <div className="flex gap-2 border-b border-white/5 pb-4">
          <Button
            variant={activeTab === "config" ? "default" : "ghost"}
            onClick={() => setActiveTab("config")}
            className={cn(
              "font-space-grotesk text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl",
              activeTab === "config" ? "bg-primary text-white shadow-glow-pro" : "text-muted-foreground hover:text-white"
            )}
          >
            Configuración
          </Button>
          <Button
            variant={activeTab === "products" ? "default" : "ghost"}
            onClick={() => setActiveTab("products")}
            className={cn(
              "font-space-grotesk text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl",
              activeTab === "products" ? "bg-primary text-white shadow-glow-pro" : "text-muted-foreground hover:text-white"
            )}
          >
            Productos
          </Button>
        </div>

        {/* CONTENIDO TAB: CONFIGURACIÓN */}
        {activeTab === "config" && (
          <div className="space-y-6 animate-pro-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Bloque 1: Información básica del negocio */}
              <Card className="lg:col-span-8 bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                <CardHeader className="p-0 pb-4 mb-4 border-b border-white/5">
                  <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground">
                    Información del Negocio
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Enlace de tu menú digital:</span>
                    <a 
                      href={businessUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 break-all"
                    >
                      {businessUrl} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Elige un tema para tu Menú Digital</Label>
                      <select 
                        value={formTheme}
                        onChange={(e) => setFormTheme(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                      >
                        <option value="tema-1">Tema 1 (Pekao Cyber)</option>
                        <option value="tema-2">Tema 2 (Azul gamer)</option>
                        <option value="tema-3">Tema 3 (Sunset Mango)</option>
                        <option value="tema-4">Tema 4 (Nature Fresh)</option>
                        <option value="tema-5">Tema 5 (Ice Spark)</option>
                        <option value="personalizado">Personalizado / Crear Tema</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Funcionalidad del Menú Digital</Label>
                      <select 
                        value={functionality}
                        onChange={(e) => setFunctionality(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                      >
                        <option value="visualizacion">Sólo visualización de carta</option>
                        <option value="pedidos">Para toma de pedidos</option>
                      </select>
                    </div>
                  </div>

                  {/* Panel Especial: Personalizador de Tema Cromático */}
                  {formTheme === "personalizado" && (
                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4 animate-pro-in">
                      <div className="flex items-center gap-2 border-b border-primary/10 pb-2 mb-2">
                        <Sliders className="w-4 h-4 text-primary" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary italic">Constructor de Temas Personalizados</h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-300">Color de Fondo</Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="color" 
                              value={customBgColor} 
                              onChange={(e) => setCustomBgColor(e.target.value)} 
                              className="w-8 h-8 p-0 rounded-md border-0 cursor-pointer"
                            />
                            <span className="text-[10px] font-mono font-bold uppercase">{customBgColor}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-300">Color Primario / Acento</Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="color" 
                              value={customPrimaryColor} 
                              onChange={(e) => setCustomPrimaryColor(e.target.value)} 
                              className="w-8 h-8 p-0 rounded-md border-0 cursor-pointer"
                            />
                            <span className="text-[10px] font-mono font-bold uppercase">{customPrimaryColor}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-300">Color de Texto</Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="color" 
                              value={customTextColor} 
                              onChange={(e) => setCustomTextColor(e.target.value)} 
                              className="w-8 h-8 p-0 rounded-md border-0 cursor-pointer"
                            />
                            <span className="text-[10px] font-mono font-bold uppercase">{customTextColor}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-300">Estilo de Fondo</Label>
                          <select 
                            value={customBgStyle}
                            onChange={(e) => setCustomBgStyle(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs text-foreground"
                          >
                            <option value="liso">Fondo Liso / Plano</option>
                            <option value="classic">Chalkboard (Papel arrugado)</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-300">Tipografía</Label>
                          <select 
                            value={customFont}
                            onChange={(e) => setCustomFont(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs text-foreground"
                          >
                            <option value="sans">Sans (Moderna / Limpia)</option>
                            <option value="space-grotesk">Space Grotesk (Gamer / Digital)</option>
                            <option value="caveat">Caveat (Manuscrito / Cálido)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Tipo de Cocina</Label>
                      <select 
                        value={kitchenType}
                        onChange={(e) => setKitchenType(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                      >
                        <option value="Jugos y licuados">Jugos y licuados</option>
                        <option value="Comida Rápida">Comida Rápida</option>
                        <option value="Cafetería">Cafetería</option>
                        <option value="Bebidas / Granizados">Bebidas / Granizados</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Nombre Comercial</Label>
                      <Input 
                        value={commercialName} 
                        onChange={(e) => setCommercialName(e.target.value)} 
                        className="bg-slate-900 border-white/10 rounded-lg text-xs" 
                        placeholder="Nombre comercial de la tienda"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Dirección del Negocio</Label>
                      <Input 
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)} 
                        className="bg-slate-900 border-white/10 rounded-lg text-xs" 
                        placeholder="Dirección física"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Teléfono(s)</Label>
                      <Input 
                        value={phones} 
                        onChange={(e) => setPhones(e.target.value)} 
                        className="bg-slate-900 border-white/10 rounded-lg text-xs" 
                        placeholder="Teléfonos de contacto"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Mesa Por Defecto</Label>
                      <select 
                        value={defaultTable}
                        onChange={(e) => setDefaultTable(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                      >
                        <option value="Mesa 1">Mesa 1</option>
                        <option value="Mesa 2">Mesa 2</option>
                        <option value="Mesa 3">Mesa 3</option>
                        <option value="Mesa 4">Mesa 4</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bloque 2: VISTA PREVIA DEL TEMA (WYSIWYG INTERACTIVO) */}
              <Card className="lg:col-span-4 bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between overflow-hidden relative">
                <CardHeader className="p-0 pb-4 mb-4 border-b border-white/5">
                  <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-primary" />
                    Vista Previa del Tema
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col items-center justify-center gap-4">
                  
                  {/* Smartphone Frame */}
                  <div 
                    className="w-full max-w-[240px] h-72 rounded-[2rem] border-4 border-slate-800 shadow-[0_0_25px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col relative transition-all duration-300"
                    style={{ backgroundColor: activeStyles.bg }}
                  >
                    {activeStyles.style === "classic" && (
                      <div className="absolute inset-0 pointer-events-none opacity-[0.10] mix-blend-overlay z-0" 
                           style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/black-paper.png')` }}></div>
                    )}
                    
                    {/* Speaker/Camera notch */}
                    <div className="w-24 h-4 bg-slate-800 absolute top-0 left-1/2 -translate-x-1/2 rounded-b-xl z-20" />
                    
                    {/* Simulated Content */}
                    <div className={cn("p-4 pt-6 space-y-4 flex-1 flex flex-col justify-between select-none relative z-10", activeStyles.font)}>
                      <div className="space-y-1">
                        <span className="text-[7px] uppercase tracking-widest opacity-40">Categoría</span>
                        <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: activeStyles.primary }}>
                          🥤 Granizados
                        </h4>
                      </div>

                      {/* Card de Producto de Previsualización */}
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h5 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: activeStyles.text }}>
                              Mango Biche
                            </h5>
                            <p className="text-[7px] opacity-60 leading-tight mt-0.5" style={{ color: activeStyles.text }}>
                              Con limón, sal y pimienta.
                            </p>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-slate-900/50 flex items-center justify-center text-[10px] border border-white/5">
                            🥭
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-white/5">
                          <span className="text-[9px] font-black" style={{ color: activeStyles.primary }}>
                            $8.500
                          </span>
                          <span className="text-[7px] bg-emerald-500/10 text-emerald-400 px-1 py-0.5 rounded font-black uppercase">
                            Disponible
                          </span>
                        </div>
                      </div>

                      {/* Footer miniatura */}
                      <div className="text-center opacity-40 border-t border-white/5 pt-1.5">
                        <p className="text-[6px] uppercase tracking-widest" style={{ color: activeStyles.text }}>
                          {commercialName || "Pekao"} • Click para Pedir
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-primary italic flex items-center justify-center gap-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin-slow" />
                      Visualización WYSIWYG
                    </p>
                    <p className="text-[8px] text-muted-foreground uppercase tracking-widest font-bold">
                      Los cambios cromáticos se reflejan al instante
                    </p>
                  </div>

                </CardContent>
              </Card>
            </div>

            {/* Configuración de Domicilios, Recogida y Horarios */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Domicilios & Recoger en sitio */}
              <Card className="lg:col-span-6 bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                <CardHeader className="p-0 pb-4 mb-4 border-b border-white/5">
                  <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    Domicilios & Entregas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary italic">A Domicilio</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase tracking-wider">Tiempo Estimado</Label>
                        <select 
                          value={deliveryTime}
                          onChange={(e) => setDeliveryTime(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-foreground"
                        >
                          <option value="15 min">15 min</option>
                          <option value="20 min">20 min</option>
                          <option value="30 min">30 min</option>
                          <option value="45 min">45 min</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase tracking-wider">Costo Envío</Label>
                        <Input 
                          type="number"
                          value={deliveryCost} 
                          onChange={(e) => setDeliveryCost(e.target.value)} 
                          className="bg-slate-900 border-white/10 rounded-lg text-xs" 
                          placeholder="Gratis"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase tracking-wider">Orden Mínima</Label>
                        <Input 
                          type="number"
                          value={deliveryMinOrder} 
                          onChange={(e) => setDeliveryMinOrder(e.target.value)} 
                          className="bg-slate-900 border-white/10 rounded-lg text-xs" 
                          placeholder="No tiene"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary italic">Recoger en Sitio</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase tracking-wider">Tiempo Estimado</Label>
                        <select 
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-foreground"
                        >
                          <option value="10 min">10 min</option>
                          <option value="15 min">15 min</option>
                          <option value="20 min">20 min</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase tracking-wider">Costo</Label>
                        <Input 
                          type="number"
                          value={pickupCost} 
                          onChange={(e) => setPickupCost(e.target.value)} 
                          className="bg-slate-900 border-white/10 rounded-lg text-xs" 
                          placeholder="Gratis"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Horarios de Atención */}
              <Card className="lg:col-span-6 bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                <CardHeader className="p-0 pb-4 mb-4 border-b border-white/5">
                  <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Horarios de Atención
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-3">
                  {Object.keys(hours).map((day) => (
                    <div key={day} className="flex items-center justify-between gap-4 py-1 border-b border-white/[0.02] last:border-0">
                      <span className="text-[10px] font-black uppercase tracking-widest w-24 text-slate-300 italic">{day}</span>
                      <div className="flex items-center gap-2 flex-1 max-w-[240px]">
                        <Input 
                          type="time" 
                          value={hours[day].open} 
                          onChange={(e) => setHours(prev => ({
                            ...prev,
                            [day]: { ...prev[day], open: e.target.value }
                          }))}
                          className="bg-slate-900 border-white/10 text-xs h-8"
                        />
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">a</span>
                        <Input 
                          type="time" 
                          value={hours[day].close} 
                          onChange={(e) => setHours(prev => ({
                            ...prev,
                            [day]: { ...prev[day], close: e.target.value }
                          }))}
                          className="bg-slate-900 border-white/10 text-xs h-8"
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Medios de Pago & Usuarios Notificados & Descarga QR */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Medios de pago: Efectivo y Transferencia */}
              <Card className="lg:col-span-6 bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                <CardHeader className="p-0 pb-4 mb-4 border-b border-white/5">
                  <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-cyan-400" />
                    Medios de Pago Aceptados
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex items-center gap-12 py-4">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="pay-cash" 
                      checked={paymentCash} 
                      onChange={(e) => setPaymentCash(e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary focus:ring-0 cursor-pointer"
                    />
                    <Label htmlFor="pay-cash" className="text-xs font-bold uppercase tracking-wider text-slate-300 cursor-pointer">Efectivo</Label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="pay-transfer" 
                      checked={paymentTransfer} 
                      onChange={(e) => setPaymentTransfer(e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary focus:ring-0 cursor-pointer"
                    />
                    <Label htmlFor="pay-transfer" className="text-xs font-bold uppercase tracking-wider text-slate-300 cursor-pointer">Transferencia</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Notificar Pedidos a */}
              <Card className="lg:col-span-6 bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                <CardHeader className="p-0 pb-4 mb-4 border-b border-white/5">
                  <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground flex items-center gap-2">
                    <Bell className="w-4 h-4 text-pink-500 animate-swing" />
                    Notificar nuevos pedidos a:
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                  <div className="flex gap-2">
                    <select 
                      value={selectedUserToNotify}
                      onChange={(e) => setSelectedUserToNotify(e.target.value)}
                      className="flex-1 bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Selecciona un usuario...</option>
                      {profiles.map(p => (
                        <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                      ))}
                    </select>
                    <Button 
                      type="button" 
                      onClick={handleAddNotifiedUser}
                      className="bg-primary text-white text-xs uppercase tracking-widest px-4 font-space-grotesk rounded-lg"
                    >
                      Agregar
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {notifiedUsers.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground uppercase font-bold text-center py-4 bg-white/[0.02] rounded-xl border border-dashed border-white/5">
                        No tiene usuarios asignados para recibir notificaciones.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {notifiedUsers.map(uId => {
                          const profile = profiles.find(p => p.id === uId);
                          return (
                            <div key={uId} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5">
                              <span className="text-xs font-bold text-slate-300">
                                {profile ? profile.full_name || profile.email : "Usuario cargando..."}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveNotifiedUser(uId)}
                                className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Código QR de Domicilio */}
            <Card className="bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col md:flex-row items-center gap-8">
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
                <img src={qrCodeUrl} alt="Menú QR" className="w-36 h-36 rounded-xl" />
              </div>
              <div className="flex-1 space-y-3 text-center md:text-left">
                <h4 className="text-sm font-black uppercase tracking-widest text-primary italic">Descarga tú código QR y pégalo en un lugar visible:</h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-wider font-semibold">
                  Descarga el código QR, imprímelo y pégalo en un lugar visible para tus clientes. Los clientes que vean el código pueden con la cámara de su celular escanearlo y los dirigirá a tu Menú Digital para que realicen pedidos.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <a 
                    href={qrCodeUrl} 
                    download="codigo_qr_menu.png" 
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 bg-primary text-white font-space-grotesk text-xs uppercase tracking-widest py-3 px-6 rounded-xl shadow-glow-pro hover:opacity-90"
                  >
                    <Download className="w-4 h-4" />
                    Descargar QR
                  </a>
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(businessUrl);
                      toast.success("Enlace del Menú copiado al portapapeles.");
                    }}
                    className="border-white/10 bg-white/5 font-space-grotesk text-xs uppercase tracking-widest px-6"
                  >
                    Copiar Enlace
                  </Button>
                </div>
              </div>
            </Card>

            {/* Botón de Guardar General */}
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="bg-primary text-white font-space-grotesk text-xs uppercase tracking-widest px-8 py-3 rounded-xl shadow-glow-pro"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Guardar Configuración
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* CONTENIDO TAB: PRODUCTOS */}
        {activeTab === "products" && (
          <div className="space-y-6 animate-pro-in">
            {categories.map((category) => {
              const isCollapsed = !!collapsedCategories[category.code];
              
              return (
                <Card key={category.code} className="bg-slate-950/40 border border-white/10 rounded-2xl overflow-hidden shadow-pro">
                  {/* Cabecera de Categoría con Toggle de Colapsado */}
                  <div 
                    onClick={() => setCollapsedCategories(prev => ({
                      ...prev,
                      [category.code]: !isCollapsed
                    }))}
                    className="flex items-center justify-between p-4 cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] border-b border-white/5 select-none"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{category.emoji_icon || "📦"}</span>
                      <div>
                        <h3 className="font-space-grotesk font-black text-sm uppercase tracking-widest text-foreground">
                          {category.label}
                        </h3>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                          {category.items.length} {category.items.length === 1 ? "Producto" : "Productos"}
                        </p>
                      </div>
                    </div>
                    {isCollapsed ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronUp className="w-5 h-5 text-muted-foreground" />}
                  </div>

                  {/* Lista de Productos */}
                  {!isCollapsed && (
                    <CardContent className="p-0 divide-y divide-white/5">
                      {category.items.map((product) => (
                        <div key={product.id} className="flex items-center justify-between gap-4 p-4 hover:bg-white/[0.01] transition-colors">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                              {product.images && product.images.length > 0 ? (
                                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-lg">🍔</span>
                              )}
                            </div>
                            
                            <div className="space-y-0.5 max-w-xl">
                              <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                                {product.name}
                              </h4>
                              {product.description && (
                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed line-clamp-2">
                                  {product.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-6 shrink-0">
                            <span className="text-xs font-bold text-primary">
                              ${Number(product.price).toLocaleString('es-CO')}
                            </span>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">
                                {product.is_public ? "Público" : "Oculto"}
                              </span>
                              <Switch 
                                checked={!!product.is_public}
                                onCheckedChange={() => toggleProductVisibility(product.id, !!product.is_public)}
                                className="data-[state=checked]:bg-primary"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  )}
                </Card>
              );
            })}

            {categories.length === 0 && (
              <div className="text-center py-24 bg-slate-950/20 border border-dashed border-white/5 rounded-2xl">
                <p className="font-caveat text-3xl text-white/40">
                  No hay productos activos configurados en esta sucursal.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
