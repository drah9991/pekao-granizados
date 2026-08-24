import React, { useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import ProductGridDisplay from "@/components/products/ProductGridDisplay";
import ProductDetailsDialog from "@/components/products/ProductDetailsDialog";
import ProductFormDialog from "@/components/products/ProductFormDialog";
import ProductImportExportButtons from "@/components/products/ProductImportExportButtons";
import AdvancedConfigDialog from "@/components/products/AdvancedConfigDialog";
import MenuPhotoDialog from "@/components/products/MenuPhotoDialog";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Upload, Download, Camera, Plus, History, Search, Zap, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Products() {
  const { storeId } = useAuth();
  const {
    products,
    skuAcronyms,
    dbCategories,
    isLoading,
    searchQuery, setSearchQuery,
    filterActive, setFilterActive,
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
    handleSaveProduct,
    handleDeleteProduct,
    handleImportProducts,
    handleExportProducts,
    openCreateDialog,
    openEditDialog,
    setViewingProduct,
    setProductStock
  } = useProducts();

  // Dynamic Unique Categories combining Master DB Categories + Existing Product Categories
  const dbCategoryNames = (dbCategories || []).map(c => c.name?.trim().toUpperCase()).filter(Boolean);
  const productCategoryNames = products.map(p => p.category?.trim().toUpperCase()).filter(Boolean);

  const rawCategories = Array.from(
    new Set([...dbCategoryNames, ...productCategoryNames])
  )
  .filter(c => c !== "TEST" && c !== "PRUEBA" && c !== "DEMO")
  .sort();

  const categories = ["Todos", ...rawCategories];
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [advancedDialogIsOpen, setAdvancedDialogIsOpen] = useState(false);
  const [menuPhotoDialogIsOpen, setMenuPhotoDialogIsOpen] = useState(false);

  // Filter products by the selected category pill
  const categoryFilteredProducts = selectedCategory === "Todos" 
    ? products 
    : products.filter(p => p.category?.trim().toUpperCase() === selectedCategory);

  return (
    <Layout>
      <div className="min-h-screen p-6 lg:p-10 space-y-10 font-space-grotesk italic">
        
        {/* Page Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-6 pb-6 border-b border-white/5 relative">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-[1.8rem] bg-primary/10 border border-primary/20 flex items-center justify-center shadow-glow-pro relative overflow-hidden">
              <Zap className="w-8 h-8 text-primary relative z-10" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
            </div>
            <div>
              <h1 
                className="text-3xl lg:text-4xl font-black tracking-tighter uppercase text-foreground mb-1"
                style={{ textShadow: "0 0 15px rgba(var(--brand-primary-h), 100%, 60%, 0.4)" }}
              >
                Productos
              </h1>
              <p className="text-primary font-black uppercase tracking-[0.3em] text-[9px]">
                Catálogo Operativo & Control de Activos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/5 px-4 h-9 rounded-full border border-white/10 font-black text-[9px] text-muted-foreground uppercase tracking-widest">
            <Globe className="w-3.5 h-3.5 text-primary" /> Ecosistema Global
          </div>
        </div>

        {/* Filter controls, search bar & action buttons */}
        <div className="flex flex-col xl:flex-row gap-4 items-center justify-between glass-pro border border-border p-5 rounded-2xl">
          
          {/* Left search bar */}
          <div className="relative w-full xl:w-72">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-primary w-4 h-4" />
            <Input
              placeholder="Buscar producto"
              className="pl-10 h-10 bg-surface-subtle border-border rounded-lg text-xs font-black uppercase tracking-widest placeholder:text-muted-foreground/50 focus:border-primary text-foreground"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Center Category Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full xl:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-1.5 text-xs font-black rounded-lg border uppercase tracking-widest transition-all cursor-pointer",
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground border-primary shadow-glow-pro"
                    : "bg-surface-subtle border-border text-muted-foreground hover:text-foreground hover:bg-surface-active"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:justify-end">
            <Button
              onClick={() => setAdvancedDialogIsOpen(true)}
              variant="outline"
              size="sm"
              className="h-9 border-border bg-surface-subtle hover:bg-surface-active text-foreground font-black rounded-lg px-4 flex items-center gap-1.5 text-xs uppercase tracking-widest cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-primary" />
              Config
            </Button>

            <Button
              onClick={handleExportProducts}
              size="sm"
              className="h-9 bg-surface-subtle hover:bg-surface-active border border-border text-foreground font-black rounded-lg px-4 flex items-center gap-1.5 text-xs uppercase tracking-widest cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              Exportar
            </Button>

            <Button
              onClick={() => setImportDialogIsOpen(true)}
              size="sm"
              className="h-9 bg-surface-subtle hover:bg-surface-active border border-border text-foreground font-black rounded-lg px-4 flex items-center gap-1.5 text-xs uppercase tracking-widest cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-primary" />
              Importar
            </Button>

            <Button
              onClick={() => setMenuPhotoDialogIsOpen(true)}
              size="sm"
              className="h-9 bg-surface-subtle hover:bg-surface-active border border-border text-foreground font-black rounded-lg px-4 flex items-center gap-1.5 text-xs uppercase tracking-widest cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-primary" />
              Foto Menú
            </Button>

            <Button
              onClick={openCreateDialog}
              size="sm"
              className="h-9 bg-primary hover:bg-primary/80 text-primary-foreground font-black rounded-lg px-4 flex items-center gap-1.5 text-xs uppercase tracking-widest shadow-glow-pro"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo
            </Button>

            <Button
              size="sm"
              className="h-9 bg-surface-subtle hover:bg-surface-active border border-border text-foreground font-black rounded-lg px-4 flex items-center gap-1.5 text-xs uppercase tracking-widest"
            >
              <History className="w-3.5 h-3.5 text-primary" />
              Historial
            </Button>
          </div>
        </div>

        {/* Product Table Grid Display */}
        <div className="w-full">
          <ProductGridDisplay
            products={categoryFilteredProducts}
            loading={isLoading}
            searchQuery={searchQuery}
            filterActive={filterActive}
            filterType="all"
            openCreateDialog={openCreateDialog}
            openEditDialog={openEditDialog}
            openDetailsDialog={async (p) => {
              setViewingProduct(p);
              setDetailsDialogIsOpen(true);
              const { data } = await supabase.from('store_stock').select('qty, min_qty, stores(name)').eq('product_id', p.id);
              setProductStock((data || []).map((item: any) => ({ 
                store_name: item.stores.name, 
                qty: item.qty, 
                min_qty: item.min_qty 
              })));
            }}
            handleDeleteProduct={handleDeleteProduct}
            userStoreId={storeId}
          />
        </div>

        {/* Form Dialog */}
        <ProductFormDialog
          isOpen={productDialogIsOpen}
          onClose={() => setProductDialogIsOpen(false)}
          editingProduct={editingProduct}
          formData={formData}
          setFormData={setFormData}
          onSave={handleSaveProduct}
          isProcessing={isProcessing}
          productTypeOptions={[
            { value: "granizado", label: "Granizado", icon: Plus },
            { value: "topping", label: "Topping", icon: Plus },
            { value: "sachet", label: "Sachet", icon: Plus },
            { value: "sweet", label: "Dulce", icon: Plus },
          ]}
          skuAcronyms={skuAcronyms}
          storeId={storeId}
        />

        {/* Details Dialog */}
        <ProductDetailsDialog
          isOpen={detailsDialogIsOpen}
          onClose={() => setDetailsDialogIsOpen(false)}
          viewingProduct={viewingProduct}
          productStock={productStock}
        />

        {/* CSV Import/Export Buttons */}
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

        {/* Advanced Config Dialog */}
        <AdvancedConfigDialog
          isOpen={advancedDialogIsOpen}
          onClose={() => setAdvancedDialogIsOpen(false)}
          categories={dbCategories || []}
          storeId={storeId}
        />

        {/* Menu Photo Dialog */}
        <MenuPhotoDialog
          isOpen={menuPhotoDialogIsOpen}
          onClose={() => setMenuPhotoDialogIsOpen(false)}
          storeId={storeId}
        />

      </div>
    </Layout>
  );
}