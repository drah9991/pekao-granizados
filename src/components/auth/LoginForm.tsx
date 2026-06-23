import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El correo de operador es obligatorio")
    .email("Ingresa un identificador de canal (email) válido"),
  password: z
    .string()
    .min(6, "El código de encriptación debe tener al menos 6 caracteres")
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  isLoading: boolean;
  onLogin: (email: string, password: string) => Promise<boolean>;
  rememberMe: boolean;
  onRememberMeChange: (checked: boolean) => void;
}

export default function LoginForm({ isLoading, onLogin, rememberMe, onRememberMeChange }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = (data: LoginFormData) => {
    onLogin(data.email, data.password);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-pro-in">
        <div className="space-y-2">
            <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 ml-2 font-space-grotesk italic">IDENTIFICADOR DE CANAL</Label>
            <Input
                id="email"
                type="email"
                placeholder="OPERADOR@PEKAO.COM"
                disabled={isLoading}
                {...register("email")}
                className={cn(
                  "h-14 bg-muted border-border rounded-2xl font-black font-space-grotesk italic tracking-widest text-[11px] uppercase focus:border-primary/50 text-foreground transition-all shadow-inner placeholder:opacity-20",
                  errors.email && "border-destructive/50 focus:border-destructive/50"
                )}
            />
            {errors.email && (
              <p className="text-[10px] font-bold text-destructive uppercase tracking-widest font-space-grotesk italic ml-2 mt-1">
                {errors.email.message}
              </p>
            )}
        </div>
        <div className="space-y-2">
            <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 ml-2 font-space-grotesk italic">CÓDIGO DE ENCRIPTACIÓN</Label>
            <div className="relative">
                <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    disabled={isLoading}
                    {...register("password")}
                    className={cn(
                      "h-14 bg-muted border-border rounded-2xl font-black font-space-grotesk italic tracking-widest text-sm focus:border-primary/50 text-foreground transition-all shadow-inner placeholder:opacity-20",
                      errors.password && "border-destructive/50 focus:border-destructive/50"
                    )}
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
            {errors.password && (
              <p className="text-[10px] font-bold text-destructive uppercase tracking-widest font-space-grotesk italic ml-2 mt-1">
                {errors.password.message}
              </p>
            )}
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

// Helper utility import
import { cn } from "@/lib/utils";

