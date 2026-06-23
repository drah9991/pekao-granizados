import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
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
  const menuSections = [
    {
      title: 'Catálogo',
      items: [
        { name: 'Categorías', icon: Tags, path: '/catalog/categories' },
        { name: 'Productos', icon: Package, path: '/catalog/products' },
        { name: 'Promociones', icon: Percent, path: '/catalog/promotions' },
      ],
    },
    {
      title: 'Inventario',
      items: [
        { name: 'Movimientos de Inventario', icon: ArrowRightLeft, path: '/catalog/inventory/movements' },
        { name: 'Historial', icon: History, path: '/catalog/inventory/history' },
        { name: 'Listado de Recetas', icon: FileText, path: '/catalog/inventory/recipes' },
        { name: 'Proveedores', icon: Truck, path: '/catalog/inventory/suppliers' },
        { name: 'Ingredientes', icon: Beaker, path: '/catalog/inventory/ingredients' },
        { name: 'Unidades', icon: Scale, path: '/catalog/inventory/units' },
      ],
    },
  ];

  return (
    <div className="flex h-full w-full bg-background rounded-lg border overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r bg-muted/30">
        <div className="h-full py-6 px-4 overflow-y-auto">
          {menuSections.map((section, idx) => (
            <div key={idx} className="mb-6 last:mb-0">
              <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h3>
              <nav className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.path}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 h-full">
          {/* Outlet para renderizar la página correspondiente a la ruta hija */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default ProductsInventoryLayout;
