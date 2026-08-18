import { Smartphone, Copy, Scan } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { OriginType, ColorMode, PaperSize } from '@/hooks/usePrintCenter';

interface PrintJobConfigPanelProps {
  origin: OriginType;
  setOrigin: (v: OriginType) => void;
  colorMode: ColorMode;
  setColorMode: (v: ColorMode) => void;
  paperSize: PaperSize;
  setPaperSize: (v: PaperSize) => void;
  pages: number;
  setPages: (updater: number | ((prev: number) => number)) => void;
  sets: number;
  setSets: (updater: number | ((prev: number) => number)) => void;
  isCedula: boolean;
  setIsCedula: (v: boolean) => void;
  cedulaQty: number;
  setCedulaQty: (updater: number | ((prev: number) => number)) => void;
  isCopia: boolean;
  setIsCopia: (v: boolean) => void;
  pricing: any;
  handleFastAdd: (amount: number) => void;
}

/**
 * Panel izquierdo "Configuración del Trabajo" del Print Center, extraído
 * de src/pages/PrintManagerModule.tsx sin cambios de comportamiento.
 */
export function PrintJobConfigPanel({
  origin,
  setOrigin,
  colorMode,
  setColorMode,
  paperSize,
  setPaperSize,
  pages,
  setPages,
  sets,
  setSets,
  isCedula,
  setIsCedula,
  cedulaQty,
  setCedulaQty,
  isCopia,
  setIsCopia,
  pricing,
  handleFastAdd,
}: PrintJobConfigPanelProps) {
  return (
    <div className="lg:col-span-7 space-y-6">
      <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-2xl shadow-2xl flex flex-col gap-5">

        {/* Selector de Origen */}
        <div>
          <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-3 block">Origen del Documento</label>
          <div className="grid grid-cols-3 gap-3">
            {(['whatsapp', 'physical', 'scanner'] as OriginType[]).map((type) => {
              const icons = { whatsapp: Smartphone, physical: Copy, scanner: Scan };
              const Icon = icons[type];
              const labels = { whatsapp: 'WhatsApp / USB', physical: 'Copias', scanner: 'Escáner' };

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setOrigin(type)}
                  className={`flex flex-col items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-medium transition-all duration-200 active:scale-95 ${
                    origin === type
                      ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                      : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {labels[type]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selección de Servicios (Cédula / Copia) */}
        {origin === 'physical' && (
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
        )}

        {/* Atributos (Modo de Color y Tamaño de Papel) */}
        {origin !== 'scanner' && (
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-200 ${origin === 'physical' && !isCopia ? 'opacity-30 pointer-events-none' : ''}`}>
            {/* Modo de Color */}
            <div>
              <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2 block">Modo de Color</label>
              <div className="flex bg-slate-950/60 p-1 border border-white/5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setColorMode('bw')}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${colorMode === 'bw' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Blanco & Negro
                </button>
                <button
                  type="button"
                  onClick={() => setColorMode('color')}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${colorMode === 'color' ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 shadow-[0_0_10px_rgba(217,70,239,0.1)]' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Full Color
                </button>
              </div>
            </div>

            {/* Tamaño de Papel */}
            <div>
              <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2 block">Tamaño de Papel</label>
              <div className="flex bg-slate-950/60 p-1 border border-white/5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPaperSize('letter')}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${paperSize === 'letter' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Carta
                </button>
                <button
                  type="button"
                  onClick={() => setPaperSize('legal')}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${paperSize === 'legal' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Oficio (Legal)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contadores Numéricos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Páginas */}
          <div className={`bg-slate-950/40 border border-white/5 p-4 rounded-xl flex flex-col gap-2 transition-opacity duration-200 ${origin === 'physical' && !isCopia ? 'opacity-30' : ''}`}>
            <label className="text-xs font-semibold text-slate-400 uppercase">Cantidad de Páginas</label>
            <div className="flex items-center justify-between gap-2">
              <input
                type="number"
                min="1"
                disabled={origin === 'physical' && !isCopia}
                value={origin === 'physical' && !isCopia ? 0 : pages}
                onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 0))}
                className="bg-transparent text-xl font-bold border-none text-white focus:outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:cursor-not-allowed"
              />
              <div className="flex gap-1">
                {[1, 5, 10, 50].map((val) => (
                  <button
                    key={val}
                    type="button"
                    disabled={origin === 'physical' && !isCopia}
                    onClick={() => handleFastAdd(val)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-[10px] font-bold rounded border border-white/5 text-cyan-400 transition-colors"
                  >
                    +{val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Juegos / Sets */}
          <div className={`bg-slate-950/40 border border-white/5 p-4 rounded-xl flex flex-col gap-2 transition-opacity duration-200 ${origin === 'physical' && !isCopia ? 'opacity-30' : ''}`}>
            <label className="text-xs font-semibold text-slate-400 uppercase">Número de Juegos (Sets)</label>
            <div className="flex items-center gap-4 justify-between">
              <input
                type="number"
                min="1"
                disabled={origin === 'physical' && !isCopia}
                value={origin === 'physical' && !isCopia ? 0 : sets}
                onChange={(e) => setSets(Math.max(1, parseInt(e.target.value) || 0))}
                className="bg-transparent text-xl font-bold border-none text-white focus:outline-none w-20 disabled:cursor-not-allowed"
              />
              <div className="flex items-center border border-white/5 bg-slate-950 rounded-lg overflow-hidden">
                <button
                  type="button"
                  disabled={origin === 'physical' && !isCopia}
                  onClick={() => setSets(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  -
                </button>
                <span className="px-4 text-xs font-bold text-slate-200">{origin === 'physical' && !isCopia ? 0 : sets}</span>
                <button
                  type="button"
                  disabled={origin === 'physical' && !isCopia}
                  onClick={() => setSets(prev => prev + 1)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
