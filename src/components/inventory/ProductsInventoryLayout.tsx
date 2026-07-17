import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  Package, 
  Tags, 
  Percent, 
  ArrowRightLeft, 
  History, 
  FileText, 
  Truck, 
  Beaker, 
  Scale 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProductsInventoryLayout() {
  const location = useLocation();
  const menuItems = [
    { name: 'Categorías', icon: Tags, path: '/settings?tab=categories' },
    { name: 'Productos', icon: Package, path: '/products' },
    { name: 'Promociones', icon: Percent, path: '/marketing' },
    { name: 'Movimientos de Inventario', icon: ArrowRightLeft, path: '/inventory' },
    { name: 'Historial', icon: History, path: '/movements' },
    { name: 'Listado de Recetas', icon: FileText, path: '/catalog/inventory/recipes' },
    { name: 'Proveedores', icon: Truck, path: '/catalog/inventory/suppliers' },
    { name: 'Ingredientes', icon: Beaker, path: '/preparation' },
    { name: 'Unidades', icon: Scale, path: '/catalog/inventory/units' },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-transparent overflow-hidden">
      {/* Horizontal Submenu Navbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-white/[0.01] overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 shrink-0">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isCurrentActive = 
            (item.path.includes('?') && location.pathname + location.search === item.path) ||
            (!item.path.includes('?') && location.pathname === item.path);
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={cn(
                "flex items-center gap-2 rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-wider italic transition-all font-space-grotesk whitespace-nowrap border shrink-0",
                isCurrentActive
                  ? "bg-primary text-white border-primary shadow-glow-pro"
                  : "text-slate-400 border-white/5 bg-white/5 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.name}
            </NavLink>
          );
        })}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default ProductsInventoryLayout;
