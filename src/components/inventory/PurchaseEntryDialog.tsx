import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowRightLeft, Plus } from "lucide-react";

interface PurchaseProduct {
  id: string;
  name: string;
  cost: number | null;
}

interface PurchaseLineItem {
  productId: string;
  name: string;
  qty: number;
  total: number;
}

interface PurchaseEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  allProducts: PurchaseProduct[];
  suppliers: { id: string; name: string }[];
  fecha: string;
  setFecha: (val: string) => void;
  tipo: string;
  setTipo: (val: string) => void;
  facturaNo: string;
  setFacturaNo: (val: string) => void;
  nota: string;
  setNota: (val: string) => void;
  proveedor: string;
  setProveedor: (val: string) => void;
  selectedProductForItem: string;
  setSelectedProductForItem: (val: string) => void;
  itemQty: string;
  setItemQty: (val: string) => void;
  itemTotal: string;
  setItemTotal: (val: string) => void;
  addedItems: PurchaseLineItem[];
  onAddItem: () => void;
  onRemoveItem: (idx: number) => void;
  totalPagado: string;
  setTotalPagado: (val: string) => void;
  saleDeCaja: boolean;
  setSaleDeCaja: (val: boolean) => void;
  calculatedDebe: number;
  isSaving: boolean;
  onSubmit: () => void;
}

export function PurchaseEntryDialog({
  isOpen,
  onClose,
  allProducts,
  suppliers,
  fecha,
  setFecha,
  tipo,
  setTipo,
  facturaNo,
  setFacturaNo,
  nota,
  setNota,
  proveedor,
  setProveedor,
  selectedProductForItem,
  setSelectedProductForItem,
  itemQty,
  setItemQty,
  itemTotal,
  setItemTotal,
  addedItems,
  onAddItem,
  onRemoveItem,
  totalPagado,
  setTotalPagado,
  saleDeCaja,
  setSaleDeCaja,
  calculatedDebe,
  isSaving,
  onSubmit,
}: PurchaseEntryDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-950 border-white/10 text-white rounded-3xl max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader className="border-b border-white/5 pb-4">
          <DialogTitle className="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" /> Movimiento Inventario
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha*</Label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white"
              />
            </div>

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

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Factura No.</Label>
              <Input
                value={facturaNo}
                onChange={(e) => setFacturaNo(e.target.value)}
                placeholder="Factura No."
                className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Proveedor</Label>
              <Select value={proveedor || "none"} onValueChange={(val) => setProveedor(val === "none" ? "" : val)}>
                <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white">
                  <SelectValue placeholder="Seleccione un proveedor" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10 text-white">
                  <SelectItem value="none" className="text-xs uppercase">Sin proveedor / Ninguno</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.name} className="text-xs uppercase">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nota</Label>
            <Textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Nota..."
              className="bg-white/5 border-white/10 rounded-xl text-xs text-white min-h-[60px]"
            />
          </div>

          <div className="border-t border-white/5 pt-4 space-y-4">
            <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">
              Productos
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Seleccionar Producto</Label>
                <Select value={selectedProductForItem} onValueChange={setSelectedProductForItem}>
                  <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white">
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-white/10 max-h-48 overflow-y-auto">
                    {allProducts.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cantidad</Label>
                <Input
                  type="number"
                  value={itemQty}
                  onChange={(e) => setItemQty(e.target.value)}
                  placeholder="0"
                  className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex gap-2 items-center">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total (Opcional)</Label>
                  <Input
                    type="number"
                    value={itemTotal}
                    onChange={(e) => setItemTotal(e.target.value)}
                    placeholder="Total"
                    className="h-11 bg-white/5 border-white/10 rounded-xl text-xs text-white"
                  />
                </div>
                <Button
                  type="button"
                  onClick={onAddItem}
                  className="bg-primary hover:bg-primary/95 text-white h-11 w-11 rounded-xl flex items-center justify-center p-0 flex-shrink-0"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {addedItems.length > 0 && (
              <div className="border border-white/5 rounded-xl overflow-hidden bg-slate-950/40">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="py-2.5 px-4">Producto</th>
                      <th className="py-2.5 px-4 text-center">Cantidad</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                      <th className="py-2.5 px-4 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {addedItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-white/5 text-xs hover:bg-white/[0.01]">
                        <td className="py-2.5 px-4 font-bold text-slate-200">{item.name}</td>
                        <td className="py-2.5 px-4 text-center font-bold">{item.qty}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-200">${item.total.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => onRemoveItem(idx)}
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
          </div>

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
            onClick={onClose}
            className="flex-1 h-11 border-white/10 text-slate-300 hover:bg-white/10 text-xs font-black uppercase rounded-xl"
          >
            Cerrar
          </Button>
          <Button
            onClick={onSubmit}
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
