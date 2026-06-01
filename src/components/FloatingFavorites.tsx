import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { navConfig } from "@/config/navConfig";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface FloatingFavoritesProps {
  isSidebarOpen: boolean;
}

export function FloatingFavorites({ isSidebarOpen }: FloatingFavoritesProps) {
  const { favorites } = useFavoritesStore();

  const allNavItems = navConfig.flatMap(group => {
    const items: { href?: string; icon?: React.ElementType; label?: string; type?: string; children?: unknown[] }[] = [];
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
    .filter(Boolean);

  if (favoriteItems.length === 0) return null;

  return (
    <div 
      className={cn(
        "fixed top-4 z-[60] flex items-center gap-1.5 p-1.5 bg-card/80 backdrop-blur-2xl border border-border/50 rounded-2xl animate-pro-in transition-all duration-500 shadow-md",
        "left-1/2 -translate-x-1/2 hidden md:flex" // Top center, hidden on mobile
      )}
    >
      <div className="flex items-center justify-center px-2 mr-1 border-r border-border/50">
        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
      </div>
      
      {favoriteItems.map((item, idx) => {
        if (!item) return null;
        const Icon = item.icon;
        
        return (
          <Tooltip key={idx} delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                to={item.href}
                className="group relative flex items-center justify-center w-10 h-10 bg-transparent hover:bg-primary/10 border border-transparent hover:border-primary/20 rounded-xl transition-all duration-200 active:scale-95"
              >
                <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px] font-bold uppercase tracking-wider bg-card border-border/50">
              {item.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
