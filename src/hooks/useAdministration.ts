import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export function useAdministration() {
  const { storeId: authStoreId, user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from("profiles").select("*");
      const { data: userRoles } = await supabase.from("user_roles").select("*");
      const rolesMap = new Map(userRoles?.map(r => [r.user_id, r.role]));
      
      setUsers(profiles?.map(p => ({ ...p, role: rolesMap.get(p.id) || null })) || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    const { data } = await supabase.from("stores").select("*").order("name");
    setStores(data || []);
  };

  const fetchRoles = async () => {
    const { data } = await (supabase as any).from('roles').select('*');
    setRoles(data || []);
  };

  const handleSaveUser = async (formData: any, editingUser: any) => {
    setIsProcessing(true);
    try {
      if (editingUser) {
        await supabase.from("profiles").update({
          name: formData.name,
          phone: formData.phone,
          store_id: formData.store_id,
          document_id: formData.document_id,
          consent_habeas_data: formData.consent_habeas_data,
        }).eq("id", editingUser.id);

        if (formData.password) {
            await supabase.functions.invoke('update-user', { body: { userId: editingUser.id, password: formData.password } });
        }

        await supabase.from("user_roles").delete().eq("user_id", editingUser.id);
        await (supabase as any).from("user_roles").insert({ user_id: editingUser.id, role: formData.role });
      } else {
        const { data: authData } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { data: { name: formData.name } }
        });
        if (authData.user) {
            await (supabase as any).from("profiles").update({ store_id: formData.store_id, document_id: formData.document_id, consent_habeas_data: formData.consent_habeas_data }).eq("id", authData.user.id);
            await (supabase as any).from("user_roles").insert({ user_id: authData.user.id, role: formData.role });
        }
      }
      toast.success("Usuario guardado");
      fetchUsers();
    } catch (e) {
      toast.error("Error al guardar usuario");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.id) return;
    setIsProcessing(true);
    try {
      await supabase.functions.invoke('delete-user', { body: { userId } });
      toast.success("Usuario eliminado");
      fetchUsers();
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStores();
    fetchRoles();
  }, []);

  return {
    users,
    stores,
    roles,
    loading,
    isProcessing,
    handleSaveUser,
    handleDeleteUser,
    refreshUsers: fetchUsers,
    refreshStores: fetchStores
  };
}
