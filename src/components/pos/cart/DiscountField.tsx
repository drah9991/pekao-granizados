import { useEffect, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { InputGroup } from "@astryxdesign/core/InputGroup";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";

type DiscountType = "percent" | "fixed";

interface DiscountFieldProps {
  discount: number;
  setDiscount: (discount: number) => void;
  discountType: DiscountType;
  setDiscountType: (type: DiscountType) => void;
}

/** Acepta coma o punto decimal (en Colombia se escribe 7,5) y descarta cualquier otro carácter. */
function parseDiscount(raw: string): number {
  const normalized = raw.replace(",", ".").replace(/[^0-9.]/g, "");
  return parseFloat(normalized) || 0;
}

const sanitizeDraft = (raw: string) => raw.replace(/[^0-9.,]/g, "");

/**
 * El descuento se aplica mientras se escribe (como antes con input type=number). Se guarda un
 * borrador de texto para que "7," o "7." no se borren antes de escribir el decimal.
 */
export function DiscountField({ discount, setDiscount, discountType, setDiscountType }: DiscountFieldProps) {
  const [draft, setDraft] = useState(discount ? String(discount) : "");

  // Si el descuento cambia desde fuera (p. ej. al vaciar el carrito), el borrador lo sigue.
  useEffect(() => {
    setDraft((current) => (parseDiscount(current) === discount ? current : discount ? String(discount) : ""));
  }, [discount]);

  const handleChange = (raw: string) => {
    const next = sanitizeDraft(raw);
    setDraft(next);
    setDiscount(parseDiscount(next));
  };

  return (
    <HStack justify="between" vAlign="center" gap={4}>
      <Text type="label" color="secondary">Descuento</Text>
      <InputGroup label="Descuento" isLabelHidden size="sm">
        <TextInput
          label="Descuento"
          inputMode="decimal"
          placeholder="0"
          value={draft}
          onChange={handleChange}
          width={96}
        />
        <Button
          label="Cambiar tipo de descuento"
          variant="secondary"
          onClick={() => setDiscountType(discountType === "percent" ? "fixed" : "percent")}
        >
          {discountType === "percent" ? "%" : "$"}
        </Button>
      </InputGroup>
    </HStack>
  );
}
