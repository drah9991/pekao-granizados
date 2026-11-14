import { memo } from "react";
import { motion, type Variants } from "framer-motion";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { HStack } from "@astryxdesign/core/HStack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { Thumbnail } from "@astryxdesign/core/Thumbnail";
import { VStack } from "@astryxdesign/core/VStack";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { formatCOP } from "@/lib/currency";
import type { PosProduct } from "@/hooks/usePosProducts";
import { getStockLevel, stockLabel, type StockLevel } from "./productStock";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 20 } },
};

const STOCK_DOT: Record<StockLevel, { variant: "error" | "warning" | "success"; label: string }> = {
  out: { variant: "error", label: "Agotado" },
  low: { variant: "error", label: "Stock bajo" },
  medium: { variant: "warning", label: "Stock medio" },
  high: { variant: "success", label: "Stock suficiente" },
};

interface ProductCardProps {
  product: PosProduct;
  tracksMixture: boolean;
  onProductSelect: (product: PosProduct) => void;
}

export const ProductCard = memo(function ProductCard({ product, tracksMixture, onProductSelect }: ProductCardProps) {
  const level = getStockLevel(product, tracksMixture);
  const isOutOfStock = level === "out";
  const dot = STOCK_DOT[level];

  const handleClick = () => {
    if (isOutOfStock) {
      toast.error(`Sin existencias de ${product.name}`, { icon: "🚫" });
      return;
    }
    onProductSelect(product);
  };

  return (
    // Agotado: se atenúa pero sigue clicable para avisar con un toast por qué no se agrega.
    <motion.div variants={cardVariants} className={isOutOfStock ? "opacity-50 grayscale" : undefined}>
      <ClickableCard
        label={product.name}
        padding={4}
        height="100%"
        variant={level === "low" ? "red" : "default"}
        onClick={handleClick}
      >
        <VStack gap={3}>
          <HStack justify="between" vAlign="start">
            <HStack gap={2} vAlign="start">
              <Thumbnail src={product.images?.[0]} className="size-12 lg:size-16 shrink-0" />
              {product.is_starred && <Star size={16} color="var(--color-icon-orange)" fill="currentColor" aria-label="Destacado" />}
            </HStack>
            {product.stock !== undefined && (
              <HStack gap={1} vAlign="center">
                <StatusDot variant={dot.variant} label={dot.label} />
                <Text type="supporting" weight="bold">{stockLabel(product, tracksMixture)}</Text>
              </HStack>
            )}
          </HStack>
          <Text weight="medium" maxLines={2}>{product.name}</Text>
          <Text type="large" weight="bold">{formatCOP(product.price)}</Text>
        </VStack>
      </ClickableCard>
    </motion.div>
  );
});
