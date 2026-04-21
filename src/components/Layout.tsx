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
import { InteractiveCursor } from "./ui/InteractiveCursor";

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
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Top Right Actions Area */}
      <div className="fixed top-4 right-4 z-[60] flex items-center gap-2 p-2 glass-pro rounded-2xl shadow-pro animate-pro-in">
        <div className="flex items-center gap-3 px-3 py-1.5 border-r border-border/50 mr-1 hidden sm:flex">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/80 leading-none mb-1 font-space-grotesk">
              {isLoadingAuth ? 'Cargando...' : 'Sesión Activa'}
            </span>
            <span className="text-[12px] font-bold text-foreground/80 leading-none">
              {userRole ? userRole.replace('_', ' ') : 'Invitado'}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-black text-sm shadow-inner transition-transform hover:scale-105 border border-primary/20">
            {userRole?.charAt(0).toUpperCase() || '?'}
          </div>
        </div>
        <div className="flex items-center gap-1 pr-1">
          <NotificationCenter />
        </div>
      </div>

      <aside
        className={cn(
          "w-64 glass-pro border-r border-border/50 flex flex-col shadow-pro",
          "fixed inset-y-0 left-0 z-50 transition-all duration-500 [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)]",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 border-b border-border/50 bg-muted/30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl gradient-hero flex items-center justify-center shadow-glow-pro transition-smooth hover:rotate-3 hover:scale-110">
              {isLoadingBranding ? (
                <div className="animate-spin w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full" />
              ) : logoUrl ? (
                <img src={logoUrl} alt="Business Logo" className="max-w-full max-h-full object-contain p-2" />
              ) : (
                <IceCream className="w-7 h-7 text-primary-foreground drop-shadow-xl" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-black text-sidebar-foreground tracking-tighter font-space-grotesk italic">PEKAO</h1>
              <p className="text-[10px] text-primary font-black uppercase tracking-widest opacity-80">PRO MAX SYSTEM</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-5 space-y-6 overflow-y-auto custom-scrollbar">
          {visibleGroups.map((group, groupIdx) => (
            <div key={group.label} className="space-y-3">
              <div className="flex items-center gap-2 px-4 mb-2">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60 font-space-grotesk">
                  {group.label}
                </span>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
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
                          "group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 text-sm font-bold relative overflow-hidden font-dm-sans",
                            isActive
                            ? "bg-primary text-primary-foreground shadow-glow-pro border border-primary/50 translate-x-1"
                            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-muted/50 hover:translate-x-1",
                          isLocked && "opacity-40 cursor-not-allowed grayscale"
                        )}
                      >
                        {isActive && (
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent animate-pulse" />
                        )}
                        <item.icon className={cn(
                          "w-5 h-5 transition-all duration-300",
                          isActive
                            ? "text-primary-foreground drop-shadow-lg scale-110"
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
                          <TooltipContent side="right" className="bg-primary border-primary/30 text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
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
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className={cn(
        "flex-1 overflow-auto transition-all duration-700 [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] pt-16 md:pt-20 relative z-10",
        !isMobile && isSidebarOpen && "pl-64"
      )}>
        <div className="animate-pro-in p-4 md:p-8 perspective-1000">
            <AlertManager />
            {children}
        </div>
      </main>
    </div>
  );
}