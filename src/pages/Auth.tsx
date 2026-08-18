import React from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IceCream, ShieldCheck, Zap, Layers } from "lucide-react";
import { useBranding } from "@/context/BrandingContext";
import { InteractiveCursor } from "@/components/ui/InteractiveCursor";
import { useAuthPage } from "@/hooks/useAuthPage";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";
import { StoreSelectorDialog } from "@/components/auth/StoreSelectorDialog";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Auth() {
  const { logoUrl, brandName, isLoadingBranding } = useBranding();
  const { 
    isLoading, 
    rememberMe, 
    setRememberMe, 
    storeModalIsOpen, 
    setStoreModalIsOpen, 
    availableStores, 
    handleSelectStoreAndProceed, 
    handleLogin, 
    handleSignup 
  } = useAuthPage();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden bg-background bg-aurora animate-aurora">
      <InteractiveCursor />
      
      {/* Multi-Store Selection Dialog on Login */}
      <StoreSelectorDialog
        isOpen={storeModalIsOpen}
        onClose={() => setStoreModalIsOpen(false)}
        stores={availableStores}
        onSelectStore={handleSelectStoreAndProceed}
        isProcessing={isLoading}
      />
      
      {/* Top Bar with Theme Toggle */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
        <div className="glass-pro p-1 rounded-2xl border border-border/50 shadow-sm">
          <ThemeToggle />
        </div>
      </div>

      <div className="w-full max-w-5xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* LEFT COLUMN: HERO SHOWCASE (Visible on lg+) */}
        <div className="lg:col-span-6 hidden lg:flex flex-col justify-between h-full py-6 pr-4 space-y-8 animate-in fade-in slide-in-from-left-6 duration-700">
          <div>
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl glass-pro border border-border flex items-center justify-center shadow-glow-pro shrink-0">
                {isLoadingBranding ? (
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                ) : logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="max-w-[75%] max-h-[75%] object-contain" />
                ) : (
                  <IceCream className="w-8 h-8 text-primary drop-shadow-glow" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-black font-space-grotesk italic tracking-tighter uppercase text-foreground">
                  {brandName ? brandName.toUpperCase() : "PEKAO CENTRAL"}
                </h1>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary font-space-grotesk italic">
                  POS & Inventory Operating System
                </p>
              </div>
            </div>

            {/* Main Headline */}
            <div className="space-y-3 mb-8">
              <h2 className="text-3xl xl:text-4xl font-black font-space-grotesk italic tracking-tight uppercase leading-none text-foreground">
                Control Total de tu <br />
                <span className="text-primary drop-shadow-glow">Negocio en Tiempo Real</span>
              </h2>
              <p className="text-xs text-muted-foreground font-medium max-w-md leading-relaxed">
                Facturación ultra-rápida, control automático de inventario por mezcla y tanques, analíticas en vivo y gestión multitienda.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div className="glass-pro p-3.5 rounded-2xl border border-border/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider font-space-grotesk italic text-foreground">Ventas Ultra-Rápidas</h4>
                  <p className="text-[10px] text-muted-foreground">POS táctil optimizado</p>
                </div>
              </div>

              <div className="glass-pro p-3.5 rounded-2xl border border-border/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider font-space-grotesk italic text-foreground">Control Mezclas</h4>
                  <p className="text-[10px] text-muted-foreground">Descuento milimétrico</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security / Status Footer */}
          <div className="pt-6 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground font-space-grotesk font-bold uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Sistema Operativo Online</span>
            </div>
            <div className="flex items-center gap-1.5 text-primary">
              <ShieldCheck className="w-4 h-4" />
              <span>Seguridad SSL 256-bit</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AUTH CARD (Centered on mobile, 6 cols on lg) */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto animate-in fade-in slide-in-from-right-6 duration-700">
          {/* Mobile Header Badge */}
          <div className="text-center mb-6 lg:hidden">
            <MagneticButton className="inline-flex items-center justify-center w-20 h-20 rounded-2xl glass-pro border-border mb-4 shadow-glow-pro mx-auto">
              {isLoadingBranding ? (
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              ) : logoUrl ? (
                <img src={logoUrl} alt="Logo" className="max-w-[70%] max-h-[70%] object-contain" />
              ) : (
                <IceCream className="w-10 h-10 text-primary drop-shadow-glow" />
              )}
            </MagneticButton>
            <h1 className="text-xl sm:text-2xl font-black font-space-grotesk italic tracking-tighter uppercase text-foreground">
              {brandName ? brandName.toUpperCase() : "PEKAO CENTRAL"}
            </h1>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary font-space-grotesk italic mt-0.5">
              Access Point v2.0
            </p>
          </div>

          <Card className="glass-pro border-border/60 shadow-pro rounded-[2.5rem] overflow-hidden p-2 backdrop-blur-xl">
            <Tabs defaultValue="login" className="w-full">
              <div className="px-4 pt-4 pb-1">
                <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-2xl h-12 border border-border/50 shadow-inner">
                  <TabsTrigger 
                    value="login" 
                    className="rounded-xl font-black font-space-grotesk italic text-[11px] tracking-[0.15em] uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-pro transition-all"
                  >
                    ACCESO
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup" 
                    className="rounded-xl font-black font-space-grotesk italic text-[11px] tracking-[0.15em] uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-pro transition-all"
                  >
                    REGISTRO
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6 sm:p-8">
                <TabsContent value="login" className="mt-0">
                  <LoginForm 
                    isLoading={isLoading}
                    rememberMe={rememberMe}
                    onRememberMeChange={setRememberMe}
                    onLogin={handleLogin}
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

          <div className="mt-6 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground/60 font-space-grotesk italic">
              {brandName || "Pekao Granizados"} • Operational Intelligence OS
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}