import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PreciosTabProps {
  sizes: { id: string; name: string; multiplier: number }[];
  price: string;
  getVariantPriceVal: (sizeId: string) => string;
  onVariantPriceValChange: (sizeId: string, priceStr: string) => void;
}

/**
 * Tab "$ Variante de precios" de ProductFormDialog.tsx, extraída sin
 * cambios de comportamiento.
 */
export function PreciosTab({ sizes, price, getVariantPriceVal, onVariantPriceValChange }: PreciosTabProps) {
  return (
    <div className="space-y-6 py-4 animate-fadeIn">
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Variación de Precios por Tamaño</h3>
      {sizes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sizes.map((size) => {
            const val = getVariantPriceVal(size.id);
            return (
              <div key={size.id} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
                <Label className="text-xs font-black text-slate-300 uppercase tracking-wider">{size.name}</Label>
                <Input
                  type="number"
                  value={val}
                  onChange={(e) => onVariantPriceValChange(size.id, e.target.value)}
                  placeholder={`Ej: ${Math.round((parseFloat(price) || 0) * size.multiplier)}`}
                  className="h-10 bg-white/5 border-white/10 rounded-lg text-xs font-black text-white focus:border-primary/50"
                />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center py-4 text-slate-500 italic text-xs uppercase tracking-widest">No hay tamaños registrados para configurar variaciones.</p>
      )}
    </div>
  );
}
