import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ClipboardList, Users as UsersIcon, Store as StoreIcon, Ruler, Cherry, Wine } from "lucide-react"; // Import new icons
import Products from "@/pages/Products";
import Inventory from "@/pages/Inventory";
import Users from "@/pages/Users";
import Stores from "@/pages/Stores";
import SizesSettings from "@/components/settings/SizesSettings"; // Import new component
import ToppingsSettings from "@/components/settings/ToppingsSettings"; // Import new component
import SachetsSettings from "@/components/settings/SachetsSettings"; // Import new component

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
          Gestiona los datos principales de tu negocio: productos, inventario, usuarios, tiendas, tamaños, toppings y sachets.
        </p>
      </div>

      <Tabs value={activeSubTab} onValueChange={handleSubTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 h-auto gap-2 p-2 bg-muted/30"> {/* Updated grid-cols */}
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
          {/* New tabs for Sizes, Toppings, Sachets */}
          <TabsTrigger
            value="sizes"
            className="flex items-center gap-2 data-[state=active]:gradient-secondary data-[state=active]:text-white"
          >
            <Ruler className="w-4 h-4" />
            <span className="hidden sm:inline">Tamaños</span>
          </TabsTrigger>
          <TabsTrigger
            value="toppings"
            className="flex items-center gap-2 data-[state=active]:gradient-accent data-[state=active]:text-white"
          >
            <Cherry className="w-4 h-4" />
            <span className="hidden sm:inline">Toppings</span>
          </TabsTrigger>
          <TabsTrigger
            value="sachets"
            className="flex items-center gap-2 data-[state=active]:gradient-primary data-[state=active]:text-white"
          >
            <Wine className="w-4 h-4" />
            <span className="hidden sm:inline">Sachets</span>
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

        <TabsContent value="toppings" className="p-0">
          <ToppingsSettings />
        </TabsContent>

        <TabsContent value="sachets" className="p-0">
          <SachetsSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}