import { ReactNode, useState, useEffect, Suspense, useMemo, useTransition } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Minus,
  Plus,
  Package, ClipboardList, Users as UsersIcon, Store as StoreIcon, Database, Ruler, ReceiptText, FileText, Activity, Calculator,
  Palette, Shield, Building2, Receipt, Tag, Megaphone, Bell, BarChart3, Download, Menu, X, Coins, Gift, Eye, RefreshCw, Bike, Percent, Users, Truck, MonitorPlay
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/context/BrandingContext";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useTurn } from "@/hooks/useTurn";
import { SidebarHeader } from "./SidebarHeader";
import { ActiveShiftCard } from "./ActiveShiftCard";
import NotificationCenter from "@/components/pos/NotificationCenter";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertManager } from "./alerts/AlertManager";
import { useAlerts } from "@/hooks/useAlerts";
import { useRealtimeAlerts } from "@/hooks/useRealtimeAlerts";
import { TankLevelsList } from "@/components/pos/TankLevelIndicator";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { useLowStockCount } from "@/hooks/useLowStockCount";
import { Badge } from "@/components/ui/badge";
import { InteractiveCursor } from "./ui/InteractiveCursor";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import ErrorBoundary from "@/components/ErrorBoundary";

interface LayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export default function Layout({ children, fullWidth = false }: LayoutProps) {
  const { isInstallable, installApp } = usePWAInstall();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { favorites, toggleFavorite, isFavorite } = useFavoritesStore();
  const { logoUrl } = useBranding();
  const navigate = useNavigate();

  const { storeId, storeName, switchStore, userRole, isLoading: isLoadingAuth } = useAuth();
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [isSwitchingNode, setIsSwitchingNode] = useState(false);
  const canSwitchStore = userRole === "admin" || userRole === "manager" || userRole === "owner";

  const { activeTurn, isLoading: isLoadingTurn } = useTurn();
  const lowStockCount = useLowStockCount();
  const { showCriticalBanner, hideCriticalBanner } = useAlerts();

  const [uiScale, setUiScale] = useState(() => {
    const saved = localStorage.getItem('oasis_ui_scale_v4');
    return saved ? parseInt(saved, 10) : 100;
  });

  useEffect(() => {
    localStorage.setItem('oasis_ui_scale_v4', uiScale.toString());
  }, [uiScale]);

  // Realtime listeners
  useRealtimeAlerts();

  // Load stores list for switcher
  useEffect(() => {
    if (canSwitchStore) {
      supabase
        .from("stores")
        .select("id, name")
        .order("name")
        .then(({ data }) => {
          if (data) setStores(data);
        });
    }
  }, [userRole, canSwitchStore]);

  // Turn status gating for POS
  useEffect(() => {
    if (!isLoadingTurn && !activeTurn && location.pathname === '/pos') {
      showCriticalBanner(
        "Punto de Venta Bloqueado: No hay un turno activo para procesar ventas.",
        "Iniciar Turno Ahora",
        () => {
           navigate('/cash-register');
        }
      );
    } else {
      hideCriticalBanner();
    }
  }, [activeTurn, isLoadingTurn, location.pathname, showCriticalBanner, hideCriticalBanner]);

