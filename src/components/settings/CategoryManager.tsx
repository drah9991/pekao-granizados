import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Tag, Loader2, Check, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Category } from "@/lib/pos-types";

const categoryFormSchema = z.object({
  name: z.string().min(1, "El nombre de la categoría es requerido y obligatorio").max(50, "Máximo 50 caracteres"),
  description: z.string().optional().or(z.literal("")),
  color_hex: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Debe ser un código hexadecimal válido (ej. #06b6d4)"),
  is_active: z.boolean().default(true),
  image_url: z.string().optional().nullable().or(z.literal("")),
  sort_order: z.number().int().min(0, "Debe ser un entero mayor o igual a 0").default(0)
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

const COLOR_PALETTE = [
  { value: "#06b6d4", name: "Cian Neón", shadow: "shadow-[0_0_15px_rgba(6,182,212,0.5)] bg-[#06b6d4]" },
  { value: "#d946ef", name: "Magenta Pro", shadow: "shadow-[0_0_15px_rgba(217,70,239,0.5)] bg-[#d946ef]" },
  { value: "#f97316", name: "Naranja Sol", shadow: "shadow-[0_0_15px_rgba(249,115,22,0.5)] bg-[#f97316]" },
  { value: "#84cc16", name: "Lime Glow", shadow: "shadow-[0_0_15px_rgba(132,204,22,0.5)] bg-[#84cc16]" },
  { value: "#eab308", name: "Yellow Acid", shadow: "shadow-[0_0_15px_rgba(234,179,8,0.5)] bg-[#eab308]" },
  { value: "#ef4444", name: "Red Warning", shadow: "shadow-[0_0_15px_rgba(239,68,68,0.5)] bg-[#ef4444]" },
  { value: "#3b82f6", name: "Blue Aurora", shadow: "shadow-[0_0_15px_rgba(59,130,246,0.5)] bg-[#3b82f6]" },
  { value: "#a855f7", name: "Purple Void", shadow: "shadow-[0_0_15px_rgba(168,85,247,0.5)] bg-[#a855f7]" }
];

export default function CategoryManager() {
  const { storeId: userStoreId } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Dialog & Form state
  const [dialogIsOpen, setDialogIsOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      color_hex: "#06b6d4",
      is_active: true,
      image_url: "",
      sort_order: 0
    }
  });

  const selectedColor = watch("color_hex");
  const imageUrlValue = watch("image_url");

  const fetchCategories = async () => {
    if (!userStoreId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .or(`store_id.eq.${userStoreId},store_id.is.null`)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      
      // Ordenar secundariamente por nombre en memoria
      const sortedData = (data || []).sort((a, b) => {
        if ((a.sort_order || 0) === (b.sort_order || 0)) {
          return a.name.localeCompare(b.name);
        }
        return (a.sort_order || 0) - (b.sort_order || 0);
      });
      
      setCategories(sortedData);
    } catch (err) {
      console.error("Error fetching categories:", err);
      toast.error("Fallo al sincronizar base de datos de categorías");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userStoreId) {
      fetchCategories();
    }
  }, [userStoreId]);

  const openCreateDialog = () => {
    setEditingCategory(null);
    reset({
      name: "",
      description: "",
      color_hex: "#06b6d4",
      is_active: true,
      image_url: "",
      sort_order: 0
    });
    setDialogIsOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      description: category.description || "",
      color_hex: category.color_hex || "#06b6d4",
      is_active: category.is_active ?? true,
      image_url: category.image_url || "",
      sort_order: category.sort_order ?? 0
    });
    setDialogIsOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, suba únicamente archivos de imagen.");
      return;
    }

    // Validar tamaño (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen debe tener un tamaño inferior a 2MB.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userStoreId}/${crypto.randomUUID()}.${fileExt}`;
      const filePath = `category-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("products") // Usamos el bucket de productos existente en lugar de crear uno nuevo para evitar problemas de buckets inexistentes
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("products")
        .getPublicUrl(filePath);

      setValue("image_url", publicUrl);
      toast.success("Imagen subida correctamente.");
    } catch (err: any) {
      console.error("Error uploading image:", err);
      toast.error("Error al subir la imagen.");
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setValue("image_url", "");
  };

  const onSubmit = async (data: CategoryFormData) => {
    if (!userStoreId) return;
    setIsProcessing(true);

    try {
      const payload = {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        color_hex: data.color_hex,
        is_active: data.is_active,
        image_url: data.image_url || null,
        sort_order: Number(data.sort_order) || 0,
        store_id: userStoreId
      };

      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update(payload)
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("Estructura de categoría actualizada con éxito.");
      } else {
        const { error } = await supabase
          .from("categories")
          .insert([payload]);

        if (error) throw error;
        toast.success("Nueva categoría incorporada al registro.");
      }

      setDialogIsOpen(false);
      fetchCategories();
    } catch (err: any) {
      console.error("Error saving category:", err);
      if (err.code === "23505") {
        toast.error("Ya existe una categoría registrada con este nombre.");
      } else {
        toast.error("Fallo de red en la persistencia de la categoría.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    // Check if category has dependent products
    try {
      const { count, error: countError } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category_id", category.id);

      if (countError) throw countError;

      if (count && count > 0) {
        toast.error(`No es posible eliminar. Existen ${count} productos enlazados a esta categoría.`);
        return;
      }
    } catch (err) {
      console.error("Error checking product dependencies:", err);
    }

    if (!confirm(`¿Confirmas la remoción permanente de la categoría "${category.name.toUpperCase()}"?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", category.id);

      if (error) throw error;
      toast.success("Categoría eliminada del catálogo.");
      fetchCategories();
    } catch (err) {
      console.error("Error deleting category:", err);
      toast.error("Error de exclusión física en base de datos.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / pageSize));
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCategories.slice(start, start + pageSize);
  }, [filteredCategories, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > 1 && currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [filteredCategories.length, currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-black font-space-grotesk tracking-wide uppercase text-foreground flex items-center gap-3">
            <Tag className="w-6 h-6 text-primary" />
            Category Engine Master
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-1 italic font-space-grotesk">
            Clasificación y Agrupación Comercial ERP
          </p>
        </div>

        <Button
          onClick={openCreateDialog}
          className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-black font-space-grotesk italic text-[11px] tracking-widest uppercase hover:bg-primary/95 transition-all shadow-glow-pro group shrink-0"
        >
          <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
          Nueva Categoría
        </Button>
      </div>

      <Card className="glass-pro border-white/5 shadow-pro overflow-hidden">
        <CardHeader className="border-b border-white/5 py-5 px-6">
          <div className="relative w-full max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-all duration-300" />
            <Input
              placeholder="BUSCAR CATEGORÍA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-11 bg-white/5 border-white/10 rounded-xl focus:border-primary/40 focus:ring-0 text-xs font-black font-space-grotesk tracking-wider italic placeholder:text-muted-foreground/30 uppercase"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white/[0.02] border-b border-white/5">
                <TableRow className="hover:bg-transparent border-white/5">
                  <TableHead className="w-16 text-[9px] font-black uppercase tracking-widest text-primary/60 h-14 font-space-grotesk">COLOR</TableHead>
                  <TableHead className="w-16 text-[9px] font-black uppercase tracking-widest text-primary/60 h-14 font-space-grotesk">IMAGEN</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-primary/60 h-14 font-space-grotesk">IDENTIFICADOR (NOMBRE)</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-primary/60 h-14 font-space-grotesk">DESCRIPCIÓN</TableHead>
                  <TableHead className="w-20 text-[9px] font-black uppercase tracking-widest text-primary/60 h-14 font-space-grotesk text-center">PRIORIDAD</TableHead>
                  <TableHead className="w-32 text-[9px] font-black uppercase tracking-widest text-primary/60 h-14 font-space-grotesk text-center">ESTADO</TableHead>
                  <TableHead className="w-32 text-[9px] font-black uppercase tracking-widest text-primary/60 h-14 font-space-grotesk text-right pr-6">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary shadow-glow-pro" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary italic animate-pulse">Sincronizando Archivos...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCategories.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="py-20 text-center text-muted-foreground font-caveat text-2xl">
                      No se encontraron categorías registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCategories.map((cat) => (
                    <TableRow key={cat.id} className="border-white/5 hover:bg-white/[0.01] transition-colors h-16">
                      <TableCell className="pl-6">
                        <div 
                          className="w-5 h-5 rounded-full border border-white/10" 
                          style={{ 
                            backgroundColor: cat.color_hex || "#06b6d4",
                            boxShadow: `0 0 10px ${cat.color_hex || "#06b6d4"}80`
                          }} 
                        />
                      </TableCell>
                      <TableCell>
                        {cat.image_url ? (
                          <img 
                            src={cat.image_url} 
                            alt={cat.name} 
                            className="w-9 h-9 object-cover rounded-lg border border-white/5"
                          />
                        ) : (
                          <div className="w-9 h-9 bg-white/5 border border-white/5 rounded-lg flex items-center justify-center text-[10px] text-muted-foreground/30 font-space-grotesk">
                            S/I
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-dm-sans font-bold text-xs uppercase text-foreground">
                        {cat.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground/80 max-w-xs truncate">
                        {cat.description || "—"}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-bold text-primary">
                        {cat.sort_order ?? 0}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          className={cn(
                            "rounded-md text-[8px] font-black uppercase tracking-wider px-2 py-0.5",
                            cat.is_active 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          )}
                        >
                          {cat.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6 space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(cat)}
                          className="h-8 w-8 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-primary transition-all"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCategory(cat)}
                          className="h-8 w-8 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-all"
                          disabled={isProcessing}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <AdvancedPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalRecords={filteredCategories.length}
            pageSizeOptions={[5, 10, 20]}
            className="bg-[#1C1F26]/10 border-t border-white/5"
          />
        </CardContent>
      </Card>

      <Dialog open={dialogIsOpen} onOpenChange={setDialogIsOpen}>
        <DialogContent className="sm:max-w-lg bg-card/95 border border-white/10 backdrop-blur-2xl p-6 rounded-2xl shadow-glow-pro animate-in fade-in zoom-in-95 duration-200 glass-pro">
          <DialogHeader className="border-b border-white/5 pb-3">
            <DialogTitle className="text-lg font-black font-space-grotesk tracking-wide uppercase text-primary">
              {editingCategory ? "EDITAR CATEGORÍA" : "REGISTRAR CATEGORÍA"}
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
              Category Engine Master • Clasificación Comercial
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-space-grotesk italic ml-1">
                Identificador (Nombre)
              </Label>
              <Input
                {...register("name")}
                placeholder="EJ. COCTELES, ENTRADAS..."
                className={cn(
                  "h-12 bg-white/5 border-white/10 rounded-xl focus:border-primary/50 text-xs font-black uppercase tracking-wider font-space-grotesk",
                  errors.name && "border-destructive/50 focus:border-destructive/50"
                )}
              />
              {errors.name && (
                <p className="text-[10px] font-bold text-destructive uppercase tracking-widest font-space-grotesk italic ml-1 mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-space-grotesk italic ml-1">
                Descripción
              </Label>
              <textarea
                {...register("description")}
                placeholder="Breve detalle de la categoría..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl focus:border-primary/50 text-xs text-foreground p-3 focus:outline-none focus:ring-0 font-dm-sans resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-space-grotesk italic ml-1">
                Imagen de Portada (Opcional)
              </Label>
              
              <div className="border border-dashed border-white/10 rounded-xl p-4 bg-white/[0.02] flex flex-col items-center justify-center gap-3">
                {imageUrlValue ? (
                  <div className="flex flex-col items-center gap-2">
                    <img 
                      src={imageUrlValue} 
                      alt="Preview" 
                      className="w-20 h-20 object-cover rounded-xl border border-white/10 shadow-lg"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={removeImage}
                      className="h-7 px-3 text-[10px] font-black text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg flex items-center gap-1 uppercase tracking-widest font-space-grotesk"
                    >
                      <X className="w-3 h-3" />
                      Eliminar Imagen
                    </Button>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center gap-2 py-2">
                    <Upload className="w-6 h-6 text-muted-foreground/60" />
                    <Label className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors font-space-grotesk">
                      {isUploading ? "Subiendo..." : "Seleccionar Archivo"}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        className="hidden" 
                        disabled={isUploading}
                      />
                    </Label>
                    <span className="text-[9px] text-muted-foreground/40 font-mono">PNG, JPG, WEBP (MÁX. 2MB)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-space-grotesk italic ml-1">
                Prioridad de Orden (Visualización)
              </Label>
              <Input
                type="number"
                {...register("sort_order", { valueAsNumber: true })}
                placeholder="0"
                min={0}
                className="h-12 bg-white/5 border-white/10 rounded-xl focus:border-primary/50 text-xs font-mono font-black"
              />
              {errors.sort_order && (
                <p className="text-[10px] font-bold text-destructive uppercase tracking-widest font-space-grotesk italic ml-1 mt-1">
                  {errors.sort_order.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-space-grotesk italic ml-1">
                Color de Asignación (Paleta POS)
              </Label>
              
              <div className="grid grid-cols-4 gap-3">
                {COLOR_PALETTE.map((color) => {
                  const isActive = selectedColor === color.value;
                  return (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setValue("color_hex", color.value)}
                      className={cn(
                        "h-10 rounded-xl border border-white/10 relative transition-all duration-300 flex items-center justify-center",
                        color.shadow,
                        isActive ? "scale-105 border-white/50" : "opacity-60 hover:opacity-100 hover:scale-[1.02]"
                      )}
                      title={color.name}
                    >
                      {isActive && (
                        <Check className="w-4 h-4 text-zinc-950 font-black" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl border border-white/5">
              <input
                id="is_active"
                type="checkbox"
                {...register("is_active")}
                className="w-4 h-4 rounded border-white/10 text-primary bg-zinc-950 focus:ring-0 focus:ring-offset-0 focus:outline-none transition-colors"
              />
              <Label htmlFor="is_active" className="text-[10px] font-black uppercase tracking-wider text-foreground cursor-pointer select-none">
                Categoría Activa (Visible en POS y menú digital)
              </Label>
            </div>

            <DialogFooter className="pt-4 border-t border-white/5 gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogIsOpen(false)}
                className="h-11 rounded-xl text-xs font-black font-space-grotesk tracking-widest uppercase hover:bg-white/5"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isProcessing}
                className="h-11 rounded-xl bg-primary text-primary-foreground font-black font-space-grotesk italic text-[11px] tracking-widest uppercase hover:bg-primary/95 transition-all shadow-glow-pro px-6"
              >
                {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
