import type { ColorMode, OriginType, PaperSize } from './types';

interface AttributeTogglesProps {
  origin: OriginType;
  isCopia: boolean;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  paperSize: PaperSize;
  setPaperSize: (size: PaperSize) => void;
}

export default function AttributeToggles({
  origin,
  isCopia,
  colorMode,
  setColorMode,
  paperSize,
  setPaperSize
}: AttributeTogglesProps) {
  return (
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
  );
}
