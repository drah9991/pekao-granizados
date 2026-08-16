import type React from 'react';
import { Checkbox } from '@/components/ui/checkbox';

interface ServiceTogglesProps {
  isCedula: boolean;
  setIsCedula: (value: boolean) => void;
  cedulaQty: number;
  setCedulaQty: React.Dispatch<React.SetStateAction<number>>;
  isCopia: boolean;
  setIsCopia: (value: boolean) => void;
  pricing: Record<string, any>;
}

export default function ServiceToggles({
  isCedula,
  setIsCedula,
  cedulaQty,
  setCedulaQty,
  isCopia,
  setIsCopia,
  pricing
}: ServiceTogglesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Cédula Card */}
      <div className={`bg-slate-900/40 backdrop-blur-md border p-4 rounded-xl flex flex-col gap-3 transition-all ${isCedula ? 'border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'border-white/5 opacity-70'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="service-cedula"
              checked={isCedula}
              onCheckedChange={(checked) => setIsCedula(!!checked)}
              className="w-5 h-5 border-slate-700 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500 rounded-md"
            />
            <label htmlFor="service-cedula" className="text-xs font-bold uppercase tracking-wider text-slate-200 cursor-pointer select-none">Cédula</label>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">${(pricing.copy?.cedula ?? 1000).toLocaleString('es-CO')} c/u</span>
        </div>
        {isCedula && (
          <div className="flex flex-col gap-1.5 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
            <label className="text-[9px] font-bold text-slate-400 uppercase">Cantidad de Cédulas</label>
            <div className="flex items-center justify-between border border-white/5 bg-slate-950/60 rounded-lg overflow-hidden h-9 px-2">
              <input
                type="number"
                min="1"
                value={cedulaQty}
                onChange={(e) => setCedulaQty(Math.max(1, parseInt(e.target.value) || 0))}
                className="bg-transparent text-sm font-bold border-none text-white focus:outline-none w-16"
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setCedulaQty(prev => Math.max(1, prev - 1))}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-xs"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setCedulaQty(prev => prev + 1)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-xs"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Copia Card */}
      <div className={`bg-slate-900/40 backdrop-blur-md border p-4 rounded-xl flex flex-col gap-3 transition-all ${isCopia ? 'border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'border-white/5 opacity-70'}`}>
        <div className="flex items-center gap-2">
          <Checkbox
            id="service-copia"
            checked={isCopia}
            onCheckedChange={(checked) => setIsCopia(!!checked)}
            className="w-5 h-5 border-slate-700 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500 rounded-md"
          />
          <label htmlFor="service-copia" className="text-xs font-bold uppercase tracking-wider text-slate-200 cursor-pointer select-none">Copia</label>
        </div>
        <span className="text-[10px] text-slate-500 leading-tight">Habilita la configuración para copias normales (páginas y juegos).</span>
      </div>
    </div>
  );
}
