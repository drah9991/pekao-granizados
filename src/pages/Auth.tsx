import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { IceCream } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { useBranding } from "@/context/BrandingContext"; // Import useBranding

export default function Auth() {
  const navigate = useNavigate();
  const { logoUrl, isLoadingBranding } = useBranding(); // Use branding context
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        throw error;
      }

      toast.success("¡Bienvenido a Pekao Granizados!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error logging in:", error);
      toast.error("Error al iniciar sesión: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
        options: {
          data: {
            full_name: signupFullName.trim(),
          },
        },
      });

      if (error) {
        console.error("Supabase signup error:", error);
        throw error;
      }

      if (!data.user) {
        console.warn("Signup successful, but no user data returned. Email confirmation might be pending.");
        toast.info("¡Cuenta creada! Por favor, revisa tu correo para verificarla y luego inicia sesión.");
        navigate("/auth"); 
        return;
      }

      toast.success("¡Cuenta creada exitosamente! Por favor, revisa tu correo para verificarla.");
      navigate("/dashboard"); 
    } catch (error: any) {
      console.error("Error signing up:", error);
      toast.error("Error al crear cuenta: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-hero">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-2xl bg-white/40 backdrop-blur-xl mb-4 shadow-glow">
            {isLoadingBranding ? (
              <div className="animate-spin w-10 h-10 border-4 border-white border-t-transparent rounded-full" />
            ) : logoUrl ? (
              <img src={logoUrl} alt="Business Logo" className="max-w-full max-h-full object-contain" />
            ) : (
              <IceCream className="w-12 h-12 text-white" />
            )}
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Pekao Granizados</h1>
          <p className="text-white/80">Sistema de punto de venta</p>
        </div>

        <Card className="glass-card shadow-elevated">
          <CardHeader>
            <CardTitle>Acceso al sistema</CardTitle>
            <CardDescription>Ingresa tus credenciales para continuar</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup">Registrarse</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      required
                      disabled={isLoading}
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      disabled={isLoading}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(!!checked)}
                      disabled={isLoading}
                    />
                    <Label htmlFor="remember-me" className="cursor-pointer text-sm">
                      Recordarme
                    </Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Ingresando..." : "Iniciar Sesión"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nombre completo</Label>
                    <Input
                      id="full_name"
                      type="text"
                      placeholder="Juan Pérez"
                      required
                      disabled={isLoading}
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="tu@email.com"
                      required
                      disabled={isLoading}
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      required
                      disabled={isLoading}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}