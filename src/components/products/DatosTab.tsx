import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import type { ChangeEvent } from "react";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<'products'>;

interface DatosTabProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
  editingProduct: Product | null;
  categoriesList: { id: string; name: string }[];
  displayType: "combo" | "normal";
  onTypeChange: (val: string) => void;
  onImageUrlChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  utility: number;
  utilityPercent: number;
}

/**
 * Tab "Datos" de ProductFormDialog.tsx, extraída sin cambios de
 * comportamiento.
 */
export function DatosTab({
  formData,
  setFormData,
  editingProduct,
  categoriesList,
  displayType,
  onTypeChange,
  onImageUrlChange,
  onRemoveImage,
  utility,
  utilityPercent,
}: DatosTabProps) {
  return (
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
              onClick={onRemoveImage}
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
            onClick={onRemoveImage}
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
            onValueChange={onTypeChange}
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
            onChange={onImageUrlChange}
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
  );
}
