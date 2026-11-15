import { Fragment } from "react";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack } from "@astryxdesign/core/HStack";
import { Kbd } from "@astryxdesign/core/Kbd";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

interface ShortcutsHelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ["F1"], description: "Focalizar el buscador de productos" },
  { keys: ["F2"], description: "Abrir la ventana de procesamiento de pago" },
  { keys: ["Esc"], description: "Cerrar diálogos emergentes o limpiar el foco de búsqueda" },
  { keys: ["?", "H"], description: "Abrir / Cerrar esta guía visual de atajos" },
];

function ShortcutKeys({ keys }: { keys: string[] }) {
  return (
    <HStack gap={1.5} vAlign="center">
      {keys.map((key, index) => (
        <Fragment key={key}>
          {index > 0 && <Text type="supporting">o</Text>}
          <Kbd keys={key} />
        </Fragment>
      ))}
    </HStack>
  );
}

export default function ShortcutsHelpDialog({ isOpen, onClose }: ShortcutsHelpDialogProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={handleOpenChange} width={448}>
      <Layout
        header={
          <DialogHeader
            title="Atajos de Teclado POS"
            subtitle="Optimiza la velocidad de operación con estos accesos rápidos del sistema."
            onOpenChange={handleOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={3}>
              <List hasDividers>
                {SHORTCUTS.map((shortcut) => (
                  <ListItem
                    key={shortcut.description}
                    // Text (no string) para que la descripción larga haga salto de línea en vez de truncarse.
                    label={<Text>{shortcut.description}</Text>}
                    endContent={<ShortcutKeys keys={shortcut.keys} />}
                  />
                ))}
              </List>
              <Text type="supporting">Presiona la tecla correspondiente en cualquier momento.</Text>
            </VStack>
          </LayoutContent>
        }
      />
    </Dialog>
  );
}
