import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

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
    <form onSubmit={handleSubmit} className="space-y-6 animate-pro-in">
        <div className="space-y-3">
            <Label htmlFor="full_name" className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 ml-2 font-space-grotesk italic">NOMBRE OPERATIVO</Label>
            <Input
                id="full_name"
                type="text"
                placeholder="JUAN PÉREZ"
                required
                disabled={isLoading}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 bg-muted/40 border-border rounded-2xl font-black font-space-grotesk italic tracking-widest text-[11px] uppercase focus:border-primary/50 text-foreground transition-all shadow-inner placeholder:opacity-20"
            />
        </div>
        <div className="space-y-3">
            <Label htmlFor="signup-password" className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 ml-2 font-space-grotesk italic">PASSWORD DE SEGURIDAD</Label>
            <div className="relative">
                <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 bg-muted/40 border-border rounded-2xl font-black font-space-grotesk italic tracking-widest text-[11px] focus:border-primary/50 text-foreground transition-all shadow-inner placeholder:opacity-20"
                />
                <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-primary transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
            </div>
        </div>
        <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-16 rounded-2xl bg-foreground text-background hover:bg-primary hover:text-primary-foreground font-black uppercase tracking-[0.3em] text-[12px] italic font-space-grotesk transition-all shadow-glow-pro active:scale-95 border-2 border-border/20 group overflow-hidden relative"
        >
            <span className="relative z-10">{isLoading ? "CREANDO PERFIL..." : "REGISTRAR EN EL SISTEMA"}</span>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-background/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        </Button>
    </form>
  );
}
