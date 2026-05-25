export const mapProductStock = (p: any, typesData: any[]) => {
  let stock = p.store_stock?.[0]?.qty ?? 0;
  let mixtureStock = 0;

  const typeCfg = (typesData || []).find((t: any) => t.code === p.type);
  const isMixtureTracked = typeCfg?.track_mixture_inventory ?? (p.type === "granizado" || p.category === "Granizado");

  if (isMixtureTracked) {
    const mixtureRecipe = (p.recipes as any[] || []).find(
      (r: any) => r.inventory_items?.is_mixture === true
    );
    if (mixtureRecipe) {
      mixtureStock = mixtureRecipe.inventory_items?.stock ?? 0;
    }
  } else {
    const firstRecipe = (p.recipes as any[] || [])[0];
    if (firstRecipe && firstRecipe.inventory_items) {
      mixtureStock = firstRecipe.inventory_items.stock ?? 0;
      // For non-mixtures, if store_stock is 0, use inventory stock as fallback
      if (stock === 0) stock = mixtureStock;
    }
  }

  const has_recipe = p.recipes && p.recipes.length > 0;

  return { ...p, stock, mixtureStock, has_recipe };
};
