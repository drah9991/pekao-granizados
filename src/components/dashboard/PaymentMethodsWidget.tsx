import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

import { formatCOP } from "@/lib/currency";

export function PaymentMethodsWidget({ data }: { data: any }) {
  if (!data) return null;
  return (
    <Card className="glass-pro border-white/5 rounded-[2.5rem] p-8 shadow-pro flex flex-col animate-pro-in">
      <div className="mb-8">
        <CardTitle className="text-2xl font-black tracking-tighter mb-1 text-white font-space-grotesk italic uppercase">CAJA HOY</CardTitle>
        <CardDescription className="text-primary font-black uppercase tracking-[0.2em] text-[10px]">Payment Intelligence</CardDescription>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center relative py-4">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none mb-2">
          <div className="text-center">
            <p className="text-3xl lg:text-4xl font-black tracking-tighter text-white font-space-grotesk italic">{data.metrics.orders.val}</p>
            <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">VENTAS</p>
          </div>
        </div>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.pieData}
                cx="50%" cy="50%" innerRadius={80} outerRadius={100} paddingAngle={6}
                dataKey="value" animationBegin={0} animationDuration={1500}
                stroke="rgba(255,255,255,0.05)" strokeWidth={2}
              >
                {data.pieData.map((entry: any, index: number) => {
                  const colors = ['hsl(var(--primary))', 'hsl(266, 80%, 60%)', 'hsl(266, 70%, 75%)'];
                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="none" className="hover:opacity-80 transition-opacity" />;
                })}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(15,17,23,0.9)', 
                  backdropFilter: 'blur(32px)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '2rem', 
                  padding: '20px', 
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' 
                }}
                itemStyle={{ color: '#fff', fontWeight: 900, fontSize: '16px', fontFamily: 'Space Grotesk' }}
                formatter={(val: number) => [formatCOP(val), "Recaudo"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="space-y-3 pt-6 border-t border-white/5 mt-auto">
        {data.pieData.map((item: any, index: number) => {
          const colors = ['bg-primary', 'bg-primary/70', 'bg-primary/40'];
          return (
            <div key={item.name} className="flex items-center justify-between group p-2 rounded-2xl hover:bg-white/5 transition-all">
              <div className="flex items-center gap-3">
                <div className={cn("w-2.5 h-2.5 rounded-full shadow-glow-pro transform group-hover:scale-125 transition-transform", colors[index % colors.length])} />
                <span className="text-xs font-black text-white/50 font-space-grotesk group-hover:text-white transition-colors uppercase tracking-widest italic">{item.name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-white font-space-grotesk">{formatCOP(item.value)}</p>
                <p className="text-[9px] font-black text-primary italic uppercase tracking-[0.2em]">{item.percentage}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