  const handleQuickSwitch = async (newStoreId: string) => {
    if (newStoreId === storeId || isSwitchingNode) return;
    setIsSwitchingNode(true);
    try {
      const switchPromise = switchStore(newStoreId);
      toast.promise(switchPromise, {
        loading: "Reconectando nodo...",
        success: "Nodo conmutado exitosamente",
        error: "Error al reconectar nodo",
      });
      await switchPromise;
    } catch (e) {
      console.error(e);
    } finally {
      setIsSwitchingNode(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
    } else {
      window.location.href = "/auth";
    }
  };

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

  return (
    <div className="flex flex-col h-screen bg-[#F8F9FA] dark:bg-slate-950 text-slate-800 dark:text-slate-100 relative overflow-hidden font-sans">
      <InteractiveCursor />
      
      {/* 1. HEADER / NAVBAR SUPERIOR (HORIZONTAL EN DESKTOP) */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 z-[60] px-4 md:px-8 flex items-center justify-between shadow-sm select-none">
        
        {/* Lado Izquierdo: Logo */}
        <div className="flex items-center gap-4">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="mr-2"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          )}

          <Link to="/dashboard" className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-9 object-contain" />
            ) : (
              <div className="flex items-center gap-1.5 font-space-grotesk font-black text-sm uppercase italic tracking-tighter">
                <span className="text-rose-600 font-extrabold">loggro</span>
                <span className="text-slate-400 font-medium">restobar</span>
              </div>
            )}
          </Link>
        </div>

        {/* Centro: Navegación Horizontal (Solo en Desktop) */}
        {!isMobile && (
          <nav className="flex items-center gap-1 md:gap-2">
            
            {/* Dashboard */}
            <Link
              to="/dashboard"
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all",
                isLinkActive("/dashboard") 
                  ? "bg-rose-50 text-rose-600" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>

            {/* Vender (POS) */}
            <Link
              to="/pos"
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all",
                isLinkActive("/pos") 
                  ? "bg-rose-50 text-rose-600" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              )}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Vender</span>
            </Link>

            {/* Ventas */}
            <Link
              to="/sales"
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all",
                isLinkActive("/sales") 
                  ? "bg-rose-50 text-rose-600" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              )}
            >
              <ReceiptText className="w-4 h-4" />
              <span>Ventas</span>
            </Link>

            {/* PRODUCTOS & CATEGORÍAS DROPDOWN (Captura 1 del paso anterior) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all outline-none cursor-pointer",
                    location.pathname.startsWith("/products") || location.pathname.includes("tab=categories") || location.pathname.startsWith("/recipes") || location.pathname.startsWith("/inventory") || location.pathname.startsWith("/suppliers")
                      ? "bg-rose-50 text-rose-600" 
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                  )}
                >
                  <Tag className="w-4 h-4" />
                  <span>Productos</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-1.5 rounded-xl shadow-lg mt-1 space-y-0.5">
                
                {/* Categorías */}
                <DropdownMenuItem onClick={() => navigate("/settings?tab=categories")} className="flex items-center gap-2 rounded-lg py-2.5 px-3 text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5">
                  <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Categorías</span>
                </DropdownMenuItem>

                {/* Productos */}
                <DropdownMenuItem onClick={() => navigate("/products")} className="flex items-center gap-2 rounded-lg py-2.5 px-3 text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5">
                  <Package className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Productos</span>
                </DropdownMenuItem>

                {/* Promociones */}
                <DropdownMenuItem onClick={() => navigate("/marketing")} className="flex items-center gap-2 rounded-lg py-2.5 px-3 text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5">
                  <Megaphone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Promociones</span>
                </DropdownMenuItem>

                {/* Submenú: Inventario */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center gap-2 rounded-lg py-2.5 px-3 text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5">
                    <Database className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Inventario</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-1 rounded-lg shadow-md ml-1 space-y-0.5">
                    
                    <DropdownMenuItem onClick={() => navigate("/inventory")} className="text-xs font-bold py-2 px-2.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                      Movimiento Inventario
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => navigate("/movements")} className="text-xs font-bold py-2 px-2.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                      Historial de Inventario
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => navigate("/recipes")} className="text-xs font-bold py-2 px-2.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                      Listado de Recetas
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => navigate("/catalog/inventory/suppliers")} className="text-xs font-bold py-2 px-2.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                      Proveedores
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => navigate("/preparation")} className="text-xs font-bold py-2 px-2.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                      Ingredientes
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => navigate("/catalog/inventory/units")} className="text-xs font-bold py-2 px-2.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                      Unidades
                    </DropdownMenuItem>

                  </DropdownMenuSubContent>
                </DropdownMenuSub>

              </DropdownMenuContent>
            </DropdownMenu>

            {/* Menú Digital */}
            <Link
              to="/digital-menu"
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all",
                isLinkActive("/digital-menu") 
                  ? "bg-rose-50 text-rose-600" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              )}
            >
              <MonitorPlay className="w-4 h-4" />
              <span>Menú Digital</span>
            </Link>

            {/* CONTABILIDAD DROPDOWN (Captura 1) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all outline-none cursor-pointer",
                    location.pathname.startsWith("/expenses") || location.pathname.startsWith("/cash-register") || location.pathname.startsWith("/customers")
                      ? "bg-rose-50 text-rose-600" 
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                  )}
                >
                  <Coins className="w-4 h-4" />
                  <span>Contabilidad</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-1.5 rounded-xl shadow-lg mt-1 space-y-0.5">
                
                {/* Gastos */}
                <DropdownMenuItem onClick={() => navigate("/expenses")} className="flex items-center gap-2 rounded-lg py-2.5 px-3 text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5">
                  <Coins className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Gastos</span>
                </DropdownMenuItem>

                {/* Tipos de gasto */}
                <DropdownMenuItem onClick={() => navigate("/expenses")} className="flex items-center gap-2 rounded-lg py-2.5 px-3 text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5">
                  <Settings className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Tipos de gasto</span>
                </DropdownMenuItem>

                {/* Impuestos */}
                <DropdownMenuItem onClick={() => navigate("/settings?tab=business")} className="flex items-center gap-2 rounded-lg py-2.5 px-3 text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5">
                  <Percent className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Impuestos</span>
                </DropdownMenuItem>

                {/* Clientes */}
                <DropdownMenuItem onClick={() => navigate("/customers")} className="flex items-center gap-2 rounded-lg py-2.5 px-3 text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5">
                  <Users className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Clientes</span>
                </DropdownMenuItem>

                {/* Créditos a Clientes */}
                <DropdownMenuItem onClick={() => navigate("/customers")} className="flex items-center gap-2 rounded-lg py-2.5 px-3 text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Créditos a Clientes</span>
                </DropdownMenuItem>

                {/* Submenú: Informes */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center gap-2 rounded-lg py-2.5 px-3 text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5">
                    <BarChart3 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Informes</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-1 rounded-lg shadow-md ml-1 space-y-0.5">
                    
                    <DropdownMenuItem onClick={() => navigate("/reports?type=sales")} className="text-xs font-bold py-2 px-2.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                      Ventas por documentos
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => navigate("/reports?type=sales&group=category")} className="text-xs font-bold py-2 px-2.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                      Ventas por Categorías
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => navigate("/reports?type=sales&group=product")} className="text-xs font-bold py-2 px-2.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                      Ventas por productos
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => navigate("/reports?type=inventory")} className="text-xs font-bold py-2 px-2.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                      Compras de inventario
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => navigate("/movements")} className="text-xs font-bold py-2 px-2.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                      Producciones
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => navigate("/movements")} className="text-xs font-bold py-2 px-2.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                      Traslados
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => navigate("/movements")} className="text-xs font-bold py-2 px-2.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                      Mermas
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => navigate("/reports?type=expenses")} className="text-xs font-bold py-2 px-2.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                      Gastos
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => navigate("/reports?type=sales")} className="text-xs font-bold py-2 px-2.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                      Utilidad de productos
                    </DropdownMenuItem>

                  </DropdownMenuSubContent>
                </DropdownMenuSub>

              </DropdownMenuContent>
            </DropdownMenu>

            {/* Estadísticas */}
            <Link
              to="/reports"
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all",
                isLinkActive("/reports") 
                  ? "bg-rose-50 text-rose-600" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              )}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Estadísticas</span>
            </Link>

            {/* Configuración */}
            <Link
              to="/settings"
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all",
                isLinkActive("/settings") 
                  ? "bg-rose-50 text-rose-600" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              )}
            >
              <Settings className="w-4 h-4" />
              <span>Configuración</span>
            </Link>

          </nav>
        )}

        {/* Lado Derecho: Acciones, Nodo selector, Notificaciones */}
        <div className="flex items-center gap-3">
          
          {/* Nodo Switcher (Solo Desktop) */}
          {!isMobile && storeId && stores.length > 0 && (
            <div className="flex items-center gap-2 border-r border-slate-200 dark:border-white/10 pr-3 mr-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    disabled={isSwitchingNode}
                    className="flex items-center gap-2 text-left hover:opacity-85 transition-opacity focus:outline-none cursor-pointer group"
                  >
                    <Building2 className="w-4 h-4 text-rose-600 group-hover:scale-105 transition-transform" />
                    <div className="flex flex-col items-start leading-none">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5 flex items-center gap-1">
                        NODO <ChevronDown className="w-2.5 h-2.5 text-muted-foreground/40" />
                      </span>
                      <span className="text-[10px] font-black text-rose-600 uppercase italic font-space-grotesk max-w-[100px] truncate">
                        {storeName || 'CARGANDO...'}
                      </span>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-lg mt-2 p-1.5 space-y-1">
                  <div className="px-2 py-1 text-[8px] font-bold text-muted-foreground/40 uppercase tracking-widest border-b border-border/30">
                    CONMUTAR NODO
                  </div>
                  {stores.map((s) => (
                    <DropdownMenuItem
                      key={s.id}
                      onClick={() => handleQuickSwitch(s.id)}
                      disabled={s.id === storeId || isSwitchingNode}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-black uppercase tracking-wider italic cursor-pointer transition-colors",
                        s.id === storeId
                          ? "bg-rose-50 text-rose-600"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                      )}
                    >
                      <span className="truncate">{s.name}</span>
                      {s.id === storeId && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shadow-glow-pro" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Notificaciones y Tema */}
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <ThemeToggle />
          </div>

          {/* Recomienda y Gana (Destacado Captura 1) */}
          {!isMobile && (
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider px-5 h-9 rounded-full border-none shadow-sm flex items-center gap-1.5 cursor-pointer ml-1"
            >
              <Gift className="w-4 h-4" />
              Recomienda y Gana
            </Button>
          )}

          {/* Logout */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-full"
            onClick={handleLogout}
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* 2. MENU LATERAL CAJÓN (SOLO EN MÓVIL) */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
            />

            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-64 fixed inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/10 flex flex-col pt-16 shadow-2xl"
            >
              <SidebarHeader />

              <nav className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
                
                {/* Enlaces Rápidos Móviles */}
                <div className="space-y-1">
                  {[
                    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
                    { label: "POS", href: "/pos", icon: ShoppingCart },
                    { label: "Ventas", href: "/sales", icon: ReceiptText },
                    { label: "Productos", href: "/products", icon: Tag },
                    { label: "Categorías", href: "/settings?tab=categories", icon: Tag },
                    { label: "Recetas", href: "/recipes", icon: FileText },
                    { label: "Inventario", href: "/inventory", icon: Package },
                    { label: "Menú Digital", href: "/digital-menu", icon: Bike },
                    { label: "Configuración", href: "/settings", icon: Settings }
                  ].map((item) => {
                    const active = isLinkActive(item.href);
                    return (
                      <Link
                        key={item.label}
                        to={item.href}
                        onClick={() => setIsSidebarOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                          active
                            ? "bg-rose-50 text-rose-600"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                        )}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <TankLevelsList />
                </div>
              </nav>

              <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                <ActiveShiftCard className="p-0 mb-3" />
                <Button
                  variant="ghost"
                  className="w-full justify-start text-xs font-bold uppercase tracking-wider text-rose-500 hover:bg-rose-50 rounded-xl"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>Cerrar Sesión</span>
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 3. CONTENEDOR PRINCIPAL */}
      <main className={cn(
        "flex-1 min-h-0 flex flex-col pt-16 relative z-10 h-full",
        fullWidth ? "overflow-hidden" : "overflow-y-auto"
      )}>
        <div 
          className={cn(
            "flex-1 min-h-0 flex flex-col overflow-x-hidden",
            fullWidth ? "p-0 overflow-hidden h-full" : "p-4 md:p-8"
          )} 
          style={{ zoom: `${uiScale * 0.85}%` } as React.CSSProperties}
        >
          <AlertManager />
          <ErrorBoundary fallbackTitle="Módulo Temporalmente No Disponible">
            {children}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}