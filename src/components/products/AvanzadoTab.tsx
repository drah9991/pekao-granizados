import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AvanzadoTabProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
  suppliersList: { id: string; name: string }[];
}

/**
 * Tab "Avanzado" de ProductFormDialog.tsx, extraída sin cambios de
 * comportamiento.
 */
export function AvanzadoTab({ formData, setFormData, suppliersList }: AvanzadoTabProps) {
  return (
    <div className="space-y-6 py-4 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Meta Margen (%)</Label>
          <Input
            type="number"
            value={formData.margin_target}
            onChange={(e) => setFormData(prev => ({ ...prev, margin_target: e.target.value }))}
            className="h-11 bg-white/5 border-white/10 rounded-lg text-white"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Comisión Vendedor (%)</Label>
          <Input
            type="number"
            value={formData.commission_rate}
            onChange={(e) => setFormData(prev => ({ ...prev, commission_rate: e.target.value }))}
            className="h-11 bg-white/5 border-white/10 rounded-lg text-white"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Proveedor</Label>
          <Select
            value={formData.supplier_id || "none"}
            onValueChange={(val) => {
              const selectedSup = suppliersList.find(s => s.id === val);
              setFormData(prev => ({
                ...prev,
                supplier_id: val === "none" ? null : val,
                supplier_name: val === "none" ? "" : (selectedSup?.name || "")
              }));
            }}
          >
            <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-lg text-white text-xs font-bold">
              <SelectValue placeholder="Seleccione un proveedor" />
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border-white/10 text-white">
              <SelectItem value="none" className="text-xs font-bold uppercase">Sin proveedor / Ninguno</SelectItem>
              {suppliersList.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-xs font-bold uppercase">{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
