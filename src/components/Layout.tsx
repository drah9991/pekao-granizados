import { ReactNode, useState, useEffect, Suspense, useMemo, useTransition } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Settings,
  LogOut,
  IceCream,
  Menu,
  X,
  ChevronDown,
  Minus,
  Plus,
  Package, ClipboardList, Users as UsersIcon, Store as StoreIcon, Database, Ruler, ReceiptText, FileText, Activity, Calculator,
  Palette, Shield, Building2, Receipt, Tag, Megaphone, Bell, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/context/BrandingContext";
import { useAuth } from "@/context/AuthContext";
import { useTurn } from "@/hooks/useTurn";
import { TurnStatusChip } from "@/components/TurnStatusChip";
import NotificationCenter from "@/components/pos/NotificationCenter";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertManager } from "./alerts/AlertManager";
import { useAlerts } from "@/hooks/useAlerts";
import { useRealtimeAlerts } from "@/hooks/useRealtimeAlerts";
import { TankLevelsList } from "@/components/pos/TankLevelIndicator";

interface LayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

import { navConfig } from "@/config/navConfig";
import { CollapsibleNavGroup } from "./CollapsibleNavGroup";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { Star } from "lucide-react";
import { FloatingFavorites } from "./FloatingFavorites";
import { useLowStockCount } from "@/hooks/useLowStockCount";
import { Badge } from "@/components/ui/badge";
import { InteractiveCursor } from "./ui/InteractiveCursor";
import { BoneyardSkeleton } from "./ui/BoneyardSkeleton";

