import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tables, Json, Enums } from "@/integrations/supabase/types";
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useProductComboOptions } from "@/hooks/useProductComboOptions";
import { DatosTab } from "@/components/products/DatosTab";
import { PreciosTab } from "@/components/products/PreciosTab";
import { AvanzadoTab } from "@/components/products/AvanzadoTab";
import { ComboProductsTab } from "@/components/products/ComboProductsTab";
import { ImpuestosTab } from "@/components/products/ImpuestosTab";
import { VarianteTab } from "@/components/products/VarianteTab";
import { InventarioModoTab } from "@/components/products/InventarioModoTab";

type Product = Tables<'products'>;
type ProductType = Enums<'product_type'>;
type SkuAcronym = Tables<'sku_acronyms'>;

interface ProductFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  formData: {
    name: string;
    sku: string;
    description: string;
    price: string;
    cost: string;
    active: boolean;
    category: string;
    category_id: string | null;
    is_public: boolean;
    images: string[];
    variants: Json | null;
    type: ProductType;
    stock: string;
    base_volume: string | number;
    unit_measure: string;
    recipe?: Record<string, unknown>;
    margin_target: string;
    commission_rate: string;
    supplier_name: string;
    supplier_id: string | null;
    is_starred: boolean;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    name: string;
    sku: string;
    description: string;
    price: string;
    cost: string;
    active: boolean;
    category: string;
    category_id: string | null;
    is_public: boolean;
    images: string[];
    variants: Json | null;
    type: ProductType;
    stock: string;
    base_volume: string | number;
    unit_measure: string;
    recipe?: Record<string, unknown>;
    margin_target: string;
    commission_rate: string;
    supplier_name: string;
    supplier_id: string | null;
    is_starred: boolean;
  }>>;
  onSave: () => void;
  isProcessing: boolean;
  productTypeOptions: { value: ProductType; label: string; icon: React.ElementType }[];
  skuAcronyms: SkuAcronym[];
  storeId: string | null;
}

type TabType = "datos" | "impuestos" | "variante" | "inventario" | "adicionales" | "precios" | "avanzado" | "integraciones" | "productos_combo";

