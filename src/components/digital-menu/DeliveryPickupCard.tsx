import { Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface DeliveryPickupCardProps {
  deliveryTime: string;
  setDeliveryTime: (value: string) => void;
  deliveryCost: string;
  setDeliveryCost: (value: string) => void;
  deliveryMinOrder: string;
  setDeliveryMinOrder: (value: string) => void;
  pickupTime: string;
  setPickupTime: (value: string) => void;
  pickupCost: string;
  setPickupCost: (value: string) => void;
}

export function DeliveryPickupCard({
  deliveryTime,
  setDeliveryTime,
  deliveryCost,
  setDeliveryCost,
  deliveryMinOrder,
  setDeliveryMinOrder,
  pickupTime,
  setPickupTime,
  pickupCost,
  setPickupCost
}: DeliveryPickupCardProps) {
  return (
    <Card className="lg:col-span-6 bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
      <CardHeader className="p-0 pb-4 mb-4 border-b border-white/5">
        <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-400" />
          Domicilios & Entregas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-6">
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary italic">A Domicilio</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-[9px] font-bold uppercase tracking-wider">Tiempo Estimado</Label>
              <select
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-foreground"
              >
                <option value="15 min">15 min</option>
                <option value="20 min">20 min</option>
                <option value="30 min">30 min</option>
                <option value="45 min">45 min</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-bold uppercase tracking-wider">Costo Envío</Label>
              <Input
                type="number"
                value={deliveryCost}
                onChange={(e) => setDeliveryCost(e.target.value)}
                className="bg-slate-900 border-white/10 rounded-lg text-xs"
                placeholder="Gratis"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-bold uppercase tracking-wider">Orden Mínima</Label>
              <Input
                type="number"
                value={deliveryMinOrder}
                onChange={(e) => setDeliveryMinOrder(e.target.value)}
                className="bg-slate-900 border-white/10 rounded-lg text-xs"
                placeholder="No tiene"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-white/5">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary italic">Recoger en Sitio</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[9px] font-bold uppercase tracking-wider">Tiempo Estimado</Label>
              <select
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-foreground"
              >
                <option value="10 min">10 min</option>
                <option value="15 min">15 min</option>
                <option value="20 min">20 min</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-bold uppercase tracking-wider">Costo</Label>
              <Input
                type="number"
                value={pickupCost}
                onChange={(e) => setPickupCost(e.target.value)}
                className="bg-slate-900 border-white/10 rounded-lg text-xs"
                placeholder="Gratis"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
