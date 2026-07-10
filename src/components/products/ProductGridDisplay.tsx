import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Edit2, Trash2, Globe } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import React, { useState } from "react";

interface Product extends Tables<'products'> {
  stock?: number;
  mixtureStock?: number;
  has_recipe?: boolean;
}

interface ProductGridDisplayProps {
  products: Product[];
  loading: boolean;
  searchQuery: string;
  filterActive: string;
  filterType: string;
  openCreateDialog: () => void;
  openEditDialog: (product: Product) => void;
  openDetailsDialog: (product: Product) => void;
  handleDeleteProduct: (product: Product) => void;
  userStoreId: string | null;
}

export default function ProductGridDisplay({
  products,
  loading,
  searchQuery,
  filterActive,
  filterType,
  openCreateDialog,
  openEditDialog,
  openDetailsDialog,
  handleDeleteProduct,
  userStoreId,
}: ProductGridDisplayProps) {
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-glow-pro" />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary animate-pulse">Cargando catálogo...</p>
      </div>
    );
  }

  const filteredProducts = products.filter(p => {
    if (filterActive === "active" && !p.active) return false;
    if (filterActive === "inactive" && p.active) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = p.name?.toLowerCase().includes(q);
      const skuMatch = p.sku?.toLowerCase().includes(q);
      const categoryMatch = p.category?.toLowerCase().includes(q);
      if (!nameMatch && !skuMatch && !categoryMatch) return false;
    }
    
    return true;
  });

  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedProducts.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const isAllSelected = paginatedProducts.length > 0 && paginatedProducts.every(p => selectedIds.includes(p.id));

  return (
    <div className="w-full space-y-6 bg-slate-950/40 border border-white/10 rounded-3xl shadow-pro backdrop-blur-md overflow-hidden p-6 font-space-grotesk italic">
      
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-white/[0.01]">
              <th className="py-4 px-4 w-28 text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-muted-foreground/60 font-bold lowercase">Seleccionar</span>
                  <Switch 
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    className="data-[state=checked]:bg-primary scale-75"
                  />
                  <span className="text-[9px] text-muted-foreground/60 font-bold lowercase">Todos</span>
                </div>
              </th>
              <th className="py-4 px-4">Categoría</th>
              <th className="py-4 px-4">Nombre</th>
              <th className="py-4 px-4 text-right">Precio</th>
              <th className="py-4 px-4 text-right">Costo</th>
              <th className="py-4 px-4 text-right font-mono">Utilidad</th>
              <th className="py-4 px-4 text-center">Variantes</th>
              <th className="py-4 px-4 text-center">Estado</th>
              <th className="py-4 px-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-[11px] font-bold text-slate-300">
            {paginatedProducts.map((product) => {
              const price = product.price || 0;
              const cost = parseFloat(product.cost as string) || 0;
              const utility = price - cost;
              const utilityPercent = price > 0 ? (utility / price) * 100 : 0;
              const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;

              return (
                <tr key={product.id} className="hover:bg-white/[0.02] transition-colors relative group">
                  {/* Select Toggle */}
                  <td className="py-4 px-4 text-center">
                    <Switch
                      checked={selectedIds.includes(product.id)}
                      onCheckedChange={(checked) => handleSelectOne(product.id, checked)}
                      className="data-[state=checked]:bg-primary scale-75"
                    />
                  </td>
                  
                  {/* Categoría */}
                  <td className="py-4 px-4">
                    <span className="inline-block text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-white/5 text-primary rounded-full border border-white/5">
                      {product.category || "General"}
                    </span>
                  </td>

                  {/* Nombre con imagen */}
                  <td className="py-4 px-4 font-black uppercase text-slate-200">
                    <div className="flex items-center gap-3">
                      {product.images && product.images.length > 0 ? (
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-9 h-9 object-cover rounded-xl border border-white/10 bg-black/40"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm">
                          🍹
                        </div>
                      )}
                      <span className="group-hover:text-primary transition-colors">{product.name}</span>
                    </div>
                  </td>

                  {/* Precio */}
                  <td className="py-4 px-4 text-right text-glow text-slate-100">
                    $ {price.toLocaleString('es-CO')}
                  </td>

                  {/* Costo */}
                  <td className="py-4 px-4 text-right text-muted-foreground/80">
                    $ {cost.toLocaleString('es-CO')}
                  </td>

                  {/* Utilidad */}
                  <td className="py-4 px-4 text-right">
                    <div className="flex flex-col items-end leading-tight">
                      <span className="font-black text-slate-200 text-glow">
                        $ {utility.toLocaleString('es-CO')}
                      </span>
                      <span className="text-[9px] text-primary/60 font-mono">
                        {utilityPercent.toFixed(1)}%
                      </span>
                    </div>
                  </td>

                  {/* Tiene variantes */}
                  <td className="py-4 px-4 text-center text-muted-foreground">
                    {hasVariants ? "Sí" : "-"}
                  </td>

                  {/* Estado */}
                  <td className="py-4 px-4 text-center">
                    {product.active ? (
                      <span className="inline-block text-[9px] font-black uppercase px-2 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded font-mono shadow-glow-pro">
                        Activo
                      </span>
                    ) : (
                      <span className="inline-block text-[9px] font-black uppercase px-2 py-0.5 bg-neutral-800 text-neutral-400 border border-neutral-700 rounded font-mono">
                        Inactivo
                      </span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(product)}
                        className="h-8 border border-primary/20 text-primary hover:bg-primary/20 text-[10px] font-black uppercase tracking-wider rounded-xl px-3 flex items-center gap-1 bg-transparent"
                      >
                        <Edit2 className="w-3 h-3" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDeleteProduct(product)}
                        className="h-8 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white text-[10px] font-black uppercase tracking-wider rounded-xl px-3 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {paginatedProducts.length === 0 && (
              <tr>
                <td colSpan={9} className="py-12 text-center text-muted-foreground/40 italic text-xs uppercase tracking-widest">
                  No se encontraron productos coincidentes en el catálogo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
        
        {/* Total Label */}
        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-slate-300">
          Total: {totalItems} • Página: {activePage} / {totalPages}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1.5 rounded-xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(1)}
            disabled={activePage === 1}
            className="h-8 px-2 font-black hover:bg-white/5 text-[9px] rounded-lg"
          >
            Primero
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={activePage === 1}
            className="h-8 px-2 font-black hover:bg-white/5 text-[9px] rounded-lg"
          >
            Anterior
          </Button>

          <span className="h-8 w-8 flex items-center justify-center bg-primary text-white rounded-lg text-xs font-black shadow-glow-pro">
            {activePage}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={activePage === totalPages}
            className="h-8 px-2 font-black hover:bg-white/5 text-[9px] rounded-lg"
          >
            Siguiente
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(totalPages)}
            disabled={activePage === totalPages}
            className="h-8 px-2 font-black hover:bg-white/5 text-[9px] rounded-lg"
          >
            Último
          </Button>
        </div>
      </div>
    </div>
  );
}