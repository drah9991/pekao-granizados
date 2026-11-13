import { useState } from "react";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack } from "@astryxdesign/core/HStack";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { ChevronRight, Store } from "lucide-react";

interface StoreItem {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  subscription_status?: string | null;
}

interface StoreSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stores: StoreItem[];
  currentStoreId?: string | null;
  onSelectStore: (storeId: string) => Promise<void>;
  isProcessing: boolean;
}

const storeLocation = (store: StoreItem) =>
  [store.address, store.city].filter(Boolean).join(" • ") || undefined;

function StoreRowEnd({ isCurrent, isConnecting }: { isCurrent: boolean; isConnecting: boolean }) {
  if (isConnecting) {
    return <Text type="supporting">Conectando...</Text>;
  }
  return (
    <HStack gap={2} vAlign="center">
      {isCurrent && <Token label="Activo" size="sm" color="purple" />}
      <ChevronRight size={16} aria-hidden />
    </HStack>
  );
}

export function StoreSelectorDialog({
  isOpen,
  onClose,
  stores,
  currentStoreId,
  onSelectStore,
  isProcessing,
}: StoreSelectorDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleConfirm = async (id: string) => {
    setSelectedId(id);
    await onSelectStore(id);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={handleOpenChange} width={448}>
      <DialogHeader
        title="Seleccionar Punto de Venta"
        subtitle="Tu cuenta tiene acceso a múltiples sucursales. Elige la sede donde deseas operar hoy."
        onOpenChange={handleOpenChange}
      />
      <VStack gap={3} padding={4}>
        <List hasDividers>
          {stores.map((store) => (
            <ListItem
              key={store.id}
              itemKey={store.id}
              label={store.name}
              description={storeLocation(store)}
              startContent={<Store size={20} aria-hidden />}
              endContent={
                <StoreRowEnd isCurrent={store.id === currentStoreId} isConnecting={selectedId === store.id} />
              }
              isSelected={store.id === currentStoreId}
              isDisabled={isProcessing}
              onClick={() => handleConfirm(store.id)}
            />
          ))}
        </List>
        <HStack justify="between">
          <Text type="supporting">Multi-Tenant Active</Text>
          <Text type="supporting">{stores.length} Sucursales Disponibles</Text>
        </HStack>
      </VStack>
    </Dialog>
  );
}
