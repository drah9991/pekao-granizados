import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, Clock } from "lucide-react";
import { formatCOP } from "@/lib/currency";
import { OrderRecord } from "@/types/cashRegister";
import { cn } from "@/lib/utils";

interface CashTransactionTableProps {
  orders: OrderRecord[];
  loading: boolean;
  summary: {
    cash: number;
    transfer: number;
    qr: number;
    card: number;
    total: number;
  };
}

const getMethodBadge = (method: string) => {
  switch (method) {
    case 'transfer':
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-500 text-[10px] font-black uppercase tracking-widest italic border border-cyan-500/20 shadow-glow-pro">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
          Transferencia
        </div>
      );
    case 'card':
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/10 text-violet-500 text-[10px] font-black uppercase tracking-widest italic border border-violet-500/20 shadow-glow-pro">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          Datáfono
        </div>
      );
    case 'qr':
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-widest italic border border-indigo-500/20 shadow-glow-pro">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          QR
        </div>
      );
    case 'split':
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest italic border border-amber-500/20 shadow-glow-pro">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Mixto
        </div>
      );
    default:
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest italic border border-emerald-500/20 shadow-glow-pro">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Efectivo
        </div>
      );
  }
};

export function CashTransactionTable({ orders, loading, summary }: CashTransactionTableProps) {
  return (
    <Card className="bg-card border border-white/10 rounded-[3rem] p-10 shadow-pro glass-pro overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight text-white mb-1">Desglose de Facturación</h2>
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Registro Auditado de Transacciones</p>
        </div>
        <Badge className="bg-primary/20 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest italic px-4 h-9">
          {orders.length} ÓRDENES REGISTRADAS
        </Badge>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6 shadow-glow-pro" />
          <p className="text-primary font-black uppercase tracking-widest text-[10px] italic animate-pulse">Sincronizando Finanzas...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 opacity-30">
          <Receipt className="w-20 h-20 mb-6 text-white" />
          <h3 className="text-xl font-black italic uppercase tracking-widest text-white">SIN MOVIMIENTOS</h3>
          <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em] mt-2">No se han reportado ventas en este turno.</p>
        </div>
      ) : (
        <div className="table-container-pro max-h-[600px]">
          <table className="w-full text-left">
            <thead className="sticky-header-pro">
              <tr className="text-white/30 text-[9px] font-black uppercase tracking-[0.3em] font-space-grotesk italic">
                <th className="py-6 pl-4 whitespace-nowrap">TIEMPO</th>
                <th className="py-6 whitespace-nowrap">IDENTIFICADOR</th>
                <th className="py-6 whitespace-nowrap">AUTORIZADO POR</th>
                <th className="py-6 whitespace-nowrap">MÉTODO PAGO</th>
                <th className="py-6 text-right pr-4 whitespace-nowrap">VALOR TRANSACCIÓN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {orders.map((order, idx) => {
                const payment = order.payment && typeof order.payment === 'object' ? order.payment : { method: 'cash' };
                const method = payment.method;

                return (
                  <motion.tr 
                    key={order.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group hover:bg-white/5 p-4 transition-all duration-300 rounded-[1.5rem]"
                  >
                    <td className="py-6 pl-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/5 rounded-[1.2rem] flex items-center justify-center border border-white/10 group-hover:border-primary/40 transition-colors">
                          <Clock className="w-4 h-4 text-white/40 group-hover:text-primary transition-colors" />
                        </div>
                        <span className="text-[11px] font-black text-white italic font-space-grotesk">
                          {new Date(order.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="py-6">
                      <span className="text-[10px] font-black text-white/20 group-hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-[10px] border border-primary/20 italic">
                          {order.user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="text-[11px] font-black text-white italic font-space-grotesk">{order.user?.name || "SISTEMA"}</span>
                      </div>
                    </td>
                    <td className="py-6">
                      {getMethodBadge(method)}
                    </td>
                    <td className="py-6 text-right pr-4">
                      <div className="flex flex-col items-end">
                        <span className="text-lg lg:text-xl font-black text-white italic font-space-grotesk tabular-nums leading-none">
                          {formatCOP(order.total)}
                        </span>
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">VERIFICADO ✓</span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>

          {/* Global Summary Footer */}
          <div className="mt-12 p-8 glass-pro rounded-[2.5rem] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8 group hover:border-primary/30 transition-all">
            <div className="flex flex-wrap items-center gap-10">
              <div className="space-y-1">
                <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-500/60">EFECTIVO FÍSICO</span>
                <p className="text-lg lg:text-2xl font-black font-space-grotesk italic text-white tracking-tighter">{formatCOP(summary.cash)}</p>
              </div>
              <div className="w-px h-10 bg-white/10 hidden md:block" />
              <div className="space-y-1">
                <span className="block text-[9px] font-black uppercase tracking-widest text-cyan-500/60">DEPÓSITOS DIGITALES</span>
                <p className="text-lg lg:text-2xl font-black font-space-grotesk italic text-white tracking-tighter">{formatCOP(summary.transfer + summary.qr)}</p>
              </div>
              <div className="w-px h-10 bg-white/10 hidden md:block" />
              <div className="space-y-1">
                <span className="block text-[9px] font-black uppercase tracking-widest text-violet-500/60">RECAUDO PLÁSTICO</span>
                <p className="text-lg lg:text-2xl font-black font-space-grotesk italic text-white tracking-tighter">{formatCOP(summary.card)}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 mb-1">RECAUDACIÓN BRUTA</span>
              <p className="text-2xl lg:text-5xl font-black font-space-grotesk italic text-primary tracking-tighter shadow-glow-pro-text">{formatCOP(summary.total)}</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
