import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Palette, Shield, Building2, Receipt, Database } from "lucide-react";
import BrandingSettings from "@/components/settings/BrandingSettings";
import RolesSettings from "@/components/settings/RolesSettings";
import BusinessSettings from "@/components/settings/BusinessSettings";
import ReceiptTemplateSettings from "@/components/settings/ReceiptTemplateSettings";
import SizesSettings from "@/components/settings/SizesSettings";
import SkuAcronymsSettings from "@/components/settings/SkuAcronymsSettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import ProductTypesMaster from "@/components/settings/ProductTypesMaster";
import { Ruler, Tag, Bell, Box } from "lucide-react";

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = searchParams.get("tab") || "branding";

  const handleTabChange = (value: string) => {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("tab", value);
    if (
      value !== "branding" &&
      value !== "roles" &&
      value !== "business" &&
      value !== "receipts" &&
      value !== "sizes" &&
      value !== "sku" &&
      value !== "notifications" &&
      value !== "product_types"
    ) {
      newSearchParams.delete("tab");
    }
    navigate(`${location.pathname}?${newSearchParams.toString()}`);
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
                <TabsTrigger
                  value="branding"
                  className="shrink-0 lg:w-full justify-start gap-4 h-12 lg:h-14 rounded-2xl font-black font-space-grotesk italic text-[10px] lg:text-[11px] tracking-widest uppercase transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-pro px-4 lg:px-6"
                >
                  <Palette className="w-4 h-4" />
                  Branding
                </TabsTrigger>
                <TabsTrigger
                  value="roles"
                  className="shrink-0 lg:w-full justify-start gap-4 h-12 lg:h-14 rounded-2xl font-black font-space-grotesk italic text-[10px] lg:text-[11px] tracking-widest uppercase transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-pro px-4 lg:px-6"
                >
                  <Shield className="w-4 h-4" />
                  Roles
                </TabsTrigger>
                <TabsTrigger
                  value="business"
                  className="shrink-0 lg:w-full justify-start gap-4 h-12 lg:h-14 rounded-2xl font-black font-space-grotesk italic text-[10px] lg:text-[11px] tracking-widest uppercase transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-pro px-4 lg:px-6"
                >
                  <Building2 className="w-4 h-4" />
                  Negocio
                </TabsTrigger>
                <TabsTrigger
                  value="receipts"
                  className="shrink-0 lg:w-full justify-start gap-4 h-12 lg:h-14 rounded-2xl font-black font-space-grotesk italic text-[10px] lg:text-[11px] tracking-widest uppercase transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-pro px-4 lg:px-6"
                >
                  <Receipt className="w-4 h-4" />
                  Recibos
                </TabsTrigger>
                <TabsTrigger
                  value="sizes"
                  className="shrink-0 lg:w-full justify-start gap-4 h-12 lg:h-14 rounded-2xl font-black font-space-grotesk italic text-[10px] lg:text-[11px] tracking-widest uppercase transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-pro px-4 lg:px-6"
                >
                  <Ruler className="w-4 h-4" />
                  Tamaños
                </TabsTrigger>
                <TabsTrigger
                  value="sku"
                  className="shrink-0 lg:w-full justify-start gap-4 h-12 lg:h-14 rounded-2xl font-black font-space-grotesk italic text-[10px] lg:text-[11px] tracking-widest uppercase transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-pro px-4 lg:px-6"
                >
                  <Tag className="w-4 h-4" />
                  Acrónimos
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  className="shrink-0 lg:w-full justify-start gap-4 h-12 lg:h-14 rounded-2xl font-black font-space-grotesk italic text-[10px] lg:text-[11px] tracking-widest uppercase transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-pro px-4 lg:px-6"
                >
                  <Bell className="w-4 h-4" />
                  Alertas
                </TabsTrigger>
                <TabsTrigger
                  value="product_types"
                  className="shrink-0 lg:w-full justify-start gap-4 h-12 lg:h-14 rounded-2xl font-black font-space-grotesk italic text-[10px] lg:text-[11px] tracking-widest uppercase transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-glow-pro px-4 lg:px-6"
                >
                  <Box className="w-4 h-4" />
                  Master Types
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </Card>

          <div className="flex-1 min-w-0">
             <Card className="glass-pro border-white/10 shadow-pro overflow-hidden p-4 md:p-8 lg:p-12 min-h-[500px] lg:min-h-[600px]">
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
                </Tabs>
             </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}