export default function Layout({ children, fullWidth = false }: LayoutProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpenInternal] = useState(!isMobile);
  const { favorites, toggleFavorite, isFavorite } = useFavoritesStore();
  const [isSidebarPending, startSidebarTransition] = useTransition();

  const toggleSidebar = () => {
    startSidebarTransition(() => {
      setIsSidebarOpenInternal(prev => !prev);
    });
  };

  const allNavItems = navConfig.flatMap(group => {
    const items: { href?: string; icon?: React.ElementType; label?: string; type?: string; children?: { href?: string; icon?: React.ElementType; label?: string }[] }[] = [];
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

  const closeSidebar = () => {
    startSidebarTransition(() => {
      setIsSidebarOpenInternal(false);
    });
  };

  const navigate = useNavigate();
  const [isNavigating, startNavigationTransition] = useTransition();

  const { logoUrl, isLoadingBranding } = useBranding();

  const optimizedLogoUrl = useMemo(() => {
    if (!logoUrl) return null;
    try {
      if (logoUrl.includes('/storage/v1/object/public/')) {
        const url = new URL(logoUrl);
        url.searchParams.set('width', '150');
        url.searchParams.set('format', 'webp');
        url.searchParams.set('quality', '80');
        return url.toString();
      }
    } catch (e) {
      return logoUrl;
    }
    return logoUrl;
  }, [logoUrl]);

  const { userRole, isLoading: isLoadingAuth } = useAuth();
  const { activeTurn, isLoading: isLoadingTurn } = useTurn();
  const lowStockCount = useLowStockCount();
  const { showCriticalBanner, hideCriticalBanner } = useAlerts();

  const [uiScale, setUiScale] = useState(() => {
    const saved = localStorage.getItem('pekao_ui_scale_v4');
    return saved ? parseInt(saved, 10) : 100;
  });

  useEffect(() => {
    localStorage.setItem('pekao_ui_scale_v4', uiScale.toString());
  }, [uiScale]);

  // Initialize Realtime listeners
  useRealtimeAlerts();

  // Handle automatic Critical Banner for Turn Status
  useEffect(() => {
    if (!isLoadingTurn && !activeTurn && location.pathname === '/pos') {
      showCriticalBanner(
        "Punto de Venta Bloqueado: No hay un turno activo para procesar ventas.",
        "Iniciar Turno Ahora",
        () => {
           const sidebarTurnBtn = document.querySelector('[href="/pos"]') as HTMLElement;
           sidebarTurnBtn?.click();
        }
      );
    } else {
      hideCriticalBanner();
    }
  }, [activeTurn, isLoadingTurn, location.pathname, showCriticalBanner, hideCriticalBanner]);

  const effectiveRole = userRole as Role | null;

  const isLinkActive = (href: string) => {
    if (href === "#") return false;
    const currentPath = location.pathname;
    const currentSearch = location.search;

    try {
      const targetUrl = new URL(href, window.location.origin);
      const targetPath = targetUrl.pathname;
      const targetSearch = targetUrl.search;

      if (currentPath !== targetPath) {
        return false;
      }

      if (!targetSearch) {
        return true;
      }

      const currentSearchParams = new URLSearchParams(currentSearch);
      const targetSearchParams = new URLSearchParams(targetSearch);

      for (const [key, value] of targetSearchParams.entries()) {
        if (currentSearchParams.get(key) !== value) {
          return false;
        }
      }
      return true;
    } catch (e) {
      return location.pathname === href;
    }
  };

  useEffect(() => {
    setIsSidebarOpenInternal(!isMobile);
  }, [isMobile]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
    } else {
      window.location.href = "/auth";
    }
  };

  const visibleGroups = useMemo(() => {
    if (isLoadingAuth || !effectiveRole) return [];
    return navConfig.filter(group => {
      return group.roles.includes(effectiveRole);
    }).map(group => ({
      ...group,
      items: group.items.filter(item => item.roles.includes(effectiveRole))
    })).filter(group => group.items.length > 0);
  }, [isLoadingAuth, effectiveRole]);

  const getMoodClass = () => {
    const path = location.pathname;
    if (path.startsWith('/pos')) return 'mood-pos';
    if (path.startsWith('/reports') || path.startsWith('/sales') || path.startsWith('/invoices')) return 'mood-reports';
    if (path.startsWith('/settings') || path.startsWith('/preparation')) return 'mood-settings';
    return '';
  };

  const moodClass = getMoodClass();

  return (
    <div className={cn(
      "flex h-screen bg-background bg-aurora animate-aurora relative overflow-hidden transition-colors duration-1000",
      moodClass
    )}>
      <InteractiveCursor />
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-[60] bg-card/80 backdrop-blur-sm border border-border/50 shadow-md"
        onClick={toggleSidebar}
        aria-label={isSidebarOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
      >
        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Floating Control Center (Top Left) */}
      <div className={cn(
        "fixed top-4 z-[60] flex items-center gap-2 p-1.5 bg-card/80 backdrop-blur-2xl border border-border/50 rounded-2xl animate-pro-in transition-all duration-500",
        isSidebarOpen ? "left-[17rem]" : "left-16"
      )}>
        <div className="flex items-center gap-3 px-3 py-1 border-r border-border/50 mr-1 hidden sm:flex">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/10">
            {userRole?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-bold uppercase tracking-widest text-primary/80 leading-none mb-0.5 font-dm-sans">
              {isLoadingAuth ? '...' : 'Online'}
            </span>
            <span className="text-[11px] font-bold text-foreground leading-none font-dm-sans">
              {userRole ? userRole.replace('_', ' ') : 'Guest'}
            </span>
          </div>
        </div>
        <div className="flex items-center px-1 gap-1 border-r border-white/5 pr-2 mr-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/60 hover:text-foreground hover:bg-muted rounded-lg" onClick={() => setUiScale(s => Math.max(50, s - 10))} aria-label="Disminuir escala de interfaz">
            <Minus className="w-3 h-3" />
          </Button>
          <span className="text-[10px] font-black w-8 text-center tracking-tighter">{uiScale}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/60 hover:text-foreground hover:bg-muted rounded-lg" onClick={() => setUiScale(s => Math.min(200, s + 10))} aria-label="Aumentar escala de interfaz">
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        <div className="flex items-center px-1">
          <NotificationCenter />
        </div>
      </div>

      <FloatingFavorites isSidebarOpen={isSidebarOpen} />

      <aside
        className={cn(
          "w-64 fixed inset-y-0 left-0 z-50 bg-sidebar-background/60 backdrop-blur-3xl border-r border-sidebar-border flex flex-col transition-all duration-500",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-8 border-b border-sidebar-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-glow transition-all hover:scale-105">
              {isLoadingBranding ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : optimizedLogoUrl ? (
                <img 
                  src={optimizedLogoUrl} 
                  alt="Logo" 
                  className="max-w-full max-h-full object-contain p-2" 
                  loading="eager"
                  fetchPriority="high"
                />
              ) : (
                <IceCream className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <span className="text-lg font-extrabold text-foreground tracking-tight font-dm-sans block">PEKAO</span>
              <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Business Pro</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar">
          {visibleGroups.map((group, groupIdx) => (
            <div key={group.label} className="space-y-4">
              <div className="px-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30 font-dm-sans">
                  {group.label}
                </span>
              </div>
              
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = isLinkActive(item.href);

                  if (!item.type || item.type === "link") {
                    const isPOS = item.href === "/pos";
                    const isLocked = isPOS && !activeTurn;
                    
                    const linkContent = (
                      <div
                        className={cn(
                          "group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-semibold relative overflow-hidden font-dm-sans",
                            isActive
                            ? "text-primary bg-primary/10"
                            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60",
                          isLocked && "opacity-30 cursor-not-allowed"
                        )}
                      >
                        {isActive && (
                          <motion.div 
                            layoutId="sidebar-active-indicator"
                            className="absolute left-0 w-1 h-5 bg-primary rounded-r-full"
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                          />
                        )}
                        <item.icon className={cn(
                          "w-4 h-4 transition-all duration-300 relative z-10",
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground/40 group-hover:text-primary"
                        )} />
                        <span className="relative z-10 flex-1">{item.label}</span>
                        {isLocked && (
                          <Shield className="ml-auto w-3.5 h-3.5 text-rose-500/30" />
                        )}
                        {!isLocked && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(item.href);
                            }}
                            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            title={isFavorite(item.href) ? "Quitar de favoritos" : "Añadir a favoritos"}
                          >
                            <Star 
                              className={cn(
                                "w-4 h-4 transition-all duration-300",
                                isFavorite(item.href) 
                                  ? "text-amber-500 fill-amber-500 opacity-100" 
                                  : "text-muted-foreground hover:text-amber-500"
                              )} 
                            />
                          </button>
                        )}
                      </div>
                    );

                    if (isLocked) {
                      return (
                        <Tooltip key={item.label} delayDuration={0}>
                          <TooltipTrigger asChild>
                            {linkContent}
                          </TooltipTrigger>
                          <TooltipContent side="right" className="bg-primary border-primary/30 text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                            Abre un turno para vender
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return (
                      <div
                        key={item.label}
                        className="cursor-pointer"
                        onClick={() => {
                          if (isMobile) closeSidebar();
                          startNavigationTransition(() => {
                            navigate(item.href);
                          });
                        }}
                      >
                        {linkContent}
                      </div>
                    );
                  } else if (item.type === "collapsible" && item.children) {
                    const isMaestros = item.label === "Maestros";
                    const isConfig = item.label === "Configuración";
                    const defaultOpen = effectiveRole === "admin" || effectiveRole === "owner";
                    const storageKey = isMaestros ? "sidebar_maestros_open" : isConfig ? "sidebar_config_open" : undefined;

                    return (
                      <CollapsibleNavGroup
                        key={item.label}
                        label={item.label}
                        icon={item.icon}
                        items={item.children}
                        activeTurn={activeTurn}
                        isMobile={isMobile}
                        onNavigate={closeSidebar}
                        isLinkActive={isLinkActive}
                        defaultOpen={defaultOpen}
                        storageKey={storageKey}
                        badgeContent={isMaestros && lowStockCount > 0 ? (
                          <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600 text-[10px] py-0 px-1.5 h-4 min-w-4 flex items-center justify-center animate-pulse border-none">
                            {lowStockCount} bajo
                          </Badge>
                        ) : null}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}
          <div className="pt-2">
            <TankLevelsList />
          </div>
        </nav>

        <div className="p-5 border-t border-border/30 bg-muted/40 backdrop-blur-sm">
          <TurnStatusChip />
          <div className="flex items-center justify-between mb-3 mt-2">
            <span className="text-sm font-medium text-sidebar-foreground/60">Modo Oscuro</span>
            <ThemeToggle />
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-300 rounded-xl py-3 group"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3 transition-transform duration-300 group-hover:scale-110 group-hover:text-destructive" />
            <span>Cerrar Sesión</span>
          </Button>
        </div>
      </aside>

      {isMobile && isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
            onClick={closeSidebar}
          />
        )}

      <main className={cn(
        "flex-1 min-h-0 flex flex-col transition-all duration-700 [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] pt-16 md:pt-20 relative z-10 h-full",
        !isMobile && isSidebarOpen && "pl-64"
      )}>
        <div className={cn(
          "animate-pro-in perspective-1000 flex-1 min-h-0 flex flex-col overflow-x-hidden",
          fullWidth ? "p-0 overflow-hidden h-full" : "p-4 md:p-8 overflow-y-auto"
        )} style={{ zoom: `${uiScale * 0.8}%` } as React.CSSProperties}>
            <AlertManager />
            {children}
        </div>
      </main>
    </div>
  );
}