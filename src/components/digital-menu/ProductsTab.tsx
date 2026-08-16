import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { MenuCategory } from "@/hooks/useDigitalMenu";

interface ProductsTabProps {
  categories: MenuCategory[];
  collapsedCategories: Record<string, boolean>;
  setCollapsedCategories: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  toggleProductVisibility: (productId: string, currentStatus: boolean) => void;
}

export function ProductsTab({
  categories,
  collapsedCategories,
  setCollapsedCategories,
  toggleProductVisibility
}: ProductsTabProps) {
  return (
    <div className="space-y-6 animate-pro-in">
      {categories.map((category) => {
        const isCollapsed = !!collapsedCategories[category.code];

        return (
          <Card key={category.code} className="bg-slate-950/40 border border-white/10 rounded-2xl overflow-hidden shadow-pro">
            {/* Cabecera de Categoría con Toggle de Colapsado */}
            <div
              onClick={() => setCollapsedCategories(prev => ({
                ...prev,
                [category.code]: !isCollapsed
              }))}
              className="flex items-center justify-between p-4 cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] border-b border-white/5 select-none"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{category.emoji_icon || "📦"}</span>
                <div>
                  <h3 className="font-space-grotesk font-black text-sm uppercase tracking-widest text-foreground">
                    {category.label}
                  </h3>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                    {category.items.length} {category.items.length === 1 ? "Producto" : "Productos"}
                  </p>
                </div>
              </div>
              {isCollapsed ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronUp className="w-5 h-5 text-muted-foreground" />}
            </div>

            {/* Lista de Productos */}
            {!isCollapsed && (
              <CardContent className="p-0 divide-y divide-white/5">
                {category.items.map((product) => (
                  <div key={product.id} className="flex items-center justify-between gap-4 p-4 hover:bg-white/[0.01] transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {product.images && product.images.length > 0 ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg">🍔</span>
                        )}
                      </div>

                      <div className="space-y-0.5 max-w-xl">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                          {product.name}
                        </h4>
                        {product.description && (
                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed line-clamp-2">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-bold text-primary">
                          ${Number(product.price).toLocaleString('es-CO')}
                        </span>
                        <span className={cn(
                          "text-[9px] font-extrabold px-2 py-0.5 rounded-full border tracking-wider font-space-grotesk",
                          (product.available_qty ?? 0) === 0
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : (product.available_qty ?? 0) <= (product.min_qty || 10)
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        )}>
                          Disp: {product.available_qty ?? 0} un.
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">
                          {product.is_public ? "Público" : "Oculto"}
                        </span>
                        <Switch
                          checked={!!product.is_public}
                          onCheckedChange={() => toggleProductVisibility(product.id, !!product.is_public)}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}

      {categories.length === 0 && (
        <div className="text-center py-24 bg-slate-950/20 border border-dashed border-white/5 rounded-2xl">
          <p className="font-caveat text-3xl text-white/40">
            No hay productos activos configurados en esta sucursal.
          </p>
        </div>
      )}
    </div>
  );
}
