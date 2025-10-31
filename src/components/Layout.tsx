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
  Package, ClipboardList, Users as UsersIcon, Store as StoreIcon, Database, Ruler, Cherry, Wine // Import new icons
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/context/BrandingContext";

interface LayoutProps {
  children: ReactNode;
}

// Definir una interfaz para los elementos de navegación
interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  type: "link" | "collapsible";
  children?: NavItem[];
}

// Nueva estructura de navegación con el elemento 'Maestros' como desplegable
const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, type: "link" },
  { name: "POS", href: "/pos", icon: ShoppingCart, type: "link" },
  { name: "Configuración", href: "/settings?tab=branding", icon: Settings, type: "link" },
  {
    name: "Maestros",
    href: "/settings?tab=master-data&subtab=products", // Enlace por defecto para Maestros
    icon: Database,
    type: "collapsible",
    children: [
      { name: "Productos", href: "/settings?tab=master-data&subtab=products", icon: Package, type: "link" },
      { name: "Inventario", href: "/settings?tab=master-data&subtab=inventory", icon: ClipboardList, type: "link" },
      { name: "Usuarios", href: "/settings?tab=master-data&subtab=users", icon: UsersIcon, type: "link" },
      { name: "Tiendas", href: "/settings?tab=master-data&subtab=stores", icon: StoreIcon, type: "link" },
      { name: "Tamaños", href: "/settings?tab=master-data&subtab=sizes", icon: Ruler, type: "link" }, // New sub-item
      { name: "Toppings", href: "/settings?tab=master-data&subtab=toppings", icon: Cherry, type: "link" }, // New sub-item
      { name: "Sachets", href: "/settings?tab=master-data&subtab=sachets", icon: Wine, type: "link" }, // New sub-item
    ],
  },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isMobile = useIsMobile(); // true if < 768px
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile); // Default to open on desktop, closed on mobile
  const { logoUrl, isLoadingBranding } = useBranding();
  const [openCollapsible, setOpenCollapsible] = useState<string | null>(null); // Estado para el elemento desplegable abierto

  // Helper para verificar si un enlace está activo, considerando los parámetros de consulta
  const isLinkActive = (href: string) => {
    const currentPath = location.pathname;
    const currentSearch = location.search;

    const targetUrl = new URL(href, window.location.origin);
    const targetPath = targetUrl.pathname;
    const targetSearch = targetUrl.search;

    if (currentPath !== targetPath) {
      return false;
    }

    // Si el destino no tiene parámetros de búsqueda, es activo si la ruta coincide
    if (!targetSearch) {
      return true;
    }

    // Si el destino tiene parámetros de búsqueda, verificar si los parámetros actuales contienen todos los del destino
    const currentSearchParams = new URLSearchParams(currentSearch);
    const targetSearchParams = new URLSearchParams(targetSearch);

    for (const [key, value] of targetSearchParams.entries()) {
      if (currentSearchParams.get(key) !== value) {
        return false;
      }
    }
    return true;
  };

  // Helper para verificar si un elemento desplegable debe estar abierto por defecto (es decir, si alguno de sus hijos está activo)
  const isCollapsibleOpenByDefault = (item: NavItem) => {
    if (!item.children) return false;
    return item.children.some(child => isLinkActive(child.href));
  };

  // Efecto para gestionar el estado abierto/cerrado del sidebar basado en el tamaño de la pantalla
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  // Efecto para gestionar el estado abierto/cerrado de los menús desplegables basado en la ruta activa
  useEffect(() => {
    const activeParent = navigation.find(item => item.type === "collapsible" && isCollapsibleOpenByDefault(item));
    if (activeParent) {
      setOpenCollapsible(activeParent.name);
    } else {
      setOpenCollapsible(null);
    }
  }, [location.pathname, location.search]); // Solo depende de los cambios de ubicación

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
    } else {
      window.location.href = "/auth";
    }
  };

  const handleCollapsibleToggle = (itemName: string) => {
    setOpenCollapsible(prev => (prev === itemName ? null : itemName));
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Botón para abrir/cerrar el sidebar, ahora visible en todas las pantallas */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-[60] bg-card/80 backdrop-blur-sm border border-border/50 shadow-md"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

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
              <p className="text-xs text-sidebar-foreground/50 font-medium">Granizados</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-5 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = isLinkActive(item.href);
            const isOpen = openCollapsible === item.name;

            if (item.type === "link") {
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 text-sm font-medium relative overflow-hidden",
                    isActive
                      ? "bg-gradient-to-r from-primary/20 to-primary/10 text-sidebar-foreground shadow-card border border-primary/30"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 hover:shadow-md hover:border hover:border-sidebar-border/50"
                  )}
                  onClick={() => isMobile && setIsSidebarOpen(false)}
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
                  <span className="relative z-10">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-glow animate-pulse" />
                  )}
                </Link>
              );
            } else if (item.type === "collapsible" && item.children) {
              const parentIsActive = isActive || isCollapsibleOpenByDefault(item);
              return (
                <div key={item.name}>
                  <button
                    type="button"
                    onClick={() => handleCollapsibleToggle(item.name)}
                    className={cn(
                      "group flex items-center w-full gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 text-sm font-medium relative overflow-hidden",
                      parentIsActive
                        ? "bg-gradient-to-r from-primary/20 to-primary/10 text-sidebar-foreground shadow-card border border-primary/30"
                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 hover:shadow-md hover:border hover:border-sidebar-border/50"
                    )}
                  >
                    {parentIsActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent animate-pulse" />
                    )}
                    <item.icon className={cn(
                      "w-5 h-5 transition-all duration-300",
                      parentIsActive
                        ? "text-primary drop-shadow-lg scale-110"
                        : "text-sidebar-foreground/60 group-hover:text-primary group-hover:scale-110"
                    )} />
                    <span className="relative z-10">{item.name}</span>
                    <ChevronDown className={cn(
                      "ml-auto w-4 h-4 transition-transform duration-300",
                      isOpen ? "rotate-180" : "rotate-0",
                      parentIsActive ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-primary"
                    )} />
                  </button>
                  {isOpen && (
                    <div className="ml-6 mt-2 space-y-1">
                      {item.children.map(child => {
                        const childIsActive = isLinkActive(child.href);
                        return (
                          <Link
                            key={child.name}
                            to={child.href}
                            className={cn(
                              "group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 text-sm relative overflow-hidden",
                              childIsActive
                                ? "bg-primary/10 text-primary font-semibold"
                                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                            )}
                            onClick={() => isMobile && setIsSidebarOpen(false)}
                          >
                            {childIsActive && (
                              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent animate-pulse" />
                            )}
                            <child.icon className={cn(
                              "w-4 h-4 transition-all duration-300",
                              childIsActive ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-primary"
                            )} />
                            <span className="relative z-10">{child.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })}
        </nav>

        <div className="p-5 border-t border-sidebar-border/30 bg-sidebar-background/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
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

      {/* Overlay para dispositivos móviles cuando el sidebar está abierto */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className={cn(
        "flex-1 overflow-auto transition-all duration-300 ease-in-out",
        // En pantallas no móviles (escritorio/tablet), si el sidebar está abierto, añade padding
        !isMobile && isSidebarOpen && "pl-64"
      )}>
        {children}
      </main>
    </div>
  );
}