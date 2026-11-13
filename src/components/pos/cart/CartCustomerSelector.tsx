import { HStack } from "@astryxdesign/core/HStack";
import { ToggleButton } from "@astryxdesign/core/ToggleButton";
import { User as UserIcon, UserX } from "lucide-react";
import CustomerSelection from "@/components/pos/CustomerSelection";
import type { Customer } from "@/components/pos/CustomerSelection";

interface CartCustomerSelectorProps {
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
}

const GENERAL_PUBLIC: Customer = {
  id: "generic",
  name: "Público General",
  document_id: "222222222222",
  phone: null,
  email: null,
};

export function CartCustomerSelector({ selectedCustomer, setSelectedCustomer }: CartCustomerSelectorProps) {
  const isAnonymous = selectedCustomer?.id === GENERAL_PUBLIC.id;

  return (
    <HStack gap={3} vAlign="center">
      {/* CustomerSelection aún es shadcn (se migra aparte); este contenedor le da el ancho libre. */}
      <div className="min-w-0 flex-1">
        <CustomerSelection selectedCustomer={selectedCustomer} onCustomerSelected={setSelectedCustomer} />
      </div>
      <ToggleButton
        label="Público"
        size="lg"
        isPressed={isAnonymous}
        onPressedChange={(pressed) => setSelectedCustomer(pressed ? GENERAL_PUBLIC : null)}
        icon={<UserX size={18} />}
        pressedIcon={<UserIcon size={18} />}
      >
        Público
      </ToggleButton>
    </HStack>
  );
}
