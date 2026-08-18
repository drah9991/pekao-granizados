import { Printer } from 'lucide-react';

interface PrintCenterCheckoutPanelProps {
  totalImpressions: number;
  totalPrice: number;
  paymentMethod: string;
  setPaymentMethod: (v: string) => void;
  isProcessing: boolean;
  activeTurn: any;
  handleProcessAndBill: () => void;
  totalTurnImpressions: number;
}

const PAYMENT_METHODS = [
  { code: 'cash', label: 'Efectivo' },
  { code: 'nequi', label: 'Nequi' },
  { code: 'daviplata', label: 'Daviplata' },
  { code: 'tarjeta', label: 'Tarjeta' },
  { code: 'bancolombia', label: 'Bancolombia' },
  { code: 'transfer', label: 'Transf.' }
];

/**
 * Panel derecho "Liquidación, Totales" del Print Center, extraído de
 * src/pages/PrintManagerModule.tsx sin cambios de comportamiento.
 */
export function PrintCenterCheckoutPanel({
  totalImpressions,
  totalPrice,
  paymentMethod,
  setPaymentMethod,
  isProcessing,
  activeTurn,
  handleProcessAndBill,
  totalTurnImpressions,
}: PrintCenterCheckoutPanelProps) {
  return (
    <div className="lg:col-span-5 space-y-6">

      {/* Liquidación de Caja */}
      <div className="bg-gradient-to-b from-slate-900/60 to-slate-950/40 backdrop-blur-xl border border-white/5 p-6 rounded-2xl shadow-2xl flex flex-col gap-4">
        <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Cómputo de Operación</h2>

        <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-white/5">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Total Impresiones / Caras:</span>
            <span className="font-mono font-medium text-slate-200">{totalImpressions} págs</span>
          </div>
          <div className="flex justify-between items-baseline pt-2 border-t border-white/5">
            <span className="text-sm font-medium text-slate-300">Total a Cobrar:</span>
            <span className="text-2xl font-black font-mono text-emerald-400 shadow-glow">
              ${totalPrice.toLocaleString('es-CO')}
            </span>
          </div>
        </div>

        {/* Selector de Método de Pago */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">Método de Pago</label>
          <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-1 border border-white/5 rounded-xl">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.code}
                type="button"
                onClick={() => setPaymentMethod(pm.code)}
                className={`py-1.5 px-2 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all duration-150 ${
                  paymentMethod === pm.code
                    ? 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
                }`}
              >
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Botón de Acción Principal con micro-animaciones */}
        <button
          type="button"
          disabled={isProcessing || !activeTurn || activeTurn.status === 'paused'}
          onClick={handleProcessAndBill}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98] ${
            !activeTurn || activeTurn.status === 'paused'
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_25px_rgba(52,211,153,0.4)] hover:brightness-110'
          }`}
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Printer className="w-4 h-4" />
              FACTURAR & PROCESAR
            </>
          )}
        </button>
      </div>

      {/* Monitor de Rendimiento del Turno */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Volumen del Turno</span>
        </div>
        <span className="font-mono text-sm font-bold bg-slate-950 px-3 py-1 border border-white/5 rounded-lg text-cyan-400">
          {totalTurnImpressions} impresiones
        </span>
      </div>

    </div>
  );
}
