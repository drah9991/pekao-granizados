import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { formatCOP } from "@/lib/currency";

export function SalesChartWidget({ data }: { data: any }) {
  if (!data) return null;
  return (
    <Card className="lg:col-span-2 glass-pro border-white/5 rounded-[2.5rem] p-8 shadow-pro animate-pro-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <CardTitle className="text-2xl font-black tracking-tighter mb-1 text-white font-space-grotesk italic">INGRESOS POR HORA</CardTitle>
          <CardDescription className="text-primary font-black uppercase tracking-[0.2em] text-[10px]">Real-time intelligence</CardDescription>
        </div>
        <div className="flex items-center gap-2 p-1 px-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest shadow-glow-pro animate-pulse">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          En Vivo
        </div>
      </div>
      <div className="h-[280px] w-full mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.hourlySales}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#700de7" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#700de7" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
            <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 900, fontFamily: 'Space Grotesk' }} />
            <YAxis hide />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(15,17,23,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(112,13,231,0.2)', borderRadius: '24px', padding: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
              itemStyle={{ color: '#fff', fontWeight: 900, fontSize: '14px', fontFamily: 'Space Grotesk' }}
              formatter={(val: number) => [formatCOP(val), "Ingresos"]}
              labelStyle={{ color: '#700de7', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px', marginBottom: '8px', letterSpacing: '0.1em' }}
              cursor={{ stroke: '#700de7', strokeWidth: 2, strokeDasharray: '4 4' }}
            />
            <Area type="monotone" dataKey="total" stroke="#700de7" strokeWidth={5} fillOpacity={1} fill="url(#colorTotal)" animationDuration={2000} strokeLinecap="round" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/5">
        <div className="space-y-1">
           <p className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em] mb-2 font-space-grotesk">Hora pico</p>
           <div className="flex items-center gap-2">
             <p className="text-xl font-black text-white font-space-grotesk italic">{data.peakHour}</p>
           </div>
        </div>
        <div className="space-y-1 border-x border-white/5 px-6 text-center">
           <p className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em] mb-2 font-space-grotesk">Venta Máxima</p>
           <p className="text-xl font-black text-white font-space-grotesk">{formatCOP(data.maxSale)}</p>
        </div>
        <div className="space-y-1 text-right">
           <p className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em] mb-2 font-space-grotesk">Total Ítems</p>
           <p className="text-xl font-black text-primary font-space-grotesk shadow-glow-pro italic">{data.totalItems} <span className="text-[10px] text-muted-foreground not-italic uppercase">und</span></p>
        </div>
      </div>
    </Card>
  );
}
