import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ComboOption, ComboProduct } from "@/hooks/useProductComboOptions";

interface ComboProductsTabProps {
  comboOptions: ComboOption[];
  showDetailsInReports: boolean;
  allProductsList: any[];
  searchQueries: Record<number, string>;
  toggleShowDetailsInReports: (checked: boolean) => void;
  addComboOption: () => void;
  removeComboOption: (index: number) => void;
  updateComboOptionField: <K extends keyof ComboOption>(index: number, field: K, value: ComboOption[K]) => void;
  addProductToOption: (index: number, product: ComboProduct) => void;
  removeProductFromOption: (index: number, productIdx: number) => void;
  updateProductQty: (index: number, productIdx: number, qty: number) => void;
  setSearchQueryFor: (index: number, value: string) => void;
}

/**
 * Tab "Productos Combo" de ProductFormDialog.tsx, extraída sin cambios de
 * comportamiento. Las mutaciones de comboOptions ahora pasan por el hook
 * useProductComboOptions, que actualiza de forma inmutable.
 */
export function ComboProductsTab({
  comboOptions,
  showDetailsInReports,
  allProductsList,
  searchQueries,
  toggleShowDetailsInReports,
  addComboOption,
  removeComboOption,
  updateComboOptionField,
  addProductToOption,
  removeProductFromOption,
  updateProductQty,
  setSearchQueryFor,
}: ComboProductsTabProps) {
  return (
    <div className="space-y-6 py-4 animate-fadeIn">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">
          Configuración de Combos
        </h3>
      </div>

      {comboOptions.map((opt, i) => (
        <div key={i} className="relative bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          {/* Remove option button */}
          <button
            type="button"
            onClick={() => removeComboOption(i)}
            className="absolute top-4 right-4 text-rose-500 hover:text-rose-600 font-black text-xs uppercase"
          >
            Eliminar Opción
          </button>

          <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 font-space-grotesk italic">
            Configuración opción
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre</Label>
              <Input
                value={opt.name}
                onChange={(e) => updateComboOptionField(i, "name", e.target.value)}
                placeholder="Ej: Bebida"
                className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black text-white focus:border-primary/50"
              />
            </div>

            {/* Tipo* */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo*</Label>
              <Select
                value={opt.selection_type}
                onValueChange={(val: any) => updateComboOptionField(i, "selection_type", val)}
              >
                <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black uppercase text-white">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10">
                  <SelectItem value="all" className="text-xs font-black uppercase">Marcar Todos</SelectItem>
                  <SelectItem value="single" className="text-xs font-black uppercase">Seleccionar Uno (Única)</SelectItem>
                  <SelectItem value="multiple" className="text-xs font-black uppercase">Seleccionar Múltiples</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Buscar producto */}
          <div className="space-y-2 relative">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Buscar producto para añadir
            </Label>
            <Input
              value={searchQueries[i] || ""}
              onChange={(e) => setSearchQueryFor(i, e.target.value)}
              placeholder="Ej: Coca-Cola"
              className="h-11 bg-white/5 border-white/10 rounded-lg text-xs text-white focus:border-primary/50"
            />

            {/* Dropdown search results */}
            {(searchQueries[i] || "").trim() !== "" && (
              <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-slate-950 border border-white/15 rounded-xl z-50 p-1 shadow-2xl custom-scrollbar">
                {allProductsList
                  .filter(p => p.name.toLowerCase().includes((searchQueries[i] || "").toLowerCase()))
                  .slice(0, 10)
                  .map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProductToOption(i, { id: p.id, name: p.name, qty: 1 })}
                      className="w-full text-left rounded-lg px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
                {allProductsList.filter(p => p.name.toLowerCase().includes((searchQueries[i] || "").toLowerCase())).length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground italic text-center">
                    No se encontraron productos
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Added products table */}
          {opt.products.length > 0 && (
            <div className="border border-white/5 rounded-xl overflow-hidden bg-slate-950/40">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-2 px-4">Producto</th>
                    <th className="py-2 px-4 w-28 text-center">Cantidad</th>
                    <th className="py-2 px-4 w-16 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {opt.products.map((item, itemIdx) => (
                    <tr key={item.id} className="border-b border-white/5 text-xs">
                      <td className="py-2 px-4 font-bold text-slate-200">{item.name}</td>
                      <td className="py-2 px-4 text-center">
                        <Input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateProductQty(i, itemIdx, parseInt(e.target.value) || 1)}
                          className="h-8 w-20 text-center mx-auto bg-white/5 border-white/10 rounded-md text-xs font-bold text-white focus:border-primary/50"
                        />
                      </td>
                      <td className="py-2 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => removeProductFromOption(i, itemIdx)}
                          className="text-rose-500 hover:text-rose-600 font-bold"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Checkboxes Row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-200">
              <input
                type="checkbox"
                checked={opt.selectable}
                onChange={(e) => updateComboOptionField(i, "selectable", e.target.checked)}
                className="rounded border-white/10 bg-white/5 text-primary focus:ring-0 focus:ring-offset-0"
              />
              <span>Productos seleccionables</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-200">
              <input
                type="checkbox"
                checked={opt.hide_quantity}
                onChange={(e) => updateComboOptionField(i, "hide_quantity", e.target.checked)}
                className="rounded border-white/10 bg-white/5 text-primary focus:ring-0 focus:ring-offset-0"
              />
              <span>No mostrar cantidades al vender</span>
            </label>
          </div>
        </div>
      ))}

      {/* Root settings */}
      <div className="pt-2 border-t border-white/5">
        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-200">
          <input
            type="checkbox"
            checked={showDetailsInReports}
            onChange={(e) => toggleShowDetailsInReports(e.target.checked)}
            className="rounded border-white/10 bg-white/5 text-primary focus:ring-0 focus:ring-offset-0"
          />
          <span>Productos del combo se deben mostrar en detalle en informes</span>
        </label>
      </div>

      {/* Agregar otra button */}
      <Button
        type="button"
        onClick={addComboOption}
        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase px-5 py-2.5 rounded-xl border-none shadow-md flex items-center gap-1.5 cursor-pointer mt-2"
      >
        Agregar otra
      </Button>
    </div>
  );
}
