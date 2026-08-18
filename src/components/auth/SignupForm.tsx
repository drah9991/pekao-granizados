import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, User, Mail, Lock, UserPlus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignupFormProps {
  isLoading: boolean;
  onSignup: (email: string, password: string, fullName: string) => Promise<boolean>;
}

export default function SignupForm({ isLoading, onSignup }: SignupFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignup(email, password, fullName);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-300">
      <div className="space-y-2">
        <Label htmlFor="full_name" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground font-space-grotesk italic flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-primary" />
          <span>Nombre Operativo / Operador</span>
        </Label>
        <div className="relative group">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors z-10" />
          <Input
            id="full_name"
            type="text"
            placeholder="JUAN PÉREZ"
            required
            disabled={isLoading}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="pl-11 h-14 bg-muted/30 border-border rounded-2xl font-bold font-space-grotesk tracking-wide text-xs focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground transition-all shadow-sm placeholder:text-muted-foreground/30"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground font-space-grotesk italic flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-primary" />
          <span>Correo Electrónico</span>
        </Label>
        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors z-10" />
          <Input
            id="signup-email"
            type="email"
            placeholder="operador@pekao.com"
            required
            disabled={isLoading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-11 h-14 bg-muted/30 border-border rounded-2xl font-bold font-space-grotesk tracking-wide text-xs focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground transition-all shadow-sm placeholder:text-muted-foreground/30"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground font-space-grotesk italic flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-primary" />
          <span>Contraseña de Seguridad</span>
        </Label>
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors z-10" />
          <Input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            required
            disabled={isLoading}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-11 pr-12 h-14 bg-muted/30 border-border rounded-2xl font-bold font-space-grotesk tracking-widest text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground transition-all shadow-sm placeholder:text-muted-foreground/30"
          />
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-primary transition-colors p-1"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button 
        type="submit" 
        disabled={isLoading}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-[0.25em] text-[11px] italic font-space-grotesk transition-all shadow-glow-pro hover:scale-[1.01] active:scale-[0.99] border border-primary/30 group overflow-hidden relative"
      >
        <div className="relative z-10 flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Creando Perfil...</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Registrar en el Sistema</span>
            </>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      </Button>
    </form>
  );
}
