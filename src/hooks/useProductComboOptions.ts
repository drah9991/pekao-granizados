import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ComboProduct {
  id: string;
  name: string;
  qty: number;
}

export interface ComboOption {
  name: string;
  selection_type: "all" | "single" | "multiple";
  products: ComboProduct[];
  selectable: boolean;
  hide_quantity: boolean;
}

interface ComboFormData {
  type: string;
  recipe?: Record<string, unknown>;
}

/**
 * Encapsula el estado y las mutaciones de las opciones de combo de
 * ProductFormDialog.tsx, extraído sin cambios de comportamiento salvo uno:
 * las actualizaciones de `comboOptions` originales hacían
 * `const updated = [...comboOptions]` y luego mutaban directamente
 * `updated[i]` o `updated[i].products` (la misma referencia que el estado
 * anterior, porque el spread solo copia el array externo, no los objetos
 * anidados). Aquí cada actualización construye objetos y arrays nuevos en
 * todos los niveles tocados, sin alterar el resultado visible.
 */
export function useProductComboOptions(
  isOpen: boolean,
  formData: ComboFormData,
  setFormData: (updater: (prev: any) => any) => void,
  storeId: string | null
) {
  const [comboOptions, setComboOptions] = useState<ComboOption[]>([]);
  const [showDetailsInReports, setShowDetailsInReports] = useState(false);
  const [allProductsList, setAllProductsList] = useState<any[]>([]);
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({});

  // Load from recipe when open
  useEffect(() => {
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

  // Fetch all products for search list
  useEffect(() => {
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

  const toggleShowDetailsInReports = (checked: boolean) => {
    updateComboRecipe(comboOptions, checked);
  };

  const addComboOption = () => {
    const updated: ComboOption[] = [
      ...comboOptions,
      {
        name: "",
        selection_type: "single",
        products: [],
        selectable: false,
        hide_quantity: false
      }
    ];
    updateComboRecipe(updated, showDetailsInReports);
  };

  const removeComboOption = (index: number) => {
    const updated = comboOptions.filter((_, idx) => idx !== index);
    updateComboRecipe(updated, showDetailsInReports);
  };

  const updateComboOptionField = <K extends keyof ComboOption>(index: number, field: K, value: ComboOption[K]) => {
    const updated = comboOptions.map((opt, idx) => idx === index ? { ...opt, [field]: value } : opt);
    updateComboRecipe(updated, showDetailsInReports);
  };

  const addProductToOption = (index: number, product: ComboProduct) => {
    const updated = comboOptions.map((opt, idx) => {
      if (idx !== index) return opt;
      if (opt.products.find(item => item.id === product.id)) return opt;
      return { ...opt, products: [...opt.products, product] };
    });
    updateComboRecipe(updated, showDetailsInReports);
    setSearchQueries(prev => ({ ...prev, [index]: "" }));
  };

  const removeProductFromOption = (index: number, productIdx: number) => {
    const updated = comboOptions.map((opt, idx) => {
      if (idx !== index) return opt;
      return { ...opt, products: opt.products.filter((_, pIdx) => pIdx !== productIdx) };
    });
    updateComboRecipe(updated, showDetailsInReports);
  };

  const updateProductQty = (index: number, productIdx: number, qty: number) => {
    const updated = comboOptions.map((opt, idx) => {
      if (idx !== index) return opt;
      return {
        ...opt,
        products: opt.products.map((item, pIdx) => pIdx === productIdx ? { ...item, qty } : item)
      };
    });
    updateComboRecipe(updated, showDetailsInReports);
  };

  const setSearchQueryFor = (index: number, value: string) => {
    setSearchQueries(prev => ({ ...prev, [index]: value }));
  };

  return {
    comboOptions,
    showDetailsInReports,
    allProductsList,
    searchQueries,
    toggleShowDetailsInReports,
    addComboOption,
    removeComboOption,
    updateComboOptionField,
    addProductToOption,
    removeProductFromOption,
    updateProductQty,
    setSearchQueryFor,
  };
}
