import { startTransition } from "react";
import { Card } from "@astryxdesign/core/Card";
import { HStack } from "@astryxdesign/core/HStack";
import { IconButton } from "@astryxdesign/core/IconButton";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";
import { Thumbnail } from "@astryxdesign/core/Thumbnail";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatCOP } from "@/lib/currency";
import type { CartItem, Product } from "@/lib/pos-types";
import { currentSizeId, enabledSizesFor, hasSizeOptions, toppingIdsOf, type SizeOption } from "./cartItemOptions";
import { ToppingPicker } from "./ToppingPicker";

interface CartItemRowProps {
  item: CartItem;
  position: number;
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  availableSizes: SizeOption[];
  availableToppings: Product[];
  updateItemCustomization?: (id: string, sizeId: string, toppingIds: string[]) => void;
}

export function CartItemRow({
  item,
  position,
  updateQuantity,
  removeItem,
  availableSizes,
  availableToppings,
  updateItemCustomization,
}: CartItemRowProps) {
  const sizeId = currentSizeId(item, availableSizes);
  const toppingIds = toppingIdsOf(item);
  const sizes = hasSizeOptions(item) ? enabledSizesFor(item, availableSizes) : [];

  const customize = (nextSizeId: string, nextToppingIds: string[]) =>
    startTransition(() => updateItemCustomization?.(item.id, nextSizeId, nextToppingIds));

  const toggleTopping = (toppingId: string) =>
    customize(
      sizeId,
      toppingIds.includes(toppingId) ? toppingIds.filter((id) => id !== toppingId) : [...toppingIds, toppingId],
    );

  return (
    <Card padding={2}>
      <HStack gap={2} vAlign="center">
        {/* Decorativa: el nombre del producto ya se lee al lado. */}
        <Thumbnail src={item.image} className="size-12 shrink-0" />

        {/* La columna central ocupa el espacio libre y empuja cantidad y precio a la derecha. */}
        <div className="min-w-0 flex-1">
        <VStack gap={1}>
          <HStack gap={1.5} vAlign="center">
            <Text type="code" size="xsm" color="accent">#{position}</Text>
            <Text weight="bold" maxLines={1}>{item.name}</Text>
          </HStack>

          <HStack gap={1} wrap="wrap" vAlign="center">
            {item.size && !hasSizeOptions(item) && <Token label={item.size} size="sm" color="purple" />}
            {item.toppings?.map((topping) => (
              <Token key={topping.id} label={topping.name} size="sm" onRemove={() => toggleTopping(topping.id)} />
            ))}
            {availableToppings.length > 0 && (
              <ToppingPicker
                itemName={item.name}
                toppings={availableToppings}
                selectedIds={toppingIds}
                onToggle={toggleTopping}
              />
            )}
          </HStack>

          {sizes.length > 0 && (
            <SegmentedControl
              label={`Tamaño de ${item.name}`}
              size="sm"
              value={sizeId}
              onChange={(nextSizeId) => customize(nextSizeId, toppingIds)}
            >
              {sizes.map((size) => (
                <SegmentedControlItem key={size.id} value={size.id} label={size.name} />
              ))}
            </SegmentedControl>
          )}
        </VStack>
        </div>

        <HStack gap={1} vAlign="center">
          <IconButton
            label={`Quitar uno de ${item.name}`}
            size="sm"
            variant="ghost"
            icon={<Minus size={14} />}
            onClick={() => startTransition(() => updateQuantity(item.id, -1))}
          />
          <Text weight="bold">{item.quantity}</Text>
          <IconButton
            label={`Agregar uno de ${item.name}`}
            size="sm"
            variant="ghost"
            icon={<Plus size={14} />}
            onClick={() => startTransition(() => updateQuantity(item.id, 1))}
          />
        </HStack>

        <VStack gap={0.5} hAlign="end">
          <Text weight="bold">{formatCOP(item.price * item.quantity)}</Text>
          {item.quantity > 1 && <Text type="supporting">{formatCOP(item.price)}</Text>}
        </VStack>

        <IconButton
          label={`Eliminar ${item.name}`}
          size="sm"
          variant="destructive"
          icon={<Trash2 size={16} />}
          onClick={() => startTransition(() => removeItem(item.id))}
        />
      </HStack>
    </Card>
  );
}
