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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/context/BrandingContext"; // Import useBranding

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "POS", href: "/pos", icon: ShoppingCart },
  { name: "Configuración", href: "/settings", icon: Settings },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { logoUrl, isLoadingBranding } = useBranding(); // Use branding context

  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
    } else {
      window.location.href = "/auth";
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-[60] lg:hidden bg-card/80 backdrop-blur-sm border border-border/50 shadow-md"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      )}

      <aside
        className={cn(
          "w-64 bg-gradient-to-b from-sidebar-background to-sidebar-background/95 border-r border-sidebar-border/50 flex flex-col shadow-elevated backdrop-blur-sm",
          "lg:relative lg:translate-x-0",
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 border-b border-sidebar-border/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl gradient-hero flex items-center justify-center shadow-glow transition-smooth hover:scale-105">
              {isLoadingBranding ? (
                <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
              ) : logoUrl ? (
                <img src={logoUrl} alt="Business Logo" className="max-w-[80%] max-h-[80%] object-contain" />
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
            const isActive = location.pathname === item.href;
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

      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}