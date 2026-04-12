import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
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

interface LayoutProps {
  children: React.ReactNode;
}

import { navConfig } from "@/config/navConfig";
import { NavItem, NavGroup, Role } from "@/types/navigation";
import { useCurrentRole } from "@/hooks/useCurrentRole";
import { CollapsibleNavGroup } from "./CollapsibleNavGroup";
import { useLowStockCount } from "@/hooks/useLowStockCount";
import { Badge } from "@/components/ui/badge";

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const { logoUrl, isLoadingBranding } = useBranding();
  const { userRole, isLoading: isLoadingAuth } = useAuth();
  const { role: currentRole, isLoading: isLoadingRole } = useCurrentRole();
  const { activeTurn, isLoading: isLoadingTurn } = useTurn();
  const lowStockCount = useLowStockCount();
  const { showCriticalBanner, hideCriticalBanner } = useAlerts();

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

  // Usamos el rol de AuthContext preferentemente, o el del hook si no está disponible
  const effectiveRole = (userRole as Role) || currentRole;

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
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
    } else {
      window.location.href = "/auth";
    }
  };

  const visibleGroups = navConfig.filter(group => {
    if (isLoadingAuth || !effectiveRole) return false;
    return group.roles.includes(effectiveRole);
  }).map(group => ({
    ...group,
    items: group.items.filter(item => item.roles.includes(effectiveRole))
  })).filter(group => group.items.length > 0);

  return (
    <div className="flex h-screen bg-background">
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-[60] bg-card/80 backdrop-blur-sm border border-border/50 shadow-md"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Top Right Actions Area */}
      <div className="fixed top-4 right-4 z-[60] flex items-center gap-2 p-2 bg-card/70 backdrop-blur-lg border border-border/40 rounded-2xl shadow-elevated animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-3 px-3 py-1.5 border-r border-border/30 mr-1 hidden sm:flex">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/80 leading-none mb-1">
              {isLoadingAuth ? 'Cargando...' : 'Sesión Activa'}
            </span>
            <span className="text-[12px] font-bold text-foreground/80 leading-none">
              {userRole ? userRole.replace('_', ' ') : 'Invitado'}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-black text-sm shadow-inner transition-transform hover:scale-105">
            {userRole?.charAt(0).toUpperCase() || '?'}
          </div>
        </div>
        <div className="flex items-center gap-1 pr-1">
          <NotificationCenter />
        </div>
      </div>

      <aside
        className={cn(
          "w-64 bg-gradient-to-b from-sidebar-background to-sidebar-background/95 border-r border-sidebar-border/50 flex flex-col shadow-elevated backdrop-blur-sm",
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 border-b border-sidebar-border/30">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl gradient-hero flex items-center justify-center shadow-glow transition-smooth hover:scale-105">
              {isLoadingBranding ? (
                <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
              ) : logoUrl ? (
                <img src={logoUrl} alt="Business Logo" className="max-w-full max-h-full object-contain" />
              ) : (
                <IceCream className="w-7 h-7 text-white drop-shadow-lg" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground tracking-tight">Pekao</h1>
              <p className="text-xs text-sidebar-foreground/50 font-medium">Granizados ({userRole || 'sin rol'})</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-5 space-y-6 overflow-y-auto custom-scrollbar">
          {visibleGroups.map((group, groupIdx) => (
            <div key={group.label} className="space-y-3">
              <div className="flex items-center gap-2 px-4 mb-2">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-sidebar-foreground/30">
                  {group.label}
                </span>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-sidebar-border/30 to-transparent" />
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
                          "group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium relative overflow-hidden",
                          isActive
                            ? "bg-gradient-to-r from-primary/20 to-primary/10 text-sidebar-foreground shadow-card border border-primary/30"
                            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 hover:shadow-md hover:border hover:border-sidebar-border/50",
                          isLocked && "opacity-50 cursor-not-allowed grayscale-[0.5]"
                        )}
                      >
                        {isActive && (
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent animate-pulse" />
                        )}
                        <item.icon className={cn(
                          "w-5 h-5 transition-all duration-300",
                          isActive
                            ? "text-primary drop-shadow-lg scale-110"
                            : "text-sidebar-foreground/60 group-hover:text-primary group-hover:scale-110"
                        )} />
                        <span className="relative z-10">{item.label}</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-glow animate-pulse" />
                        )}
                        {isLocked && (
                          <Shield className="ml-auto w-4 h-4 text-rose-500/50" />
                        )}
                      </div>
                    );

                    if (isLocked) {
                      return (
                        <Tooltip key={item.label} delayDuration={0}>
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
                        key={item.label}
                        to={item.href}
                        onClick={() => isMobile && setIsSidebarOpen(false)}
                      >
                        {linkContent}
                      </Link>
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
                        onNavigate={() => setIsSidebarOpen(false)}
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
        </nav>

        <div className="p-5 border-t border-sidebar-border/30 bg-sidebar-background/50 backdrop-blur-sm">
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
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className={cn(
        "flex-1 overflow-auto transition-all duration-300 ease-in-out pt-20",
        !isMobile && isSidebarOpen && "pl-64"
      )}>
        <AlertManager />
        {children}
      </main>
    </div>
  );
}