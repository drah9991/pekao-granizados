import { Receipt } from "lucide-react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";

interface CartHeaderProps {
  itemCount: number;
  onClearCart: () => void;
}

export function CartHeader({ itemCount, onClearCart }: CartHeaderProps) {
  return (
    <HStack justify="between" vAlign="center">
      <HStack gap={3} vAlign="center">
        <Receipt className="size-6 text-primary" aria-hidden />
        <Heading level={2}>Orden</Heading>
        <Badge variant="purple" label={`${itemCount} items`} />
      </HStack>
      <Button label="Vaciar" variant="ghost" size="sm" onClick={onClearCart} />
    </HStack>
  );
}
