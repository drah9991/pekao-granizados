import React from "react";
import { useProducts } from "@/hooks/useProducts";
import ProductStats from "@/components/products/ProductStats";
import ProductFiltersAndSearch from "@/components/products/ProductFiltersAndSearch";
import ProductGridDisplay from "@/components/products/ProductGridDisplay";
import ProductFormDialog from "@/components/products/ProductFormDialog";
import ProductDetailsDialog from "@/components/products/ProductDetailsDialog";
import ProductImportExportButtons from "@/components/products/ProductImportExportButtons";
import Layout from "@/components/Layout";
import { motion } from "framer-motion";
import { IceCream, Cherry, Wine, Candy, Globe, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const productTypeOptions: { value: any; label: string; icon: React.ElementType }[] = [
  { value: "granizado", label: "Granizado", icon: IceCream },
  { value: "topping", label: "Topping", icon: Cherry },
  { value: "sachet", label: "Sachet", icon: Wine },
  { value: "sweet", label: "Dulce", icon: Candy },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

export default function Products() {
  const { storeId } = useAuth();
  const {
    products,
    skuAcronyms,
    isLoading,
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
  } = useProducts();

  return (
    <Layout>
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="min-h-screen bg-transparent text-foreground p-6 lg:p-10 space-y-10"
      >
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
                    onImportFileChange={(e) => {
                        if (e.target.files && e.target.files[0]) setImportFile(e.target.files[0]);
                    }}
                    importFile={importFile}
                    isImporting={isImporting}
                    importDialogIsOpen={importDialogIsOpen}
                    setImportDialogIsOpen={setImportDialogIsOpen}
                    userStoreId={storeId}
                    loading={isLoading}
                    products={products}
                    openCreateDialog={openCreateDialog}
                />
            </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <ProductStats {...stats} />
        </motion.div>

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

        <motion.div variants={itemVariants}>
           <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight text-foreground leading-none">Activos de Venta</h2>
              <div className="flex items-center gap-3 bg-muted/30 px-4 h-9 rounded-full border border-border font-black text-[10px] text-muted-foreground italic uppercase">
                 <Globe className="w-3.5 h-3.5" /> Ecosistema Global
              </div>
           </div>

           <ProductGridDisplay
            products={products}
            loading={isLoading}
            searchQuery={searchQuery}
            filterActive={filterActive}
            filterType={filterType}
            openCreateDialog={openCreateDialog}
            openEditDialog={openEditDialog}
            openDetailsDialog={async (p) => {
                setViewingProduct(p);
                setDetailsDialogIsOpen(true);
                const { data } = await (window as any).supabase.from('store_stock').select('qty, min_qty, stores(name)').eq('product_id', p.id);
                setProductStock((data || []).map((item: any) => ({ store_name: item.stores.name, qty: item.qty, min_qty: item.min_qty })));
            }}
            handleDeleteProduct={handleDeleteProduct}
            userStoreId={storeId}
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
          storeId={storeId}
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