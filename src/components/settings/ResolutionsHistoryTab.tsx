import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

interface ResolutionRecord {
  fecha: string;
  usuario: string;
  tipo: string;
  descripcion: string;
}

interface ResolutionsHistoryTabProps {
  resolutionsHistory: ResolutionRecord[];
}

/**
 * Subtab "Resoluciones" de BusinessSettings.tsx, extraída sin cambios de
 * comportamiento.
 */
export function ResolutionsHistoryTab({ resolutionsHistory }: ResolutionsHistoryTabProps) {
  return (
    <motion.div
      key="resolutions"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="space-y-6"
    >
      <Card className="bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
        <CardHeader className="p-0 pb-4 mb-6 border-b border-white/5">
          <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground">Historial de Movimientos de Resoluciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-muted-foreground uppercase text-[9px] font-black tracking-wider">
                <th className="pb-3">Fecha</th>
                <th className="pb-3">Usuario</th>
                <th className="pb-3">Tipo de Movimiento</th>
                <th className="pb-3">Descripción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {resolutionsHistory.map((item, idx) => (
                <tr key={idx} className="hover:bg-white/[0.01]">
                  <td className="py-3.5 font-mono text-slate-400">{item.fecha}</td>
                  <td className="py-3.5 font-bold text-slate-300">{item.usuario}</td>
                  <td className="py-3.5 font-bold text-primary">{item.tipo}</td>
                  <td className="py-3.5 text-slate-400">{item.descripcion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
