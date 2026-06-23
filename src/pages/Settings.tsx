import React, { useState, useEffect, lazy, Suspense } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Palette, Shield, Building2, Receipt, Ruler, Tag, Bell, Box, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useConfigStore } from "@/store/useConfigStore";

// Lazy loading components for performance optimization
const BrandingSettings = lazy(() => import("@/components/settings/BrandingSettings"));
const RolesSettings = lazy(() => import("@/components/settings/RolesSettings"));
const BusinessSettings = lazy(() => import("@/components/settings/BusinessSettings"));
const ReceiptTemplateSettings = lazy(() => import("@/components/settings/ReceiptTemplateSettings"));
const SizesSettings = lazy(() => import("@/components/settings/SizesSettings"));
const SkuAcronymsSettings = lazy(() => import("@/components/settings/SkuAcronymsSettings"));
const NotificationSettings = lazy(() => import("@/components/settings/NotificationSettings"));
const ProductTypesMaster = lazy(() => import("@/components/settings/ProductTypesMaster"));
const CategoryManager = lazy(() => import("@/components/settings/CategoryManager"));

const TabLoadingSkeleton = () => (
    <div className="flex flex-col items-center justify-center py-24 gap-6 animate-pro-in">
        <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-primary shadow-glow-pro" />
            <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse rounded-full" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-primary italic animate-pulse">
            Sincronizando Módulos de Control...
        </p>
    </div>
);

export default function Settings() {
  const { storeId } = useAuth();
  const fetchConfig = useConfigStore((state) => state.fetchConfig);

  useEffect(() => {
    if (storeId) {
      fetchConfig(storeId);
    }
  }, [storeId, fetchConfig]);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = searchParams.get("tab") || "branding";

  const handleTabChange = (value: string) => {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("tab", value);
    
    const validTabs = ["branding", "roles", "business", "receipts", "sizes", "sku", "notifications", "product_types", "categories"];
    if (!validTabs.includes(value)) {
      newSearchParams.delete("tab");
    }
    
    navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-10 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10 pb-8 border-b border-white/5 relative">
          <div className="hidden md:block absolute -left-6 lg:-left-12 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary via-primary/50 to-transparent rounded-full shadow-glow-pro" />
          <div className="animate-pro-in">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black font-space-grotesk italic tracking-tighter uppercase text-foreground mb-2">
              CONFIGURACIÓN <span className="text-primary text-glow italic">SISTEMA</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 font-space-grotesk italic">
               Master Control Panel • Pro Max Environment
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          <Card className="lg:w-80 shrink-0 glass-pro border-white/10 shadow-pro overflow-hidden h-fit lg:sticky lg:top-24">
            <Tabs value={activeTab} onValueChange={handleTabChange} orientation="vertical" className="w-full">
              <TabsList className="flex flex-row lg:flex-col h-auto bg-transparent gap-1 p-2 lg:p-4 overflow-x-auto lg:overflow-visible no-scrollbar">
                {[
                  { value: "branding", label: "Branding", icon: Palette },
                  { value: "roles", label: "Roles", icon: Shield },
                  { value: "business", label: "Negocio", icon: Building2 },
                  { value: "receipts", label: "Recibos", icon: Receipt },
                  { value: "sizes", label: "Tamaños", icon: Ruler },
                  { value: "sku", label: "Acrónimos", icon: Tag },
                  { value: "notifications", label: "Alertas", icon: Bell },
                  { value: "product_types", label: "Tipos Operativos", icon: Box },
                  { value: "categories", label: "Categorías ERP", icon: Tag },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="shrink-0 lg:w-full justify-start gap-4 h-12 lg:h-14 rounded-2xl font-black font-space-grotesk italic text-[10px] lg:text-[11px] tracking-widest uppercase transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-pro px-4 lg:px-6"
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </Card>

          <div className="flex-1 min-w-0">
             <Card className="glass-pro border-white/10 shadow-pro overflow-hidden p-4 md:p-8 lg:p-12 min-h-[500px] lg:min-h-[600px]">
                <Suspense fallback={<TabLoadingSkeleton />}>
                    <Tabs value={activeTab} className="w-full">
                        <TabsContent value="branding" className="m-0 animate-pro-in">
                            <BrandingSettings />
                        </TabsContent>

                        <TabsContent value="roles" className="m-0 animate-pro-in">
                            <RolesSettings />
                        </TabsContent>

                        <TabsContent value="business" className="m-0 animate-pro-in">
                            <BusinessSettings />
                        </TabsContent>

                        <TabsContent value="receipts" className="m-0 animate-pro-in">
                            <ReceiptTemplateSettings />
                        </TabsContent>

                        <TabsContent value="sizes" className="m-0 animate-pro-in">
                            <SizesSettings />
                        </TabsContent>

                        <TabsContent value="sku" className="m-0 animate-pro-in">
                            <SkuAcronymsSettings />
                        </TabsContent>

                        <TabsContent value="notifications" className="m-0 animate-pro-in">
                            <NotificationSettings />
                        </TabsContent>

                        <TabsContent value="product_types" className="m-0 animate-pro-in">
                            <ProductTypesMaster />
                        </TabsContent>

                        <TabsContent value="categories" className="m-0 animate-pro-in">
                            <CategoryManager />
                        </TabsContent>
                    </Tabs>
                </Suspense>
             </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}