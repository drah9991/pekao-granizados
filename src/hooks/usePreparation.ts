import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export interface InventoryItem {
  id: string;
  name: string;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  type: string;
  recipe?: any;
  base_volume?: number;
  unit_measure?: string;
}

export interface Size {
  id: string;
  name: string;
  multiplier: number;
}

export interface PreparationLog {
  id: string;
  created_at: string;
  qty: number;
  reason: string;
  type?: string;
  product_id?: string;
  products?: { name: string };
}

export function usePreparation() {
  const { storeId, user } = useAuth();
  const [mixtures, setMixtures] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [logs, setLogs] = useState<PreparationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEmptying, setIsEmptying] = useState(false);
  
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [liters, setLiters] = useState<string>("");
  const [currentMixtureStock, setCurrentMixtureStock] = useState<number | null>(null);
  const [currentMixtureId, setCurrentMixtureId] = useState<string | null>(null);
  const [currentMixtureName, setCurrentMixtureName] = useState<string | null>(null);

  useEffect(() => {
    if (storeId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  useEffect(() => {
    if (selectedProductId) {
      fetchCurrentMixtureStock();
      fetchRecentLogs(selectedProductId);
    } else {
      setCurrentMixtureStock(null);
      setCurrentMixtureId(null);
      setCurrentMixtureName(null);
      fetchRecentLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId, storeId]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchMixtures(),
      fetchProducts(),
      fetchSizes(),
      fetchRecentLogs()
    ]);
    setLoading(false);
  };

  const fetchMixtures = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, stock")
        .eq("store_id", storeId)
        .eq("is_mixture", true);
      if (error) throw error;
      setMixtures(data || []);
    } catch (error: any) {
      console.error("Error fetching mixtures:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: typesData } = await supabase
        .from("product_types_config")
        .select("code")
        .eq("track_mixture_inventory", true);

      const trackableCodes = (typesData || []).map(t => t.code);
      if (trackableCodes.length === 0) trackableCodes.push("granizado");

      const { data, error } = await supabase
        .from("products")
        .select("id, name, type, base_volume, unit_measure, recipe")
        .eq("store_id", storeId)
        .in("type", trackableCodes)
        .eq("active", true);
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchSizes = async () => {
    try {
      const { data, error } = await supabase
        .from("sizes")
        .select("id, name, multiplier")
        .eq("store_id", storeId)
        .order("multiplier", { ascending: true });
      if (error) throw error;
      setSizes(data || []);
    } catch (error: any) {
      console.error("Error fetching sizes:", error);
    }
  };

  const fetchRecentLogs = async (productId?: string) => {
    try {
      let query = supabase
        .from("movements")
        .select(`
          id,
          created_at,
          qty,
          reason,
          type,
          product_id,
          products:product_id (name)
        `)
        .eq("store_id", storeId)
        .or('reason.ilike.%Preparación%,reason.ilike.%VACIADO%');

      if (productId) {
        query = query.eq("product_id", productId);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setLogs(data as any[] || []);
    } catch (error: any) {
      console.error("Error fetching logs:", error);
    }
  };

  const fetchCurrentMixtureStock = async () => {
    if (!selectedProductId) return;
    try {
      const { data: recipeData } = await supabase
        .from("recipes")
        .select("inventory_item_id")
        .eq("product_id", selectedProductId)
        .limit(1);

      if (recipeData && recipeData.length > 0) {
        const itemId = recipeData[0].inventory_item_id;
        setCurrentMixtureId(itemId);

        const { data: invData } = await supabase
          .from("inventory_items")
          .select("stock, name")
          .eq("id", itemId)
          .single();

        if (invData) {
          setCurrentMixtureStock(invData.stock);
          setCurrentMixtureName(invData.name);
        }
      } else {
        setCurrentMixtureStock(null);
        setCurrentMixtureId(null);
        setCurrentMixtureName(null);
      }
    } catch (err) {
      console.error("Error fetching current mixture stock:", err);
    }
  };

  const handleAutoLink = async () => {
    if (!selectedProductId || !storeId) return;
    const selectedFlavor = products.find(p => p.id === selectedProductId);
    if (!selectedFlavor) return;

    setIsProcessing(true);
    try {
      const { data: invItem, error: invError } = await supabase
        .from("inventory_items")
        .insert({
          store_id: storeId,
          name: `Tanque ${selectedFlavor.name}`,
          unit: 'ml',
          stock: 0,
          is_mixture: true
        })
        .select()
        .single();
      
      if (invError) throw invError;
      
      const { error: recipeError } = await supabase
        .from("recipes")
        .insert({
          product_id: selectedProductId,
          inventory_item_id: invItem.id,
          quantity_required: 4
        });
        
      if (recipeError) throw recipeError;
      
      toast.success("¡Tanque vinculado correctamente!");
      fetchCurrentMixtureStock();
      fetchMixtures();
    } catch (error: any) {
      console.error("Error linking tank:", error);
      toast.error("Error al vincular: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmptyTank = async () => {
    if (!selectedProductId || !storeId) return;
    const selectedFlavor = products.find(f => f.id === selectedProductId);

    if (!confirm(`¿Estás seguro de vaciar el tanque de ${selectedFlavor?.name}? Esto pondrá el stock en 0.`)) return;

    try {
      setIsEmptying(true);
      const { data: recipeData } = await supabase
        .from("recipes")
        .select("inventory_item_id")
        .eq("product_id", selectedProductId)
        .limit(1);

      if (!recipeData || recipeData.length === 0) {
        toast.error("Sin receta vinculada.");
        return;
      }

      const mixtureId = recipeData[0].inventory_item_id;
      const { data: currentItem } = await supabase
        .from('inventory_items')
        .select('stock')
        .eq('id', mixtureId)
        .single();

      const currentStockBefore = currentItem?.stock || 0;
      if (currentStockBefore === 0) {
        toast.info("El tanque ya está vacío.");
        return;
      }

      await supabase.from("inventory_items").update({ stock: 0 }).eq("id", mixtureId);
      await supabase.from("movements").insert({
        product_id: selectedProductId,
        store_id: storeId,
        qty: currentStockBefore,
        type: "exit",
        reason: `VACIADO DE TANQUE: ${selectedFlavor?.name} (${(currentStockBefore / 1000).toFixed(1)}L)`,
        user_id: user?.id
      });

      toast.success("Tanque vaciado.");
      setCurrentMixtureStock(0);
      fetchMixtures();
      fetchRecentLogs(selectedProductId);
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setIsEmptying(false);
    }
  };

  const handleRegisterPreparation = async () => {
    if (!selectedProductId || !liters || parseFloat(liters) <= 0) {
      toast.error("Selecciona un sabor e ingresa los litros");
      return;
    }

    const { data: recipeData } = await supabase
      .from("recipes")
      .select("inventory_item_id")
      .eq("product_id", selectedProductId)
      .limit(1);

    if (!recipeData || recipeData.length === 0) {
      toast.error("Sin receta vinculada.");
      return;
    }

    const inventoryItemId = recipeData[0].inventory_item_id;
    const volumeMl = parseFloat(liters) * 1000;
    const product = products.find(p => p.id === selectedProductId);
    
    setIsProcessing(true);
    try {
      await supabase.rpc('adjust_inventory_item_stock', {
        item_id: inventoryItemId,
        quantity: volumeMl
      });

      await supabase.from("movements").insert({
        product_id: selectedProductId,
        store_id: storeId,
        qty: volumeMl,
        type: "entry",
        reason: `Preparación Lote: ${liters}L para ${product?.name}`,
        user_id: user?.id
      });

      toast.success(`Se han añadido ${liters}L a ${product?.name}`);
      setSelectedProductId("");
      setLiters("");
      fetchMixtures();
      fetchRecentLogs();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteLog = async (log: any) => {
    if (!confirm(`¿Eliminar registro de ${(log.qty / 1000)}L?`)) return;

    try {
      const { data: recipeData } = await supabase
        .from("recipes")
        .select("inventory_item_id")
        .eq("product_id", log.product_id)
        .limit(1);

      if (recipeData && recipeData.length > 0) {
        const invId = recipeData[0].inventory_item_id;
        await supabase.rpc('adjust_inventory_item_stock', {
          item_id: invId,
          quantity: -log.qty
        });
        await supabase.from("movements").delete().eq("id", log.id);
        toast.success("Registro eliminado.");
        fetchRecentLogs(selectedProductId);
        fetchCurrentMixtureStock();
      }
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  return {
    products, mixtures, sizes, logs, loading, isProcessing, isEmptying,
    selectedProductId, setSelectedProductId,
    liters, setLiters,
    currentMixtureStock, currentMixtureName,
    handleAutoLink, handleEmptyTank, handleRegisterPreparation, handleDeleteLog
  };
}
