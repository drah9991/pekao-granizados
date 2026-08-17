import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useDigitalMenu } from "@/hooks/useDigitalMenu";
import { useAuth } from "@/context/AuthContext";
import { useDigitalMenuConfigForm } from "@/hooks/useDigitalMenuConfigForm";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { DigitalMenuClientView } from "@/components/menu/DigitalMenuClientView";
import { DigitalMenuConfigTab } from "@/components/menu/DigitalMenuConfigTab";
import { DigitalMenuProductsTab } from "@/components/menu/DigitalMenuProductsTab";

export default function DigitalMenu() {
  const { storeId, storeName, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPreviewMode = searchParams.get("preview") === "true";

  // Si se pasa 'store' en la URL (cliente), usar ese storeId; si no, usar el del contexto de autenticación
  const queryStoreId = searchParams.get("store");
  const effectiveStoreId = queryStoreId || storeId;

  // Lista de sucursales para el alternador responsive de cliente
  const [storesList, setStoresList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchStores = async () => {
      const { data } = await supabase.from("stores").select("id, name").order("name");
      if (data) {
        setStoresList(data);
      }
    };
    fetchStores();
  }, []);

  const handleStoreChange = (newStoreId: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("store", newStoreId);
    setSearchParams(newParams);
  };

  // Si no hay usuario autenticado o está en modo vista previa, renderizar la carta digital de cliente
  const showClientView = !user || isPreviewMode;

  const { categories, toggleProductVisibility, loading } = useDigitalMenu(
    effectiveStoreId,
    !showClientView
  );

  const [activeTab, setActiveTab] = useState<"config" | "products">("config");

  // Categorías colapsadas para la tab de productos
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Estado y lógica del formulario de configuración del Menú Digital
  const form = useDigitalMenuConfigForm(effectiveStoreId, storeName);

  const businessUrl = `${window.location.origin}/digital-menu?preview=true${effectiveStoreId ? `&store=${effectiveStoreId}` : ""}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(businessUrl)}`;

  // VISTA DEL CLIENTE (CARTA DIGITAL PÚBLICA CON ESTILOS DINÁMICOS)
  if (showClientView) {
    return (
      <DigitalMenuClientView
        storeName={storeName}
        commercialName={form.commercialName}
        phones={form.phones}
        activeStyles={form.activeStyles}
        formTheme={form.formTheme}
        storesList={storesList}
        effectiveStoreId={effectiveStoreId}
        onStoreChange={handleStoreChange}
        categories={categories}
        loading={loading}
      />
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
          <DigitalMenuConfigTab form={form} businessUrl={businessUrl} qrCodeUrl={qrCodeUrl} />
        )}

        {/* CONTENIDO TAB: PRODUCTOS */}
        {activeTab === "products" && (
          <DigitalMenuProductsTab
            categories={categories}
            collapsedCategories={collapsedCategories}
            setCollapsedCategories={setCollapsedCategories}
            toggleProductVisibility={toggleProductVisibility}
          />
        )}
      </div>
    </Layout>
  );
}
