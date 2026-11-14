import { memo, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
import { Kbd } from "@astryxdesign/core/Kbd";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { Search, ShoppingCart, WifiOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useBoneyardLoad } from "@/hooks/useBoneyardLoad";
import { usePosProducts, type PosProduct } from "@/hooks/usePosProducts";
import type { Product } from "@/lib/pos-types";
import { BoneyardSkeleton } from "@/components/ui/BoneyardSkeleton";
import { CategoryTabs, PRODUCT_PANEL_ID } from "./product-grid/CategoryTabs";
import { ProductCard } from "./product-grid/ProductCard";
import { ALL_CATEGORIES, filterProducts } from "./product-grid/productFilter";

interface ProductGridProps {
  onProductSelect: (product: Product) => void;
  searchRef?: React.RefObject<HTMLInputElement>;
  activeCategoryIndex?: number;
}

const SEARCH_DELAY_MS = 150;

const gridVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };

const ProductGrid = memo(function ProductGrid({ onProductSelect, searchRef, activeCategoryIndex }: ProductGridProps) {
  const { storeId } = useAuth();
  const { products, categories, isOffline, isLoading } = usePosProducts(storeId);

  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);
  const [, startCategoryTransition] = useTransition();

  const applySearch = useDebouncedCallback((value: string) => setSearchQuery(value), SEARCH_DELAY_MS);

  const handleSearchChange = (value: string) => {
    setSearchText(value);
    applySearch(value);
  };

  const clearSearch = useCallback(() => {
    setSearchText("");
    setSearchQuery("");
  }, []);

  // Los atajos de teclado del POS eligen la categoría por su posición (0 = Todos).
  useEffect(() => {
    if (activeCategoryIndex === undefined) return;
    const codes = [ALL_CATEGORIES, ...categories.map((c) => c.code)];
    if (activeCategoryIndex < codes.length) setActiveCategory(codes[activeCategoryIndex]);
  }, [activeCategoryIndex, categories]);

  const tracksMixture = useCallback(
    (product: PosProduct) => categories.find((c) => c.code === (product.type || "other"))?.trackMixture ?? false,
    [categories],
  );

  const visibleProducts = useMemo(
    () => filterProducts(products, searchQuery, activeCategory, categories),
    [products, searchQuery, activeCategory, categories],
  );

  const isBoneyardLoading = useBoneyardLoad(isLoading && !products.length);

  return (
    // .products-panel es el contenedor que miden las container queries de .products-grid (index.css).
    <div className="products-panel flex-1 w-full min-h-0 overflow-y-auto bg-transparent animate-pro-in custom-scrollbar">
      <VStack gap={6} padding={4} minHeight="100%">
        <HStack gap={3} vAlign="center">
          <TextInput
            ref={searchRef}
            label="Buscar productos por nombre o categoría"
            isLabelHidden
            type="search"
            size="lg"
            startIcon={Search}
            placeholder="Buscar por nombre o categoría..."
            value={searchText}
            onChange={handleSearchChange}
            hasClear
            width="100%"
          />
          {isOffline && <Token label="OFFLINE" color="orange" icon={<WifiOff size={14} />} />}
          <Kbd keys="mod+k" />
        </HStack>

        <CategoryTabs
          categories={categories}
          value={activeCategory}
          onChange={(code) => startCategoryTransition(() => setActiveCategory(code))}
        />

        <BoneyardSkeleton name="pos-products-grid" isLoading={isBoneyardLoading} animate="wave">
          {/* .products-grid (index.css) ajusta las columnas al ancho, incluido el carrito abierto. */}
          <motion.div
            id={PRODUCT_PANEL_ID}
            role="tabpanel"
            variants={gridVariants}
            initial="hidden"
            animate="show"
            className="products-grid pb-24"
          >
            <AnimatePresence mode="popLayout">
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  tracksMixture={tracksMixture(product)}
                  onProductSelect={onProductSelect}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </BoneyardSkeleton>

        {visibleProducts.length === 0 && !isLoading && (
          <EmptyState
            icon={<ShoppingCart size={48} />}
            title="¿Buscas algo especial?"
            description={`No encontramos productos con "${searchQuery}"`}
            actions={<Button label="Ver todo el catálogo" variant="secondary" onClick={clearSearch} />}
          />
        )}
      </VStack>
    </div>
  );
});

export default ProductGrid;
