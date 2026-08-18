import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

interface PaymentMethodsSettingsTabProps {
  paymentMethods: string[];
  newPaymentName: string;
  setNewPaymentName: (v: string) => void;
  handleAddPaymentMethod: () => void;
  handleRemovePaymentMethod: (name: string) => void;
}

/**
 * Subtab "Medios de pago" de BusinessSettings.tsx, extraída sin cambios
 * de comportamiento.
 */
export function PaymentMethodsSettingsTab({
  paymentMethods,
  newPaymentName,
  setNewPaymentName,
  handleAddPaymentMethod,
  handleRemovePaymentMethod,
}: PaymentMethodsSettingsTabProps) {
  return (
    <motion.div
      key="payments"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="space-y-6"
    >
      <Card className="bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
        <CardHeader className="p-0 pb-4 mb-6 border-b border-white/5">
          <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground">Medios de Pago</CardTitle>
          <CardDescription className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest italic leading-none font-space-grotesk mt-1">Configura y personaliza las alternativas de cobro en tu terminal</CardDescription>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          <div className="flex gap-2 max-w-md">
            <Input
              value={newPaymentName}
              onChange={(e) => setNewPaymentName(e.target.value)}
              placeholder="Ej: Transferencia, Nequi, etc."
              className="bg-slate-900 border-white/10 rounded-lg text-xs"
            />
            <Button onClick={handleAddPaymentMethod} className="bg-primary text-white uppercase tracking-widest font-space-grotesk text-xs px-4 rounded-lg">
              <Plus className="w-4 h-4 mr-1" /> Agregar
            </Button>
          </div>

          <div className="space-y-2 max-w-md pt-2">
            {paymentMethods.map((method) => (
              <div key={method} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                <span className="text-xs font-bold text-slate-300">{method}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemovePaymentMethod(method)}
                  className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
