import { Link } from "react-router-dom";
import { Star, ArrowRight } from "lucide-react";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { navConfig } from "@/config/navConfig";
import { cn } from "@/lib/utils";

export function FavoritesWidget() {
  const { favorites, removeFavorite } = useFavoritesStore();

  // Aplanar todos los items del navConfig para poder buscarlos fácilmente
  const allNavItems = navConfig.flatMap(group => {
    const items: any[] = [];
    group.items.forEach(item => {
      if (item.type === 'collapsible' && item.children) {
        items.push(...item.children);
      } else {
        items.push(item);
      }
    });
    return items;
  });

  const favoriteItems = favorites
    .map(href => allNavItems.find(item => item.href === href))
    .filter(Boolean); // Filtrar rutas que ya no existan

  if (favoriteItems.length === 0) {
    return (
      <div className="bg-surface-subtle border border-border/50 rounded-2xl p-6 text-center">
        <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <h3 className="text-foreground font-bold font-dm-sans mb-1">Sin Módulos Favoritos</h3>
        <p className="text-sm text-muted-foreground">
          Usa el ícono de estrella en el menú lateral para anclar aquí tus módulos más usados.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border/50 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-amber-500 fill-amber-500/20" />
        <h2 className="text-lg font-black font-dm-sans text-foreground">Módulos Favoritos</h2>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {favoriteItems.map((item, idx) => {
          if (!item) return null;
          const Icon = item.icon;
          return (
            <Link 
              key={idx}
              to={item.href}
              className="group relative flex flex-col items-center justify-center p-4 bg-surface-subtle hover:bg-surface-active border border-border/50 hover:border-primary/40 rounded-xl transition-all duration-200 hover:shadow-glow active:scale-95"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold font-dm-sans text-foreground text-center truncate w-full px-1">
                {item.label}
              </span>
              
              <button
                onClick={(e) => {
                  e.preventDefault();
                  removeFavorite(item.href);
                }}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-rose-500"
                title="Quitar de favoritos"
              >
                <Star className="w-3 h-3 fill-current" />
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
