import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

export type Unit = Tables<'units'>;

export function useUnits() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [unitName, setUnitName] = useState("");

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      setUnits(data || []);
    } catch (err) {
      console.error("Error fetching units:", err);
      toast.error("Error al cargar unidades");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setSelectedUnit(null);
    setUnitName("");
    setDialogOpen(true);
  };

  const handleOpenEdit = (unit: Unit) => {
    setSelectedUnit(unit);
    setUnitName(unit.name);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!unitName.trim()) {
      toast.error("El nombre no puede estar vacío");
      return;
    }

    setIsProcessing(true);
    try {
      if (selectedUnit) {
        // Edit
        const { error } = await supabase
          .from("units")
          .update({ name: unitName.trim() })
          .eq("id", selectedUnit.id);
        if (error) throw error;
        toast.success("Unidad actualizada");
      } else {
        // Create
        const { error } = await supabase
          .from("units")
          .insert([{ name: unitName.trim() }]);
        if (error) throw error;
        toast.success("Unidad creada");
      }
      setDialogOpen(false);
      fetchUnits();
    } catch (err: any) {
      console.error("Error saving unit:", err);
      toast.error(err.message || "Error al guardar la unidad");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta unidad?")) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("units")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Unidad eliminada");
      fetchUnits();
    } catch (err: any) {
      console.error("Error deleting unit:", err);
      toast.error("Error al eliminar la unidad");
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    units,
    loading,
    isProcessing,
    dialogOpen,
    setDialogOpen,
    selectedUnit,
    unitName,
    setUnitName,
    handleOpenCreate,
    handleOpenEdit,
    handleSave,
    handleDelete,
    refreshUnits: fetchUnits,
  };
}
