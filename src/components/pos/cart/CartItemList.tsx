import { AnimatePresence, motion } from "framer-motion";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { VStack } from "@astryxdesign/core/VStack";
import { Receipt } from "lucide-react";
import type { CartItem, Product } from "@/lib/pos-types";
import { CartItemRow } from "./CartItemRow";
import type { SizeOption } from "./cartItemOptions";

interface CartItemListProps {
  cart: CartItem[];
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  availableSizes?: SizeOption[];
  availableToppings?: Product[];
  updateItemCustomization?: (id: string, sizeId: string, toppingIds: string[]) => void;
}

export function CartItemList({
  cart,
  updateQuantity,
  removeItem,
  availableSizes = [],
  availableToppings = [],
  updateItemCustomization,
}: CartItemListProps) {
  if (cart.length === 0) {
    return (
      <EmptyState
        icon={<Receipt size={48} />}
        title="Selecciona productos"
        description="El carrito está esperando tu próxima venta"
      />
    );
  }

  return (
    <VStack gap={2} paddingInline={2}>
      {/* framer-motion anima la entrada y salida de cada ítem del carrito. */}
      <AnimatePresence initial={false}>
        {cart.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95, overflow: "hidden" }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <CartItemRow
              item={item}
              position={index + 1}
              updateQuantity={updateQuantity}
              removeItem={removeItem}
              availableSizes={availableSizes}
              availableToppings={availableToppings}
              updateItemCustomization={updateItemCustomization}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </VStack>
  );
}
