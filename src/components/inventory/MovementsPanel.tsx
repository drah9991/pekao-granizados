import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet } from "lucide-react";
import type { Movement } from "@/hooks/useInventory";

interface MovementsPanelProps {
  movementFilterType: string;
  setMovementFilterType: (v: string) => void;
  movementFilterSupplier: string;
  setMovementFilterSupplier: (v: string) => void;
  movementFilterInvoice: string;
  setMovementFilterInvoice: (v: string) => void;
  suppliers: string[];
  filteredMovements: Movement[];
  totalMovementSum: number;
}

/**
 * Panel derecho "MOVIMIENTOS INVENTARIO" de src/pages/Inventory.tsx,
 * extraído sin cambios de comportamiento.
 */
export function MovementsPanel({
  movementFilterType,
  setMovementFilterType,
  movementFilterSupplier,
  setMovementFilterSupplier,
  movementFilterInvoice,
  setMovementFilterInvoice,
  suppliers,
  filteredMovements,
  totalMovementSum,
}: MovementsPanelProps) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-6 shadow-pro">
      <h2 className="text-base font-black text-slate-300 uppercase tracking-widest border-b border-white/5 pb-2">
        MOVIMIENTOS INVENTARIO
      </h2>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select value={movementFilterType} onValueChange={setMovementFilterType}>
            <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white uppercase font-bold">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border-white/10 text-white z-50 shadow-2xl">
              <SelectItem value="all" className="cursor-pointer text-xs uppercase font-bold">Todos los Tipos</SelectItem>
              <SelectItem value="entry" className="cursor-pointer text-xs uppercase text-emerald-400 font-bold">Entradas (+)</SelectItem>
              <SelectItem value="exit" className="cursor-pointer text-xs uppercase text-rose-400 font-bold">Salidas (-)</SelectItem>
              <SelectItem value="adjustment" className="cursor-pointer text-xs uppercase text-amber-400 font-bold">Ajustes</SelectItem>
            </SelectContent>
          </Select>

          <Select value={movementFilterSupplier} onValueChange={setMovementFilterSupplier}>
            <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white uppercase font-bold">
              <SelectValue placeholder="Proveedor" />
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border-white/10 text-white z-50 shadow-2xl max-h-60 overflow-y-auto">
              <SelectItem value="all" className="cursor-pointer text-xs uppercase font-bold">Todos los Proveedores</SelectItem>
              {suppliers.map(sup => (
                <SelectItem key={sup} value={sup} className="cursor-pointer text-xs uppercase">{sup}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Input
              placeholder="Nº Factura..."
              value={movementFilterInvoice}
              onChange={(e) => setMovementFilterInvoice(e.target.value)}
              className="h-11 pr-8 bg-white/5 border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500"
            />
            {movementFilterInvoice && (
              <button
                type="button"
                onClick={() => setMovementFilterInvoice("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
                title="Limpiar filtro de factura"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {(movementFilterType !== "all" || movementFilterSupplier !== "all" || movementFilterInvoice) && (
          <div className="flex items-center justify-between px-2 text-[10px] text-slate-400">
            <span>
              Filtros activos: {movementFilterType !== "all" ? `[${movementFilterType}]` : ""} {movementFilterSupplier !== "all" ? `[${movementFilterSupplier}]` : ""} {movementFilterInvoice ? `Factura: "${movementFilterInvoice}"` : ""}
            </span>
            <button
              type="button"
              onClick={() => {
                setMovementFilterType("all");
                setMovementFilterSupplier("all");
                setMovementFilterInvoice("");
              }}
              className="text-primary hover:underline font-bold uppercase"
            >
              Restablecer filtros
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/40">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-black uppercase text-slate-400 tracking-wider">
              <th className="py-3 px-4">Fecha Movimiento</th>
              <th className="py-3 px-4">Fecha Creación</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4 text-right">Total</th>
              <th className="py-3 px-4">Proveedor</th>
              <th className="py-3 px-4">Fact. No.</th>
            </tr>
          </thead>
          <tbody>
            {filteredMovements.slice(0, 10).map((m) => {
              const isEntry = m.type === "entry" || m.type === "in" || m.type?.toLowerCase().startsWith("entrada");
              const isAdjustment = m.type === "adjustment" || m.type?.toLowerCase().includes("ajuste");

              return (
                <tr key={m.id} className="border-b border-white/5 text-xs hover:bg-white/[0.01] transition-colors">
                  <td className="py-3 px-4 text-slate-300">
                    {m.movement_date ? new Date(m.movement_date).toLocaleDateString() : "-"}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {m.created_at ? new Date(m.created_at).toLocaleString() : "-"}
                  </td>
                  <td className="py-3 px-4 font-bold">
                    <span
                      className={
                        isEntry
                          ? "text-emerald-400"
                          : isAdjustment
                          ? "text-amber-400"
                          : "text-rose-400"
                      }
                    >
                      {isEntry
                        ? "Entrada - Compra"
                        : isAdjustment
                        ? "Ajuste"
                        : "Salida"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-200">
                    ${(m.total_price || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-slate-300">{m.supplier_name || "-"}</td>
                  <td className="py-3 px-4 text-slate-400">{m.invoice_no || "-"}</td>
                </tr>
              );
            })}
            {filteredMovements.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 text-xs italic uppercase">
                  No hay movimientos registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="text-xs font-black uppercase text-slate-300">
          Total movimientos: ${totalMovementSum.toLocaleString()}
        </div>

        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase h-10 px-5 rounded-xl gap-2 border-none">
          <FileSpreadsheet className="w-4 h-4" /> Excel
        </Button>
      </div>
    </div>
  );
}
