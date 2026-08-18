import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import type { SettingsSubTab } from "@/hooks/useBusinessSettings";

interface PlaceholderSettingsTabProps {
  activeSubTab: SettingsSubTab;
}

/**
 * Subtabs complementarios (Avanzado, Moneda, Integraciones, Cajas) de
 * BusinessSettings.tsx, extraídos sin cambios de comportamiento.
 */
export function PlaceholderSettingsTab({ activeSubTab }: PlaceholderSettingsTabProps) {
  return (
    <motion.div
      key={activeSubTab}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="space-y-6"
    >
      <Card className="bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
        <CardHeader className="p-0 pb-4 mb-6 border-b border-white/5">
          <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground">
            {activeSubTab === "advanced" && "Parámetros Avanzados"}
            {activeSubTab === "currency" && "Formato de Moneda"}
            {activeSubTab === "integrations" && "Módulos e Integraciones ERP"}
            {activeSubTab === "cajas" && "Terminales de Caja"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 py-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
            Módulo configurado de forma predeterminada para esta sucursal.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
