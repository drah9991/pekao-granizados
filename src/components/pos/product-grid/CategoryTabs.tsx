import { Tab, TabList } from "@astryxdesign/core/TabList";
import { ALL_CATEGORIES, type GridCategory } from "./productFilter";

export const PRODUCT_PANEL_ID = "pos-products-panel";

interface CategoryTabsProps {
  categories: GridCategory[];
  value: string;
  onChange: (categoryCode: string) => void;
}

/** Filtro de categorías del catálogo: pestañas que controlan el panel de productos. */
export function CategoryTabs({ categories, value, onChange }: CategoryTabsProps) {
  return (
    <TabList role="tablist" value={value} onChange={onChange} overflow="scroll">
      <Tab value={ALL_CATEGORIES} label="Todos" icon={<span aria-hidden>📋</span>} panelId={PRODUCT_PANEL_ID} />
      {categories.map((category) => (
        <Tab
          key={category.code}
          value={category.code}
          label={category.label}
          icon={<span aria-hidden>{category.emoji}</span>}
          panelId={PRODUCT_PANEL_ID}
        />
      ))}
    </TabList>
  );
}
