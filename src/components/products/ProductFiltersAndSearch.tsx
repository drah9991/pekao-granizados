import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";
import { Enums } from "@/integrations/supabase/types";

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
    <Card className="glass-card shadow-card">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Buscar por nombre, SKU o descripción..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={filterType} onValueChange={(value: ProductType | "all") => setFilterType(value)}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {productTypeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="w-4 h-4" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterActive} onValueChange={setFilterActive}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los productos</SelectItem>
              <SelectItem value="active">Solo activos</SelectItem>
              <SelectItem value="inactive">Solo inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}