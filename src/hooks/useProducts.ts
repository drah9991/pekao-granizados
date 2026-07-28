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

interface ProductRecord extends Product {
  categories?: { id: string; name: string; color_theme?: string; emoji_icon?: string } | null;
  store_stock?: Array<{ qty: number; min_qty: number }>;
  recipes?: Array<{
    inventory_item_id: string;
    quantity: number;
    inventory_items?: {
      id: string;
      stock: number;
      is_mixture: boolean;
    };
  }>;
}

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
    category_id: null as string | null,
    is_public: true,
    images: [] as string[],
    variants: null as Json | null,
    recipe: null as Json | null,
    type: "granizado" as ProductType,
    stock: "",
    base_volume: "" as string | number,
    unit_measure: "oz",
    margin_target: "60.0",
    commission_rate: "0.0",
    supplier_name: "",
    supplier_id: null as string | null,
    is_starred: false,
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products-admin", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories ( id, name, color_theme, emoji_icon ),
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
        .eq("store_id", storeId)
        .order("name", { ascending: true });
      if (error) throw error;

      // Fetch types config to determine stock tracking
      const { data: typesData } = await supabase.from("product_types_config").select("*").eq('active', true);

      const mapped = ((data || []) as ProductRecord[]).map((p: ProductRecord) => {
        const mappedStock = mapProductStock(p, typesData || []);
        const relCategoryName = p.categories?.name || p.category || "General";
        return {
          ...mappedStock,
          category: relCategoryName.toUpperCase(),
          category_id: p.category_id || p.categories?.id || null
        };
      });
      
      // Sort starred/featured products first, maintaining name alphabetical order
      return mapped.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const aStarred = a.is_starred ? 1 : 0;
        const bStarred = b.is_starred ? 1 : 0;
        if (aStarred !== bStarred) {
          return bStarred - aStarred;
        }
        return (a.name || "").localeCompare(b.name || "");
      });
    },
    staleTime: 30_000, // 30s — panel admin, cambios moderados
    enabled: !!storeId,
  });

  // Realtime subscription for products and stock
  useEffect(() => {
    if (!storeId) return;
    const channel = supabase.channel(`products-sync-${storeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `store_id=eq.${storeId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["products-admin"] });
        queryClient.invalidateQueries({ queryKey: ["products-grid"] }); // Also invalidate POS grid
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_stock', filter: `store_id=eq.${storeId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["products-admin"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, queryClient]);

  const { data: skuAcronyms = [] } = useQuery({
    queryKey: ["sku-acronyms", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase.from("sku_acronyms").select("*");
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60_000, // 5 min — acrónimos SKU, casi nunca cambian
    enabled: !!storeId,
  });

  const { data: dbCategories = [] } = useQuery({
    queryKey: ["categories-master", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, color_theme, emoji_icon")
        .or(`store_id.eq.${storeId},store_id.is.null`)
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
    enabled: !!storeId,
  });

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.price || !formData.type) {
      toast.error("Los campos nombre, precio y tipo son obligatorios.");
      return;
    }

    setIsProcessing(true);
    if (!formData.name || !formData.name.trim()) {
      toast.error("El nombre del producto es obligatorio");
      setIsProcessing(false);
      return;
    }

    const priceVal = parseFloat(formData.price);
    if (isNaN(priceVal) || priceVal < 0) {
      toast.error("El precio debe ser un número mayor o igual a 0");
      setIsProcessing(false);
      return;
    }

    const costVal = (formData.cost !== "" && formData.cost !== null && formData.cost !== undefined) 
      ? parseFloat(formData.cost) 
      : null;
    if (costVal !== null && (isNaN(costVal) || costVal < 0)) {
      toast.error("El costo debe ser un número mayor o igual a 0");
      setIsProcessing(false);
      return;
    }

    try {
      const productData: Record<string, unknown> = {
        name: formData.name.trim().toUpperCase(),
        sku: formData.sku?.trim() || null,
        description: formData.description?.trim() || null,
        price: priceVal,
        cost: costVal,
        active: formData.active,
        category: formData.category ? formData.category.toUpperCase() : null,
        category_id: formData.category_id || null,
        is_public: formData.is_public,
        images: formData.images,
        variants: formData.variants,
        recipe: formData.recipe,
        type: formData.type,
        base_volume: formData.base_volume ? parseFloat(formData.base_volume.toString()) : null,
        unit_measure: formData.unit_measure,
        store_id: storeId,
        margin_target: formData.margin_target ? parseFloat(formData.margin_target) : null,
        commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : null,
        supplier_name: formData.supplier_name || null,
        supplier_id: formData.supplier_id || null,
        is_starred: formData.is_starred,
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
      queryClient.invalidateQueries({ queryKey: ["products-grid"] });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al guardar: " + msg);
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
      queryClient.invalidateQueries({ queryKey: ["products-grid"] });
    } catch (error: unknown) {
      console.error("Error deleting product:", error);
      toast.error("Error al eliminar");
    }
  };

  const handleImportProducts = async () => {
    if (!importFile) return;
    setIsImporting(true);
    try {
      const text = await importFile.text();
      const results = importFromCsv<Record<string, string>>(text);
      const productsToInsert = results.map((row: Record<string, string>) => ({
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
      queryClient.invalidateQueries({ queryKey: ["products-grid"] });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error en importación: " + msg);
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
      category: "", category_id: null, is_public: true, images: [], variants: null, recipe: null,
      type: "granizado", stock: "", base_volume: "", unit_measure: "oz",
      margin_target: "60.0", commission_rate: "0.0", supplier_name: "", supplier_id: null, is_starred: false,
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
      category: product.category || "", category_id: product.category_id || null, is_public: product.is_public ?? true,
      images:    (product.images as string[]) || [], 
      variants: product.variants as Json | null, 
      recipe: product.recipe ? (Array.isArray(product.recipe) ? product.recipe : []) : null,
      type: product.type as ProductType, 
      stock: currentStock, 
      base_volume: ((product as Record<string, unknown>).base_volume?.toString() as string) || "",
      unit_measure: ((product as Record<string, unknown>).unit_measure as string) || "oz",
      margin_target: product.margin_target?.toString() || "60.0",
      commission_rate: product.commission_rate?.toString() || "0.0",
      supplier_name: product.supplier_name || "",
      supplier_id: (product as any).supplier_id || null,
      is_starred: product.is_starred ?? false,
    });
    setProductDialogIsOpen(true);
  };

  return {
    products: filteredProducts,
    skuAcronyms,
    dbCategories,
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
