import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { Mail, User, UserPlus } from "lucide-react";
import { PasswordInput } from "./PasswordInput";

// Antes solo validaba el `required` nativo; los campos de Astryx no lo usan, así que se valida aquí.
const signupSchema = z.object({
  fullName: z.string().trim().min(1, "El nombre del operador es obligatorio"),
  email: z
    .string()
    .min(1, "El correo electrónico es obligatorio")
    .email("Ingresa un correo electrónico válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type SignupFormData = z.infer<typeof signupSchema>;

interface SignupFormProps {
  isLoading: boolean;
  onSignup: (email: string, password: string, fullName: string) => Promise<boolean>;
}

const errorStatus = (message?: string) =>
  message ? ({ type: "error", message } as const) : undefined;

export default function SignupForm({ isLoading, onSignup }: SignupFormProps) {
  const { control, handleSubmit, formState: { errors } } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  const onSubmit = (data: SignupFormData) => {
    onSignup(data.email, data.password, data.fullName);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <VStack gap={5}>
        <Controller
          name="fullName"
          control={control}
          render={({ field }) => (
            <TextInput
              label="Nombre Operativo / Operador"
              size="lg"
              startIcon={User}
              placeholder="JUAN PÉREZ"
              autoComplete="name"
              htmlName={field.name}
              value={field.value}
              onChange={(value) => field.onChange(value)}
              isDisabled={isLoading}
              status={errorStatus(errors.fullName?.message)}
              statusVariant="detached"
            />
          )}
        />

        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextInput
              label="Correo Electrónico"
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
            <PasswordInput
              label="Contraseña de Seguridad"
              autoComplete="new-password"
              htmlName={field.name}
              value={field.value}
              onChange={field.onChange}
              isDisabled={isLoading}
              errorMessage={errors.password?.message}
            />
          )}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          width="100%"
          label="Registrar en el Sistema"
          icon={<UserPlus size={16} />}
          isLoading={isLoading}
        />
      </VStack>
    </form>
  );
}
