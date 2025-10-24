import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IceCream } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client"; // Import Supabase client

export default function Auth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
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
        email: signupEmail,
        password: signupPassword,
        options: {
          data: {
            name: signupName,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Optionally, create a profile entry for the new user
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            { id: data.user.id, name: signupName, email: signupEmail }
          ]);
        
        if (profileError) {
          console.error("Error creating user profile:", profileError);
          // Decide if you want to throw this error or just log it.
          // For now, we'll let the signup proceed even if profile creation fails.
        }
      }

      toast.success("¡Cuenta creada exitosamente! Por favor, revisa tu correo para verificarla.");
      // After signup, you might want to redirect to a verification page or dashboard
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
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-xl mb-4 shadow-glow">
            <IceCream className="w-12 h-12 text-white" />
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
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Ingresando..." : "Iniciar Sesión"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Juan Pérez"
                      required
                      disabled={isLoading}
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
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