import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, X } from "lucide-react";
import type { UseFormRegister, UseFormHandleSubmit, UseFormSetValue, UseFormWatch, FieldErrors } from "react-hook-form";
import type { Category } from "@/lib/pos-types";
import type { CategoryFormData } from "@/hooks/useCategoryManager";

interface CategoryFormDialogProps {
  dialogIsOpen: boolean;
  setDialogIsOpen: (v: boolean) => void;
  editingCategory: Category | null;
  isProcessing: boolean;
  isUploading: boolean;
  imageUrlValue: string | null | undefined;
  register: UseFormRegister<CategoryFormData>;
  handleSubmit: UseFormHandleSubmit<CategoryFormData>;
  setValue: UseFormSetValue<CategoryFormData>;
  watch: UseFormWatch<CategoryFormData>;
  errors: FieldErrors<CategoryFormData>;
  onSubmit: (data: CategoryFormData) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: () => void;
}

/**
 * Diálogo "Crear/Editar Categoría" de CategoryManager.tsx, extraído sin
 * cambios de comportamiento.
 */
export function CategoryFormDialog({
  dialogIsOpen,
  setDialogIsOpen,
  editingCategory,
  isProcessing,
  isUploading,
  imageUrlValue,
  register,
  handleSubmit,
  setValue,
  watch,
  errors,
  onSubmit,
  handleImageUpload,
  removeImage,
}: CategoryFormDialogProps) {
  return (
    <Dialog open={dialogIsOpen} onOpenChange={setDialogIsOpen}>
      <DialogContent className="bg-slate-900 border border-white/10 text-white rounded-2xl max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-black uppercase tracking-widest font-space-grotesk text-white">
            {editingCategory ? "Modificar Categoría" : "Agregar Categoría"}
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Define los atributos de visualización y operacionales de la categoría
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {/* Left Side: General Info */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary font-space-grotesk italic">Datos Generales</h4>

              <div className="space-y-2">
                <Label htmlFor="cat-name" className="text-[9px] font-black uppercase tracking-widest text-slate-300">Nombre Comercial *</Label>
                <Input
                  id="cat-name"
                  {...register("name")}
                  className="bg-slate-950 border-white/10 rounded-lg text-xs"
                  placeholder="Ej: Acompañantes"
                />
                {errors.name && (
                  <p className="text-[10px] text-rose-500 font-bold uppercase">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cat-desc" className="text-[9px] font-black uppercase tracking-widest text-slate-300">Descripción</Label>
                <Input
                  id="cat-desc"
                  {...register("description")}
                  className="bg-slate-950 border-white/10 rounded-lg text-xs"
                  placeholder="Breve reseña de la categoría"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cat-color" className="text-[9px] font-black uppercase tracking-widest text-slate-300">Color Hexadecimal</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="cat-color"
                      type="color"
                      {...register("color_hex")}
                      className="w-8 h-8 p-0 rounded-md border-0 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono uppercase font-bold">{watch("color_hex")}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cat-order" className="text-[9px] font-black uppercase tracking-widest text-slate-300">Prioridad / Orden</Label>
                  <Input
                    id="cat-order"
                    type="number"
                    {...register("sort_order", { valueAsNumber: true })}
                    className="bg-slate-950 border-white/10 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Cargar Imagen */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Miniatura Ilustrativa</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="bg-slate-950 border-white/10 rounded-lg text-xs file:bg-primary file:text-white file:border-0"
                  />
                  {isUploading && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
                </div>
                {imageUrlValue && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5 mt-2">
                    <img src={imageUrlValue} alt="Preview" className="w-10 h-10 object-cover rounded-lg" />
                    <span className="text-[9px] text-muted-foreground truncate flex-1">{imageUrlValue}</span>
                    <Button type="button" size="icon" variant="ghost" onClick={removeImage} className="h-6 w-6 text-rose-500">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Checkbox de Activa */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="cat-active"
                  onChange={(e) => setValue("is_active", e.target.checked)}
                  checked={watch("is_active")}
                  className="w-4 h-4 rounded border-white/10 bg-slate-950 text-primary cursor-pointer"
                />
                <Label htmlFor="cat-active" className="text-xs text-slate-300 cursor-pointer font-bold">Categoría activa en catálogo</Label>
              </div>
            </div>

            {/* Right Side: Operational Rules */}
            <div className="space-y-4 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary font-space-grotesk italic">Reglas Operativas</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cat-emoji" className="text-[9px] font-black uppercase tracking-widest text-slate-300">Emoji Icono</Label>
                  <Input
                    id="cat-emoji"
                    {...register("emoji_icon")}
                    className="bg-slate-950 border-white/10 rounded-lg text-xs"
                    placeholder="Ej: 🍧"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-theme" className="text-[9px] font-black uppercase tracking-widest text-slate-300">Color Tema CSS</Label>
                  <Input
                    id="cat-theme"
                    {...register("color_theme")}
                    className="bg-slate-950 border-white/10 rounded-lg text-xs"
                    placeholder="Ej: bg-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Modo de Venta</Label>
                  <Select
                    value={watch("sales_mode")}
                    onValueChange={(val: any) => setValue("sales_mode", val)}
                  >
                    <SelectTrigger className="h-9 bg-slate-950 border-white/10 rounded-lg text-xs font-bold text-white">
                      <SelectValue placeholder="Seleccionar modo" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-white/10 text-white text-xs">
                      <SelectItem value="unit">Por Unidad</SelectItem>
                      <SelectItem value="sizes">Por Tamaños</SelectItem>
                      <SelectItem value="weight">Por Peso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-unit" className="text-[9px] font-black uppercase tracking-widest text-slate-300">Unidad Inventario</Label>
                  <Input
                    id="cat-unit"
                    {...register("inventory_unit")}
                    className="bg-slate-950 border-white/10 rounded-lg text-xs"
                    placeholder="Ej: ml, un, gr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cat-tax" className="text-[9px] font-black uppercase tracking-widest text-slate-300">Impuesto (%)</Label>
                  <Input
                    id="cat-tax"
                    type="number"
                    step="0.01"
                    {...register("tax_rate", { valueAsNumber: true })}
                    className="bg-slate-950 border-white/10 rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-alert" className="text-[9px] font-black uppercase tracking-widest text-slate-300">Alerta Stock Mínimo</Label>
                  <Input
                    id="cat-alert"
                    type="number"
                    {...register("alert_threshold", { valueAsNumber: true })}
                    className="bg-slate-950 border-white/10 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-white/5 flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="cat-recipe"
                    onChange={(e) => setValue("requires_recipe", e.target.checked)}
                    checked={watch("requires_recipe")}
                    className="w-4 h-4 rounded border-white/10 bg-slate-950 text-primary cursor-pointer"
                  />
                  <Label htmlFor="cat-recipe" className="text-xs text-slate-300 cursor-pointer font-bold">Requiere receta ingred.</Label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="cat-mixture"
                    onChange={(e) => setValue("track_mixture_inventory", e.target.checked)}
                    checked={watch("track_mixture_inventory")}
                    className="w-4 h-4 rounded border-white/10 bg-slate-950 text-primary cursor-pointer"
                  />
                  <Label htmlFor="cat-mixture" className="text-xs text-slate-300 cursor-pointer font-bold">Control Mezcla (Tanques)</Label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="cat-toppings"
                    onChange={(e) => setValue("allow_toppings", e.target.checked)}
                    checked={watch("allow_toppings")}
                    className="w-4 h-4 rounded border-white/10 bg-slate-950 text-primary cursor-pointer"
                  />
                  <Label htmlFor="cat-toppings" className="text-xs text-slate-300 cursor-pointer font-bold">Permitir Toppings</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-white/5 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDialogIsOpen(false)}
              className="text-xs font-bold uppercase tracking-widest"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isProcessing || isUploading}
              className="bg-rose-600 text-white font-bold text-xs uppercase tracking-widest px-6"
            >
              {isProcessing ? "Guardando..." : "Guardar Categoría"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
