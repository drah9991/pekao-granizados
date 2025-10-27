import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ClipboardList, Users as UsersIcon, Store as StoreIcon } from "lucide-react"; // Import StoreIcon
import Products from "@/pages/Products";
import Inventory from "@/pages/Inventory";
import Users from "@/pages/Users";
import Stores from "@/pages/Stores"; // Import the new Stores component

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
          Gestiona los datos principales de tu negocio: productos, inventario, usuarios y tiendas.
        </p>
      </div>

      <Tabs value={activeSubTab} onValueChange={handleSubTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto gap-2 p-2 bg-muted/30"> {/* Updated grid-cols to 4 */}
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
            value="stores" {/* New tab for Stores */}
            className="flex items-center gap-2 data-[state=active]:gradient-primary data-[state=active]:text-white"
          >
            <StoreIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Tiendas</span>
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

        <TabsContent value="stores" className="p-0"> {/* New TabsContent for Stores */}
          <Stores />
        </TabsContent>
      </Tabs>
    </div>
  );
}