export default function ProductFormDialog({
  isOpen,
  onClose,
  editingProduct,
  formData,
  setFormData,
  onSave,
  isProcessing,
  productTypeOptions,
  skuAcronyms,
  storeId,
}: ProductFormDialogProps) {

  const [activeTab, setActiveTab] = useState<TabType>("datos");
  const [sizes, setSizes] = useState<{ id: string; name: string; multiplier: number }[]>([]);
  const [categoriesList, setCategoriesList] = useState<{ id: string; name: string }[]>([]);
  const [suppliersList, setSuppliersList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      const { data } = await supabase.from("suppliers").select("id, name").order("name");
      setSuppliersList(data || []);
    };
    if (isOpen) {
      fetchSuppliers();
    }
  }, [isOpen]);

  // Custom mock inputs inside additional tabs
  const [selectedTax, setSelectedTax] = useState("");
  const [variantShortName, setVariantShortName] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [inventoryMode, setInventoryMode] = useState<"ingredients" | "none" | "mixed" | "no_ingredients">("none");

  const isCombo = formData.type === "combo";
  const displayType = isCombo ? "combo" : "normal";

  const combo = useProductComboOptions(isOpen, formData, setFormData, storeId);

  const handleTypeChange = (val: string) => {
    if (val === "combo") {
      setFormData(prev => ({ ...prev, type: "combo" }));
    } else {
      const prevNormalType = editingProduct && editingProduct.type !== "combo" ? editingProduct.type : "granizado";
      setFormData(prev => ({ ...prev, type: prevNormalType as ProductType }));
    }
  };

  // Handle active tab reset when type changes
  React.useEffect(() => {
    if (isCombo && (activeTab === "variante" || activeTab === "inventario")) {
      setActiveTab("datos");
    } else if (!isCombo && activeTab === "productos_combo") {
      setActiveTab("datos");
    }
  }, [formData.type, activeTab]);

  React.useEffect(() => {
    if (storeId && isOpen) {
      const fetchSizes = async () => {
        const { data } = await supabase
          .from("sizes")
          .select("id, name, multiplier")
          .eq("store_id", storeId)
          .order("multiplier", { ascending: true });
        setSizes(data || []);
      };

      const fetchCategories = async () => {
        const { data } = await supabase
          .from("categories")
          .select("id, name, store_id")
          .or(`store_id.eq.${storeId},store_id.is.null`)
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (data) {
          const seen = new Set<string>();
          const unique: { id: string; name: string }[] = [];

          // Sort prioritizing store-specific categories first over global ones
          const sorted = [...data].sort((a, b) => {
            if (a.store_id === storeId && b.store_id !== storeId) return -1;
            if (a.store_id !== storeId && b.store_id === storeId) return 1;
            return 0;
          });

          for (const cat of sorted) {
            const normalized = cat.name.trim().toUpperCase();
            // Ignore test categories or duplicates
            if (normalized === "TEST" || normalized === "PRUEBA" || normalized === "DEMO") continue;

            if (!seen.has(normalized)) {
              seen.add(normalized);
              unique.push({ id: cat.id, name: cat.name.trim().toUpperCase() });
            }
          }

          // Sort alphabetically
          unique.sort((a, b) => a.name.localeCompare(b.name));
          setCategoriesList(unique);
        } else {
          setCategoriesList([]);
        }
      };

      fetchSizes();
      fetchCategories();
    }
  }, [storeId, isOpen]);

  const [isUploading, setIsUploading] = useState(false);

  // Image helpers
  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setFormData(prev => ({ ...prev, images: [e.target.value] }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, suba únicamente archivos de imagen.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen debe tener un tamaño inferior a 2MB.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${storeId || 'global'}/product-${crypto.randomUUID()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("products")
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, images: [publicUrl] }));
      toast.success("Imagen cargada correctamente");
    } catch (err: any) {
      console.error("Error uploading image:", err);
      toast.error(`Error al subir: ${err.message || "desconocido"}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, images: [] }));
  };

  // Pricing calculations
  const priceVal = parseFloat(formData.price) || 0;
  const costVal = parseFloat(formData.cost) || 0;
  const utility = priceVal - costVal;
  const utilityPercent = priceVal > 0 ? (utility / priceVal) * 100 : 0;

  // Variants handlers
  const getVariantPriceVal = (sizeId: string): string => {
    const variants = formData.variants as any;
    if (!variants || !Array.isArray(variants)) return "";
    const found = variants.find((v: any) => v.size_id === sizeId || v.id === sizeId);
    return found && typeof found.price === 'number' ? found.price.toString() : "";
  };

  const handleVariantPriceValChange = (sizeId: string, priceStr: string) => {
    const currentVariants = Array.isArray(formData.variants) ? [...formData.variants] : [];
    const val = parseFloat(priceStr);
    const index = currentVariants.findIndex((v: any) => v.size_id === sizeId || v.id === sizeId);

    if (priceStr.trim() === "" || isNaN(val) || val < 0) {
      if (index >= 0) {
        currentVariants.splice(index, 1);
      }
    } else {
      if (index >= 0) {
        currentVariants[index] = { ...currentVariants[index], price: val, size_id: sizeId };
      } else {
        currentVariants.push({ size_id: sizeId, price: val, enabled: true });
      }
    }
    setFormData(prev => ({ ...prev, variants: currentVariants.length > 0 ? currentVariants : null }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[95dvh] overflow-y-auto bg-[#0d0d12] border border-white/10 shadow-pro p-0 rounded-3xl text-slate-300 font-space-grotesk italic dialog-cyberpunk">

        {/* Header containing name title & close option */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-white/[0.01] dialog-cyberpunk-header">
          <h2 className="text-lg font-black tracking-widest text-slate-100 uppercase dialog-cyberpunk-title">
            {formData.name || (editingProduct ? "Editar Producto" : "Nuevo Producto")}
          </h2>
        </div>

        {/* Tab Headers navigation bar */}
        <div className="flex border-b border-white/5 overflow-x-auto no-scrollbar bg-slate-950/60">
          {[
            { id: "datos", label: "Datos" },
            { id: "impuestos", label: "Impuestos" },
            ...(!isCombo ? [
              { id: "variante", label: "Variante" },
              { id: "inventario", label: "Inventario" }
            ] : [
              { id: "productos_combo", label: "Productos Combo" }
            ]),
            { id: "adicionales", label: "Adicionales" },
            { id: "precios", label: "$ Variante de precios" },
            { id: "avanzado", label: "Avanzado" },
            { id: "integraciones", label: "Integraciones" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "px-5 py-4 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2 cursor-pointer",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-400 hover:text-slate-100 hover:border-white/10"
              )}
            >
              {tab.label}
              {tab.id === "impuestos" && (
                <span className="ml-1 bg-primary text-white font-mono text-[8px] font-black uppercase px-1 rounded-sm relative -top-2 shadow-glow-pro animate-pulse">
                  Nuevo
                </span>
              )}
            </button>
          ))}
        </div>

        <form id="product-form-modal" onSubmit={(e) => { e.preventDefault(); onSave(); }} className="p-8">

          {activeTab === "datos" && (
            <DatosTab
              formData={formData}
              setFormData={setFormData}
              editingProduct={editingProduct}
              categoriesList={categoriesList}
              displayType={displayType}
              onTypeChange={handleTypeChange}
              onImageUrlChange={handleImageUrlChange}
              onImageUpload={handleImageUpload}
              isUploading={isUploading}
              onRemoveImage={handleRemoveImage}
              utility={utility}
              utilityPercent={utilityPercent}
            />
          )}

          {activeTab === "impuestos" && (
            <ImpuestosTab selectedTax={selectedTax} setSelectedTax={setSelectedTax} />
          )}

          {activeTab === "variante" && (
            <VarianteTab
              variantShortName={variantShortName}
              setVariantShortName={setVariantShortName}
              variantPrice={variantPrice}
              setVariantPrice={setVariantPrice}
            />
          )}

          {activeTab === "inventario" && (
            <InventarioModoTab inventoryMode={inventoryMode} setInventoryMode={setInventoryMode} />
          )}

          {/* TAB 5: ADICIONALES */}
          {activeTab === "adicionales" && (
            <div className="py-12 text-center text-slate-500 uppercase tracking-widest text-[10px] animate-fadeIn">
              No hay adicionales configurados para este producto.
            </div>
          )}

          {activeTab === "precios" && (
            <PreciosTab
              sizes={sizes}
              price={formData.price}
              getVariantPriceVal={getVariantPriceVal}
              onVariantPriceValChange={handleVariantPriceValChange}
            />
          )}

          {activeTab === "avanzado" && (
            <AvanzadoTab formData={formData} setFormData={setFormData} suppliersList={suppliersList} />
          )}

          {/* TAB 8: INTEGRACIONES */}
          {activeTab === "integraciones" && (
            <div className="space-y-4 py-4 animate-fadeIn">
              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="space-y-0.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-slate-300">Rappi Delivery</Label>
                  <p className="text-[10px] text-slate-500">Publicar este producto en el catálogo de Rappi.</p>
                </div>
                <Switch className="data-[state=checked]:bg-primary" />
              </div>
            </div>
          )}

          {activeTab === "productos_combo" && (
            <ComboProductsTab
              comboOptions={combo.comboOptions}
              showDetailsInReports={combo.showDetailsInReports}
              allProductsList={combo.allProductsList}
              searchQueries={combo.searchQueries}
              toggleShowDetailsInReports={combo.toggleShowDetailsInReports}
              addComboOption={combo.addComboOption}
              removeComboOption={combo.removeComboOption}
              updateComboOptionField={combo.updateComboOptionField}
              addProductToOption={combo.addProductToOption}
              removeProductFromOption={combo.removeProductFromOption}
              updateProductQty={combo.updateProductQty}
              setSearchQueryFor={combo.setSearchQueryFor}
            />
          )}

        </form>

        {/* Footer */}
        <DialogFooter className="px-8 py-5 border-t border-white/5 flex gap-3 bg-white/[0.01]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 h-11 text-xs font-black uppercase tracking-widest rounded-xl dialog-cyberpunk-close-btn"
          >
            Cerrar // Discard
          </Button>
          <Button
            type="submit"
            form="product-form-modal"
            disabled={isProcessing || !formData.name || !formData.price}
            className="flex-1 h-11 text-white text-xs font-black uppercase tracking-widest rounded-xl active:scale-[0.98] transition-all border-none dialog-cyberpunk-save-btn"
          >
            {isProcessing ? "Guardando..." : "Guardar cambios // Commit"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
