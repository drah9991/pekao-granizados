import { Search, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Store, productTypeOptions } from "@/types/inventory";
import { Enums } from "@/integrations/supabase/types";

interface InventoryFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedStore: string;
  setSelectedStore: (val: string) => void;
  filterProductType: Enums<'product_type'> | "all";
  setFilterProductType: (val: Enums<'product_type'> | "all") => void;
  filterLowStock: boolean;
  setFilterLowStock: (val: boolean) => void;
  stores: Store[];
}

export function InventoryFilters({
  searchQuery,
  setSearchQuery,
  selectedStore,
  setSelectedStore,
  filterProductType,
  setFilterProductType,
  filterLowStock,
  setFilterLowStock,
  stores
}: InventoryFiltersProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="relative group flex-1">
        <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="LOCALIZAR SUMINISTRO POR NOMBRE O SKU..."
          className="pl-16 h-16 bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk focus:border-primary/50 focus:ring-primary/20 shadow-pro transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="flex flex-wrap gap-4">
        <Select value={selectedStore} onValueChange={setSelectedStore}>
          <SelectTrigger className="w-[200px] h-16 bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk transition-all shadow-pro focus:ring-primary/20">
            <SelectValue placeholder="NODOS DE RED" />
          </SelectTrigger>
          <SelectContent className="glass-pro border-border rounded-3xl">
            <SelectItem value="all" className="text-[10px] font-black uppercase italic">TODAS LAS SUCURSALES</SelectItem>
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.id} className="text-[10px] font-black uppercase italic">
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterProductType} onValueChange={(value: Enums<'product_type'> | "all") => setFilterProductType(value)}>
          <SelectTrigger className="w-[180px] h-16 bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk transition-all shadow-pro focus:ring-primary/20">
            <SelectValue placeholder="FILTRO DE TIPO" />
          </SelectTrigger>
          <SelectContent className="glass-pro border-border rounded-3xl">
            {productTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-[10px] font-black uppercase italic">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={() => setFilterLowStock(!filterLowStock)}
          className={cn(
            "h-16 px-10 rounded-[1.5rem] font-black italic uppercase tracking-widest text-[10px] transition-all gap-4 border-2 font-space-grotesk",
            filterLowStock 
              ? "bg-rose-500 text-white border-rose-400 shadow-glow-pro scale-105" 
              : "bg-muted border-border text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          )}
        >
          <AlertTriangle className="w-4 h-4" />
          Vista Crítica
        </Button>
      </div>
    </div>
  );
}
