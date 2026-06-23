import { 
  LayoutDashboard, 
  ShoppingCart, 
  Calculator, 
  ReceiptText, 
  BarChart3, 
  Megaphone, 
  Database, 
  Settings,
  Package,
  Users as UsersIcon,
  ClipboardList,
  Activity,
  Store as StoreIcon,
  Palette,
  Shield,
  Building2,
  Receipt,
  Ruler,
  Tag,
  Bell,
  UserCog,
  FileText,
  Users,
  FlaskConical,
  CreditCard,
  MonitorPlay
} from "lucide-react";
import { NavGroup } from "@/types/navigation";

export const navConfig: NavGroup[] = [
  {
    label: "Operación",
    roles: ["admin", "cashier", "owner", "manager", "store_manager"],
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "cashier", "owner", "manager", "store_manager"] },
      { label: "POS", href: "/pos", icon: ShoppingCart, roles: ["admin", "cashier", "owner", "manager", "store_manager"] },
      { label: "Menú Digital", href: "/digital-menu", icon: MonitorPlay, roles: ["admin", "cashier", "owner", "manager", "store_manager"] },
      { label: "Arqueo de Caja", href: "/cash-register", icon: Calculator, roles: ["admin", "cashier", "owner", "manager", "store_manager"] },
      { label: "Gastos", href: "/expenses", icon: CreditCard, roles: ["admin", "owner", "manager"] },
      { label: "Ventas", href: "/sales", icon: ReceiptText, roles: ["admin", "cashier", "owner", "manager", "store_manager"] },
      { label: "Preparación", href: "/preparation", icon: FlaskConical, roles: ["admin", "cashier", "owner", "manager", "store_manager"] },
      { label: "Facturas", href: "/invoices", icon: FileText, roles: ["admin", "cashier", "owner", "manager", "store_manager"] },
    ]
  },
  {
    label: "Análisis",
    roles: ["admin", "owner", "manager"],
    items: [
      { label: "Reportes", href: "/reports", icon: BarChart3, roles: ["admin", "owner", "manager"] },
      { label: "Marketing", href: "/marketing", icon: Megaphone, roles: ["admin", "owner", "manager"] },
    ]
  },
  {
    label: "Sistema",
    roles: ["admin", "owner", "manager"],
    items: [
      {
        label: "Maestros",
        href: "#",
        icon: Database,
        type: "collapsible",
        roles: ["admin", "owner", "manager"],
        children: [
          { label: "Productos", href: "/products", icon: Tag, roles: ["admin", "owner", "manager"] },
          { label: "Clientes", href: "/customers", icon: UsersIcon, roles: ["admin", "owner", "manager"] },
          { label: "Inventario", href: "/inventory", icon: Package, roles: ["admin", "owner", "manager"] },
          { label: "Recetas", href: "/recipes", icon: FileText, roles: ["admin", "owner", "manager"] },
          { label: "Usuarios", href: "/users", icon: UserCog, roles: ["admin", "owner"] },
          { label: "Tiendas", href: "/stores", icon: StoreIcon, roles: ["admin", "owner"] },
          { label: "Kardex", href: "/movements", icon: ClipboardList, roles: ["admin", "owner", "manager"] },
        ]
      },
      {
        label: "Configuración",
        href: "#",
        icon: Settings,
        type: "collapsible",
        roles: ["admin", "owner", "manager"],
        children: [
          { label: "Branding Visual", href: "/settings?tab=branding", icon: Palette, roles: ["admin", "owner"] },
          { label: "Roles de Sistema", href: "/settings?tab=roles", icon: Shield, roles: ["admin", "owner"] },
          { label: "Perfil de Negocio", href: "/settings?tab=business", icon: Building2, roles: ["admin", "owner"] },
          { label: "Plantillas Recibos", href: "/settings?tab=receipts", icon: Receipt, roles: ["admin", "owner"] },
          { label: "Tamaños Estándar", href: "/settings?tab=sizes", icon: Ruler, roles: ["admin", "owner"] },
          { label: "Acrónimos SKU", href: "/settings?tab=sku", icon: Tag, roles: ["admin", "owner"] },
          { label: "Tipos Operativos", href: "/settings?tab=product_types", icon: Package, roles: ["admin", "owner"] },
          { label: "Categorías ERP", href: "/settings?tab=categories", icon: Tag, roles: ["admin", "owner", "manager"] },
          { label: "Alertas y Notificaciones", href: "/settings?tab=notifications", icon: Bell, roles: ["admin", "owner", "manager"] },
        ]
      }
    ]
  }
];
