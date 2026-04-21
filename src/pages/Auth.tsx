import React from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IceCream } from "lucide-react";
import { useBranding } from "@/context/BrandingContext";
import { InteractiveCursor } from "@/components/ui/InteractiveCursor";
import { useAuthPage } from "@/hooks/useAuthPage";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";

export default function Auth() {
  const { logoUrl, isLoadingBranding } = useBranding();
  const { 
    isLoading, rememberMe, setRememberMe, handleLogin, handleSignup 
  } = useAuthPage();

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
                <TabsList className="grid w-full grid-cols-2 bg-muted p-1.5 rounded-[1.5rem] h-14 border border-border/50 shadow-inner">
                    <TabsTrigger value="login" className="rounded-xl font-black font-space-grotesk italic text-[11px] tracking-[0.2em] uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-pro transition-all">ACCESO</TabsTrigger>
                    <TabsTrigger value="signup" className="rounded-xl font-black font-space-grotesk italic text-[11px] tracking-[0.2em] uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-pro transition-all">REGISTRO</TabsTrigger>
                </TabsList>
            </div>

            <div className="p-8">
                <TabsContent value="login" className="mt-0">
                    <LoginForm 
                        isLoading={isLoading}
                        onLogin={handleLogin}
                        rememberMe={rememberMe}
                        onRememberMeChange={setRememberMe}
                    />
                </TabsContent>

                <TabsContent value="signup" className="mt-0">
                    <SignupForm 
                        isLoading={isLoading}
                        onSignup={handleSignup}
                    />
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