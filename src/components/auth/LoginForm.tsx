import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Mail, Lock, LogIn, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El correo de operador es obligatorio")
    .email("Ingresa un correo electrónico válido"),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 animate-in fade-in duration-300">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground font-space-grotesk italic flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-primary" />
          <span>Correo de Operador</span>
        </Label>
        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors z-10" />
          <Input
            id="email"
            type="email"
            placeholder="operador@pekao.com"
            disabled={isLoading}
            {...register("email")}
            className={cn(
              "pl-11 h-14 bg-muted/30 border-border rounded-2xl font-bold font-space-grotesk tracking-wide text-xs focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground transition-all shadow-sm placeholder:text-muted-foreground/30",
              errors.email && "border-destructive/60 focus:border-destructive focus:ring-destructive/20"
            )}
          />
        </div>
        {errors.email && (
          <p className="text-[10px] font-bold text-destructive uppercase tracking-wider font-space-grotesk italic ml-1 mt-1">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground font-space-grotesk italic flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-primary" />
          <span>Contraseña de Acceso</span>
        </Label>
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors z-10" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={isLoading}
            {...register("password")}
            className={cn(
              "pl-11 pr-12 h-14 bg-muted/30 border-border rounded-2xl font-bold font-space-grotesk tracking-widest text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground transition-all shadow-sm placeholder:text-muted-foreground/30",
              errors.password && "border-destructive/60 focus:border-destructive focus:ring-destructive/20"
            )}
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
        {errors.password && (
          <p className="text-[10px] font-bold text-destructive uppercase tracking-wider font-space-grotesk italic ml-1 mt-1">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 pb-2">
        <div className="flex items-center space-x-2.5">
          <Checkbox
            id="remember-me"
            checked={rememberMe}
            onCheckedChange={(checked) => onRememberMeChange(!!checked)}
            disabled={isLoading}
            className="border-border/80 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-sm"
          />
          <Label htmlFor="remember-me" className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-space-grotesk hover:text-foreground transition-colors">
            Mantener sesión activa
          </Label>
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
              <span>Verificando Identidad...</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              <span>Ingresar al Sistema</span>
            </>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      </Button>
    </form>
  );
}

