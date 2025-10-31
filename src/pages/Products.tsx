import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, Package, DollarSign, TrendingUp, Eye, Image as ImageIcon, X, Upload, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables, Json } from "@/integrations/supabase/types"; // Import Json type
import { exportToCsv, importFromCsv, downloadFile } from "@/lib/csv-utils"; // Import CSV utilities
import { formatCurrency } from "@/lib/formatters"; // Import the formatter

type Product = Tables<'products'>; // Use Tables type for direct mapping

interface StockInfo {
  store_name: string;
  qty: number;
  min_qty: number;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [userStoreId, setUserStoreId] = useState<string | null>(null); // State to hold the user's store_id
  
  // Create/Edit Dialog
  const [productDialog, setProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    price: "",
    cost: "",
    active: true,
    category: "",
    is_public: true,
    images: [] as string[], // Initialize as empty array
    variants: null as Json | null,
    recipe: null as Json | null,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // View Details Dialog
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [productStock, setProductStock] = useState<StockInfo[]>([]);

  // Import Dialog
  const [importDialogIsOpen, setImportDialogIsOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchUserStoreId();
    fetchProducts();
  }, []);

  const fetchUserStoreId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuario no autenticado.");
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('store_id') // Select only store_id
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (profile?.store_id) {
        setUserStoreId(profile.store_id);
      } else {
        toast.warning("No se encontró un ID de tienda para el usuario. No podrás crear productos.");
      }
    } catch (error: any) {
      console.error("Error fetching user's store ID:", error);
      toast.error("Error al obtener ID de tienda: " + error.message);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          sku,
          description,
          price,
          cost,
          active,
          images,
          variants,
          recipe,
          category,
          is_public,
          created_at,
          updated_at,
          store_id
        `) // Explicitly select all fields required by Product interface
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast.error("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    if (!userStoreId) {
      toast.error("No tienes una tienda asignada para crear productos. Contacta a un administrador.");
      return;
    }
    setEditingProduct(null);
    setFormData({
      name: "",
      sku: "",
      description: "",
      price: "",
      cost: "",
      active: true,
      category: "",
      is_public: true,
      images: [],
      variants: null,
      recipe: null,
    });
    setProductDialog(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku || "",
      description: product.description || "",
      price: product.price.toString(),
      cost: product.cost?.toString() || "",
      active: product.active || false, // Ensure boolean
      category: product.category || "",
      is_public: product.is_public || false, // Ensure boolean
      images: product.images || [],
      variants: product.variants || null,
      recipe: product.recipe || null,
    });
    setProductDialog(true);
  };

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.price) {
      toast.error("Nombre y precio son obligatorios");
      return;
    }
    if (!userStoreId && !editingProduct) { // Only require storeId for new products
      toast.error("No se pudo determinar la tienda para este producto.");
      return;
    }

    setIsProcessing(true);
    try {
      const productData = {
        name: formData.name.trim(),
        sku: formData.sku.trim() || null,
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : null,
        active: formData.active,
        category: formData.category.trim() || null,
        is_public: formData.is_public,
        images: formData.images.length > 0 ? formData.images : null,
        variants: formData.variants,
        recipe: formData.recipe,
        // store_id is only added for new products, or if it's an existing product and we need to ensure it's there.
        // For updates, we assume store_id is already set and not changing.
        ...(editingProduct ? {} : { store_id: userStoreId }), 
      };

      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) throw error;
        toast.success("Producto actualizado correctamente");
      } else {
        // Create new product
        const { error } = await supabase
          .from("products")
          .insert([productData as TablesInsert<'products'>]); // Explicitly cast to the insert type

        if (error) throw error;
        toast.success("Producto creado correctamente");
      }

      setProductDialog(false);
      fetchProducts();
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error("Error al guardar producto: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`¿Estás seguro de eliminar "${product.name}"?`)) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (error) throw error;
      toast.success("Producto eliminado correctamente");
      fetchProducts();
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast.error("Error al eliminar producto: " + error.message);
    }
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ active: !product.active })
        .eq("id", product.id);

      if (error) throw error;
      toast.success(`Producto ${!product.active ? "activado" : "desactivado"}`);
      fetchProducts();
    } catch (error: any) {
      console.error("Error toggling product status:", error);
      toast.error("Error al cambiar estado del producto");
    }
  };

  const openDetailsDialog = async (product: Product) => {
    setViewingProduct(product);
    setDetailsDialog(true);

    // Fetch stock info
    try {
      const { data, error } = await supabase
        .from("store_stock")
        .select(`
          qty,
          min_qty,
          stores:store_id (
            name
          )
        `)
        .eq("product_id", product.id);

      if (error) throw error;

      const stockInfo = (data || []).map(item => ({
        store_name: Array.isArray(item.stores) ? item.stores[0]?.name : item.stores?.name || "N/A",
        qty: item.qty,
        min_qty: item.min_qty,
      }));

      setProductStock(stockInfo);
    } catch (error) {
      console.error("Error fetching stock:", error);
      setProductStock([]);
    }
  };

  const handleExportProducts = () => {
    if (products.length === 0) {
      toast.info("No hay productos para exportar.");
      return;
    }
    const csv = exportToCsv(products);
    downloadFile("productos.csv", csv, "text/csv");
    toast.success("Productos exportados correctamente.");
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleImportProducts = async () => {
    if (!importFile) {
      toast.error("Por favor, selecciona un archivo CSV para importar.");
      return;
    }
    if (!userStoreId) {
      toast.error("No tienes una tienda asignada para importar productos.");
      return;
    }

    setIsImporting(true);
    try {
      const fileContent = await importFile.text();
      const importedData = importFromCsv<Product>(fileContent);

      if (importedData.length === 0) {
        toast.error("El archivo CSV está vacío o no contiene datos válidos.");
        return;
      }

      let importedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      for (const item of importedData) {
        // Basic validation: ensure name and price exist
        if (!item.name || typeof item.price !== 'number' || item.price < 0) {
          toast.error(`Fila inválida (nombre o precio faltante/inválido): ${JSON.stringify(item)}`);
          errorCount++;
          continue;
        }

        // Prepare data for Supabase
        const productToSave: TablesInsert<'products'> = { // Cast to TablesInsert
          name: item.name,
          sku: item.sku || null,
          description: item.description || null,
          price: item.price,
          cost: item.cost || null,
          active: item.active ?? true,
          category: item.category || null,
          is_public: item.is_public ?? true,
          images: item.images || null,
          variants: item.variants || null,
          recipe: item.recipe || null,
          store_id: userStoreId, // Assign to current user's store
        };

        // Check if product already exists by SKU or name (simple check, can be improved)
        const existingProduct = products.find(p => p.sku === item.sku && item.sku !== null) || products.find(p => p.name === item.name);

        if (existingProduct) {
          // Update existing product
          const { error } = await supabase
            .from("products")
            .update(productToSave)
            .eq("id", existingProduct.id);
          if (error) {
            console.error("Error updating product:", error);
            errorCount++;
          } else {
            updatedCount++;
          }
        } else {
          // Insert new product
          const { error } = await supabase
            .from("products")
            .insert([productToSave]);
          if (error) {
            console.error("Error inserting product:", error);
            errorCount++;
          } else {
            importedCount++;
          }
        }
      }

      toast.success(`Importación completada: ${importedCount} creados, ${updatedCount} actualizados, ${errorCount} errores.`);
      setImportDialogIsOpen(false);
      setImportFile(null);
      fetchProducts(); // Refresh the list
    } catch (error: any) {
      console.error("Error importing products:", error);
      toast.error("Error al importar productos: " + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterActive === "all" || 
      (filterActive === "active" && product.active) ||
      (filterActive === "inactive" && !product.active);

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: products.length,
    active: products.filter(p => p.active).length,
    inactive: products.filter(p => !p.active).length,
    avgPrice: products.length > 0 
      ? products.reduce((sum, p) => sum + p.price, 0) / products.length 
      : 0,
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
            Catálogo de Productos
          </h1>
          <p className="text-muted-foreground">Gestiona tu inventario de productos</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            className="shadow-card w-full md:w-auto"
            onClick={handleExportProducts}
            disabled={loading || products.length === 0}
          >
            <Download className="mr-2 w-5 h-5" />
            Exportar CSV
          </Button>
          <Button 
            variant="outline"
            className="shadow-card w-full md:w-auto"
            onClick={() => setImportDialogIsOpen(true)}
            disabled={!userStoreId}
          >
            <Upload className="mr-2 w-5 h-5" />
            Importar CSV
          </Button>
          <Button 
            className="gradient-primary shadow-glow w-full md:w-auto"
            onClick={openCreateDialog}
            disabled={!userStoreId} // Disable if no store_id
          >
            <Plus className="mr-2 w-5 h-5" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Productos</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Activos</p>
                <p className="text-2xl font-bold text-accent">{stats.active}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Inactivos</p>
                <p className="text-2xl font-bold text-muted-foreground">{stats.inactive}</p>
              </div>
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Precio Promedio</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(stats.avgPrice)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
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

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando productos...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="glass-card shadow-card">
          <CardContent className="text-center py-12">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay productos</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterActive !== "all" 
                ? "No se encontraron productos con los filtros aplicados"
                : "Comienza creando tu primer producto"}
            </p>
            {!searchQuery && filterActive === "all" && (
              <Button onClick={openCreateDialog} className="gradient-primary" disabled={!userStoreId}>
                <Plus className="mr-2 w-4 h-4" />
                Crear Primer Producto
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredProducts.map((product) => (
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
          ))}
        </div>
      )}
      {/* Create/Edit Product Dialog */}
      <Dialog open={productDialog} onOpenChange={setProductDialog}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Editar Producto" : "Nuevo Producto"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct 
                ? "Actualiza la información del producto" 
                : "Completa los datos del nuevo producto"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Nombre del Producto *</Label>
                <Input
                  id="name"
                  placeholder="Ej: Granizado Fresa"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="sku">SKU (Código)</Label>
                <Input
                  id="sku"
                  placeholder="Ej: GRAN-FRES-001"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="price">Precio de Venta *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="cost">Costo del Producto</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active" className="cursor-pointer">
                  Producto activo
                </Label>
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Describe el producto, ingredientes, características especiales..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-2"
                  rows={4}
                />
              </div>
            </div>

            {formData.price && formData.cost && (
              <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                <p className="text-sm text-muted-foreground mb-1">Margen de Ganancia</p>
                <p className="text-2xl font-bold text-accent">
                  {formatCurrency(parseFloat(formData.price) - parseFloat(formData.cost))}
                  <span className="text-sm ml-2">
                    ({(((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.price)) * 100).toFixed(1)}%)
                  </span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProductDialog(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveProduct}
              disabled={isProcessing || !formData.name || !formData.price || (!editingProduct && !userStoreId)}
              className="gradient-primary"
            >
              {isProcessing ? "Guardando..." : editingProduct ? "Actualizar" : "Crear Producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Details Dialog */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Detalles del Producto
            </DialogTitle>
          </DialogHeader>

          {viewingProduct && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Información</TabsTrigger>
                <TabsTrigger value="stock">Stock por Tienda</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Nombre</Label>
                    <p className="text-lg font-semibold">{viewingProduct.name}</p>
                  </div>

                  {viewingProduct.sku && (
                    <div>
                      <Label className="text-muted-foreground">SKU</Label>
                      <p className="font-mono">{viewingProduct.sku}</p>
                    </div>
                  )}

                  {viewingProduct.description && (
                    <div>
                      <Label className="text-muted-foreground">Descripción</Label>
                      <p className="text-sm">{viewingProduct.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Precio de Venta</Label>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(viewingProduct.price)}
                      </p>
                    </div>

                    {viewingProduct.cost && (
                      <div>
                        <Label className="text-muted-foreground">Costo</Label>
                        <p className="text-2xl font-bold text-muted-foreground">
                          {formatCurrency(viewingProduct.cost)}
                        </p>
                      </div>
                    )}
                  </div>

                  {viewingProduct.cost && (
                    <div className="p-4 bg-accent/10 rounded-lg">
                      <Label className="text-muted-foreground">Margen de Ganancia</Label>
                      <p className="text-2xl font-bold text-accent">
                        {formatCurrency(viewingProduct.price - viewingProduct.cost)}
                        <span className="text-sm ml-2">
                          ({(((viewingProduct.price - viewingProduct.cost) / viewingProduct.price) * 100).toFixed(1)}%)
                        </span>
                      </p>
                    </div>
                  )}

                  <div>
                    <Label className="text-muted-foreground">Estado</Label>
                    <div className="mt-2">
                      <Badge variant={viewingProduct.active ? "default" : "secondary"}>
                        {viewingProduct.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Fecha de Creación</Label>
                    <p className="text-sm">{new Date(viewingProduct.created_at).toLocaleString('es')}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="stock" className="space-y-4">
                {productStock.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      No hay información de stock disponible
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {productStock.map((stock, index) => (
                      <Card key={index} className="glass-card">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{stock.store_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Mínimo: {stock.min_qty} unidades
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-2xl font-bold ${
                                stock.qty < stock.min_qty ? 'text-destructive' : 'text-accent'
                              }`}>
                                {stock.qty}
                              </p>
                              <p className="text-xs text-muted-foreground">unidades</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button onClick={() => setDetailsDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Products Dialog */}
      <Dialog open={importDialogIsOpen} onOpenChange={setImportDialogIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Productos (CSV)</DialogTitle>
            <DialogDescription>
              Sube un archivo CSV para importar o actualizar productos.
              Asegúrate de que las columnas coincidan con los campos del producto (id, name, sku, price, etc.).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="import-file">Archivo CSV</Label>
              <Input
                id="import-file"
                type="file"
                accept=".csv"
                onChange={handleImportFileChange}
                className="mt-2"
                disabled={isImporting}
              />
              {importFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  Archivo seleccionado: {importFile.name}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportDialogIsOpen(false)}
              disabled={isImporting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImportProducts}
              disabled={isImporting || !importFile}
              className="gradient-primary"
            >
              {isImporting ? "Importando..." : "Confirmar Importación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}