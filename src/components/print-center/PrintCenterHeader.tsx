import { Printer } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PrintCenterHeaderProps {
  selectedTurnId: string;
  setSelectedTurnId: (v: string) => void;
  turnsHistory: any[];
  activeTurn: any;
}

/**
 * Encabezado del módulo Print Center (título, selector de turno e
 * indicador de estado), extraído de src/pages/PrintManagerModule.tsx sin
 * cambios de comportamiento.
 */
export function PrintCenterHeader({ selectedTurnId, setSelectedTurnId, turnsHistory, activeTurn }: PrintCenterHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
          <Printer className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-emerald-400 bg-clip-text text-transparent">
            Print Center
          </h1>
          <p className="text-xs text-slate-400">Gestión automatizada de copiado, escaneo y facturación de servicios</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Filtro de Turnos */}
        <Select value={selectedTurnId} onValueChange={setSelectedTurnId}>
          <SelectTrigger className="w-[200px] h-9 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest italic font-space-grotesk shadow-pro text-white">
            <SelectValue placeholder="Seleccionar turno..." />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10 rounded-xl">
            <SelectItem value="active" className="text-[10px] font-black uppercase tracking-widest italic text-white">Turno Actual</SelectItem>
            {turnsHistory.map(turn => (
              <SelectItem key={turn.id} value={turn.id} className="text-[10px] font-black uppercase tracking-widest italic text-white">
                {format(new Date(turn.opened_at), "d MMM hh:mm a", { locale: es })} - {(turn.status === 'open' || turn.status === 'paused') ? 'ACTUAL' : 'Cerrado'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Indicador de Estado del Turno */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium backdrop-blur-md h-9 ${
          activeTurn && activeTurn.status !== 'paused'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${activeTurn && activeTurn.status !== 'paused' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
          {activeTurn && activeTurn.status !== 'paused' ? `Turno Activo` : 'Caja Cerrada / Pausada'}
        </div>
      </div>
    </div>
  );
}
