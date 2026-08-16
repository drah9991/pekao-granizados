import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface OpeningHoursCardProps {
  hours: Record<string, { open: string; close: string }>;
  setHours: (updater: (prev: Record<string, { open: string; close: string }>) => Record<string, { open: string; close: string }>) => void;
}

export function OpeningHoursCard({ hours, setHours }: OpeningHoursCardProps) {
  return (
    <Card className="lg:col-span-6 bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
      <CardHeader className="p-0 pb-4 mb-4 border-b border-white/5">
        <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          Horarios de Atención
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-3">
        {Object.keys(hours).map((day) => (
          <div key={day} className="flex items-center justify-between gap-4 py-1 border-b border-white/[0.02] last:border-0">
            <span className="text-[10px] font-black uppercase tracking-widest w-24 text-slate-300 italic">{day}</span>
            <div className="flex items-center gap-2 flex-1 max-w-[240px]">
              <Input
                type="time"
                value={hours[day].open}
                onChange={(e) => setHours(prev => ({
                  ...prev,
                  [day]: { ...prev[day], open: e.target.value }
                }))}
                className="bg-slate-900 border-white/10 text-xs h-8"
              />
              <span className="text-[10px] text-muted-foreground uppercase font-bold">a</span>
              <Input
                type="time"
                value={hours[day].close}
                onChange={(e) => setHours(prev => ({
                  ...prev,
                  [day]: { ...prev[day], close: e.target.value }
                }))}
                className="bg-slate-900 border-white/10 text-xs h-8"
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
