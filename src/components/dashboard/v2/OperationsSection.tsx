import React from "react";
import { OperationsData, RecentOrderSummary, TopProductItem, SellerPerformance } from "@/types/dashboard";
import { safeFormatCOP } from "@/adapters/dashboardAdapter";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { ShoppingBag, Clock, Users, ArrowUpRight, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface OperationsSectionProps {
  data?: OperationsData;
}

// Order Status Badge Mapper
function OrderStatusBadge({ status }: { status: RecentOrderSummary['status'] }) {
  if (status === 'completed' || status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" /> Pagada
      </span>
    );
  }
  if (status === 'preparing' || status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Clock className="w-3 h-3" /> En Prep.
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
      <XCircle className="w-3 h-3" /> Cancelada
    </span>
  );
}

// Micro Sparkline SVG Renderer
function MicroSparkline({ data = [10, 20, 15, 30, 45, 60], strokeColor = "#39FF14" }: { data?: number[]; strokeColor?: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * 60;
    const y = 20 - ((val - min) / (max - min || 1)) * 16;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg className="w-16 h-6 overflow-visible">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function OperationsSection({ data }: OperationsSectionProps) {
  const topProducts: TopProductItem[] = data?.topProducts || [];
  const recentOrders: RecentOrderSummary[] = data?.recentOrders || [];
  const topSellers: SellerPerformance[] = data?.topSellers || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
      
      {/* 1. Top 5 Productos del Mes (Donut PieChart) */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4 shadow-pro flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 font-space-grotesk italic">
                Top 5 Productos
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Volumen de venta relativo (%)</p>
            </div>
          </div>
        </div>

        {/* Donut Chart & Side Legend Layout */}
        {topProducts.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-medium">
            Sin datos de productos en este período
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 py-2">
            <div className="h-44 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topProducts}
                    dataKey="quantitySold"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={4}
                  >
                    {topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || "#FF007F"} stroke="#0f172a" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [`${val} un.`, 'Vendidos']}
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Top 1</span>
                <span className="text-xs font-black text-white">{topProducts[0]?.relativePercentage || 0}%</span>
              </div>
            </div>

            {/* Side Legend */}
            <div className="space-y-2 text-xs font-space-grotesk italic">
              {topProducts.map((prod, idx) => (
                <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/40 border border-slate-800/40">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: prod.color }} />
                    <span className="text-[11px] font-bold text-slate-200 truncate">{prod.name}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 ml-2">{prod.relativePercentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Últimos Pedidos (Accessible Table) */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4 shadow-pro flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 font-space-grotesk italic">
                Últimos Pedidos
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Flujo de comanda en tiempo real</p>
            </div>
          </div>
        </div>

        {/* Recent Orders List */}
        {recentOrders.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-medium">
            Sin pedidos registrados en este período
          </div>
        ) : (
          <div className="space-y-2.5 font-space-grotesk italic">
            {recentOrders.map((order) => (
              <div 
                key={order.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 hover:border-slate-700 transition-all"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">{order.shortId}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{order.timeFormatted}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                    {order.paymentMethod} • {order.itemsCount} ítem(s)
                  </span>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-xs font-black text-slate-100 block">{safeFormatCOP(order.total)}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Canales de Pago / Desempeño Operativo */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4 shadow-pro flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 font-space-grotesk italic">
                Canales de Pago
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Ranking por volumen de canal</p>
            </div>
          </div>
        </div>

        {/* Sellers / Channels List */}
        {topSellers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-medium">
            Sin canales registrados en este período
          </div>
        ) : (
          <div className="space-y-3 font-space-grotesk italic">
            {topSellers.map((seller, idx) => (
              <div 
                key={idx} 
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border",
                    idx === 0 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" :
                    idx === 1 ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40" :
                    "bg-slate-800 text-slate-400 border-slate-700"
                  )}>
                    #{idx + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{seller.name}</h4>
                    <span className="text-[10px] text-slate-400 block">{seller.ordersCount} operaciones</span>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-xs font-black text-slate-100 block">{safeFormatCOP(seller.totalSales)}</span>
                  <MicroSparkline data={seller.trendSparkline} strokeColor={idx === 0 ? "#39FF14" : "#00E5FF"} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
