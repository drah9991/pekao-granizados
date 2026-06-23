import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Eye, Ban, Edit2, User, UserCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatCOP } from "@/lib/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { OrderWithDetails, OrderStatus, orderStatusOptions, OrderItem } from "@/types/sales";

interface SalesTableProps {
  orders: OrderWithDetails[];
  selectedStatusFilter: OrderStatus | "all";
  setSelectedStatusFilter: (status: OrderStatus | "all") => void;
  statusCounts: Record<string, number>;
  onViewDetails: (order: OrderWithDetails) => void;
  onConfirmCancel: (order: OrderWithDetails) => void;
  onEdit: (order: OrderWithDetails) => void;
}

export function SalesTable({
  orders,
  selectedStatusFilter,
  setSelectedStatusFilter,
  statusCounts,
  onViewDetails,
  onConfirmCancel,
  onEdit
}: SalesTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedRows(newExpanded);
  };

  return (
    <div className="bg-muted border border-border rounded-[2.5rem] shadow-pro glass-pro overflow-hidden">
      <div className="p-10 border-b border-border/50 flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-3">
          {orderStatusOptions.map((status) => (
            <Button
              key={status.value}
              variant="ghost"
              onClick={() => setSelectedStatusFilter(status.value)}
              className={cn(
                "h-10 px-6 rounded-full text-[9px] font-black uppercase tracking-widest italic transition-all duration-300",
                selectedStatusFilter === status.value 
                  ? `${status.bgClass} ${status.textClass} shadow-glow-pro scale-105` 
                  : "bg-muted/40 text-muted-foreground/40 hover:text-foreground"
              )}
            >
              {status.label}
              <span className="ml-2 py-0.5 px-2 rounded-full bg-white/10 text-[8px]">{statusCounts[status.value] || 0}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/30 hover:bg-transparent bg-black/20">
              <TableHead className="w-16 px-8 py-7"></TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-widest italic text-[#00F3FF] px-8 py-7">ORDEN</TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-widest italic text-[#00F3FF] px-8 py-7">CLIENTE / CAJERO</TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-widest italic text-[#00F3FF] px-8 py-7">FECHA Y HORA</TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-widest italic text-[#00F3FF] px-8 py-7">ESTADO</TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-widest italic text-[#00F3FF] px-8 py-7 text-right">TOTAL</TableHead>
              <TableHead className="text-[11px] font-black uppercase tracking-widest italic text-[#00F3FF] px-8 py-7 text-right">ACCIONES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {orders.map((order) => (
                <OrderRow 
                  key={order.id} 
                  order={order} 
                  isExpanded={expandedRows.has(order.id)}
                  onToggle={() => toggleRow(order.id)}
                  onView={() => onViewDetails(order)}
                  onCancel={() => onConfirmCancel(order)}
                  onEdit={() => onEdit(order)}
                />
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function OrderRow({ order, isExpanded, onToggle, onView, onCancel, onEdit }: { 
  order: OrderWithDetails, 
  isExpanded: boolean, 
  onToggle: () => void,
  onView: () => void,
  onCancel: () => void,
  onEdit: () => void
}) {
  const { storeName } = useAuth();
  const statusInfo = orderStatusOptions.find(s => s.value === order.status) || orderStatusOptions[0];
  const items = (order.items as unknown as OrderItem[]) || [];

  return (
    <>
      <TableRow className={cn(
        "group border-b border-border/20 hover:bg-white/5 transition-all duration-300",
        isExpanded && "bg-white/5 border-primary/20"
      )}>
        <TableCell className="px-8 py-7">
          <Button variant="ghost" size="icon" onClick={onToggle} className="text-white/60 group-hover:text-primary transition-colors">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </TableCell>
        <TableCell className="px-8 py-7">
          <div className="flex flex-col">
            <span className="text-[12px] font-black font-space-grotesk italic text-white tracking-tighter">#{order.id.slice(0, 8).toUpperCase()}</span>
            <span className="text-[9px] font-extrabold text-[#00F3FF]/80 uppercase tracking-widest italic">{storeName || "Oasis"} — POS</span>
          </div>
        </TableCell>
        <TableCell className="px-8 py-7">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] font-black font-space-grotesk uppercase italic text-white">{order.customer_details?.name || "VENTA MOSTRADOR"}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-[#00F3FF]/70" />
              <span className="text-[9px] font-extrabold text-[#00F3FF]/70 uppercase tracking-widest italic">{order.creator_profile?.name || "Cajero General"}</span>
            </div>
          </div>
        </TableCell>
        <TableCell className="px-8 py-7">
          <div className="flex flex-col">
            <span className="text-[11px] font-black font-space-grotesk uppercase italic text-white">{format(new Date(order.created_at!), "dd MMM, yyyy", { locale: es })}</span>
            <span className="text-[9px] font-extrabold text-[#00F3FF]/70 uppercase tracking-widest italic">{format(new Date(order.created_at!), "HH:mm 'HRS'", { locale: es })}</span>
          </div>
        </TableCell>
        <TableCell className="px-8 py-7">
          <Badge className={cn("rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-widest italic border shadow-glow-pro", statusInfo.bgClass, statusInfo.textClass)}>
            {statusInfo.label}
          </Badge>
        </TableCell>
        <TableCell className="px-8 py-7 text-right">
          <div className="text-[15px] font-black font-space-grotesk italic text-white tracking-tighter">{formatCOP(order.total)}</div>
        </TableCell>
        <TableCell className="px-8 py-7 text-right">
          <div className="flex items-center justify-end gap-2">
            <Button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onView(); }} size="icon" variant="ghost" className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200 transition-all shadow-pro border border-indigo-500/20">
              <Eye className="w-4 h-4" />
            </Button>
            {order.status !== 'cancelled' && (
              <>
                <Button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }} size="icon" variant="ghost" className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 transition-all shadow-pro border border-emerald-500/20">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCancel(); }} size="icon" variant="ghost" className="w-9 h-9 rounded-xl bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all shadow-pro border border-red-500/20">
                  <Ban className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>

      <AnimatePresence>
        {isExpanded && (
          <TableRow className="border-b border-border/20 bg-muted/20">
            <TableCell colSpan={7} className="p-0">
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="p-10 pl-24 pr-24 grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#00F3FF] italic font-space-grotesk">Detalle de Productos</h4>
                    <div className="space-y-3">
                      {items.map((item, idx) => (
                        <div key={item.name} className="flex justify-between items-center p-4 bg-muted/40 rounded-2xl border border-border/30 hover:border-primary/20 transition-all shadow-pro">
                          <div className="flex flex-col">
                            <span className="text-[12px] font-black font-space-grotesk uppercase italic text-white tracking-tight">{item.qty}x {item.name}</span>
                            <span className="text-[9px] font-extrabold text-[#00F3FF]/80 uppercase tracking-widest italic">{item.size || "Original"} — {formatCOP(item.price)}/u</span>
                          </div>
                          <span className="text-[12px] font-black font-space-grotesk italic text-white tracking-tighter">{formatCOP(item.qty * item.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-6 bg-muted/40 p-8 rounded-[2rem] border border-border/30 shadow-pro">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#00F3FF] italic font-space-grotesk">Resumen de Pago</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-extrabold text-white uppercase tracking-[0.2em] italic">
                        <span className="text-white/70">Método de Pago</span>
                        <span className="text-[#00F3FF] font-black">{order.payment_method?.toUpperCase() || "EFECTIVO"}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-extrabold text-white uppercase tracking-[0.2em] italic">
                        <span className="text-white/70">Tipo de Orden</span>
                        <span className="text-[#00F3FF] font-black">{order.order_type?.toUpperCase() || "MOSTRADOR"}</span>
                      </div>
                      {order.subtotal > 0 && order.subtotal !== order.total && (
                        <div className="flex justify-between items-center text-[10px] font-extrabold text-white uppercase tracking-[0.2em] italic">
                          <span className="text-white/70">Subtotal</span>
                          <span className="text-[#00F3FF] font-black">{formatCOP(order.subtotal)}</span>
                        </div>
                      )}
                      {order.subtotal + (order.delivery_fee || 0) + (order.tip_amount || 0) > order.total && (
                        <div className="flex justify-between items-center text-[10px] font-extrabold text-white uppercase tracking-[0.2em] italic">
                          <span className="text-white/70">Descuento</span>
                          <span className="text-emerald-400 font-black">-{formatCOP(order.subtotal + (order.delivery_fee || 0) + (order.tip_amount || 0) - order.total)}</span>
                        </div>
                      )}
                      {order.delivery_fee > 0 && (
                        <div className="flex justify-between items-center text-[10px] font-extrabold text-white uppercase tracking-[0.2em] italic">
                          <span className="text-white/70">Envío</span>
                          <span className="text-emerald-400 font-black">{formatCOP(order.delivery_fee)}</span>
                        </div>
                      )}
                      <div className="pt-4 border-t border-border/30 flex justify-between items-center">
                        <span className="text-[11px] font-black text-[#00F3FF] uppercase tracking-[0.3em] italic">Total Final</span>
                        <span className="text-[19px] font-black font-space-grotesk italic text-white tracking-tighter">{formatCOP(order.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </TableCell>
          </TableRow>
        )}
      </AnimatePresence>
    </>
  );
}
