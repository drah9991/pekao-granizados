import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { formatCOP } from "@/lib/currency";

export function SalesChartWidget({ data }: { data: any }) {
  if (!data) return null;
  return (
    <Card className="lg:col-span-2 glass-card rounded-[3.5rem] p-10 shadow-elevated border-t border-white/5 hover:-translate-y-1 transition-smooth">
      <div className="flex items-center justify-between mb-10">
        <div>
          <CardTitle className="text-2xl font-black tracking-tight mb-1 text-white">Ingresos por hora</CardTitle>
          <CardDescription className="text-slate-400 font-medium tracking-wide">Actividad detectada en tiempo real</CardDescription>
        </div>
        <div className="p-1 px-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest shadow-glow">
          En Vivo
        </div>
      </div>
      <div className="h-[280px] w-full mb-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.hourlySales}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
            <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 800 }} />
            <YAxis hide />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(15,17,23,0.9)', backdropFilter: 'blur(10px)', border: '1px solid #ffffff10', borderRadius: '24px', padding: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
              itemStyle={{ color: '#fff', fontWeight: 900, fontSize: '14px' }}
              formatter={(val: number) => [formatCOP(val), "Ingresos"]}
              labelStyle={{ color: '#475569', fontWeight: 800, textTransform: 'uppercase', fontSize: '10px', marginBottom: '8px' }}
              cursor={{ stroke: '#10B981', strokeWidth: 2, strokeDasharray: '4 4' }}
            />
            <Area type="monotone" dataKey="total" stroke="#10B981" strokeWidth={5} fillOpacity={1} fill="url(#colorTotal)" animationDuration={2000} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-6 pt-10 border-t border-white/5">
        <div className="space-y-1">
           <p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] mb-2">Hora pico</p>
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-glow" />
             <p className="text-lg font-black text-white">{data.peakHour}</p>
           </div>
        </div>
        <div className="space-y-1 border-x border-white/5 px-6 text-center">
           <p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] mb-2">Venta Máxima</p>
           <p className="text-xl font-black text-white">{formatCOP(data.maxSale)}</p>
        </div>
        <div className="space-y-1 text-right">
           <p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] mb-2">Total Ítems</p>
           <p className="text-xl font-black text-emerald-500 shadow-glow">{data.totalItems} und</p>
        </div>
      </div>
    </Card>
  );
}
