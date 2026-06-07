import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCOP } from "@/lib/currency";
import { Tables, Json, Enums } from "@/integrations/supabase/types";
import React from "react"; 
import { supabase } from "@/integrations/supabase/client";
import { typedFrom } from "@/integrations/supabase/types-extensions";
import { Package, Activity, Calculator } from "lucide-react";
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
    is_starred: boolean;
  }>>;
  onSave: () => void;
  isProcessing: boolean;
  productTypeOptions: { value: ProductType; label: string; icon: React.ElementType }[];
  skuAcronyms: SkuAcronym[]; 
  storeId: string | null; // Added storeId prop
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
  storeId, // Destructure new prop
}: ProductFormDialogProps) {
  const [sizes, setSizes] = React.useState<{ id: string; name: string; multiplier: number }[]>([]);
  const [productTypesConfig, setProductTypesConfig] = React.useState<{ code: string; emoji_icon: string; label: string }[]>([]);

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
      const fetchTypes = async () => {
        const { data } = await typedFrom.product_types_config().select('*').eq('active', true);
        setProductTypesConfig(data || []);
      };
      fetchSizes();
      fetchTypes();
    }
  }, [storeId, isOpen]);

  const generateSkuSuggestion = () => {
    const typeAcronym = skuAcronyms.find(a => a.type === formData.type)?.code || '';
    const namePart = formData.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (typeAcronym && namePart) {
      return `${typeAcronym}-${namePart}`;
    }
    return '';
  };

  const getVariantPrice = (sizeId: string, variants: any): string => {
    if (!variants || !Array.isArray(variants)) return "";
    const found = variants.find((v: any) => v.size_id === sizeId || v.id === sizeId);
    return found && typeof found.price === 'number' ? found.price.toString() : "";
  };

  const handleVariantPriceChange = (sizeId: string, priceStr: string) => {
    const currentVariants = Array.isArray(formData.variants) ? [...formData.variants] : [];
    const priceVal = parseFloat(priceStr);
    const index = currentVariants.findIndex((v: any) => v.size_id === sizeId || v.id === sizeId);

    if (priceStr.trim() === "" || isNaN(priceVal) || priceVal < 0) {
      if (index >= 0) {
        currentVariants.splice(index, 1);
      }
    } else {
      if (index >= 0) {
        currentVariants[index] = { ...currentVariants[index], price: priceVal, size_id: sizeId };
      } else {
        currentVariants.push({ size_id: sizeId, price: priceVal });
      }
    }
    setFormData({ ...formData, variants: currentVariants.length > 0 ? currentVariants : null });
  };

  const isVariantEnabled = (sizeId: string, variants: any): boolean => {
    if (!variants || !Array.isArray(variants)) return true;
    const found = variants.find((v: any) => v.size_id === sizeId || v.id === sizeId);
    return found ? found.enabled !== false : false;
  };

  const handleVariantEnabledChange = (sizeId: string, isEnabled: boolean) => {
    const currentVariants = Array.isArray(formData.variants) ? [...formData.variants] : [];
    const index = currentVariants.findIndex((v: any) => v.size_id === sizeId || v.id === sizeId);

    if (index >= 0) {
      currentVariants[index] = { ...currentVariants[index], enabled: isEnabled };
    } else {
      const sizeObj = sizes.find(s => s.id === sizeId);
      const defaultPrice = Math.round((parseFloat(formData.price) || 0) * (sizeObj?.multiplier || 1));
      currentVariants.push({ size_id: sizeId, price: defaultPrice, enabled: isEnabled });
    }
    setFormData({ ...formData, variants: currentVariants.length > 0 ? currentVariants : null });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto custom-scrollbar bg-background border-border/40 shadow-pro p-0 rounded-[2.5rem]">
        {/* Header with Background Accent */}
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-8 border-b border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Package className="w-40 h-40 -rotate-12 translate-x-10 -translate-y-10 text-primary" />
          </div>
          <div className="relative flex items-center gap-4 mb-3">
            <div className="p-3 bg-primary/20 rounded-2xl text-primary border border-primary/20 shadow-glow-pro">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <DialogTitle className="text-3xl font-black font-space-grotesk tracking-tighter italic uppercase text-white">
                {editingProduct ? "EDITAR" : "REGISTRAR"} <span className="text-primary text-glow">PRODUCTO</span>
              </DialogTitle>
              <DialogDescription className="text-primary font-black uppercase text-[10px] tracking-widest mt-1">
                {editingProduct ? "ACTUALIZACIÓN DE PARÁMETROS TÉCNICOS" : "CREACIÓN DE NUEVO ACTIVO DE VENTA"}
              </DialogDescription>
            </div>
          </div>
        </div>

        <form id="product-form" onSubmit={(e) => { e.preventDefault(); onSave(); }} className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 space-y-3">
              <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 font-space-grotesk italic">IDENTIFICACIÓN COMERCIAL *</Label>
              <Input
                id="name"
                placeholder="EJ: GRANIZADO DE MANDARINA PREMIUM"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-14 bg-white/5 border-white/10 rounded-2xl font-black font-space-grotesk italic uppercase tracking-tighter text-lg focus:border-primary/50 text-white transition-all shadow-inner"
                required
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="type" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 font-space-grotesk italic">TIPO DE ACTIVO *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: ProductType) => setFormData({ ...formData, type: value })}
                disabled={isProcessing}
              >
                <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl font-black font-space-grotesk tracking-widest uppercase italic text-[10px] focus:ring-primary/20 transition-all hover:bg-white/10">
                  <SelectValue placeholder="SELECCIONA TIPO" />
                </SelectTrigger>
                <SelectContent className="glass-pro border-white/10">
                  {productTypesConfig.length > 0 ? (
                    productTypesConfig.map(option => (
                      <SelectItem key={option.code} value={option.code as ProductType} className="font-black font-space-grotesk italic text-[10px] tracking-widest uppercase">
                        <div className="flex items-center gap-3">
                          <span className="text-base grayscale group-hover:grayscale-0 transition-all">{option.emoji_icon}</span>
                          {option.label}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    productTypeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value} className="font-black font-space-grotesk italic text-[10px] tracking-widest uppercase">
                        <div className="flex items-center gap-3">
                          <option.icon className="w-4 h-4 text-primary" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="category" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 font-space-grotesk italic">CATEGORIZACIÓN</Label>
              <Input
                id="category"
                placeholder="EJ: CLÁSICOS, PREMIUM, FRUTAS"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="h-14 bg-white/5 border-white/10 rounded-2xl font-black font-space-grotesk italic uppercase tracking-widest text-xs focus:border-primary/50 text-white transition-all shadow-inner"
              />
            </div>

            <div className="col-span-2 space-y-3">
              <Label htmlFor="sku" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 font-space-grotesk italic">SKU (PRIMARY KEY)</Label>
              <div className="flex gap-3">
                <Input
                  id="sku"
                  placeholder={generateSkuSuggestion() || "EJ: GRAN-FRES-001"}
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="flex-1 h-14 bg-white/5 border-white/10 rounded-2xl font-black font-space-grotesk italic tracking-widest text-sm focus:border-primary/50 text-primary transition-all shadow-inner"
                />
                {!formData.sku && generateSkuSuggestion() && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setFormData({ ...formData, sku: generateSkuSuggestion() })}
                    className="h-14 px-6 glass-pro rounded-2xl font-black font-space-grotesk italic text-[10px] tracking-widest uppercase text-primary border border-primary/20 shadow-glow hover:bg-primary/20 transition-all"
                  >
                    SUGERIR SKU
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="price" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 font-space-grotesk italic">PRECIO VENTA *</Label>
              <div className="relative group">
                <Input
                  id="price"
                  type="number"
                  step="1000"
                  min="0"
                  placeholder="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      setFormData({ ...formData, price: (Math.round(val / 1000) * 1000).toString() });
                    }
                  }}
                  className="h-14 bg-white/5 border-white/10 rounded-2xl font-black font-space-grotesk italic tracking-tighter text-xl focus:border-primary/50 text-white transition-all shadow-inner pr-12"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary font-black italic text-xs">COP</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="cost" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 font-space-grotesk italic">COSTO OPERATIVO</Label>
              <div className="relative group">
                <Input
                  id="cost"
                  type="number"
                  step="1000"
                  min="0"
                  placeholder="0"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      setFormData({ ...formData, cost: (Math.round(val / 1000) * 1000).toString() });
                    }
                  }}
                  className="h-14 bg-white/5 border-white/10 rounded-2xl font-black font-space-grotesk italic tracking-tighter text-xl focus:border-primary/50 text-white/60 transition-all shadow-inner pr-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black italic text-xs opacity-50">COP</span>
              </div>
            </div>

            {/* Custom pricing per size toggle and inputs */}
            {(formData.type === 'granizado' || formData.category === 'Granizado') && sizes.length > 0 && (
              <div className="col-span-2 space-y-4 border-t border-white/5 pt-6 mt-2">
                <div className="flex items-center justify-between p-4 glass-pro rounded-2xl border border-white/5 hover:bg-white/5 transition-all">
                  <div className="space-y-0.5">
                    <Label htmlFor="custom-pricing-toggle" className="cursor-pointer text-[10px] font-black uppercase tracking-wider text-white italic font-space-grotesk">
                      PRECIOS PERSONALIZADOS POR TAMAÑO
                    </Label>
                    <p className="text-[8px] text-muted-foreground uppercase tracking-widest font-medium">
                      Permite precios independientes por tamaño sin usar multiplicadores generales.
                    </p>
                  </div>
                  <Switch
                    id="custom-pricing-toggle"
                    checked={Array.isArray(formData.variants) && formData.variants.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const initialVariants = sizes.map(s => ({
                          size_id: s.id,
                          price: Math.round((parseFloat(formData.price) || 0) * s.multiplier),
                          enabled: true
                        }));
                        setFormData({ ...formData, variants: initialVariants });
                      } else {
                        setFormData({ ...formData, variants: null });
                      }
                    }}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                {Array.isArray(formData.variants) && formData.variants.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 glass-pro rounded-[2rem] border border-primary/20 shadow-glow-pro animate-pro-in">
                    {sizes.map((size) => {
                      const vPrice = getVariantPrice(size.id, formData.variants);
                      const isEnabled = isVariantEnabled(size.id, formData.variants);
                      return (
                        <div key={size.id} className="space-y-2 p-4 bg-white/5 rounded-2xl border border-white/5">
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground font-space-grotesk italic">
                              {size.name}
                            </Label>
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`size-toggle-${size.id}`}
                                checked={isEnabled}
                                onCheckedChange={(checked) => handleVariantEnabledChange(size.id, checked)}
                                className="scale-75 data-[state=checked]:bg-primary"
                              />
                              <Label htmlFor={`size-toggle-${size.id}`} className="text-[8px] font-black uppercase tracking-widest text-white/50 italic cursor-pointer">
                                {isEnabled ? "HABILITADO" : "OCULTO"}
                              </Label>
                            </div>
                          </div>
                          
                          <div className="relative group">
                            <Input
                              type="number"
                              step="1000"
                              min="0"
                              placeholder={`Ej: ${Math.round((parseFloat(formData.price) || 0) * size.multiplier)}`}
                              value={vPrice}
                              onChange={(e) => handleVariantPriceChange(size.id, e.target.value)}
                              disabled={!isEnabled}
                              className="h-10 bg-white/5 border-white/10 rounded-xl font-black font-space-grotesk italic tracking-tighter text-sm focus:border-primary/50 text-white transition-all shadow-inner pr-12 disabled:opacity-30 disabled:cursor-not-allowed"
                              required={isEnabled}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary font-black italic text-[9px]">COP</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="col-span-2 space-y-3">
              <Label htmlFor="stock" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 font-space-grotesk italic">INVENTARIO INICIAL (PUNTO)</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                placeholder="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="h-14 bg-white/5 border-white/10 rounded-2xl font-black font-space-grotesk italic tracking-tighter text-2xl focus:border-primary/50 text-emerald-400 transition-all shadow-inner"
              />
            </div>

            {/* Customization & Analytics Parameters */}
            <div className="col-span-2 border-t border-white/5 pt-8 mt-4 space-y-6">
              <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-6 bg-primary rounded-full shadow-glow-pro" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white font-space-grotesk italic">PARÁMETROS DE INTELIGENCIA DE NEGOCIO Y PROVEEDOR</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="margin_target" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 font-space-grotesk italic">META MARGEN (%)</Label>
                  <div className="relative group">
                    <Input
                      id="margin_target"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="60.0"
                      value={formData.margin_target}
                      onChange={(e) => setFormData({ ...formData, margin_target: e.target.value })}
                      className="h-14 bg-white/5 border-white/10 rounded-2xl font-black font-space-grotesk italic tracking-tighter text-lg focus:border-primary/50 text-white transition-all shadow-inner pr-10"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary font-black italic text-xs">%</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="commission_rate" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 font-space-grotesk italic">COMISIÓN VENDEDOR (%)</Label>
                  <div className="relative group">
                    <Input
                      id="commission_rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="0.0"
                      value={formData.commission_rate}
                      onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                      className="h-14 bg-white/5 border-white/10 rounded-2xl font-black font-space-grotesk italic tracking-tighter text-lg focus:border-primary/50 text-white transition-all shadow-inner pr-10"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary font-black italic text-xs">%</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="supplier_name" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 font-space-grotesk italic">PROVEEDOR</Label>
                  <Input
                    id="supplier_name"
                    placeholder="EJ: ALQUERÍA, SAS"
                    value={formData.supplier_name}
                    onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                    className="h-14 bg-white/5 border-white/10 rounded-2xl font-black font-space-grotesk italic tracking-widest text-xs focus:border-primary/50 text-white transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="col-span-2">
              {(() => {
                const typeCfg = productTypesConfig.find(t => t.code === formData.type);
                const showBaseVolume = typeCfg ? typeCfg.sales_mode === 'sizes' : (formData.type === 'granizado' || formData.category === 'Granizado');

                if (!showBaseVolume) return null;

                return (
                  <div className="border-t border-white/5 pt-8 mt-4 space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-1.5 h-6 bg-primary rounded-full shadow-glow-pro" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white font-space-grotesk italic">LOGÍSTICA DE MEDIDA PARA VENTA POR TAMAÑOS</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="base_volume" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 font-space-grotesk italic">VOLUMEN BASE (L)</Label>
                        <Input
                            id="base_volume"
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="EJ: 4.0"
                            value={formData.base_volume}
                            onChange={(e) => setFormData({ ...formData, base_volume: e.target.value })}
                            className="h-14 bg-white/5 border-white/10 rounded-2xl font-black font-space-grotesk italic tracking-tighter text-xl focus:border-primary/50 text-white transition-all shadow-inner"
                        />
                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1 italic opacity-60 px-1">
                            Calculador dinámico: Base x Multiplicador de Tamaño.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="unit_measure" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 font-space-grotesk italic">MÉTRICA DE CONTROL</Label>
                        <Select
                            value={formData.unit_measure}
                            onValueChange={(value) => {
                            const newBaseVol = value === 'unit' ? '1' : formData.base_volume;
                            setFormData({ ...formData, unit_measure: value, base_volume: newBaseVol });
                            }}
                        >
                            <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl font-black font-space-grotesk tracking-widest uppercase italic text-[10px] focus:ring-primary/20 transition-all hover:bg-white/10">
                            <SelectValue placeholder="UNIDAD" />
                            </SelectTrigger>
                            <SelectContent className="glass-pro border-white/10">
                            <SelectItem value="oz" className="font-black font-space-grotesk italic text-[10px] tracking-widest uppercase">ONZAS (OZ)</SelectItem>
                            <SelectItem value="ml" className="font-black font-space-grotesk italic text-[10px] tracking-widest uppercase">MILILITROS (ML)</SelectItem>
                            <SelectItem value="gr" className="font-black font-space-grotesk italic text-[10px] tracking-widest uppercase">GRAMOS (GR)</SelectItem>
                            <SelectItem value="unit" className="font-black font-space-grotesk italic text-[10px] tracking-widest uppercase">UNIDAD (UN)</SelectItem>
                            </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Discount Calculator Preview */}
                    {formData.base_volume && Number(formData.base_volume) > 0 && (
                        <div className="relative overflow-hidden p-6 glass-pro rounded-[2rem] border border-primary/20 shadow-glow-pro animate-pro-in">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Activity className="w-24 h-24 text-primary" />
                            </div>
                            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic mb-6 flex items-center gap-2">
                                <Activity className="w-3 h-3" />
                                PROYECCIÓN DE CONSUMO POS
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {sizes.length > 0 ? (
                                    sizes.map((size, idx) => {
                                        const baseVol = Number(formData.base_volume);
                                        const multiplier = size.multiplier || 1;
                                        const totalVolOz = baseVol * multiplier;
                                        const totalVolMl = totalVolOz * (formData.unit_measure === "oz" ? 29.57 : 1);
                                        
                                        return (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group hover:bg-white/10 transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase italic tracking-tighter text-white">{size.name}</span>
                                                    <span className="text-[8px] text-muted-foreground font-black uppercase tracking-widest opacity-40">{multiplier.toFixed(1)}X FACTOR</span>
                                                </div>
                                                <div className="font-black text-right font-space-grotesk italic">
                                                    {formData.unit_measure === 'unit' ? (
                                                        <span className="text-primary text-sm">{Math.round(multiplier)} UN.</span>
                                                    ) : (
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-primary text-sm leading-none">{totalVolOz.toFixed(1)} {formData.unit_measure}</span>
                                                            <span className="text-[8px] text-muted-foreground uppercase font-black not-italic opacity-40">~{totalVolMl.toFixed(0)} ml</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="col-span-2 text-[9px] font-black uppercase italic tracking-widest text-muted-foreground/40 text-center py-4">Sincroniza tamaños en configuración para previsualizar</p>
                                )}
                            </div>
                            {formData.unit_measure === 'unit' && (
                                <div className="mt-4 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                    <p className="text-[8px] text-amber-400 font-black text-center uppercase tracking-widest italic">
                                        LÓGICA DISCRETA: Deducción basada en unidades enteras según factor multiplicador.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                  </div>
                );
              })()}
            </div>
            
            <div className="col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="flex items-center justify-between p-4 glass-pro rounded-2xl border border-white/5 hover:bg-white/5 transition-all">
                    <Label htmlFor="active" className="cursor-pointer text-[10px] font-black uppercase tracking-wider text-white italic font-space-grotesk">ACTIVO EN VENTA</Label>
                    <Switch
                        id="active"
                        checked={formData.active}
                        onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                        className="data-[state=checked]:bg-primary"
                    />
                </div>

                <div className="flex items-center justify-between p-4 glass-pro rounded-2xl border border-white/5 hover:bg-white/5 transition-all">
                    <Label htmlFor="is_public" className="cursor-pointer text-[10px] font-black uppercase tracking-wider text-white italic font-space-grotesk">CATÁLOGO WEB</Label>
                    <Switch
                        id="is_public"
                        checked={formData.is_public}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                        className="data-[state=checked]:bg-primary"
                    />
                </div>

                <div className="flex items-center justify-between p-4 glass-pro rounded-2xl border border-white/5 hover:bg-white/5 transition-all">
                    <Label htmlFor="is_starred" className="cursor-pointer text-[10px] font-black uppercase tracking-wider text-white italic font-space-grotesk">DESTACADO POS</Label>
                    <Switch
                        id="is_starred"
                        checked={formData.is_starred}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_starred: checked })}
                        className="data-[state=checked]:bg-primary"
                    />
                </div>
            </div>

            <div className="col-span-2 space-y-3">
              <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 font-space-grotesk italic">NARRATIVA DEL PRODUCTO</Label>
              <Textarea
                id="description"
                placeholder="PROPIEDADES, NOTAS DE CATA O INFORMACIÓN PARA EL CLIENTE FINAL..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="h-32 bg-white/5 border-white/10 rounded-2xl font-dm-sans italic text-sm focus:border-primary/50 text-white transition-all shadow-inner placeholder:opacity-30"
              />
            </div>
          </div>

          {formData.price && formData.cost && (
            <div className="relative overflow-hidden p-8 glass-pro rounded-[2.5rem] border border-primary/20 shadow-pro">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <Calculator className="w-24 h-24 text-primary" />
              </div>
              <div className="relative flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 font-space-grotesk italic mb-2">MARGEN OPERATIVO ESTIMADO</p>
                   <p className="text-4xl font-black font-space-grotesk italic text-white tracking-tighter">
                     {formatCOP(parseFloat(formData.price) - parseFloat(formData.cost)).replace("$", "")}
                     <span className="text-xs not-italic ml-2 text-primary opacity-60">COP</span>
                   </p>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 block mb-1 font-space-grotesk italic">PROFIT RATIO</span>
                    {(() => {
                      const actualMargin = (((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.price)) * 100);
                      const targetMarginVal = parseFloat(formData.margin_target || "60");
                      const meetsTarget = actualMargin >= targetMarginVal;
                      return (
                        <>
                          <Badge className={cn(
                            "text-white font-black text-xl px-4 py-1 h-12 rounded-2xl italic font-space-grotesk shadow-glow border-none",
                            meetsTarget ? "bg-emerald-500 shadow-emerald-500/20" : "bg-rose-500 shadow-rose-500/20"
                          )}>
                              {actualMargin.toFixed(1)}%
                          </Badge>
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest block mt-1.5 italic",
                            meetsTarget ? "text-emerald-400" : "text-rose-400"
                          )}>
                            {meetsTarget ? "✓ CUMPLE META" : `✗ META: ${targetMarginVal.toFixed(1)}%`}
                          </span>
                        </>
                      );
                    })()}
                </div>
              </div>
            </div>
          )}

          {/* RecipeManager removed from products form as per user request */}
        </form>

        <DialogFooter className="p-8 pt-0 flex gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 rounded-[1.5rem] appetite-accent-muted border-none font-black uppercase tracking-widest text-[10px] h-14 font-space-grotesk italic"
          >
            CANCELAR
          </Button>
          <Button
            type="submit"
            form="product-form"
            disabled={isProcessing || !formData.name || !formData.price}
            className="flex-1 rounded-[1.5rem] bg-white text-black hover:bg-primary hover:text-white font-black uppercase tracking-widest text-[10px] shadow-glow-pro active:scale-95 transition-all h-14 font-space-grotesk italic border-none"
          >
            {isProcessing ? (
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    SYNCING...
                </div>
            ) : editingProduct ? "ACTUALIZAR ACTIVO" : "CREAR PRODUCTO"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}