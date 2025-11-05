import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Edit, Trash2, Eye, IceCream, Cherry, Wine, Candy } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { Tables, Enums } from "@/integrations/supabase/types";

type Product = Tables<'products'>;
type ProductType = Enums<'product_type'>;

const productTypeOptions: { value: ProductType; label: string; icon: React.ElementType }[] = [
  { value: "granizado", label: "Granizado", icon: IceCream },
  { value: "topping", label: "Topping", icon: Cherry },
  { value: "sachet", label: "Sachet", icon: Wine },
  { value: "sweet", label: "Dulce", icon: Candy },
];

interface ProductGridDisplayProps {
  products: Product[];
  loading: boolean;
  searchQuery: string;
  filterActive: string;
  filterType: ProductType | "all";
  openCreateDialog: () => void;
  openEditDialog: (product: Product) => void;
  openDetailsDialog: (product: Product) => void;
  handleDeleteProduct: (product: Product) => void;
  userStoreId: string | null;
}

export default function ProductGridDisplay({
  products,
  loading,
  searchQuery,
  filterActive,
  filterType,
  openCreateDialog,
  openEditDialog,
  openDetailsDialog,
  handleDeleteProduct,
  userStoreId,
}: ProductGridDisplayProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando productos...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="glass-card shadow-card">
        <CardContent className="text-center py-12">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay productos</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || filterActive !== "all" || filterType !== "all"
              ? "No se encontraron productos con los filtros aplicados"
              : "Comienza creando tu primer producto"}
          </p>
          {!searchQuery && filterActive === "all" && filterType === "all" && (
            <Button onClick={openCreateDialog} className="gradient-primary" disabled={!userStoreId}>
              <Plus className="mr-2 w-4 h-4" />
              Crear Primer Producto
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {products.map((product) => {
        const ProductIcon = productTypeOptions.find(opt => opt.value === product.type)?.icon || Package;
        return (
          <Card 
            key={product.id} 
            className={`glass-card shadow-card transition-smooth hover:shadow-elevated group ${
              !product.active ? 'opacity-60' : ''
            }`}
          >
            <CardContent className="p-6">
              {/* Header with badges and actions */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant={product.active ? "default" : "secondary"}>
                    {product.active ? "Activo" : "Inactivo"}
                  </Badge>
                  {product.sku && (
                    <Badge variant="outline" className="text-xs">
                      {product.sku}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <ProductIcon className="w-3 h-3" />
                    {productTypeOptions.find(opt => opt.value === product.type)?.label}
                  </Badge>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:text-primary"
                    onClick={() => openDetailsDialog(product)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:text-accent"
                    onClick={() => openEditDialog(product)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:text-destructive"
                    onClick={() => handleDeleteProduct(product)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Product main info */}
              <h3 className="text-xl font-bold mb-1">{product.name}</h3>
              <p className="text-2xl font-bold text-primary mb-2">{formatCurrency(product.price)}</p>
              {product.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
              )}
              {product.category && (
                <Badge variant="outline" className="mt-3 text-xs">{product.category}</Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}