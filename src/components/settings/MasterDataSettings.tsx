import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ClipboardList, Users as UsersIcon, Store as StoreIcon, Ruler, Database, Tag } from "lucide-react"; // Added Tag icon
import Products from "@/pages/Products";
import Inventory from "@/pages/Inventory";
import Users from "@/pages/Users";
import Stores from "@/pages/Stores";
import SizesSettings from "@/components/settings/SizesSettings";
import SkuAcronymsSettings from "@/components/settings/SkuAcronymsSettings"; // Import the new component

export default function MasterDataSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const activeSubTab = searchParams.get("subtab") || "products";

  const handleSubTabChange = (value: string) => {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("subtab", value);
    navigate(`${location.pathname}?${newSearchParams.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Maestros del Sistema</h2>
        <p className="text-muted-foreground">
          Gestiona los datos principales de tu negocio: productos (incluyendo toppings, sachets y dulces), inventario, usuarios, tiendas, tamaños y acrónimos SKU.
        </p>
      </div>

      <Tabs value={activeSubTab} onValueChange={handleSubTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto gap-2 p-2 bg-muted/30"> {/* Updated grid-cols to 6 */}
          <TabsTrigger
            value="products"
            className="flex items-center gap-2 data-[state=active]:gradient-primary data-[state=active]:text-white"
          >
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Productos</span>
          </TabsTrigger>
          <TabsTrigger
            value="inventory"
            className="flex items-center gap-2 data-[state=active]:gradient-secondary data-[state=active]:text-white"
          >
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Inventario</span>
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="flex items-center gap-2 data-[state=active]:gradient-accent data-[state=active]:text-white"
          >
            <UsersIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Usuarios</span>
          </TabsTrigger>
          <TabsTrigger
            value="stores"
            className="flex items-center gap-2 data-[state=active]:gradient-primary data-[state=active]:text-white"
          >
            <StoreIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Tiendas</span>
          </TabsTrigger>
          <TabsTrigger
            value="sizes"
            className="flex items-center gap-2 data-[state=active]:gradient-secondary data-[state=active]:text-white"
          >
            <Ruler className="w-4 h-4" />
            <span className="hidden sm:inline">Tamaños</span>
          </TabsTrigger>
          <TabsTrigger
            value="sku-acronyms" {/* New tab for SKU Acronyms */}
            className="flex items-center gap-2 data-[state=active]:gradient-accent data-[state=active]:text-white"
          >
            <Tag className="w-4 h-4" />
            <span className="hidden sm:inline">Acrónimos SKU</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="p-0">
          <Products />
        </TabsContent>

        <TabsContent value="inventory" className="p-0">
          <Inventory />
        </TabsContent>

        <TabsContent value="users" className="p-0">
          <Users />
        </TabsContent>

        <TabsContent value="stores" className="p-0">
          <Stores />
        </TabsContent>

        <TabsContent value="sizes" className="p-0">
          <SizesSettings />
        </TabsContent>

        <TabsContent value="sku-acronyms" className="p-0"> {/* New content for SKU Acronyms */}
          <SkuAcronymsSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}