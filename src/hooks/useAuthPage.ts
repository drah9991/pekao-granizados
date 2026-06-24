import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export function useAuthPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

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

      const { error } = await clientToUse.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("¡Bienvenido a Punto Play Pausa!");
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
      navigate("/dashboard"); 
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
    handleLogin,
    handleSignup
  };
}
