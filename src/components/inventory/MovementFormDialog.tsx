import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, ArrowRightLeft } from "lucide-react";
import type { Product, AddedItem, StockItem } from "@/hooks/useInventory";
import { ProductSearchSelector } from "./ProductSearchSelector";

interface MovementFormDialogProps {
  modalOpen: boolean;
  setModalOpen: (v: boolean) => void;
  fecha: string;
  setFecha: (v: string) => void;
  tipo: string;
  setTipo: (v: string) => void;
  facturaNo: string;
  setFacturaNo: (v: string) => void;
  proveedor: string;
  setProveedor: (v: string) => void;
  dbSuppliers: { id: string; name: string }[];
  nota: string;
  setNota: (v: string) => void;
  selectedProductForItem: string;
  setSelectedProductForItem: (v: string) => void;
  allProducts: Product[];
  stockItems?: StockItem[];
  itemQty: string;
  setItemQty: (v: string) => void;
  itemTotal: string;
  setItemTotal: (v: string) => void;
  handleAddItemToMovement: () => void;
  addedItems: AddedItem[];
  handleRemoveAddedItem: (idx: number) => void;
  totalPagado: string;
  setTotalPagado: (v: string) => void;
  calculatedDebe: number;
  saleDeCaja: boolean;
  setSaleDeCaja: (v: boolean) => void;
  isSaving: boolean;
  handleSaveMovement: () => void;
}

function getDisplayUnit(unit?: string | null): string {
  if (!unit) return "und";
  const u = unit.trim().toLowerCase();
  if (u === "oz" || u === "onza" || u === "onzas" || u === "un" || u === "uni" || u === "unit" || u === "unidades") {
    return "und";
  }
  return unit;
}

/**
 * Diálogo "Nuevo movimiento" de src/pages/Inventory.tsx, extraído sin
 * cambios de comportamiento.
 */
