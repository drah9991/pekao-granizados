interface InventarioModoTabProps {
  inventoryMode: "ingredients" | "none" | "mixed" | "no_ingredients";
  setInventoryMode: (v: "ingredients" | "none" | "mixed" | "no_ingredients") => void;
}

const OPTIONS: { id: "ingredients" | "no_ingredients" | "mixed" | "none"; label: string }[] = [
  { id: "ingredients", label: "Con ingredientes" },
  { id: "no_ingredients", label: "Sin ingredientes" },
  { id: "mixed", label: "Mixto o Para Producción" },
  { id: "none", label: "Ninguno" },
];

/**
 * Tab "Inventario" de ProductFormDialog.tsx (selector de modo de consumo),
 * extraída sin cambios de comportamiento.
 */
export function InventarioModoTab({ inventoryMode, setInventoryMode }: InventarioModoTabProps) {
  return (
    <div className="space-y-6 py-4 animate-fadeIn flex flex-col items-center justify-center">
      <h3 className="text-xs font-black text-slate-400 mb-4 uppercase tracking-widest">Modo de consumo en Inventario</h3>
      <div className="flex flex-col sm:flex-row gap-6">
        {OPTIONS.map((opt) => (
          <label key={opt.id} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-300 cursor-pointer">
            <input
              type="radio"
              name="inventoryMode"
              checked={inventoryMode === opt.id}
              onChange={() => setInventoryMode(opt.id)}
              className="accent-primary h-4 w-4"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}
