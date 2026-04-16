import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { IceCream, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { useBranding } from "@/context/BrandingContext";
import { InteractiveCursor } from "@/components/ui/InteractiveCursor";

export default function Auth() {
  const navigate = useNavigate();
  const { logoUrl, isLoadingBranding } = useBranding(); // Use branding context
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
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
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-background bg-aurora animate-aurora">
      <InteractiveCursor />
      
      <div className="w-full max-w-xl relative z-10 animate-pro-in perspective-1000">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-[2.5rem] glass-pro border-border mb-8 shadow-glow-pro group hover:scale-110 transition-transform duration-700">
            {isLoadingBranding ? (
              <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full shadow-glow-pro" />
            ) : logoUrl ? (
              <img src={logoUrl} alt="Pekao Logo" className="max-w-[70%] max-h-[70%] object-contain" />
            ) : (
              <IceCream className="w-16 h-16 text-primary drop-shadow-glow" />
            )}
          </div>
          <h1 className="text-3xl sm:text-6xl font-black font-space-grotesk italic tracking-tighter uppercase text-foreground mb-3">
            PEKAO <span className="text-primary text-glow">CENTRAL</span>
          </h1>
          <p className="text-[11px] font-black uppercase tracking-[0.5em] text-primary/60 font-space-grotesk italic">
            Intelligence Design • Access Point
          </p>
        </div>

        <div className="dim-layering">
          <Card className="glass-pro border-border/50 shadow-pro rounded-[3rem] overflow-hidden p-2">
          <Tabs defaultValue="login" className="w-full">
            <div className="px-6 pt-6 pb-2">
                <TabsList className="grid w-full grid-cols-2 bg-muted p-1.5 rounded-[1.5rem] h-14 border border-border/50">
                <TabsTrigger value="login" className="rounded-xl font-black font-space-grotesk italic text-[11px] tracking-[0.2em] uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-pro transition-all">ACCESO</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-xl font-black font-space-grotesk italic text-[11px] tracking-[0.2em] uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-pro transition-all">REGISTRO</TabsTrigger>
                </TabsList>
            </div>

            <div className="p-8">
                <TabsContent value="login" className="mt-0 animate-pro-in">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-3">
                            <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 ml-2 font-space-grotesk italic">IDENTIFICADOR DE CANAL</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="OPERADOR@PEKAO.COM"
                                required
                                disabled={isLoading}
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                className="h-14 bg-muted border-border rounded-2xl font-black font-space-grotesk italic tracking-widest text-[11px] uppercase focus:border-primary/50 text-foreground transition-all shadow-inner placeholder:opacity-20"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 ml-2 font-space-grotesk italic">CÓDIGO DE ENCRIPTACIÓN</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showLoginPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    required
                                    disabled={isLoading}
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    className="h-14 bg-muted border-border rounded-2xl font-black font-space-grotesk italic tracking-widest text-sm focus:border-primary/50 text-foreground transition-all shadow-inner placeholder:opacity-20"
                                />
                                <button
                                    type="button"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-primary transition-colors"
                                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                                    tabIndex={-1}
                                >
                                    {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="remember-me"
                                    checked={rememberMe}
                                    onCheckedChange={(checked) => setRememberMe(!!checked)}
                                    disabled={isLoading}
                                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                                <Label htmlFor="remember-me" className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-muted-foreground italic font-space-grotesk hover:text-foreground transition-colors">
                                    MANTENER SESIÓN ACTIVA
                                </Label>
                            </div>
                        </div>
                        <Button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full h-16 rounded-2xl bg-foreground text-background hover:bg-primary hover:text-primary-foreground font-black uppercase tracking-[0.3em] text-[12px] italic font-space-grotesk transition-all shadow-glow-pro active:scale-95 border-2 border-border/20 group overflow-hidden relative"
                        >
                            <span className="relative z-10">{isLoading ? "INICIANDO SECUENCIA..." : "VERIFICAR IDENTIDAD"}</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-background/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        </Button>
                    </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-0 animate-pro-in">
                    <form onSubmit={handleSignup} className="space-y-6">
                        <div className="space-y-3">
                            <Label htmlFor="full_name" className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 ml-2 font-space-grotesk italic">NOMBRE OPERATIVO</Label>
                            <Input
                                id="full_name"
                                type="text"
                                placeholder="JUAN PÉREZ"
                                required
                                disabled={isLoading}
                                value={signupFullName}
                                onChange={(e) => setSignupFullName(e.target.value)}
                                className="h-14 bg-muted/40 border-border rounded-2xl font-black font-space-grotesk italic tracking-widest text-[11px] uppercase focus:border-primary/50 text-foreground transition-all shadow-inner placeholder:opacity-20"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="signup-email" className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 ml-2 font-space-grotesk italic">CORREO ELECTRÓNICO</Label>
                            <Input
                                id="signup-email"
                                type="email"
                                placeholder="OPERADOR@PEKAO.COM"
                                required
                                disabled={isLoading}
                                value={signupEmail}
                                onChange={(e) => setSignupEmail(e.target.value)}
                                className="h-14 bg-muted/40 border-border rounded-2xl font-black font-space-grotesk italic tracking-widest text-[11px] uppercase focus:border-primary/50 text-foreground transition-all shadow-inner placeholder:opacity-20"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="signup-password" className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 ml-2 font-space-grotesk italic">PASSWORD DE SEGURIDAD</Label>
                            <div className="relative">
                                <Input
                                    id="signup-password"
                                    type={showSignupPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    required
                                    disabled={isLoading}
                                    value={signupPassword}
                                    onChange={(e) => setSignupPassword(e.target.value)}
                                    className="h-14 bg-white/5 border-white/10 rounded-2xl font-black font-space-grotesk italic tracking-widest text-[11px] focus:border-primary/50 text-white transition-all shadow-inner placeholder:opacity-20"
                                />
                                <button
                                    type="button"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-primary transition-colors"
                                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                                    tabIndex={-1}
                                >
                                    {showSignupPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                        <Button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full h-16 rounded-2xl bg-foreground text-background hover:bg-primary hover:text-primary-foreground font-black uppercase tracking-[0.3em] text-[12px] italic font-space-grotesk transition-all shadow-glow-pro active:scale-95 border-2 border-border/20"
                        >
                            {isLoading ? "CREANDO PERFIL..." : "REGISTRAR EN EL SISTEMA"}
                        </Button>
                    </form>
                </TabsContent>
            </div>
          </Tabs>
          </Card>
        </div>
        
        <div className="mt-12 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.6em] text-muted-foreground/40 font-space-grotesk italic">
                Pekao Granizados • Sistema de Inteligencia Operativa • v2.0 Pro Max
            </p>
        </div>
      </div>
    </div>

  );
}