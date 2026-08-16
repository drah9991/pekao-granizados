import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

export type Supplier = Tables<'suppliers'> & {
  commercial_name?: string | null;
  nit_doc?: string | null;
  website?: string | null;
  contact_name?: string | null;
  notes?: string | null;
};

export interface SupplierFormData {
  name: string;
  commercialName: string;
  nitDoc: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  contactName: string;
  notes: string;
}

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
      toast.error("Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setSelectedSupplier(null);
    setDialogOpen(true);
  };

  const openEditDialog = (sup: Supplier) => {
    setSelectedSupplier(sup);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
  };

  const handleSave = async (formData: SupplierFormData) => {
    if (!formData.name.trim()) {
      toast.error("El Nombre del proveedor es obligatorio");
      return false;
    }
    if (!formData.nitDoc.trim()) {
      toast.error("El Documento (NIT/Cédula) del proveedor es obligatorio");
      return false;
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast.error("El correo electrónico ingresado no tiene un formato válido");
      return false;
    }

    const payload = {
      name: formData.name.trim(),
      commercial_name: formData.commercialName.trim() || null,
      nit_doc: formData.nitDoc.trim() || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      address: formData.address.trim() || null,
      website: formData.website.trim() || null,
      contact_name: formData.contactName.trim() || null,
      notes: formData.notes.trim() || null,
    };

    setIsProcessing(true);
    try {
      if (selectedSupplier) {
        const { error } = await supabase
          .from("suppliers")
          .update(payload)
          .eq("id", selectedSupplier.id);
        if (error) throw error;
        toast.success("Proveedor actualizado");
      } else {
        const { error } = await supabase
          .from("suppliers")
          .insert([payload]);
        if (error) throw error;
        toast.success("Proveedor registrado");
      }
      setDialogOpen(false);
      fetchSuppliers();
      return true;
    } catch (err: any) {
      console.error("Error saving supplier:", err);
      toast.error(err.message || "Error al guardar el proveedor");
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este proveedor?")) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Proveedor eliminado");
      fetchSuppliers();
    } catch (err: any) {
      console.error("Error deleting supplier:", err);
      toast.error("Error al eliminar el proveedor (puede estar relacionado con productos o compras)");
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    suppliers,
    loading,
    isProcessing,
    dialogOpen,
    setDialogOpen,
    selectedSupplier,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    handleSave,
    handleDelete,
    refreshSuppliers: fetchSuppliers,
  };
}
