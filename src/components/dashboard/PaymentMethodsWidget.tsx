import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

export function PaymentMethodsWidget({ data }: { data: any }) {
  if (!data) return null;
  return (
    <Card className="glass-card border-none rounded-[3.5rem] p-10 shadow-elevated flex flex-col border-t border-white/5 hover:-translate-y-1 transition-smooth">
      <div className="mb-8">
        <CardTitle className="text-2xl font-black tracking-tight mb-1 text-white">Caja hoy</CardTitle>
        <CardDescription className="text-slate-400 font-medium tracking-wide">Métodos de recaudo</CardDescription>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center relative py-6">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none mb-4">
          <div className="text-center">
            <p className="text-4xl font-black tracking-tighter text-white">{data.metrics.orders.val}</p>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Ventas</p>
          </div>
        </div>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.pieData}
                cx="50%" cy="50%" innerRadius={85} outerRadius={105} paddingAngle={8}
                dataKey="value" animationBegin={0} animationDuration={1500}
              >
                {data.pieData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.name === 'Efectivo' ? '#10B981' : (entry.name === 'Tarjeta' ? '#4F46E5' : '#06B6D4')} stroke="none" />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(15,17,23,0.9)', backdropFilter: 'blur(10px)', border: '1px solid #ffffff10', borderRadius: '20px' }}
                itemStyle={{ color: '#fff', fontWeight: 800 }}
                formatter={(val: number) => formatMoney(val)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="space-y-5 pt-8 border-t border-white/5 mt-auto">
        {data.pieData.map((item: any) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("w-3 h-3 rounded-full shadow-lg", item.name === 'Efectivo' ? 'bg-emerald-500 shadow-emerald-500/40' : (item.name === 'Tarjeta' ? 'bg-indigo-500 shadow-indigo-500/40' : 'bg-cyan-500 shadow-cyan-500/40'))} />
              <span className="text-sm font-black text-slate-300">{item.name}</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-white">{formatMoney(item.value)}</p>
              <p className="text-[10px] font-bold text-slate-500">{item.percentage}%</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
