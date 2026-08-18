import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Category } from "@/lib/pos-types";

export const categoryFormSchema = z.object({
  name: z.string().min(1, "El nombre de la categoría es requerido y obligatorio").max(50, "Máximo 50 caracteres"),
  description: z.string().optional().or(z.literal("")),
  color_hex: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Debe ser un código hexadecimal válido (ej. #06b6d4)"),
  is_active: z.boolean().default(true),
  image_url: z.string().optional().nullable().or(z.literal("")),
  sort_order: z.number().int().min(0, "Debe ser un entero mayor o igual a 0").default(0),
  requires_recipe: z.boolean().default(false),
  sales_mode: z.enum(["sizes", "unit", "weight"]).default("unit"),
  track_mixture_inventory: z.boolean().default(false),
  inventory_unit: z.string().default("un"),
  allow_toppings: z.boolean().default(false),
  emoji_icon: z.string().default("📦"),
  color_theme: z.string().default("bg-slate-500"),
  tax_rate: z.number().default(0),
  alert_threshold: z.number().default(10)
});

export type CategoryFormData = z.infer<typeof categoryFormSchema>;

const emptyDefaults: CategoryFormData = {
  name: "",
  description: "",
  color_hex: "#ef4444",
  is_active: true,
  image_url: "",
  sort_order: 0,
  requires_recipe: false,
  sales_mode: "unit",
  track_mixture_inventory: false,
  inventory_unit: "un",
  allow_toppings: false,
  emoji_icon: "📦",
  color_theme: "bg-slate-500",
  tax_rate: 0,
  alert_threshold: 10
};

/**
 * Hook con toda la lógica de estado y datos de CategoryManager.tsx,
 * extraído sin cambios de comportamiento.
 */
export function useCategoryManager() {
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

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: emptyDefaults
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = form;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStoreId]);

  const openCreateDialog = () => {
    setEditingCategory(null);
    reset(emptyDefaults);
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
      sort_order: category.sort_order ?? 0,
      requires_recipe: category.requires_recipe ?? false,
      sales_mode: (category.sales_mode as any) ?? "unit",
      track_mixture_inventory: category.track_mixture_inventory ?? false,
      inventory_unit: category.inventory_unit ?? "un",
      allow_toppings: category.allow_toppings ?? false,
      emoji_icon: category.emoji_icon ?? "📦",
      color_theme: category.color_theme ?? "bg-slate-500",
      tax_rate: Number(category.tax_rate) ?? 0,
      alert_threshold: category.alert_threshold ?? 10
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
        store_id: userStoreId,
        requires_recipe: data.requires_recipe,
        sales_mode: data.sales_mode,
        track_mixture_inventory: data.track_mixture_inventory,
        inventory_unit: data.inventory_unit,
        allow_toppings: data.allow_toppings,
        emoji_icon: data.emoji_icon,
        color_theme: data.color_theme,
        tax_rate: Number(data.tax_rate) || 0,
        alert_threshold: Number(data.alert_threshold) || 10
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

  return {
    // list state
    loading,
    searchQuery, setSearchQuery,
    currentPage, setCurrentPage,
    totalPages,
    paginatedCategories,
    filteredCategories,
    fetchCategories,
    openCreateDialog,
    openEditDialog,
    handleDeleteCategory,

    // dialog/form state
    dialogIsOpen, setDialogIsOpen,
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
  };
}
