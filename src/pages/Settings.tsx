import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Palette, Shield, Building2, Receipt } from "lucide-react";
import BrandingSettings from "@/components/settings/BrandingSettings";
import RolesSettings from "@/components/settings/RolesSettings";
import BusinessSettings from "@/components/settings/BusinessSettings";
import ReceiptTemplateSettings from "@/components/settings/ReceiptTemplateSettings";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("branding");

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
            Configuración del Sistema
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Personaliza tu negocio y gestiona permisos
          </p>
        </div>

        <Card className="border-2 shadow-card">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-2 p-2 bg-muted/30">
              <TabsTrigger 
                value="branding" 
                className="flex items-center gap-2 data-[state=active]:gradient-primary data-[state=active]:text-white"
              >
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">Branding</span>
              </TabsTrigger>
              <TabsTrigger 
                value="roles" 
                className="flex items-center gap-2 data-[state=active]:gradient-secondary data-[state=active]:text-white"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Roles</span>
              </TabsTrigger>
              <TabsTrigger 
                value="business" 
                className="flex items-center gap-2 data-[state=active]:gradient-accent data-[state=active]:text-white"
              >
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">Negocio</span>
              </TabsTrigger>
              <TabsTrigger 
                value="receipts" 
                className="flex items-center gap-2 data-[state=active]:gradient-primary data-[state=active]:text-white"
              >
                <Receipt className="w-4 h-4" />
                <span className="hidden sm:inline">Recibos</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="branding" className="p-6">
              <BrandingSettings />
            </TabsContent>

            <TabsContent value="roles" className="p-6">
              <RolesSettings />
            </TabsContent>

            <TabsContent value="business" className="p-6">
              <BusinessSettings />
            </TabsContent>

            <TabsContent value="receipts" className="p-6">
              <ReceiptTemplateSettings />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </Layout>
  );
}
