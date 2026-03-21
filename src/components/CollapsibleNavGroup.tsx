import React from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCollapsible } from "@/hooks/useCollapsible";
import { NavItem } from "@/types/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CollapsibleNavGroupProps {
  label: string;
  icon: any;
  items: NavItem[];
  activeTurn?: any;
  isMobile?: boolean;
  onNavigate?: () => void;
  isLinkActive: (href: string) => boolean;
  isLocked?: (href: string) => boolean;
  defaultOpen?: boolean;
  storageKey?: string;
  badgeContent?: React.ReactNode;
}

export function CollapsibleNavGroup({
  label,
  icon: Icon,
  items,
  activeTurn,
  isMobile,
  onNavigate,
  isLinkActive,
  defaultOpen = false,
  storageKey,
  badgeContent
}: CollapsibleNavGroupProps) {
  const { isOpen, toggle } = useCollapsible(
    storageKey || `collapsible_${label.toLowerCase()}`,
    defaultOpen
  );

  const parentIsActive = items.some(item => isLinkActive(item.href));

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "group flex items-center w-full gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium relative overflow-hidden",
          parentIsActive
            ? "bg-gradient-to-r from-primary/20 to-primary/10 text-sidebar-foreground shadow-card border border-primary/30"
            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 hover:shadow-md hover:border hover:border-sidebar-border/50"
        )}
      >
        {parentIsActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent animate-pulse" />
        )}
        <Icon className={cn(
          "w-5 h-5 transition-all duration-300",
          parentIsActive
            ? "text-primary drop-shadow-lg scale-110"
            : "text-sidebar-foreground/60 group-hover:text-primary group-hover:scale-110"
        )} />
        <span className="relative z-10">{label}</span>
        
        <div className="ml-auto flex items-center gap-2">
          {badgeContent && !isOpen && (
            <div className="flex items-center">
              {badgeContent}
            </div>
          )}
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform duration-300",
            isOpen ? "rotate-180" : "rotate-0",
            parentIsActive ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-primary"
          )} />
        </div>
      </button>

      <div 
        className={cn(
          "ml-6 space-y-1 overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-height-collapse opacity-100 mt-2" : "max-height-0 opacity-0"
        )}
        style={{ maxHeight: isOpen ? "500px" : "0px" }}
      >
        {items.map(child => {
          const childIsActive = isLinkActive(child.href);
          const isPOS = child.href === "/pos";
          const isLocked = isPOS && !activeTurn;
          const isInventory = child.label === "Inventario";

          const linkContent = (
            <div
              className={cn(
                "group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 text-sm relative overflow-hidden",
                childIsActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
                isLocked && "opacity-50 cursor-not-allowed grayscale-[0.5]"
              )}
            >
              {childIsActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent animate-pulse" />
              )}
              <child.icon className={cn(
                "w-4 h-4 transition-all duration-300",
                childIsActive ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-primary"
              )} />
              <span className="relative z-10">{child.label}</span>
              
              {isInventory && badgeContent && (
                <div className="ml-auto">
                   {badgeContent}
                </div>
              )}

              {isLocked && (
                <Shield className="ml-auto w-4 h-4 text-rose-500/50" />
              )}
            </div>
          );

          if (isLocked) {
            return (
              <Tooltip key={child.label} delayDuration={0}>
                <TooltipTrigger asChild>
                  {linkContent}
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-rose-950 border-rose-500/30 text-rose-200 text-[10px] font-bold uppercase tracking-wider">
                  Abre un turno para vender
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Link
              key={child.label}
              to={child.href}
              className="block"
              onClick={() => isMobile && onNavigate?.()}
            >
              {linkContent}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
