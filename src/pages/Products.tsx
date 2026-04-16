import React, { useState, useEffect } from "react";
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
import { motion, AnimatePresence } from "framer-motion";
import { IceCream, Cherry, Wine, Candy, Plus, Globe, Package, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

type Product = Tables<'products'>;
type ProductType = Enums<'product_type'>;
type SkuAcronym = Tables<'sku_acronyms'>;

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  }
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [skuAcronyms, setSkuAcronyms] = useState<SkuAcronym[]>([]);
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
    stock: "",
    base_volume: "" as string | number,
    unit_measure: "oz",
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
    fetchSkuAcronyms();
  }, []);

  const fetchUserStoreId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();

      if (profile?.store_id) {
        setUserStoreId(profile.store_id);
      }
    } catch (err: any) {
      console.error("Error fetching user store id:", err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });

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
      const { data } = await supabase
        .from("sku_acronyms")
        .select("*");
      setSkuAcronyms(data || []);
    } catch (error: any) {
      console.error("Error fetching SKU acronyms:", error);
    }
  };

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.price || !formData.type) {
      toast.error("Los campos nombre, precio y tipo son obligatorios.");
      return;
    }

    setIsProcessing(true);
    try {
      const productData: TablesInsert<'products'> = {
        name: formData.name.toUpperCase(),
        sku: formData.sku || null,
        description: formData.description || null,
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : null,
        active: formData.active,
        category: formData.category ? formData.category.toUpperCase() : null,
        is_public: formData.is_public,
        images: formData.images,
        variants: formData.variants,
        recipe: formData.recipe,
        type: formData.type,
        base_volume: formData.base_volume ? parseFloat(formData.base_volume.toString()) : null,
        unit_measure: formData.unit_measure,
        store_id: userStoreId,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);
        if (error) throw error;
      } else {
        const { data: newProd, error: insError } = await supabase
          .from("products")
          .insert(productData)
          .select()
          .single();
        
        if (insError) throw insError;

        if (formData.stock && parseFloat(formData.stock) > 0 && userStoreId) {
            await supabase.from('store_stock').insert({
                product_id: newProd.id,
                store_id: userStoreId,
                qty: parseFloat(formData.stock),
                min_qty: 10
            });
            
            await supabase.from('movements').insert({
                product_id: newProd.id,
                store_id: userStoreId,
                qty: parseFloat(formData.stock),
                type: 'entry',
                reason: 'Stock inicial al crear producto',
                user_id: (await supabase.auth.getUser()).data.user?.id
            });
        }
      }

      toast.success(editingProduct ? "Operación de actualización completada" : "Registro de activo exitoso");
      setProductDialogIsOpen(false);
      fetchProducts();
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error("Fallo en sincronización: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`¿Estás seguro de eliminar el producto "${product.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (error) throw error;

      toast.success("Activo removido del ecosistema");
      fetchProducts();
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast.error("Fallo en eliminación");
    }
  };

  const openCreateDialog = () => {
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
      stock: "",
      base_volume: "",
      unit_measure: "oz",
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
      active: product.active,
      category: product.category || "",
      is_public: product.is_public || true,
      images: (product.images as string[]) || [],
      variants: product.variants,
      recipe: product.recipe,
      type: product.type as ProductType,
      stock: "",
      base_volume: product.base_volume?.toString() || "",
      unit_measure: product.unit_measure || "oz",
    });
    setProductDialogIsOpen(true);
  };

  const openDetailsDialog = async (product: Product) => {
    setViewingProduct(product);
    setDetailsDialogIsOpen(true);
    
    try {
      const { data } = await supabase
        .from('store_stock')
        .select(`
          qty,
          min_qty,
          stores ( name )
        `)
        .eq('product_id', product.id);
        
      const formattedStock = (data || []).map((item: any) => ({
        store_name: item.stores.name,
        qty: item.qty,
        min_qty: item.min_qty
      }));
      
      setProductStock(formattedStock);
    } catch (err) {
      console.error("Error fetching product stock details:", err);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  const handleImportProducts = async () => {
    if (!importFile) {
      toast.error("Selecciona un archivo CSV para importar.");
      return;
    }

    setIsImporting(true);
    try {
      const results = await importFromCsv(importFile);
      
      const productsToInsert = results.map((row: any) => ({
        name: (row.name || "PRODUCTO SIN NOMBRE").toUpperCase(),
        sku: row.sku || null,
        description: row.description || null,
        price: parseFloat(row.price) || 0,
        cost: row.cost ? parseFloat(row.cost) : null,
        active: row.active === 'true' || row.active === true,
        type: row.type || 'granizado',
        category: row.category ? row.category.toUpperCase() : null,
        store_id: userStoreId
      }));

      const { error } = await supabase.from("products").insert(productsToInsert);
      if (error) throw error;

      toast.success(`${productsToInsert.length} activos indexados correctamente.`);
      setImportDialogIsOpen(false);
      setImportFile(null);
      fetchProducts();
    } catch (error: any) {
      console.error("Error importing products:", error);
      toast.error("Fallo masivo en importación: " + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportProducts = () => {
    if (products.length === 0) {
      toast.error("No hay registros para exportar.");
      return;
    }

    const exportData = products.map(p => ({
      name: p.name,
      sku: p.sku,
      description: p.description,
      price: p.price,
      cost: p.cost,
      active: p.active,
      type: p.type,
      category: p.category
    }));

    const csvContent = exportToCsv(exportData);
    downloadFile(csvContent, `catalogo_pekao_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    toast.success("Ecosistema exportado con éxito.");
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesActive = filterActive === "all" || (filterActive === "active" ? product.active : !product.active);
    const matchesType = filterType === "all" || product.type === filterType;

    return matchesSearch && matchesActive && matchesType;
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
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="min-h-screen bg-transparent text-foreground p-6 lg:p-10 space-y-10"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center shadow-glow-pro group-hover:scale-110 transition-all duration-700 overflow-hidden relative">
                    <Zap className="w-10 h-10 text-primary relative z-10" />
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
                </div>
                <div>
                    <h1 className="text-4xl lg:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent italic uppercase font-space-grotesk">
                    Master Catalog
                    </h1>
                    <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
                    Catering Intelligence • Global Assets Management v2.0
                    </p>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
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
        </motion.div>

        {/* Executive Stats Bento */}
        <motion.div variants={itemVariants}>
          <ProductStats {...stats} />
        </motion.div>

        {/* Global Catalog Controls */}
        <motion.div variants={itemVariants}>
          <ProductFiltersAndSearch
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterType={filterType}
            setFilterType={setFilterType}
            filterActive={filterActive}
            setFilterActive={setFilterActive}
            productTypeOptions={productTypeOptions}
          />
        </motion.div>

        {/* Assets Grid */}
        <motion.div variants={itemVariants}>
           <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight text-foreground leading-none">Activos de Venta</h2>
              <div className="flex items-center gap-3 bg-muted/30 px-4 h-9 rounded-full border border-border font-black text-[10px] text-muted-foreground italic uppercase">
                 <Globe className="w-3.5 h-3.5" /> Ecosistema Global
              </div>
           </div>

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
        </motion.div>

        <ProductFormDialog
          isOpen={productDialogIsOpen}
          onClose={() => setProductDialogIsOpen(false)}
          editingProduct={editingProduct}
          formData={formData}
          setFormData={setFormData}
          onSave={handleSaveProduct}
          isProcessing={isProcessing}
          productTypeOptions={productTypeOptions}
          skuAcronyms={skuAcronyms}
          storeId={userStoreId}
        />

        <ProductDetailsDialog
          isOpen={detailsDialogIsOpen}
          onClose={() => setDetailsDialogIsOpen(false)}
          viewingProduct={viewingProduct}
          productStock={productStock}
        />
      </motion.div>
    </Layout>
  );
}