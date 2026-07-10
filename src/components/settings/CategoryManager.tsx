import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Tag, Loader2, Check, Upload, X, RotateCcw } from "lucide-react";
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

export default function CategoryManager() {
  const { storeId: userStoreId } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
      color_hex: "#ef4444",
      is_active: true,
      image_url: "",
      sort_order: 0
    }
  });

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
      
      const sortedData = (data || []).sort((a, b) => {
        if ((a.sort_order || 0) === (b.sort_order || 0)) {
          return a.name.localeCompare(b.name);
        }
        return (a.sort_order || 0) - (b.sort_order || 0);
      });
      
      setCategories(sortedData);
    } catch (err) {
      console.error("Error fetching categories:", err);
      toast.error("Fallo al sincronizar categorías.");
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
      color_hex: "#ef4444",
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
      color_hex: category.color_hex || "#ef4444",
      is_active: category.is_active ?? true,
      image_url: category.image_url || "",
      sort_order: category.sort_order ?? 0
    });
    setDialogIsOpen(true);
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
      const fileName = `${userStoreId}/${crypto.randomUUID()}.${fileExt}`;
      const filePath = `category-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("products")
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
        toast.success("Categoría actualizada con éxito.");
      } else {
        const { error } = await supabase
          .from("categories")
          .insert([payload]);

        if (error) throw error;
        toast.success("Categoría creada con éxito.");
      }

      setDialogIsOpen(false);
      fetchCategories();
    } catch (err: any) {
      console.error("Error saving category:", err);
      if (err.code === "23505") {
        toast.error("Ya existe una categoría registrada con este nombre.");
      } else {
        toast.error("Error al guardar la categoría.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    try {
      const { count, error: countError } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category_id", category.id);

      if (countError) throw countError;

      if (count && count > 0) {
        toast.error(`No es posible eliminar. Existen ${count} productos asociados a esta categoría.`);
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
      toast.success("Categoría eliminada con éxito.");
      fetchCategories();
    } catch (err) {
      console.error("Error deleting category:", err);
      toast.error("Error al eliminar la categoría.");
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
    <div className="space-y-6 w-full animate-pro-in text-slate-800 dark:text-slate-100">
      
      {/* Título Centrado */}
      <div className="text-center py-4">
        <h2 className="text-xl sm:text-2xl font-black font-space-grotesk tracking-widest uppercase text-slate-900 dark:text-white">
          Categorías
        </h2>
      </div>

      {/* Controles de Búsqueda y Botones de Creación */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Label htmlFor="search-cat" className="text-xs font-bold uppercase tracking-wider text-slate-500 shrink-0">Buscar:</Label>
          <div className="relative flex-1 sm:w-64">
            <Input
              id="search-cat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 bg-slate-900/10 dark:bg-white/5 border-white/10 rounded-lg text-xs"
              placeholder=""
            />
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <Button
            onClick={openCreateDialog}
            className="h-9 px-5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-full border-none shadow-sm cursor-pointer"
          >
            Nueva
          </Button>
          <Button
            variant="outline"
            className="h-9 px-5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-full border-none shadow-sm cursor-pointer"
            onClick={fetchCategories}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Ver Historial
          </Button>
        </div>
      </div>

      {/* Tabla de Categorías Rediseñada */}
      <Card className="bg-transparent border-0 shadow-none overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="border-0">
              <TableHeader className="bg-slate-900/5 dark:bg-white/[0.02] border-b border-white/10">
                <TableRow className="hover:bg-transparent border-white/5">
                  <TableHead className="w-20"></TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 h-11">Nombre</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 h-11">Descripción</TableHead>
                  <TableHead className="w-24 text-xs font-bold uppercase tracking-wider text-slate-500 h-11 text-center">Estado</TableHead>
                  <TableHead className="w-48 h-11"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 dark:divide-white/5">
                {loading ? (
                  <TableRow className="hover:bg-transparent border-0">
                    <TableCell colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Cargando Categorías...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCategories.length === 0 ? (
                  <TableRow className="hover:bg-transparent border-0">
                    <TableCell colSpan={5} className="py-20 text-center text-slate-400 font-medium text-sm">
                      No hay categorías registradas que coincidan con la búsqueda.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCategories.map((cat) => (
                    <TableRow key={cat.id} className="border-0 hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors h-14">
                      
                      {/* Imagen Miniatura Circular */}
                      <TableCell className="py-2.5 pl-4">
                        <div className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center overflow-hidden bg-slate-900/50">
                          {cat.image_url ? (
                            <img 
                              src={cat.image_url} 
                              alt={cat.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm">🍔</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Nombre */}
                      <td className="py-2.5 font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {cat.name}
                      </td>

                      {/* Descripción */}
                      <td className="py-2.5 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {cat.description || "—"}
                      </td>

                      {/* Estado rectangular verde/rojo */}
                      <TableCell className="py-2.5 text-center">
                        <Badge 
                          className={cn(
                            "rounded-sm text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-0 text-white",
                            cat.is_active 
                              ? "bg-emerald-600" 
                              : "bg-rose-600"
                          )}
                        >
                          {cat.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>

                      {/* Acciones */}
                      <TableCell className="py-2.5 text-right pr-4">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => openEditDialog(cat)}
                            className="h-8 px-3 rounded-full border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-bold text-rose-600 flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="w-3 h-3" /> Editar
                          </Button>
                          <Button
                            onClick={() => handleDeleteCategory(cat)}
                            className="h-8 px-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer border-none shadow-sm"
                          >
                            <Trash2 className="w-3 h-3" /> Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-4 border-t border-slate-100 dark:border-white/5 px-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="h-8 rounded-lg text-xs"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="h-8 rounded-lg text-xs"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para Crear/Editar Categoría */}
      <Dialog open={dialogIsOpen} onOpenChange={setDialogIsOpen}>
        <DialogContent className="bg-slate-900 border border-white/10 text-white rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest font-space-grotesk text-white">
              {editingCategory ? "Modificar Categoría" : "Agregar Categoría"}
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Define los atributos operacionales de la categoría
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
    </div>
  );
}
