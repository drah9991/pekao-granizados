import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

interface ObjectivesTabProps {
  objectiveToday: string; setObjectiveToday: (v: string) => void;
  objective7Days: string; setObjective7Days: (v: string) => void;
  objective30Days: string; setObjective30Days: (v: string) => void;
  objectiveYear: string; setObjectiveYear: (v: string) => void;
}

/**
 * Subtab "Objetivos" de BusinessSettings.tsx, extraída sin cambios de
 * comportamiento.
 */
export function ObjectivesTab({
  objectiveToday, setObjectiveToday,
  objective7Days, setObjective7Days,
  objective30Days, setObjective30Days,
  objectiveYear, setObjectiveYear,
}: ObjectivesTabProps) {
  return (
    <motion.div
      key="objectives"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="space-y-6"
    >
      <Card className="bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
        <CardHeader className="p-0 pb-4 mb-6 border-b border-white/5">
          <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground">Metas y Objetivos de Facturación</CardTitle>
          <CardDescription className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest italic leading-none font-space-grotesk mt-1">Establece objetivos de venta para tu sucursal</CardDescription>
        </CardHeader>
        <CardContent className="p-0 space-y-4 max-w-md">
          <div className="space-y-2">
            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Facturado Hoy</Label>
            <Input type="number" value={objectiveToday} onChange={(e) => setObjectiveToday(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
          </div>
          <div className="space-y-2">
            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Últimos 7 días</Label>
            <Input type="number" value={objective7Days} onChange={(e) => setObjective7Days(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
          </div>
          <div className="space-y-2">
            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Últimos 30 días</Label>
            <Input type="number" value={objective30Days} onChange={(e) => setObjective30Days(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
          </div>
          <div className="space-y-2">
            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Año actual</Label>
            <Input type="number" value={objectiveYear} onChange={(e) => setObjectiveYear(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
