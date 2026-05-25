import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Tables, TablesInsert, Json, Enums } from "@/integrations/supabase/types";
import { exportToCsv, importFromCsv, downloadFile } from "@/lib/csv-utils";
import { mapProductStock } from "@/utils/productStockUtils";

type Product = Tables<'products'>;
type ProductType = Enums<'product_type'>;
type SkuAcronym = Tables<'sku_acronyms'>;

interface StockInfo {
  store_name: string;
  qty: number;
  min_qty: number;
}

export function useProducts() {
  const { storeId } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [filterType, setFilterType] = useState<ProductType | "all">("all");
  const [isProcessing, setIsProcessing] = useState(false);

  // Dialog states
  const [productDialogIsOpen, setProductDialogIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [detailsDialogIsOpen, setDetailsDialogIsOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [productStock, setProductStock] = useState<StockInfo[]>([]);
  const [importDialogIsOpen, setImportDialogIsOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

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

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products-admin", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          store_stock ( qty, min_qty ),
          recipes (
            inventory_item_id,
            quantity_required,
            inventory_items (
              id,
              stock,
              is_mixture
            )
          )
        `)
        .order("name", { ascending: true });
      if (error) throw error;

      // Fetch types config to determine stock tracking
      const { data: typesData } = await supabase.from("product_types_config").select("*").eq('active', true);

      return (data || []).map((p: any) => mapProductStock(p, typesData || []));
    }
  });

  const { data: skuAcronyms = [] } = useQuery({
    queryKey: ["sku-acronyms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sku_acronyms").select("*");
      if (error) throw error;
      return data || [];
    }
  });

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.price || !formData.type) {
      toast.error("Los campos nombre, precio y tipo son obligatorios.");
      return;
    }

    setIsProcessing(true);
    try {
      const productData: any = {
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
        store_id: storeId,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);
        if (error) throw error;

        // Si se especificó stock durante la edición, lo actualizamos o insertamos en store_stock
        if (formData.stock !== "" && !isNaN(parseFloat(formData.stock)) && storeId) {
            const qty = parseFloat(formData.stock);
            const { error: stockError } = await supabase
                .from('store_stock')
                .upsert({
                    product_id: editingProduct.id,
                    store_id: storeId,
                    qty: qty,
                    updated_at: new Date().toISOString(),
                    min_qty: 10
                }, {
                    onConflict: 'product_id,store_id'
                });
            
            if (stockError) console.error("Error updating stock during product edit:", stockError);
        }
      } else {
        const { data: newProd, error: insError } = await supabase
          .from("products")
          .insert(productData)
          .select()
          .single();
        
        if (insError) throw insError;

        if (formData.stock && parseFloat(formData.stock) > 0 && storeId) {
            await supabase.from('store_stock').insert({
                product_id: newProd.id,
                store_id: storeId,
                qty: parseFloat(formData.stock),
                min_qty: 10
            });
        }
      }

      toast.success("Producto guardado exitosamente");
      setProductDialogIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["products-admin"] });
    } catch (error: any) {
      toast.error("Error al guardar: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`¿Estás seguro de eliminar "${product.name}"?`)) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", product.id);
      if (error) throw error;
      toast.success("Producto eliminado");
      queryClient.invalidateQueries({ queryKey: ["products-admin"] });
    } catch (error: any) {
      toast.error("Error al eliminar");
    }
  };

  const handleImportProducts = async () => {
    if (!importFile) return;
    setIsImporting(true);
    try {
      const text = await importFile.text();
      const results = importFromCsv<any>(text);
      const productsToInsert = results.map((row: any) => ({
        name: (row.name || "N/A").toUpperCase(),
        sku: row.sku || null,
        price: parseFloat(row.price) || 0,
        type: row.type || 'granizado',
        store_id: storeId
      }));
      const { error } = await supabase.from("products").insert(productsToInsert);
      if (error) throw error;
      toast.success("Importación exitosa");
      setImportDialogIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["products-admin"] });
    } catch (error: any) {
      toast.error("Error en importación: " + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportProducts = () => {
    const csvContent = exportToCsv(products.map(p => ({ name: p.name, sku: p.sku, price: p.price })));
    downloadFile(csvContent, `productos_${new Date().toISOString()}.csv`, 'text/csv');
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

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormData({
      name: "", sku: "", description: "", price: "", cost: "", active: true,
      category: "", is_public: true, images: [], variants: null, recipe: null,
      type: "granizado", stock: "", base_volume: "", unit_measure: "oz",
    });
    setProductDialogIsOpen(true);
    toast.success("Abriendo modal de creación...");
  };

  const openEditDialog = async (product: Product) => {
    setEditingProduct(product);
    
    // Intentamos obtener el stock actual para este producto y tienda
    let currentStock = "";
    if (storeId) {
        const { data } = await supabase
            .from('store_stock')
            .select('qty')
            .eq('product_id', product.id)
            .eq('store_id', storeId)
            .maybeSingle();
        if (data) currentStock = data.qty?.toString() || "0";
    }

    setFormData({
      name: product.name, sku: product.sku || "", description: product.description || "",
      price: product.price.toString(), cost: product.cost?.toString() || "", active: product.active,
      category: product.category || "", is_public: product.is_public ?? true,
      images: (product.images as string[]) || [], 
      variants: product.variants, 
      recipe: Array.isArray(product.recipe) ? product.recipe : [],
      type: product.type as ProductType, 
      stock: currentStock, 
      base_volume: (product as any).base_volume?.toString() || "",
      unit_measure: (product as any).unit_measure || "oz",
    });
    setProductDialogIsOpen(true);
  };

  return {
    products: filteredProducts,
    skuAcronyms,
    isLoading: isLoadingProducts,
    searchQuery, setSearchQuery,
    filterActive, setFilterActive,
    filterType, setFilterType,
    isProcessing,
    productDialogIsOpen, setProductDialogIsOpen,
    editingProduct,
    detailsDialogIsOpen, setDetailsDialogIsOpen,
    viewingProduct,
    productStock,
    importDialogIsOpen, setImportDialogIsOpen,
    importFile, setImportFile,
    isImporting,
    formData, setFormData,
    stats,
    handleSaveProduct,
    handleDeleteProduct,
    handleImportProducts,
    handleExportProducts,
    openCreateDialog,
    openEditDialog,
    setViewingProduct,
    setProductStock
  };
}
