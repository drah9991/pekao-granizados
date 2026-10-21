import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { storesForLogin } from "@/lib/permissions";

export interface StoreOption {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
}

export function useAuthPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Multi-store selection modal state
  const [storeModalIsOpen, setStoreModalIsOpen] = useState(false);
  const [availableStores, setAvailableStores] = useState<StoreOption[]>([]);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const loginClientRef = useRef(supabase);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      let clientToUse = supabase;
      if (!rememberMe) {
        clientToUse = createClient<Database>(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          {
            auth: {
              storage: sessionStorage,
              persistSession: true,
              autoRefreshToken: true,
            }
          }
        );
      }

      const { data: authData, error } = await clientToUse.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const user = authData?.user;
      if (user) {
        // La sesión vive en clientToUse (con "recordarme" apagado no es el cliente global).
        loginClientRef.current = clientToUse;
        const [{ data: allStores }, { data: profile }, { data: roleRow }] = await Promise.all([
          clientToUse.from("stores").select("id, name, address").order("name", { ascending: true }),
          // is_superadmin existe en la base pero no en types.ts: se pide con "*".
          clientToUse.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          clientToUse.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
        ]);

        const stores = storesForLogin(allStores ?? [], {
          userRole: roleRow?.role ?? null,
          isSuperAdmin: profile != null && "is_superadmin" in profile && profile.is_superadmin === true,
          profileStoreId: profile?.store_id,
        });

        if (stores.length > 1) {
          setAvailableStores(stores);
          setPendingUserId(user.id);
          setStoreModalIsOpen(true);
          toast.success("Credenciales validadas. Elige tu sucursal para continuar.");
          return true;
        } else if (stores.length === 1 && stores[0].id !== profile?.store_id) {
          await clientToUse.from("profiles").update({ store_id: stores[0].id }).eq("id", user.id);
        }
      }

      toast.success("¡Bienvenido al sistema!");
      navigate("/dashboard");
      return true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      console.error("Error logging in:", error);
      toast.error("Error al iniciar sesión: " + msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectStoreAndProceed = async (storeId: string) => {
    setIsLoading(true);
    try {
      if (pendingUserId) {
        const { error } = await loginClientRef.current
          .from("profiles")
          .update({ store_id: storeId })
          .eq("id", pendingUserId);
        if (error) throw error;
      }
      toast.success("Sucursal conectada con éxito.");
      setStoreModalIsOpen(false);
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Error selecting store:", err);
      toast.error("Error al seleccionar la sucursal.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) throw error;

      if (!data.user) {
        toast.info("¡Cuenta creada! Por favor, revisa tu correo para verificarla.");
        navigate("/auth"); 
        return true;
      }

      toast.success("¡Cuenta creada exitosamente!");
      navigate("/onboarding"); 
      return true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      console.error("Error signing up:", error);
      toast.error("Error al crear cuenta: " + msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    rememberMe,
    setRememberMe,
    storeModalIsOpen,
    setStoreModalIsOpen,
    availableStores,
    handleSelectStoreAndProceed,
    handleLogin,
    handleSignup
  };
}
