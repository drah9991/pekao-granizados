import { Button } from "@astryxdesign/core/Button";
import { List, ListItem } from "@astryxdesign/core/List";
import { Popover } from "@astryxdesign/core/Popover";
import { Text } from "@astryxdesign/core/Text";
import { Check, Plus } from "lucide-react";
import { formatCOP } from "@/lib/currency";
import type { Product } from "@/lib/pos-types";

interface ToppingPickerProps {
  itemName: string;
  toppings: Product[];
  selectedIds: string[];
  onToggle: (toppingId: string) => void;
}

/** Botón "+ Top" que abre la lista de toppings; cada fila agrega o quita el topping del ítem. */
export function ToppingPicker({ itemName, toppings, selectedIds, onToggle }: ToppingPickerProps) {
  const content = (
    <List density="compact" header={<Text type="label" color="secondary">Agregar Toppings</Text>}>
      {toppings.map((topping) => {
        const isSelected = selectedIds.includes(topping.id);
        return (
          <ListItem
            key={topping.id}
            label={topping.name}
            isSelected={isSelected}
            startContent={isSelected ? <Check size={14} aria-hidden /> : undefined}
            endContent={<Text type="supporting">+{formatCOP(topping.price)}</Text>}
            onClick={() => onToggle(topping.id)}
          />
        );
      })}
    </List>
  );

  return (
    <Popover label={`Toppings de ${itemName}`} content={content} width={240}>
      <Button label={`Agregar topping a ${itemName}`} size="sm" variant="ghost" icon={<Plus size={12} />}>
        Top
      </Button>
    </Popover>
  );
}
