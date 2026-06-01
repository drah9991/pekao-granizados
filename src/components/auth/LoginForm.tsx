import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
  isLoading: boolean;
  onLogin: (email: string, password: string) => Promise<boolean>;
  rememberMe: boolean;
  onRememberMeChange: (checked: boolean) => void;
}

export default function LoginForm({ isLoading, onLogin, rememberMe, onRememberMeChange }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-pro-in">
        <div className="space-y-3">
            <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 ml-2 font-space-grotesk italic">IDENTIFICADOR DE CANAL</Label>
            <Input
                id="email"
                type="email"
                placeholder="OPERADOR@PEKAO.COM"
                required
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 bg-muted border-border rounded-2xl font-black font-space-grotesk italic tracking-widest text-[11px] uppercase focus:border-primary/50 text-foreground transition-all shadow-inner placeholder:opacity-20"
            />
        </div>
        <div className="space-y-3">
            <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 ml-2 font-space-grotesk italic">CÓDIGO DE ENCRIPTACIÓN</Label>
            <div className="relative">
                <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 bg-muted border-border rounded-2xl font-black font-space-grotesk italic tracking-widest text-sm focus:border-primary/50 text-foreground transition-all shadow-inner placeholder:opacity-20"
                />
                <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-primary transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
            </div>
        </div>
        <div className="flex items-center justify-between px-2">
            <div className="flex items-center space-x-3">
                <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => onRememberMeChange(!!checked)}
                    disabled={isLoading}
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-glow-pro"
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
  );
}
