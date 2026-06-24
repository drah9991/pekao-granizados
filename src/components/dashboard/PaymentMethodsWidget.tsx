import React, { useMemo } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { formatCOP } from "@/lib/currency";

interface PieDataItem {
  name: string;
  value: number;
  percentage: number;
}

interface PaymentMethodsData {
  metrics: { orders: { val: number } };
  pieData: PieDataItem[];
}

export function PaymentMethodsWidget({ data }: { data: PaymentMethodsData | null }) {
  // Calculate total cash in drawer from all payment methods
  const totalCaja = useMemo(() => {
    if (!data) return 0;
    return data.pieData.reduce((sum, item) => sum + item.value, 0);
  }, [data]);

  return useMemo(() => {
    if (!data) return null;
    return (
      <Card className="h-full w-full flex flex-col glass-pro border-border dark:border-white/5 rounded-[2.5rem] p-8 shadow-sm dark:shadow-pro overflow-hidden animate-pro-in hover:bg-muted/30 dark:hover:bg-white/[0.04] transition-all duration-500 relative">
        <div className="mb-8">
          <CardTitle className="text-2xl font-black tracking-tighter mb-1 text-foreground font-space-grotesk italic uppercase">CAJA HOY</CardTitle>
          <CardDescription className="text-primary font-black uppercase tracking-[0.2em] text-[10px]">Payment Intelligence</CardDescription>
        </div>

        {/* Fallback Table for Accessibility (Screen Readers) */}
        <table className="sr-only">
          <caption>Resumen de recaudación por método de pago</caption>
          <thead>
            <tr>
              <th scope="col">Método de Pago</th>
              <th scope="col">Recaudado</th>
              <th scope="col">Porcentaje</th>
            </tr>
          </thead>
          <tbody>
            {data.pieData.map((item, idx) => (
              <tr key={idx}>
                <td>{item.name}</td>
                <td>{formatCOP(item.value)}</td>
                <td>{item.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex-1 flex flex-col items-center justify-center relative py-4">
          {/* Usability Center Indicator */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none mb-2 z-10">
            <div className="text-center">
              <p className="text-[20px] lg:text-[24px] font-black tracking-tighter text-white font-space-grotesk italic pr-1">
                {formatCOP(totalCaja)}
              </p>
              <p className="text-[9px] font-black uppercase text-[#00F3FF] tracking-[0.25em] mt-1">
                {data.metrics.orders.val} Ventas Realizadas
              </p>
            </div>
          </div>
          
          <div className="flex-1 min-h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.pieData}
                  cx="50%" cy="50%" innerRadius={80} outerRadius={100} paddingAngle={6}
                  dataKey="value" animationBegin={0} animationDuration={1500}
                  stroke="rgba(255,255,255,0.05)" strokeWidth={2}
                >
                  {data.pieData.map((entry, index: number) => {
                    const colors = ['#8b5cf6', '#a855f7', '#d946ef'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="none" className="hover:opacity-80 transition-opacity" />;
                  })}
                </Pie>
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
                  formatter={(val: number) => [formatCOP(val), "Recaudo"]}
                  labelStyle={{ color: 'oklch(var(--muted-foreground))' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="space-y-3 pt-6 border-t border-border dark:border-white/5 mt-auto">
          {data.pieData.map((item, index: number) => {
            const bgColors = ['bg-[#8b5cf6]', 'bg-[#a855f7]', 'bg-[#d946ef]'];
            return (
              <div key={item.name} className="flex items-center justify-between group p-2 rounded-2xl hover:bg-muted/50 dark:hover:bg-white/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2.5 h-2.5 rounded-full shadow-glow-pro transform group-hover:scale-125 transition-transform", bgColors[index % bgColors.length])} />
                  <span className="text-xs font-black text-zinc-400 font-space-grotesk group-hover:text-foreground transition-colors uppercase tracking-widest italic">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-foreground font-space-grotesk">{formatCOP(item.value)}</p>
                  <p className="text-[9px] font-black text-[#00F3FF] italic uppercase tracking-[0.2em]">{item.percentage}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }, [data, totalCaja]);
}
