import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";
import { Enums } from "@/integrations/supabase/types";
import React from "react";

type ProductType = Enums<'product_type'>;

interface ProductFiltersAndSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterType: ProductType | "all";
  setFilterType: (type: ProductType | "all") => void;
  filterActive: string;
  setFilterActive: (status: string) => void;
  productTypeOptions: { value: ProductType; label: string; icon: React.ElementType }[];
}

export default function ProductFiltersAndSearch({
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  filterActive,
  setFilterActive,
  productTypeOptions,
}: ProductFiltersAndSearchProps) {
  return (
    <Card className="glass-pro shadow-pro border-white/5 overflow-hidden animate-pro-in dim-layering rounded-[2.5rem]">
      <CardContent className="p-10">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-primary w-5 h-5 transition-all group-focus-within:scale-110 group-focus-within:text-white drop-shadow-glow" />
            <Input 
              placeholder="BUSCAR EN EL CATÁLOGO..." 
              className="pl-14 h-16 bg-white/5 border-white/10 rounded-2xl font-black font-space-grotesk tracking-[0.2em] uppercase placeholder:text-muted-foreground/20 focus:border-primary/50 transition-all text-sm italic shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap md:flex-nowrap gap-5">
            <Select value={filterType} onValueChange={(value: ProductType | "all") => setFilterType(value)}>
              <SelectTrigger className="w-full md:w-64 h-16 bg-white/5 border-white/10 rounded-2xl font-black font-space-grotesk tracking-[0.2em] uppercase italic text-[10px] focus:ring-primary/20 hover:bg-white/10 transition-all shadow-inner">
                <SelectValue placeholder="TIPO: TODOS" />
              </SelectTrigger>
              <SelectContent className="glass-pro border-white/10">
                <SelectItem value="all" className="font-black font-space-grotesk italic text-[10px] tracking-widest uppercase">TODOS LOS TIPOS</SelectItem>
                {productTypeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} className="font-black font-space-grotesk italic text-[10px] tracking-widest uppercase">
                    <div className="flex items-center gap-3">
                      <option.icon className="w-4 h-4 text-primary" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-full md:w-64 h-16 bg-white/5 border-white/10 rounded-2xl font-black font-space-grotesk tracking-[0.2em] uppercase italic text-[10px] focus:ring-primary/20 hover:bg-white/10 transition-all shadow-inner">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-pro border-white/10">
                <SelectItem value="all" className="font-black font-space-grotesk italic text-[10px] tracking-widest uppercase">ESTADO: TODOS</SelectItem>
                <SelectItem value="active" className="font-black font-space-grotesk italic text-[10px] tracking-widest uppercase text-emerald-400">OPERATIVOS (ACTIVOS)</SelectItem>
                <SelectItem value="inactive" className="font-black font-space-grotesk italic text-[10px] tracking-widest uppercase text-red-500">DESKT (INACTIVOS)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}