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
                  const colors = ['#700de7', '#9333ea', '#c084fc'];
                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="none" className="hover:opacity-80 transition-opacity" />;
                })}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(15,17,23,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(112,13,231,0.2)', borderRadius: '24px', padding: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
                itemStyle={{ color: '#fff', fontWeight: 900, fontSize: '14px', fontFamily: 'Space Grotesk' }}
                formatter={(val: number) => [formatCOP(val), "Recaudo"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="space-y-4 pt-6 border-t border-white/5 mt-auto">
        {data.pieData.map((item: any, index: number) => {
          const colors = ['bg-[#700de7]', 'bg-[#9333ea]', 'bg-[#c084fc]'];
          return (
            <div key={item.name} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className={cn("w-3 h-3 rounded-full shadow-glow-pro transform group-hover:scale-125 transition-transform", colors[index % colors.length])} />
                <span className="text-sm font-bold text-white/70 font-dm-sans group-hover:text-white transition-colors">{item.name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-white font-space-grotesk">{formatCOP(item.value)}</p>
                <p className="text-[10px] font-bold text-primary italic uppercase tracking-widest">{item.percentage}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
