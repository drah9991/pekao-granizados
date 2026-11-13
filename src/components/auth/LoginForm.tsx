import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { InputGroup } from "@astryxdesign/core/InputGroup";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { Eye, EyeOff, LogIn, Mail } from "lucide-react";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El correo de operador es obligatorio")
    .email("Ingresa un correo electrónico válido"),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  isLoading: boolean;
  onLogin: (email: string, password: string) => Promise<boolean>;
  rememberMe: boolean;
  onRememberMeChange: (checked: boolean) => void;
}

const errorStatus = (message?: string) =>
  message ? ({ type: "error", message } as const) : undefined;

export default function LoginForm({ isLoading, onLogin, rememberMe, onRememberMeChange }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginFormData) => {
    onLogin(data.email, data.password);
  };

  const passwordToggleLabel = showPassword ? "Ocultar contraseña" : "Mostrar contraseña";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <VStack gap={5}>
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextInput
              label="Correo de Operador"
              type="email"
              size="lg"
              startIcon={Mail}
              placeholder="operador@pekao.com"
              autoComplete="email"
              htmlName={field.name}
              value={field.value}
              onChange={(value) => field.onChange(value)}
              isDisabled={isLoading}
              status={errorStatus(errors.email?.message)}
              statusVariant="detached"
            />
          )}
        />

        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <InputGroup
              label="Contraseña de Acceso"
              size="lg"
              isDisabled={isLoading}
              status={errorStatus(errors.password?.message)}
            >
              <TextInput
                label="Contraseña de Acceso"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                htmlName={field.name}
                value={field.value}
                onChange={(value) => field.onChange(value)}
              />
              <Button
                label={passwordToggleLabel}
                variant="secondary"
                isIconOnly
                icon={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                onClick={() => setShowPassword((shown) => !shown)}
              />
            </InputGroup>
          )}
        />

        <CheckboxInput
          label="Mantener sesión activa"
          value={rememberMe}
          onChange={(checked) => onRememberMeChange(checked)}
          isDisabled={isLoading}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          width="100%"
          label="Ingresar al Sistema"
          icon={<LogIn size={16} />}
          isLoading={isLoading}
        />
      </VStack>
    </form>
  );
}
