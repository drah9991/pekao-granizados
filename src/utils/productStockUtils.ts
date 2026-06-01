export const mapProductStock = (p: Record<string, unknown>, typesData: Record<string, unknown>[]) => {
  let stock = p.store_stock?.[0]?.qty ?? 0;
  let mixtureStock = 0;

  const typeCfg = (typesData || []).find((t: Record<string, unknown>) => t.code === p.type);
  const isMixtureTracked = typeCfg?.track_mixture_inventory ?? (p.type === "granizado" || p.category === "Granizado");

  if (isMixtureTracked) {
    const mixtureRecipe = (p.recipes as Record<string, unknown>[] || []).find(
      (r: Record<string, unknown>) => (r.inventory_items as Record<string, unknown>)?.is_mixture === true
    );
    if (mixtureRecipe) {
      mixtureStock = mixtureRecipe.inventory_items?.stock ?? 0;
    }
  } else {
    const firstRecipe = (p.recipes as Record<string, unknown>[] || [])[0];
    if (firstRecipe && firstRecipe.inventory_items) {
      mixtureStock = firstRecipe.inventory_items.stock ?? 0;
      // For non-mixtures, if store_stock is 0, use inventory stock as fallback
      if (stock === 0) stock = mixtureStock;
    }
  }

  const has_recipe = p.recipes && p.recipes.length > 0;

  return { ...p, stock, mixtureStock, has_recipe };
};
