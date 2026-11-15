import { useMemo, useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import {
  Typeahead,
  type BaseTypeaheadHandle,
  type SearchableItem,
  type SearchSource,
} from "@astryxdesign/core/Typeahead";
import { VStack } from "@astryxdesign/core/VStack";
import { Search, UserPlus } from "lucide-react";
import { CreateCustomerDialog } from "./customer/CreateCustomerDialog";
import { SelectedCustomerCard } from "./customer/SelectedCustomerCard";
import {
  MIN_SEARCH_LENGTH,
  UNREGISTERED_CUSTOMER,
  searchCustomers,
  type Customer,
} from "./customer/customerApi";

export type { Customer } from "./customer/customerApi";

type CustomerItem = SearchableItem<Customer>;

interface CustomerSelectionProps {
  onCustomerSelected: (customer: Customer | null) => void;
  selectedCustomer: Customer | null;
}

const SEARCH_DELAY_MS = 300;

const toItem = (customer: Customer): CustomerItem => ({ id: customer.id, label: customer.name, auxiliaryData: customer });

function CustomerOption({ item }: { item: CustomerItem }) {
  const customer = item.auxiliaryData;
  const details = [customer?.document_id && `CC: ${customer.document_id}`, customer?.phone && `Tel: ${customer.phone}`]
    .filter(Boolean)
    .join(" · ");
  return (
    <VStack gap={0.5}>
      <Text weight="medium">{item.label}</Text>
      {details && <Text type="supporting">{details}</Text>}
    </VStack>
  );
}

export default function CustomerSelection({ onCustomerSelected, selectedCustomer }: CustomerSelectionProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const typeaheadRef = useRef<BaseTypeaheadHandle>(null);

  // El menú de resultados queda abierto detrás del formulario si no se cierra antes.
  const openCreateDialog = () => {
    typeaheadRef.current?.close();
    setIsCreateOpen(true);
  };

  const searchSource = useMemo<SearchSource<CustomerItem>>(
    () => ({
      search: async (query) => {
        try {
          return (await searchCustomers(query)).map(toItem);
        } catch (error) {
          console.error("Error searching customers:", error);
          return [];
        }
      },
      bootstrap: () => [],
    }),
    [],
  );

  if (selectedCustomer) {
    return <SelectedCustomerCard customer={selectedCustomer} onClear={() => onCustomerSelected(null)} />;
  }

  const noResults = (
    <VStack gap={2} padding={2}>
      <Text type="supporting">No se encontraron clientes.</Text>
      <Button
        label="Crear Nuevo Cliente"
        size="sm"
        variant="secondary"
        width="100%"
        icon={<UserPlus size={16} />}
        onClick={openCreateDialog}
      />
    </VStack>
  );

  return (
    <VStack gap={2}>
      <Typeahead<CustomerItem>
        label="Buscar cliente por nombre o teléfono"
        isLabelHidden
        placeholder="Buscar cliente por nombre o teléfono..."
        startIcon={Search}
        value={null}
        onChange={(item) => item?.auxiliaryData && onCustomerSelected(item.auxiliaryData)}
        searchSource={searchSource}
        minQueryLength={MIN_SEARCH_LENGTH}
        debounceMs={SEARCH_DELAY_MS}
        renderItem={(item) => <CustomerOption item={item} />}
        emptySearchText={noResults}
        handleRef={typeaheadRef}
      />
      <HStack justify="end">
        <Button
          label="Continuar sin registrar cliente"
          variant="ghost"
          size="sm"
          onClick={() => onCustomerSelected(UNREGISTERED_CUSTOMER)}
        />
      </HStack>
      <CreateCustomerDialog isOpen={isCreateOpen} onOpenChange={setIsCreateOpen} onCreated={onCustomerSelected} />
    </VStack>
  );
}
