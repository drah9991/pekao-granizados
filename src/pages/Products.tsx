import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables, TablesInsert, Json, Enums } from "@/integrations/supabase/types";
import { exportToCsv, importFromCsv, downloadFile } from "@/lib/csv-utils";
import { formatCOP } from "@/lib/currency";
import { createNotification } from "@/hooks/useNotifications";

// Import new modular components
import ProductStats from "@/components/products/ProductStats";
import ProductFiltersAndSearch from "@/components/products/ProductFiltersAndSearch";
import ProductGridDisplay from "@/components/products/ProductGridDisplay";
import ProductFormDialog from "@/components/products/ProductFormDialog";
import ProductDetailsDialog from "@/components/products/ProductDetailsDialog";
import ProductImportExportButtons from "@/components/products/ProductImportExportButtons";
import Layout from "@/components/Layout";

import { IceCream, Cherry, Wine, Candy } from "lucide-react"; // Icons for product types

type Product = Tables<'products'>;
type ProductType = Enums<'product_type'>;
type SkuAcronym = Tables<'sku_acronyms'>; // Import SkuAcronym type

interface StockInfo {
  store_name: string;
  qty: number;
  min_qty: number;
}

const productTypeOptions: { value: ProductType; label: string; icon: React.ElementType }[] = [
  { value: "granizado", label: "Granizado", icon: IceCream },
  { value: "topping", label: "Topping", icon: Cherry },
  { value: "sachet", label: "Sachet", icon: Wine },
  { value: "sweet", label: "Dulce", icon: Candy },
];

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [skuAcronyms, setSkuAcronyms] = useState<SkuAcronym[]>([]); // New state for SKU acronyms
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [filterType, setFilterType] = useState<ProductType | "all">("all");
  const [loading, setLoading] = useState(true);
  const [userStoreId, setUserStoreId] = useState<string | null>(null);

  // Create/Edit Dialog states
  const [productDialogIsOpen, setProductDialogIsOpen] = useState(false);
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
    images: [] as string[],
    variants: null as Json | null,
    recipe: null as Json | null,
    type: "granizado" as ProductType,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // View Details Dialog states
  const [detailsDialogIsOpen, setDetailsDialogIsOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [productStock, setProductStock] = useState<StockInfo[]>([]);

  // Import Dialog states
  const [importDialogIsOpen, setImportDialogIsOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchUserStoreId();
    fetchProducts();
    fetchSkuAcronyms(); // Fetch SKU acronyms on load
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
        .select('store_id')
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
        .select("*")
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

  const fetchSkuAcronyms = async () => {
    try {
      const { data, error } = await supabase
        .from("sku_acronyms")
        .select("*")
        .order("type", { ascending: true });

      if (error) throw error;
      setSkuAcronyms(data || []);
    } catch (error: any) {
      console.error("Error fetching SKU acronyms:", error);
      toast.error("Error al cargar acrónimos SKU: " + error.message);
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
      type: "granizado",
    });
    setProductDialogIsOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku || "",
      description: product.description || "",
      price: product.price.toString(),
      cost: product.cost?.toString() || "",
      active: product.active || false,
      category: product.category || "",
      is_public: product.is_public || false,
      images: product.images || [],
      variants: product.variants || null,
      recipe: product.recipe || null,
      type: product.type || "granizado",
    });
    setProductDialogIsOpen(true);
  };

  const prepareProductData = (): TablesInsert<'products'> => ({
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
    type: formData.type,
    ...(editingProduct ? {} : { store_id: userStoreId! }),
  });

  const createProduct = async (productData: TablesInsert<'products'>) => {
    const { data: newProductData, error } = await supabase
      .from("products")
      .insert([productData])
      .select('id')
      .single();

    if (error) throw error;

    if (newProductData?.id && userStoreId) {
      const { error: stockError } = await supabase
        .from("store_stock")
        .insert({
          product_id: newProductData.id,
          store_id: userStoreId,
          qty: 0,
          min_qty: 0,
        });
      if (stockError) throw stockError;
    }

    await createNotification({
      store_id: userStoreId,
      title: "Nuevo Producto",
      message: `El producto "${productData.name}" ha sido creado.`,
      type: "system_event",
      priority: "medium"
    });

    toast.success("Producto creado correctamente");
  };

  const updateProduct = async (productId: string, productData: TablesInsert<'products'>) => {
    const { error } = await supabase
      .from("products")
      .update(productData)
      .eq("id", productId);
    if (error) throw error;

    if (userStoreId) {
      await createNotification({
        store_id: userStoreId,
        title: "Producto Actualizado",
        message: `El producto "${productData.name}" ha sido actualizado.`,
        type: "system_event",
        priority: "low"
      });
    }

    toast.success("Producto actualizado correctamente");
  };

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.price) {
      toast.error("Nombre y precio son obligatorios");
      return;
    }
    if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0) {
      toast.error("El precio debe ser un número positivo.");
      return;
    }
    if (formData.cost && (isNaN(parseFloat(formData.cost)) || parseFloat(formData.cost) < 0)) {
      toast.error("El costo debe ser un número positivo.");
      return;
    }
    if (!userStoreId && !editingProduct) {
      toast.error("No se pudo determinar la tienda para este producto.");
      return;
    }

    setIsProcessing(true);
    try {
      const productData = prepareProductData();

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
      } else {
        await createProduct(productData);
      }

      setProductDialogIsOpen(false);
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

      if (product.store_id) {
        await createNotification({
          store_id: product.store_id,
          title: "Producto Eliminado",
          message: `El producto "${product.name}" ha sido eliminado.`,
          type: "system_event",
          priority: "high"
        });
      }

      toast.success("Producto eliminado correctamente");
      fetchProducts();
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast.error("Error al eliminar producto: " + error.message);
    }
  };

  const openDetailsDialog = async (product: Product) => {
    setViewingProduct(product);
    setDetailsDialogIsOpen(true);

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
        if (!item.name || typeof item.price !== 'number' || item.price < 0) {
          toast.error(`Fila inválida (nombre o precio faltante/inválido): ${JSON.stringify(item)}`);
          errorCount++;
          continue;
        }

        const productToSave: TablesInsert<'products'> = {
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
          type: item.type || "granizado",
          store_id: userStoreId,
        };

        const existingProduct = products.find(p => p.sku === item.sku && item.sku !== null) || products.find(p => p.name === item.name);

        if (existingProduct) {
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
          const { data: newProductData, error } = await supabase
            .from("products")
            .insert([productToSave])
            .select('id')
            .single();

          if (error) {
            console.error("Error inserting product:", error);
            errorCount++;
          } else if (newProductData?.id) {
            const { error: stockError } = await supabase
              .from("store_stock")
              .insert({
                product_id: newProductData.id,
                store_id: userStoreId,
                qty: 0,
                min_qty: 0,
              });
            if (stockError) {
              console.error("Error creating stock for imported product:", stockError);
              errorCount++;
            } else {
              importedCount++;
            }
          }
        }
      }

      toast.success(`Importación completada: ${importedCount} creados, ${updatedCount} actualizados, ${errorCount} errores.`);
      setImportDialogIsOpen(false);
      setImportFile(null);
      fetchProducts();
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

    const matchesType = filterType === "all" || product.type === filterType;

    return matchesSearch && matchesFilter && matchesType;
  });

  const stats = {
    total: products.length,
    active: products.filter(p => p.active).length,
    inactive: products.filter(p => !p.active).length,
    avgPrice: products.length > 0
      ? Math.round(products.reduce((sum, p) => sum + p.price, 0) / products.length)
      : 0,
  };

  return (
    <Layout>
      <div className="space-y-6 p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
              Catálogo de Productos
            </h1>
            <p className="text-muted-foreground">Gestiona tu inventario de productos</p>
          </div>
          <ProductImportExportButtons
            onExport={handleExportProducts}
            onImport={handleImportProducts}
            onImportFileChange={handleImportFileChange}
            importFile={importFile}
            isImporting={isImporting}
            importDialogIsOpen={importDialogIsOpen}
            setImportDialogIsOpen={setImportDialogIsOpen}
            userStoreId={userStoreId}
            loading={loading}
            products={products}
            openCreateDialog={openCreateDialog}
          />
        </div>

        {/* Stats Cards */}
        <ProductStats {...stats} />

        {/* Search and Filters */}
        <ProductFiltersAndSearch
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterType={filterType}
          setFilterType={setFilterType}
          filterActive={filterActive}
          setFilterActive={setFilterActive}
          productTypeOptions={productTypeOptions}
        />

        {/* Products Grid */}
        <ProductGridDisplay
          products={filteredProducts}
          loading={loading}
          searchQuery={searchQuery}
          filterActive={filterActive}
          filterType={filterType}
          openCreateDialog={openCreateDialog}
          openEditDialog={openEditDialog}
          openDetailsDialog={openDetailsDialog}
          handleDeleteProduct={handleDeleteProduct}
          userStoreId={userStoreId}
        />

        {/* Create/Edit Product Dialog */}
        <ProductFormDialog
          isOpen={productDialogIsOpen}
          onClose={() => setProductDialogIsOpen(false)}
          editingProduct={editingProduct}
          formData={formData}
          setFormData={setFormData}
          onSave={handleSaveProduct}
          isProcessing={isProcessing}
          productTypeOptions={productTypeOptions}
          skuAcronyms={skuAcronyms} // Pass SKU acronyms here
        />

        {/* Product Details Dialog */}
        <ProductDetailsDialog
          isOpen={detailsDialogIsOpen}
          onClose={() => setDetailsDialogIsOpen(false)}
          viewingProduct={viewingProduct}
          productStock={productStock}
        />
      </div>
    </Layout>
  );
}