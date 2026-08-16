import type React from 'react';
import type { OriginType } from './types';

interface PageCountersProps {
  origin: OriginType;
  isCopia: boolean;
  pages: number;
  setPages: React.Dispatch<React.SetStateAction<number>>;
  sets: number;
  setSets: React.Dispatch<React.SetStateAction<number>>;
  handleFastAdd: (amount: number) => void;
}

export default function PageCounters({
  origin,
  isCopia,
  pages,
  setPages,
  sets,
  setSets,
  handleFastAdd
}: PageCountersProps) {
  const disabled = origin === 'physical' && !isCopia;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
      {/* Páginas */}
      <div className={`bg-slate-950/40 border border-white/5 p-4 rounded-xl flex flex-col gap-2 transition-opacity duration-200 ${disabled ? 'opacity-30' : ''}`}>
        <label className="text-xs font-semibold text-slate-400 uppercase">Cantidad de Páginas</label>
        <div className="flex items-center justify-between gap-2">
          <input
            type="number"
            min="1"
            disabled={disabled}
            value={disabled ? 0 : pages}
            onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 0))}
            className="bg-transparent text-xl font-bold border-none text-white focus:outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:cursor-not-allowed"
          />
          <div className="flex gap-1">
            {[1, 5, 10, 50].map((val) => (
              <button
                key={val}
                type="button"
                disabled={disabled}
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
      <div className={`bg-slate-950/40 border border-white/5 p-4 rounded-xl flex flex-col gap-2 transition-opacity duration-200 ${disabled ? 'opacity-30' : ''}`}>
        <label className="text-xs font-semibold text-slate-400 uppercase">Número de Juegos (Sets)</label>
        <div className="flex items-center gap-4 justify-between">
          <input
            type="number"
            min="1"
            disabled={disabled}
            value={disabled ? 0 : sets}
            onChange={(e) => setSets(Math.max(1, parseInt(e.target.value) || 0))}
            className="bg-transparent text-xl font-bold border-none text-white focus:outline-none w-20 disabled:cursor-not-allowed"
          />
          <div className="flex items-center border border-white/5 bg-slate-950 rounded-lg overflow-hidden">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setSets(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              -
            </button>
            <span className="px-4 text-xs font-bold text-slate-200">{disabled ? 0 : sets}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setSets(prev => prev + 1)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
