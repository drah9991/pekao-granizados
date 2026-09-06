import React, { useState, useMemo } from "react";
import { AnalyticalChartsData, HourlySalesPoint } from "@/types/dashboard";
import { safeFormatCOP } from "@/adapters/dashboardAdapter";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell 
} from "recharts";
import { Activity, Calendar, Wallet, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsChartsProps {
  data?: AnalyticalChartsData;
}

type TimeWindowFilter = 'all' | 'morning' | 'afternoon' | 'night';

// Custom Neon Tooltip for AreaChart & BarChart
function CustomChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-xl text-xs font-space-grotesk italic">
        <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2 my-0.5">
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: entry.color || entry.fill || "#39FF14" }} 
            />
            <span className="text-slate-300 font-medium">{entry.name}:</span>
            <span className="text-white font-black">
              {typeof entry.value === 'number' ? safeFormatCOP(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  const [timeWindow, setTimeWindow] = useState<TimeWindowFilter>('all');

  // Filter hourly sales based on active time window selector
  const filteredHourlySales = useMemo(() => {
    const hourly = data?.hourlySales || [];
    if (timeWindow === 'morning') {
      return hourly.filter(h => h.rawHour >= 6 && h.rawHour < 12);
    }
    if (timeWindow === 'afternoon') {
      return hourly.filter(h => h.rawHour >= 12 && h.rawHour < 18);
    }
    if (timeWindow === 'night') {
      return hourly.filter(h => h.rawHour >= 18 || h.rawHour < 6);
    }
    return hourly;
  }, [data?.hourlySales, timeWindow]);

  const weeklySalesData = data?.weeklySales || [];

  const cashFlowData = data?.cashFlow || [
    { periodLabel: "Período Actual", income: 0, expenses: 0, netProfit: 0 }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
      
      {/* 1. Pedidos por Hora (AreaChart - Neon Gradient) */}
      <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4 shadow-pro">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FF007F]/10 border border-[#FF007F]/20 text-[#FF007F]">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 font-space-grotesk italic">
                Pedidos por Hora & Flujo Operativo
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Distribución de facturación e intensidad de consumo por franja horaria
              </p>
            </div>
          </div>

          {/* Time Window Interactive Filters */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'all', label: 'Todo el día' },
              { id: 'morning', label: 'Mañana (6-12h)' },
              { id: 'afternoon', label: 'Tarde (12-18h)' },
              { id: 'night', label: 'Noche (18-24h)' },
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => setTimeWindow(btn.id as TimeWindowFilter)}
                className={cn(
                  "px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer",
                  timeWindow === btn.id
                    ? "bg-[#FF007F] text-white shadow-[0_0_10px_rgba(255,0,127,0.4)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Area Container */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredHourlySales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="neonMagentaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF007F" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#FF007F" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="neonCyanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="hourLabel" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={{ stroke: '#334155' }} 
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => `$${Math.round(val / 1000)}k`} 
              />
              <Tooltip content={<CustomChartTooltip />} />
              <Area
                type="monotone"
                dataKey="totalSales"
                name="Ventas Totales ($)"
                stroke="#FF007F"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#neonMagentaGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Ingresos VS Egresos (Comparative BarChart) */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4 shadow-pro flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/20 text-[#39FF14]">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 font-space-grotesk italic">
                Ingresos VS Egresos
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Comparativo de flujo operativo real</p>
            </div>
          </div>
        </div>

        {/* Dual BarChart Container */}
        <div className="h-60 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashFlowData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="periodLabel" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => `$${Math.round(val / 1000)}k`} 
              />
              <Tooltip content={<CustomChartTooltip />} />
              <Bar dataKey="income" name="Ingresos ($)" fill="#39FF14" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Egresos ($)" fill="#FF007F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Flujo Operativo Summary Panel */}
        {(() => {
          const totIncome = cashFlowData.reduce((s, c) => s + (c.income || 0), 0);
          const totExpenses = cashFlowData.reduce((s, c) => s + (c.expenses || 0), 0);
          const totNet = totIncome - totExpenses;
          const marginPct = totIncome > 0 ? Math.round((totNet / totIncome) * 100) : 0;

          return (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 font-space-grotesk italic">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider">
                <span className="text-slate-400">Ganancia Neta</span>
                <span className={totNet >= 0 ? "text-[#39FF14]" : "text-rose-400"}>
                  {safeFormatCOP(totNet)} ({marginPct}%)
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1.5 border-t border-slate-800">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#39FF14]" />
                  Ingresos: <strong className="text-emerald-400">{safeFormatCOP(totIncome)}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#FF007F]" />
                  Egresos: <strong className="text-rose-400">{safeFormatCOP(totExpenses)}</strong>
                </span>
              </div>
            </div>
          );
        })()}
      </div>

    </div>
  );
}
