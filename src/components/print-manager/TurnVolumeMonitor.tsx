interface TurnVolumeMonitorProps {
  totalTurnImpressions: number;
}

export default function TurnVolumeMonitor({ totalTurnImpressions }: TurnVolumeMonitorProps) {
  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-4 rounded-2xl flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Volumen del Turno</span>
      </div>
      <span className="font-mono text-sm font-bold bg-slate-950 px-3 py-1 border border-white/5 rounded-lg text-cyan-400">
        {totalTurnImpressions} impresiones
      </span>
    </div>
  );
}
