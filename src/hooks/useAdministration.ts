import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { typedFrom } from "@/integrations/supabase/types-extensions";
import type { TablesInsert } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export function useAdministration() {
  const { storeId: authStoreId, user } = useAuth();
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [stores, setStores] = useState<Record<string, unknown>[]>([]);
  const [roles, setRoles] = useState<Record<string, unknown>[]>([]);
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
    const { data } = await typedFrom.roles().select('*');
    setRoles(data || []);
  };

  const handleSaveUser = async (formData: Record<string, unknown>, editingUser: Record<string, unknown> | null) => {
    setIsProcessing(true);
    try {
      if (editingUser) {
        const { error: profileErr } = await supabase.from("profiles").update({
          name: formData.name,
          phone: formData.phone,
          store_id: formData.store_id,
          document_id: formData.document_id,
          consent_habeas_data: formData.consent_habeas_data,
        }).eq("id", editingUser.id);
        if (profileErr) throw profileErr;

        if (formData.password) {
            const { error: passwordErr } = await supabase.functions.invoke('update-user', { body: { userId: editingUser.id, password: formData.password } });
            if (passwordErr) throw passwordErr;
        }

        const { error: roleDeleteErr } = await supabase.from("user_roles").delete().eq("user_id", editingUser.id);
        if (roleDeleteErr) throw roleDeleteErr;
        const { error: roleInsertErr } = await supabase.from("user_roles").insert({ user_id: editingUser.id, role: formData.role as string });
        if (roleInsertErr) {
          // Sin rol el usuario pierde acceso a todo (ProtectedRoute): se le devuelve el anterior.
          const previousRole = editingUser.role as string | null;
          if (previousRole) {
            // types.ts está desactualizado (role es texto en la base): de ahí el cast.
            await supabase.from("user_roles").insert({ user_id: String(editingUser.id), role: previousRole } as TablesInsert<"user_roles">);
          }
          throw roleInsertErr;
        }
      } else {
        const { data: authData, error: signUpErr } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { data: { name: formData.name } }
        });
        if (signUpErr) throw signUpErr;
        if (authData.user) {
            const { error: newProfileErr } = await supabase.from("profiles").update({ store_id: formData.store_id as string, document_id: formData.document_id as string, consent_habeas_data: formData.consent_habeas_data as boolean }).eq("id", authData.user.id);
            if (newProfileErr) throw newProfileErr;
            const { error: newRoleErr } = await supabase.from("user_roles").insert({ user_id: authData.user.id, role: formData.role as string });
            if (newRoleErr) throw newRoleErr;
        }
      }
      toast.success("Usuario guardado");
      fetchUsers();
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message;
      toast.error("Error al guardar usuario" + (msg ? ": " + msg : ""));
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
