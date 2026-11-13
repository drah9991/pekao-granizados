import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { InputGroup } from "@astryxdesign/core/InputGroup";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  htmlName?: string;
  isDisabled?: boolean;
  errorMessage?: string;
};

/** Campo de contraseña de Astryx con botón para mostrarla u ocultarla. */
export function PasswordInput({ label, value, onChange, autoComplete, htmlName, isDisabled, errorMessage }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const toggleLabel = isVisible ? "Ocultar contraseña" : "Mostrar contraseña";

  return (
    <InputGroup
      label={label}
      size="lg"
      isDisabled={isDisabled}
      status={errorMessage ? { type: "error", message: errorMessage } : undefined}
    >
      <TextInput
        label={label}
        type={isVisible ? "text" : "password"}
        placeholder="••••••••"
        autoComplete={autoComplete}
        htmlName={htmlName}
        value={value}
        onChange={(next) => onChange(next)}
      />
      <Button
        label={toggleLabel}
        variant="secondary"
        isIconOnly
        icon={isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
        onClick={() => setIsVisible((visible) => !visible)}
      />
    </InputGroup>
  );
}
