import { Card } from "@astryxdesign/core/Card";
import { HStack } from "@astryxdesign/core/HStack";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { UserCheck, X } from "lucide-react";
import type { Customer } from "./customerApi";

interface SelectedCustomerCardProps {
  customer: Customer;
  onClear: () => void;
}

export function SelectedCustomerCard({ customer, onClear }: SelectedCustomerCardProps) {
  return (
    <Card variant="purple" padding={3}>
      <HStack justify="between" vAlign="center" gap={3}>
        <HStack gap={3} vAlign="center">
          <UserCheck size={20} color="var(--color-icon-purple)" aria-hidden />
          <VStack gap={0.5}>
            <Text weight="semibold">{customer.name}</Text>
            {customer.document_id && <Text type="supporting">CC: {customer.document_id}</Text>}
            {customer.phone && <Text type="supporting">{customer.phone}</Text>}
          </VStack>
        </HStack>
        <IconButton label="Quitar cliente" variant="ghost" size="sm" icon={<X size={16} />} onClick={onClear} />
      </HStack>
    </Card>
  );
}
