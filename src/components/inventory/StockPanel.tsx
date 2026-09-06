import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileSpreadsheet } from "lucide-react";
import type { StockItem } from "@/hooks/useInventory";

interface StockPanelProps {
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  stockItemsPaginated: StockItem[];
  filteredStockLength: number;
  stockPage: number;
  setStockPage: (updater: number | ((prev: number) => number)) => void;
  stockLimit: number;
}

/**
 * Panel izquierdo "INVENTARIO" de src/pages/Inventory.tsx, extraído sin
 * cambios de comportamiento.
 */
export function StockPanel({
  categories,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  stockItemsPaginated,
  filteredStockLength,
  stockPage,
  setStockPage,
  stockLimit,
}: StockPanelProps) {
  const totalPages = Math.ceil(filteredStockLength / stockLimit) || 1;

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-6 shadow-pro">
      <h2 className="text-base font-black text-slate-300 uppercase tracking-widest border-b border-white/5 pb-2">
        INVENTARIO
      </h2>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white uppercase font-bold">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border-white/10 text-white z-50 shadow-2xl max-h-64 overflow-y-auto">
              <SelectItem value="all" className="text-xs uppercase font-bold cursor-pointer">Todas las Categorías</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat} className="text-xs uppercase cursor-pointer">{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Buscar por nombre o categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-10 pr-8 bg-white/5 border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
                title="Limpiar búsqueda"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {(selectedCategory !== "all" || searchQuery) && (
          <div className="flex items-center justify-between px-2 text-[10px] text-slate-400">
            <span>Filtro activo: {selectedCategory !== "all" ? `[${selectedCategory}]` : ""} {searchQuery ? `"${searchQuery}"` : ""}</span>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("all");
                setSearchQuery("");
              }}
              className="text-primary hover:underline font-bold uppercase"
            >
              Restablecer filtros
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/40">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-black uppercase text-slate-400 tracking-wider">
              <th className="py-3 px-4">Negocio</th>
              <th className="py-3 px-4">Categoría</th>
              <th className="py-3 px-4">Nombre Ítem</th>
              <th className="py-3 px-4">Unidad</th>
              <th className="py-3 px-4 text-center">Cant. Actual</th>
              <th className="py-3 px-4 text-right">Costo Unit. Prom</th>
              <th className="py-3 px-4 text-right">Costo Total Prom</th>
              <th className="py-3 px-4 text-center">Stock Mín.</th>
            </tr>
          </thead>
          <tbody>
            {stockItemsPaginated.map((item) => (
              <tr key={item.id} className="border-b border-white/5 text-xs hover:bg-white/[0.01] transition-colors">
                <td className="py-3 px-4 font-bold text-slate-300">{item.stores?.name}</td>
                <td className="py-3 px-4 text-slate-400 uppercase text-[10px]">{item.products?.category || item.products?.type || "OTROS"}</td>
                <td className="py-3 px-4 font-bold text-slate-100">{item.products?.name}</td>
                <td className="py-3 px-4 text-slate-400 font-semibold uppercase text-[11px]">
                  {(!item.products?.unit_measure || item.products.unit_measure.toLowerCase() === "oz") ? "und" : item.products.unit_measure}
                </td>
                <td className="py-3 px-4 text-center font-bold text-slate-200">{item.qty}</td>
                <td className="py-3 px-4 text-right text-slate-300">${(item.products?.cost || 0).toLocaleString()}</td>
                <td className="py-3 px-4 text-right text-slate-200 font-bold">${(item.qty * (item.products?.cost || 0)).toLocaleString()}</td>
                <td className="py-3 px-4 text-center text-slate-400">{item.min_qty}</td>
              </tr>
            ))}
            {filteredStockLength === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500 text-xs italic uppercase">
                  No hay productos cargados en inventario
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Excel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="flex gap-2">
          <Button
            onClick={() => setStockPage(1)}
            disabled={stockPage === 1}
            variant="outline"
            className="h-9 px-3 rounded-lg text-[10px] border-white/10 text-slate-300"
          >
            Primero
          </Button>
          <Button
            onClick={() => setStockPage(prev => Math.max(1, prev - 1))}
            disabled={stockPage === 1}
            variant="outline"
            className="h-9 px-3 rounded-lg text-[10px] border-white/10 text-slate-300"
          >
            Anterior
          </Button>
          <Button
            onClick={() => setStockPage(prev => Math.min(totalPages, prev + 1))}
            disabled={stockPage >= totalPages}
            variant="outline"
            className="h-9 px-3 rounded-lg text-[10px] border-white/10 text-slate-300"
          >
            Siguiente
          </Button>
          <Button
            onClick={() => setStockPage(totalPages)}
            disabled={stockPage >= totalPages}
            variant="outline"
            className="h-9 px-3 rounded-lg text-[10px] border-white/10 text-slate-300"
          >
            Último
          </Button>
        </div>

        <div className="text-[10px] text-slate-400 uppercase font-black">
          Total: {filteredStockLength} - Página: {stockPage} / {totalPages}
        </div>

        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase h-10 px-5 rounded-xl gap-2 border-none">
          <FileSpreadsheet className="w-4 h-4" /> Excel
        </Button>
      </div>
    </div>
  );
}
