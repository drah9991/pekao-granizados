import React, { useMemo } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCOP } from "@/lib/currency";

interface HourlySale {
  hour: string;
  total: number;
}

interface SalesChartData {
  hourlySales: HourlySale[];
  peakHour: string;
  maxSale: number;
  totalItems: number;
}

export function SalesChartWidget({ data }: { data: SalesChartData | null }) {
  return useMemo(() => {
    if (!data) return null;

    return (
      <Card className="h-full w-full flex flex-col glass-pro border-border dark:border-white/5 rounded-[2.5rem] p-8 shadow-sm dark:shadow-pro animate-pro-in hover:bg-muted/30 dark:hover:bg-white/[0.04] transition-all duration-500 relative">
        <div className="flex items-center justify-between mb-8">
          <div>
            <CardTitle className="text-2xl font-black tracking-tighter mb-1 text-foreground font-space-grotesk italic">INGRESOS POR HORA</CardTitle>
            <CardDescription className="text-primary font-black uppercase tracking-[0.2em] text-[10px]">Real-time intelligence</CardDescription>
          </div>
          <div className="flex items-center gap-2 p-1 px-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest dark:shadow-glow-pro animate-pulse">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            En Vivo
          </div>
        </div>
        
        {/* Fallback Table for Accessibility (Screen Readers) */}
        <table className="sr-only">
          <caption>Ingresos por hora registrados hoy</caption>
          <thead>
            <tr>
              <th scope="col">Hora</th>
              <th scope="col">Ingresos</th>
            </tr>
          </thead>
          <tbody>
            {data.hourlySales.map((item, idx) => (
              <tr key={idx}>
                <td>{item.hour}</td>
                <td>{formatCOP(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex-1 w-full min-h-[250px] mb-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.hourlySales}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.45}/>
                  <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border dark:text-white/5" vertical={false} />
              <XAxis 
                dataKey="hour" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 900, fontFamily: 'Space Grotesk' }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 900, fontFamily: 'Space Grotesk' }}
                tickFormatter={(val) => `$${Math.round(val / 1000)}k`}
                dx={-5}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'oklch(var(--card))',
                  backdropFilter: 'blur(32px)', 
                  border: '1px solid oklch(var(--border))',
                  borderRadius: '16px', 
                  padding: '20px', 
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)'
                }}
                itemStyle={{ color: 'oklch(var(--foreground))', fontWeight: 900, fontSize: '16px', fontFamily: 'Space Grotesk' }}
                formatter={(val: number) => [formatCOP(val), "Ingresos"]}
                labelStyle={{ color: 'oklch(var(--muted-foreground))', fontWeight: 900, textTransform: 'uppercase', fontSize: '9px', marginBottom: '8px', letterSpacing: '0.2em' }}
                cursor={{ stroke: '#8b5cf6', strokeWidth: 2, strokeDasharray: '6 6' }}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#ffffff" 
                strokeWidth={4} 
                fillOpacity={1} 
                fill="url(#colorTotal)" 
                animationDuration={2500} 
                strokeLinecap="round" 
                activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border dark:border-white/5">
          <div className="space-y-1">
             <p className="text-[10px] uppercase font-black text-zinc-400 tracking-[0.2em] mb-2 font-space-grotesk italic">Hora pico</p>
             <div className="flex items-center gap-2">
               <p className="text-xl font-black text-foreground font-space-grotesk italic uppercase">{data.peakHour}</p>
             </div>
          </div>
          <div className="space-y-1 border-x border-border dark:border-white/5 px-6 text-center">
             <p className="text-[10px] uppercase font-black text-zinc-400 tracking-[0.2em] mb-2 font-space-grotesk italic">Venta Máxima</p>
             <p className="text-xl font-black text-foreground font-space-grotesk">{formatCOP(data.maxSale)}</p>
          </div>
          <div className="space-y-1 text-right">
             <p className="text-[10px] uppercase font-black text-zinc-400 tracking-[0.2em] mb-2 font-space-grotesk">Total Ítems</p>
             <p className="text-xl font-black text-primary font-space-grotesk shadow-glow-pro italic">{data.totalItems} <span className="text-[10px] text-zinc-400 not-italic uppercase font-bold">und</span></p>
          </div>
        </div>
      </Card>
    );
  }, [data]);
}