export function MovementFormDialog({
  modalOpen,
  setModalOpen,
  fecha,
  setFecha,
  tipo,
  setTipo,
  facturaNo,
  setFacturaNo,
  proveedor,
  setProveedor,
  dbSuppliers,
  nota,
  setNota,
  selectedProductForItem,
  setSelectedProductForItem,
  allProducts,
  stockItems = [],
  itemQty,
  setItemQty,
  itemTotal,
  setItemTotal,
  handleAddItemToMovement,
  addedItems,
  handleRemoveAddedItem,
  totalPagado,
  setTotalPagado,
  calculatedDebe,
  saleDeCaja,
  setSaleDeCaja,
  isSaving,
  handleSaveMovement,
}: MovementFormDialogProps) {
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    (stockItems || []).forEach((s) => {
      map.set(s.product_id, s.qty);
    });
    return map;
  }, [stockItems]);

  const selectedProduct = useMemo(
    () => allProducts.find((p) => p.id === selectedProductForItem),
    [allProducts, selectedProductForItem]
  );
  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogContent className="bg-slate-950 border-white/10 text-white rounded-3xl max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader className="border-b border-white/5 pb-4">
          <DialogTitle className="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" /> Movimiento Inventario
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fecha */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha*</Label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white"
              />
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo*</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white font-bold uppercase">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10">
                  <SelectItem value="Entrada - Compra" className="text-xs">Entrada - Compra</SelectItem>
                  <SelectItem value="Entrada - Devolución" className="text-xs">Entrada - Devolución</SelectItem>
                  <SelectItem value="Entrada - Ajuste" className="text-xs">Entrada - Ajuste</SelectItem>
                  <SelectItem value="Entrada - Otro" className="text-xs">Entrada - Otro</SelectItem>
                  <SelectItem value="Salida - Devolución" className="text-xs">Salida - Devolución</SelectItem>
                  <SelectItem value="Salida - Ajuste" className="text-xs">Salida - Ajuste</SelectItem>
                  <SelectItem value="Salida - Otro" className="text-xs">Salida - Otro</SelectItem>
                  <SelectItem value="Salida - Merma" className="text-xs">Salida - Merma</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Factura No */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Factura No.</Label>
              <Input
                value={facturaNo}
                onChange={(e) => setFacturaNo(e.target.value)}
                placeholder="Factura No."
                className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white"
              />
            </div>

            {/* Proveedor */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Proveedor</Label>
              <Select value={proveedor || "none"} onValueChange={(val) => setProveedor(val === "none" ? "" : val)}>
                <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white">
                  <SelectValue placeholder="Seleccione un proveedor" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10 text-white">
                  <SelectItem value="none" className="text-xs uppercase">Sin proveedor / Ninguno</SelectItem>
                  {dbSuppliers.map(s => (
                    <SelectItem key={s.id} value={s.name} className="text-xs uppercase">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Nota */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nota</Label>
            <Textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Nota..."
              className="bg-white/5 border-white/10 rounded-xl text-xs text-white min-h-[60px]"
            />
          </div>

          {/* Added Items Section */}
          <div className="border-t border-white/5 pt-4 space-y-4">
            <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Productos del Movimiento</span>
              {addedItems.length > 0 && (
                <span className="text-[10px] text-primary font-bold lowercase tracking-normal">
                  {addedItems.length} {addedItems.length === 1 ? "producto agregado" : "productos agregados"}
                </span>
              )}
            </h4>

            {/* Input Box for adding products */}
            <div className="bg-white/[0.02] border border-white/10 p-4 rounded-2xl space-y-3.5">
              {/* Product Selector */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Seleccionar Producto*
                </Label>
                <ProductSearchSelector
                  products={allProducts}
                  stockMap={stockMap}
                  selectedProductId={selectedProductForItem}
                  onSelectProduct={setSelectedProductForItem}
                />
              </div>

              {/* Quantity, Total and Add Button */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
                {/* Quantity */}
                <div className="sm:col-span-4 space-y-1.5">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Cantidad*
                  </Label>
                  <Input
                    type="number"
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    placeholder="0"
                    min="1"
                    className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white"
                  />
                </div>

                {/* Total */}
                <div className="sm:col-span-5 space-y-1.5">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Total (Opcional)
                  </Label>
                  <Input
                    type="number"
                    value={itemTotal}
                    onChange={(e) => setItemTotal(e.target.value)}
                    placeholder={
                      selectedProduct?.cost && itemQty && Number(itemQty) > 0
                        ? `Sugerido: $${(Number(itemQty) * (selectedProduct.cost || 0)).toLocaleString()}`
                        : "Total"
                    }
                    className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500"
                  />
                </div>

                {/* Add Button */}
                <div className="sm:col-span-3">
                  <Button
                    type="button"
                    onClick={handleAddItemToMovement}
                    disabled={!selectedProductForItem || !itemQty || Number(itemQty) <= 0}
                    className="w-full h-11 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl flex items-center justify-center gap-1.5 font-black text-xs uppercase tracking-wider shadow-glow-pro transition-all"
                  >
                    <Plus className="w-4 h-4" /> Agregar
                  </Button>
                </div>
              </div>
            </div>

            {/* Added items list table */}
            {addedItems.length > 0 && (
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-950/60 shadow-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.04] border-b border-white/5 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="py-3 px-4">Producto / Categoría</th>
                      <th className="py-3 px-4 text-center">Cantidad</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {addedItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-white/5 text-xs hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="font-black text-slate-100 uppercase tracking-wide">{item.name}</div>
                          {item.category && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-white/5 text-[9px] font-bold uppercase text-slate-400 border border-white/5">
                              {item.category}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-slate-200">
                          {item.qty} {getDisplayUnit(item.unit_measure)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-slate-100">
                          ${item.total.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveAddedItem(idx)}
                            className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors font-bold text-sm leading-none"
                            title="Eliminar producto"
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
          </div>

          {/* Bottom box info and total details */}
          <div className="border-t border-white/5 pt-4 space-y-4">
            <p className="text-[11px] font-bold italic text-rose-500 uppercase tracking-wider font-space-grotesk text-center">
              Su caja asignada es: Caja Principal
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center max-w-sm mx-auto">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pagado</Label>
                <Input
                  type="number"
                  value={totalPagado}
                  onChange={(e) => setTotalPagado(e.target.value)}
                  placeholder="0"
                  className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white"
                />
              </div>

              <div className="space-y-1 text-center sm:text-left">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Debe</div>
                <div className="text-lg font-black text-rose-500">${calculatedDebe.toLocaleString()}</div>
              </div>
            </div>

            <div className="flex justify-center">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={saleDeCaja}
                  onChange={(e) => setSaleDeCaja(e.target.checked)}
                  className="rounded border-white/10 bg-white/5 text-primary focus:ring-0 focus:ring-offset-0"
                />
                <span>Sale de caja</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-3 border-t border-white/5 pt-4">
          <Button
            variant="outline"
            onClick={() => setModalOpen(false)}
            className="flex-1 h-11 border-white/10 text-slate-300 hover:bg-white/10 text-xs font-black uppercase rounded-xl"
          >
            Cerrar
          </Button>
          <Button
            onClick={handleSaveMovement}
            disabled={isSaving || addedItems.length === 0}
            className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase rounded-xl border-none shadow-glow-pro"
          >
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
