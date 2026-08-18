import { AdvancedPagination } from '@/components/ui/AdvancedPagination';
import type { PrintJob } from '@/hooks/usePrintCenter';

interface PrintJobHistoryTableProps {
  history: PrintJob[];
  paginatedHistory: PrintJob[];
  historyPage: number;
  setHistoryPage: (v: number) => void;
  historyTotalPages: number;
  historyPageSize: number;
  handleCancelJob: (job: PrintJob) => void;
}

/**
 * Tabla "Registro de Trabajos Recientes" del Print Center, extraída de
 * src/pages/PrintManagerModule.tsx sin cambios de comportamiento.
 */
export function PrintJobHistoryTable({
  history,
  paginatedHistory,
  historyPage,
  setHistoryPage,
  historyTotalPages,
  historyPageSize,
  handleCancelJob,
}: PrintJobHistoryTableProps) {
  return (
    <div className="bg-slate-900/20 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden mt-2">
      <div className="p-6 pb-4">
        <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Registro de Trabajos Recientes</h2>
      </div>
      <div className="overflow-x-auto px-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="pb-3 pl-2">ID Operación</th>
              <th className="pb-3">Origen</th>
              <th className="pb-3">Impresiones</th>
              <th className="pb-3">Medio de Pago</th>
              <th className="pb-3">Estado</th>
              <th className="pb-3">Importe</th>
              <th className="pb-3 text-right">Fecha / Hora</th>
              <th className="pb-3 text-right pr-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs font-medium text-slate-300">
            {history.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-500 font-normal">
                  No se registran transacciones de impresión en este turno.
                </td>
              </tr>
            ) : (
              paginatedHistory.map((job) => {
                const isCancelled = job.rawOrder?.status === 'cancelled';
                return (
                  <tr key={job.id} className={`hover:bg-white/[0.02] transition-colors group ${isCancelled ? 'opacity-50 line-through' : ''}`}>
                    <td className="py-3 pl-2 font-mono text-slate-500 group-hover:text-cyan-400 transition-colors">
                      #{job.id.slice(0, 8)}
                    </td>
                    <td className="py-3 capitalize">{job.origin}</td>
                    <td className="py-3 font-mono">{job.impressions} u.</td>
                    <td className="py-3 uppercase font-bold text-[10px] text-slate-400">
                      {job.rawOrder?.payment_method === 'cash' ? '💵 Efectivo' :
                       job.rawOrder?.payment_method === 'nequi' ? '📱 Nequi' :
                       job.rawOrder?.payment_method === 'daviplata' ? '📱 Daviplata' :
                       job.rawOrder?.payment_method === 'tarjeta' ? '💳 Tarjeta' :
                       job.rawOrder?.payment_method === 'bancolombia' ? '🏦 Bancolombia' :
                       `🏦 ${job.rawOrder?.payment_method || 'Otro'}`}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        isCancelled
                          ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                          : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      }`}>
                        {isCancelled ? 'Anulada' : 'Facturada'}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-emerald-400">${job.price.toLocaleString('es-CO')}</td>
                    <td className="py-3 text-right text-slate-500 font-mono">{job.time}</td>
                    <td className="py-3 text-right pr-2">
                       {!isCancelled && (
                         <button
                           onClick={() => handleCancelJob(job)}
                           className="text-xs text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 px-2 py-1 rounded transition-colors border border-transparent hover:border-rose-500/30"
                         >
                           Anular
                         </button>
                       )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AdvancedPagination
        currentPage={historyPage}
        totalPages={historyTotalPages}
        onPageChange={setHistoryPage}
        pageSize={historyPageSize}
        totalRecords={history.length}
        className="bg-slate-950 border-t border-white/10 py-4 px-6 mt-2 rounded-b-2xl"
      />
    </div>
  );
}
