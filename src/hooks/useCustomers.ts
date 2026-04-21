import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

export type Customer = Tables<'customers'> & { document_id?: string; consent_habeas_data?: boolean };

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("customers")
        .select("*")
        .order("name", { ascending: true, nullsFirst: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      toast.error("Error al cargar clientes: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomer = async (editingCustomer: Customer | null, formData: any) => {
    if (!formData.name || !formData.document_id) {
        toast.error("El nombre y documento del cliente son obligatorios.");
        return false;
    }
    if (!formData.consent_habeas_data) {
        toast.error("Debe autorizar el tratamiento de datos (Ley 1581) para continuar.");
        return false;
    }

    setIsProcessing(true);
    try {
        const customerData = {
            name: formData.name.trim(),
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            document_id: formData.document_id.trim() || null,
            consent_habeas_data: formData.consent_habeas_data,
        };

        if (editingCustomer) {
            const { error } = await supabase
                .from("customers")
                .update(customerData)
                .eq("id", editingCustomer.id);

            if (error) throw error;
            toast.success("Perfil actualizado con éxito.");
        } else {
            const { error } = await supabase
                .from("customers")
                .insert([customerData]);

            if (error) throw error;
            toast.success("Cliente indexado correctamente.");
        }

        fetchCustomers();
        return true;
    } catch (error: any) {
        console.error("Error saving customer:", error);
        toast.error("Error en la operación: " + error.message);
        return false;
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    setIsProcessing(true);
    try {
        const { error } = await supabase
            .from("customers")
            .delete()
            .eq("id", id);

        if (error) {
            if (error.code === '23503') {
                throw new Error("Persistencia de datos activa: El cliente posee órdenes vinculadas.");
            }
            throw error;
        }
        toast.success("Entidad eliminada.");
        fetchCustomers();
        return true;
    } catch (error: any) {
        console.error("Error deleting customer:", error);
        toast.error(error.message);
        return false;
    } finally {
        setIsProcessing(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    (customer.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.phone || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.document_id || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return {
    customers,
    filteredCustomers,
    searchQuery,
    setSearchQuery,
    loading,
    isProcessing,
    handleSaveCustomer,
    handleDeleteCustomer,
    refreshCustomers: fetchCustomers
  };
}
