import { Smartphone, Copy, Scan } from 'lucide-react';
import type { OriginType } from './types';

interface OriginSelectorProps {
  origin: OriginType;
  setOrigin: (origin: OriginType) => void;
}

export default function OriginSelector({ origin, setOrigin }: OriginSelectorProps) {
  return (
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
  );
}
