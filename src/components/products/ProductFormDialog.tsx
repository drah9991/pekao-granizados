import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tables, Json, Enums } from "@/integrations/supabase/types";
import React, { useState, useEffect } from "react"; 
import { supabase } from "@/integrations/supabase/client";
import { X, Plus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ComboProduct {
  id: string;
  name: string;
  qty: number;
}

interface ComboOption {
  name: string;
  selection_type: "all" | "single" | "multiple";
  products: ComboProduct[];
  selectable: boolean;
  hide_quantity: boolean;
}

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

  // Combo States
  const [comboOptions, setComboOptions] = useState<ComboOption[]>([]);
  const [showDetailsInReports, setShowDetailsInReports] = useState(false);
  const [allProductsList, setAllProductsList] = useState<any[]>([]);
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({});

  const isCombo = formData.type === "combo";
  const displayType = isCombo ? "combo" : "normal";

  const handleTypeChange = (val: string) => {
    if (val === "combo") {
      setFormData(prev => ({ ...prev, type: "combo" }));
    } else {
      const prevNormalType = editingProduct && editingProduct.type !== "combo" ? editingProduct.type : "granizado";
      setFormData(prev => ({ ...prev, type: prevNormalType as ProductType }));
    }
  };

  // Load from recipe when open
  React.useEffect(() => {
    if (isOpen) {
      if (formData.type === "combo" && formData.recipe) {
        try {
          const comboData = typeof formData.recipe === 'string' ? JSON.parse(formData.recipe) : formData.recipe;
          const parsedOptions = Array.isArray((comboData as any)?.options) ? (comboData as any).options : [];
          setComboOptions(parsedOptions);
          setShowDetailsInReports((comboData as any)?.show_details_in_reports || false);
        } catch (e) {
          console.error("Error parsing combo recipe:", e);
        }
      } else {
        setComboOptions([]);
        setShowDetailsInReports(false);
      }
    }
  }, [isOpen, formData.recipe, formData.type]);

  // Sync back to recipe
  const updateComboRecipe = (newOptions: ComboOption[], newShowDetails: boolean) => {
    setComboOptions(newOptions);
    setShowDetailsInReports(newShowDetails);
    setFormData(prev => ({
      ...prev,
      recipe: {
        options: newOptions,
        show_details_in_reports: newShowDetails
      } as any
    }));
  };

  // Fetch all products for search list
  React.useEffect(() => {
    if (isOpen && storeId) {
      const fetchAllProducts = async () => {
        const { data } = await supabase
          .from("products")
          .select("id, name, price, type, category")
          .eq("store_id", storeId)
          .eq("active", true)
          .order("name", { ascending: true });
        setAllProductsList(data || []);
      };
      fetchAllProducts();
    }
  }, [isOpen, storeId]);

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
          .select("id, name")
          .or(`store_id.eq.${storeId},store_id.is.null`)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        setCategoriesList(data || []);
      };

      fetchSizes();
      fetchCategories();
    }
  }, [storeId, isOpen]);

  // Image helpers
  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setFormData(prev => ({ ...prev, images: [e.target.value] }));
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
  const getVariantPriceVal = (sizeId: string, variants: any): string => {
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
      <DialogContent className="sm:max-w-4xl max-h-[95dvh] overflow-y-auto bg-[#0d0d12] border border-white/10 shadow-pro p-0 rounded-3xl text-slate-300 font-space-grotesk italic">
        
        {/* Header containing name title & close option */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-white/[0.01]">
          <h2 className="text-lg font-black tracking-widest text-slate-100 uppercase">
            {formData.name || (editingProduct ? "Editar Producto" : "Nuevo Producto")}
          </h2>
          <button 
            type="button" 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
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
          
          {/* TAB 1: DATOS */}
          {activeTab === "datos" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Product Image Section */}
              <div className="flex flex-col items-center justify-center space-y-2.5 pb-4 border-b border-white/5">
                {formData.images && formData.images.length > 0 ? (
                  <div className="relative">
                    <img 
                      src={formData.images[0]} 
                      alt="Preview" 
                      className="w-28 h-28 object-cover rounded-2xl border border-white/10 bg-black/40"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full shadow-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-28 h-28 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl">
                    🍹
                  </div>
                )}
                {formData.images && formData.images.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-xs text-rose-400 hover:underline font-bold uppercase tracking-widest"
                  >
                    × Eliminar
                  </button>
                )}
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Tipo* */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo*</Label>
                  <Select
                    value={displayType}
                    onValueChange={handleTypeChange}
                  >
                    <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black uppercase text-white">
                      <SelectValue placeholder="Normal" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-white/10">
                      <SelectItem value="normal" className="text-xs font-black uppercase">Normal</SelectItem>
                      <SelectItem value="combo" className="text-xs font-black uppercase">Combo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Categoría* */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categoría*</Label>
                  <Select
                    value={formData.category_id || ""}
                    onValueChange={(value) => {
                      const selected = categoriesList.find(c => c.id === value);
                      setFormData(prev => ({
                        ...prev,
                        category_id: value,
                        category: selected ? selected.name : ""
                      }));
                    }}
                  >
                    <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black uppercase text-white">
                      <SelectValue placeholder="--- Seleccione ---" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-white/10">
                      {categoriesList.map(cat => (
                        <SelectItem key={cat.id} value={cat.id} className="text-xs font-black uppercase">{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Nombre* */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre*</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black uppercase text-white focus:border-primary/50"
                    required
                  />
                </div>

                {/* Descripción */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descripción</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="h-11 min-h-[44px] py-2 bg-white/5 border-white/10 rounded-lg text-xs text-white focus:border-primary/50"
                  />
                </div>

                {/* Código */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Código</Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black uppercase text-white focus:border-primary/50"
                  />
                </div>

                {/* Imagen URL */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Imagen (URL)</Label>
                  <Input
                    value={formData.images[0] || ""}
                    onChange={handleImageUrlChange}
                    placeholder="URL de la imagen"
                    className="h-11 bg-white/5 border-white/10 rounded-lg text-xs text-white focus:border-primary/50"
                  />
                </div>

                {/* Precio de venta */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Precio de venta</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black text-white focus:border-primary/50"
                    required
                  />
                </div>

                {/* Promoción */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Promoción</Label>
                  <Select defaultValue="none">
                    <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black uppercase text-white">
                      <SelectValue placeholder="--- Seleccione ---" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-white/10">
                      <SelectItem value="none" className="text-xs font-black uppercase">--- Seleccione ---</SelectItem>
                      <SelectItem value="promo-1" className="text-xs font-black uppercase">Descuento 10%</SelectItem>
                      <SelectItem value="promo-2" className="text-xs font-black uppercase">Descuento 20%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tiempo de Preparación */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tiempo de Preparación (Min)</Label>
                  <Input
                    type="number"
                    placeholder="Ej: 5"
                    className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black text-white focus:border-primary/50"
                  />
                </div>

                {/* Zona de comanda */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Zona de comanda</Label>
                  <Select defaultValue="default">
                    <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black uppercase text-white">
                      <SelectValue placeholder="Por defecto" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-white/10">
                      <SelectItem value="default" className="text-xs font-black uppercase">Por defecto</SelectItem>
                      <SelectItem value="barra" className="text-xs font-black uppercase">Barra</SelectItem>
                      <SelectItem value="cocina" className="text-xs font-black uppercase">Cocina principal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Costo de producción */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Costo de producción</Label>
                  <Input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                    className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black text-white focus:border-primary/50"
                  />
                </div>

                {/* Utilidad (read only) */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Utilidad</span>
                  <span className="text-sm font-black text-primary text-glow">
                    $ {utility.toLocaleString('es-CO')} ({utilityPercent.toFixed(1)}%)
                  </span>
                </div>

              </div>

              {/* Switches Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/10">
                  <Label className="cursor-pointer text-xs font-black uppercase tracking-wider text-slate-300">Inventariable</Label>
                  <Switch
                    checked={formData.is_public}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/10">
                  <Label className="cursor-pointer text-xs font-black uppercase tracking-wider text-slate-300">Activo</Label>
                  <Switch
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/10">
                  <Label className="cursor-pointer text-xs font-black uppercase tracking-wider text-slate-300">Rappi</Label>
                  <Switch
                    checked={formData.is_starred}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_starred: checked }))}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: IMPUESTOS */}
          {activeTab === "impuestos" && (
            <div className="space-y-6 py-4 animate-fadeIn">
              <h3 className="text-sm font-black text-center text-slate-300 uppercase tracking-widest">Impuestos</h3>
              <div className="flex items-end justify-center gap-4 max-w-md mx-auto">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Impuesto</Label>
                  <Select value={selectedTax} onValueChange={setSelectedTax}>
                    <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black uppercase text-white">
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-white/10">
                      <SelectItem value="iva-19" className="text-xs font-black uppercase">IVA 19%</SelectItem>
                      <SelectItem value="iva-8" className="text-xs font-black uppercase">IVA 8% (Consumo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <button
                  type="button"
                  className="bg-primary hover:bg-primary/80 text-white rounded-full p-2.5 h-11 w-11 flex items-center justify-center shadow-glow-pro"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="text-center py-8 text-slate-500 font-black flex flex-col items-center justify-center gap-2 uppercase tracking-widest text-[10px]">
                <AlertCircle className="w-8 h-8 text-white/10" />
                No tiene impuestos relacionados.
              </div>
            </div>
          )}

          {/* TAB 3: VARIANTE */}
          {activeTab === "variante" && (
            <div className="space-y-6 py-4 animate-fadeIn">
              <h3 className="text-xs font-black text-center text-primary uppercase tracking-widest">¿Qué es esto?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 items-end gap-4 max-w-xl mx-auto">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre Corto</Label>
                  <Input 
                    value={variantShortName}
                    onChange={(e) => setVariantShortName(e.target.value)}
                    placeholder="Ej: Pequeño"
                    className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black uppercase text-white focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Precio</Label>
                  <Input 
                    type="number"
                    value={variantPrice}
                    onChange={(e) => setVariantPrice(e.target.value)}
                    placeholder="0"
                    className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black text-white focus:border-primary/50"
                  />
                </div>
                <button
                  type="button"
                  className="bg-primary hover:bg-primary/80 text-white rounded-full p-2.5 h-11 w-11 flex items-center justify-center shadow-glow-pro"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: INVENTARIO */}
          {activeTab === "inventario" && (
            <div className="space-y-6 py-4 animate-fadeIn flex flex-col items-center justify-center">
              <h3 className="text-xs font-black text-slate-400 mb-4 uppercase tracking-widest">Modo de consumo en Inventario</h3>
              <div className="flex flex-col sm:flex-row gap-6">
                {[
                  { id: "ingredients", label: "Con ingredientes" },
                  { id: "no_ingredients", label: "Sin ingredientes" },
                  { id: "mixed", label: "Mixto o Para Producción" },
                  { id: "none", label: "Ninguno" },
                ].map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="inventoryMode"
                      checked={inventoryMode === opt.id}
                      onChange={() => setInventoryMode(opt.id as any)}
                      className="accent-primary h-4 w-4"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: ADICIONALES */}
          {activeTab === "adicionales" && (
            <div className="py-12 text-center text-slate-500 uppercase tracking-widest text-[10px] animate-fadeIn">
              No hay adicionales configurados para este producto.
            </div>
          )}

          {/* TAB 6: PRECIOS */}
          {activeTab === "precios" && (
            <div className="space-y-6 py-4 animate-fadeIn">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Variación de Precios por Tamaño</h3>
              {sizes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sizes.map((size) => {
                    const val = getVariantPriceVal(size.id, formData.variants);
                    return (
                      <div key={size.id} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
                        <Label className="text-xs font-black text-slate-300 uppercase tracking-wider">{size.name}</Label>
                        <Input
                          type="number"
                          value={val}
                          onChange={(e) => handleVariantPriceValChange(size.id, e.target.value)}
                          placeholder={`Ej: ${Math.round((parseFloat(formData.price) || 0) * size.multiplier)}`}
                          className="h-10 bg-white/5 border-white/10 rounded-lg text-xs font-black text-white focus:border-primary/50"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-4 text-slate-500 italic text-xs uppercase tracking-widest">No hay tamaños registrados para configurar variaciones.</p>
              )}
            </div>
          )}

          {/* TAB 7: AVANZADO */}
          {activeTab === "avanzado" && (
            <div className="space-y-6 py-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Meta Margen (%)</Label>
                  <Input
                    type="number"
                    value={formData.margin_target}
                    onChange={(e) => setFormData(prev => ({ ...prev, margin_target: e.target.value }))}
                    className="h-11 bg-white/5 border-white/10 rounded-lg text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Comisión Vendedor (%)</Label>
                  <Input
                    type="number"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, commission_rate: e.target.value }))}
                    className="h-11 bg-white/5 border-white/10 rounded-lg text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Proveedor</Label>
                  <Select
                    value={formData.supplier_id || "none"}
                    onValueChange={(val) => {
                      const selectedSup = suppliersList.find(s => s.id === val);
                      setFormData(prev => ({
                        ...prev,
                        supplier_id: val === "none" ? null : val,
                        supplier_name: val === "none" ? "" : (selectedSup?.name || "")
                      }));
                    }}
                  >
                    <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-lg text-white text-xs font-bold">
                      <SelectValue placeholder="Seleccione un proveedor" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-white/10 text-white">
                      <SelectItem value="none" className="text-xs font-bold uppercase">Sin proveedor / Ninguno</SelectItem>
                      {suppliersList.map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-xs font-bold uppercase">{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
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

          {/* TAB 9: PRODUCTOS COMBO */}
          {activeTab === "productos_combo" && (
            <div className="space-y-6 py-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">
                  Configuración de Combos
                </h3>
              </div>

              {comboOptions.map((opt, i) => (
                <div key={i} className="relative bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                  {/* Remove option button */}
                  <button
                    type="button"
                    onClick={() => {
                      const updated = comboOptions.filter((_, idx) => idx !== i);
                      updateComboRecipe(updated, showDetailsInReports);
                    }}
                    className="absolute top-4 right-4 text-rose-500 hover:text-rose-600 font-black text-xs uppercase"
                  >
                    Eliminar Opción
                  </button>

                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 font-space-grotesk italic">
                    Configuración opción
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nombre */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre</Label>
                      <Input
                        value={opt.name}
                        onChange={(e) => {
                          const updated = [...comboOptions];
                          updated[i].name = e.target.value;
                          updateComboRecipe(updated, showDetailsInReports);
                        }}
                        placeholder="Ej: Bebida"
                        className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black text-white focus:border-primary/50"
                      />
                    </div>

                    {/* Tipo* */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo*</Label>
                      <Select
                        value={opt.selection_type}
                        onValueChange={(val: any) => {
                          const updated = [...comboOptions];
                          updated[i].selection_type = val;
                          updateComboRecipe(updated, showDetailsInReports);
                        }}
                      >
                        <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black uppercase text-white">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-white/10">
                          <SelectItem value="all" className="text-xs font-black uppercase">Marcar Todos</SelectItem>
                          <SelectItem value="single" className="text-xs font-black uppercase">Seleccionar Uno (Única)</SelectItem>
                          <SelectItem value="multiple" className="text-xs font-black uppercase">Seleccionar Múltiples</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Buscar producto */}
                  <div className="space-y-2 relative">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Buscar producto para añadir
                    </Label>
                    <Input
                      value={searchQueries[i] || ""}
                      onChange={(e) => {
                        setSearchQueries(prev => ({ ...prev, [i]: e.target.value }));
                      }}
                      placeholder="Ej: Coca-Cola"
                      className="h-11 bg-white/5 border-white/10 rounded-lg text-xs text-white focus:border-primary/50"
                    />

                    {/* Dropdown search results */}
                    {(searchQueries[i] || "").trim() !== "" && (
                      <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-slate-950 border border-white/15 rounded-xl z-50 p-1 shadow-2xl custom-scrollbar">
                        {allProductsList
                          .filter(p => p.name.toLowerCase().includes((searchQueries[i] || "").toLowerCase()))
                          .slice(0, 10)
                          .map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                const updated = [...comboOptions];
                                if (!updated[i].products.find(item => item.id === p.id)) {
                                  updated[i].products.push({ id: p.id, name: p.name, qty: 1 });
                                }
                                updateComboRecipe(updated, showDetailsInReports);
                                setSearchQueries(prev => ({ ...prev, [i]: "" }));
                              }}
                              className="w-full text-left rounded-lg px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                            >
                              {p.name}
                            </button>
                          ))}
                        {allProductsList.filter(p => p.name.toLowerCase().includes((searchQueries[i] || "").toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-xs text-muted-foreground italic text-center">
                            No se encontraron productos
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Added products table */}
                  {opt.products.length > 0 && (
                    <div className="border border-white/5 rounded-xl overflow-hidden bg-slate-950/40">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                            <th className="py-2 px-4">Producto</th>
                            <th className="py-2 px-4 w-28 text-center">Cantidad</th>
                            <th className="py-2 px-4 w-16 text-center"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {opt.products.map((item, itemIdx) => (
                            <tr key={item.id} className="border-b border-white/5 text-xs">
                              <td className="py-2 px-4 font-bold text-slate-200">{item.name}</td>
                              <td className="py-2 px-4 text-center">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.qty}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    const updated = [...comboOptions];
                                    updated[i].products[itemIdx].qty = val;
                                    updateComboRecipe(updated, showDetailsInReports);
                                  }}
                                  className="h-8 w-20 text-center mx-auto bg-white/5 border-white/10 rounded-md text-xs font-bold text-white focus:border-primary/50"
                                />
                              </td>
                              <td className="py-2 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...comboOptions];
                                    updated[i].products.splice(itemIdx, 1);
                                    updateComboRecipe(updated, showDetailsInReports);
                                  }}
                                  className="text-rose-500 hover:text-rose-600 font-bold"
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Checkboxes Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6 pt-2">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-200">
                      <input
                        type="checkbox"
                        checked={opt.selectable}
                        onChange={(e) => {
                          const updated = [...comboOptions];
                          updated[i].selectable = e.target.checked;
                          updateComboRecipe(updated, showDetailsInReports);
                        }}
                        className="rounded border-white/10 bg-white/5 text-primary focus:ring-0 focus:ring-offset-0"
                      />
                      <span>Productos seleccionables</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-200">
                      <input
                        type="checkbox"
                        checked={opt.hide_quantity}
                        onChange={(e) => {
                          const updated = [...comboOptions];
                          updated[i].hide_quantity = e.target.checked;
                          updateComboRecipe(updated, showDetailsInReports);
                        }}
                        className="rounded border-white/10 bg-white/5 text-primary focus:ring-0 focus:ring-offset-0"
                      />
                      <span>No mostrar cantidades al vender</span>
                    </label>
                  </div>
                </div>
              ))}

              {/* Root settings */}
              <div className="pt-2 border-t border-white/5">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={showDetailsInReports}
                    onChange={(e) => {
                      updateComboRecipe(comboOptions, e.target.checked);
                    }}
                    className="rounded border-white/10 bg-white/5 text-primary focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Productos del combo se deben mostrar en detalle en informes</span>
                </label>
              </div>

              {/* Agregar otra button */}
              <Button
                type="button"
                onClick={() => {
                  const updated = [
                    ...comboOptions,
                    {
                      name: "",
                      selection_type: "single" as const,
                      products: [],
                      selectable: false,
                      hide_quantity: false
                    }
                  ];
                  updateComboRecipe(updated, showDetailsInReports);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase px-5 py-2.5 rounded-xl border-none shadow-md flex items-center gap-1.5 cursor-pointer mt-2"
              >
                Agregar otra
              </Button>
            </div>
          )}

        </form>

        {/* Footer */}
        <DialogFooter className="px-8 py-5 border-t border-white/5 flex gap-3 bg-white/[0.01]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 h-11 border-white/10 text-slate-300 hover:bg-white/10 text-xs font-black uppercase tracking-widest rounded-xl bg-transparent"
          >
            Cerrar
          </Button>
          <Button
            type="submit"
            form="product-form-modal"
            disabled={isProcessing || !formData.name || !formData.price}
            className="flex-1 h-11 bg-primary hover:bg-primary/80 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-glow-pro active:scale-[0.98] transition-all border-none"
          >
            {isProcessing ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}