import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Eye, Ban, Edit2, User, UserCheck } from "lucide-react";
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
            <TableRow className="border-b border-border/20 hover:bg-transparent">
              <TableHead className="w-16"></TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest italic text-muted-foreground/60 p-6">ORDEN</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest italic text-muted-foreground/60 p-6">CLIENTE / CAJERO</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest italic text-muted-foreground/60 p-6">FECHA Y HORA</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest italic text-muted-foreground/60 p-6">ESTADO</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest italic text-muted-foreground/60 p-6 text-right">TOTAL</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest italic text-muted-foreground/60 p-6 text-right">ACCIONES</TableHead>
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
  const statusInfo = orderStatusOptions.find(s => s.value === order.status) || orderStatusOptions[0];
  const items = (order.items as unknown as OrderItem[]) || [];

  return (
    <>
      <TableRow className={cn(
        "group border-b border-border/20 hover:bg-white/5 transition-all duration-300",
        isExpanded && "bg-white/5 border-primary/20"
      )}>
        <TableCell className="p-6">
          <Button variant="ghost" size="icon" onClick={onToggle} className="text-muted-foreground/40 group-hover:text-primary transition-colors">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </TableCell>
        <TableCell className="p-6">
          <div className="flex flex-col">
            <span className="text-[11px] font-black font-space-grotesk italic text-foreground tracking-tighter">#{order.id.slice(0, 8).toUpperCase()}</span>
            <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-widest italic">Pekao — POS</span>
          </div>
        </TableCell>
        <TableCell className="p-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <UserCheck className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-black font-space-grotesk uppercase italic text-foreground/80">{order.customer_details?.name || "VENTA MOSTRADOR"}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-3 h-3 text-muted-foreground/40" />
              <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-widest italic italic">{order.creator_profile?.name || "Cajero General"}</span>
            </div>
          </div>
        </TableCell>
        <TableCell className="p-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black font-space-grotesk uppercase italic text-foreground/80">{format(new Date(order.created_at!), "dd MMM, yyyy", { locale: es })}</span>
            <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-widest italic italic">{format(new Date(order.created_at!), "HH:mm 'HRS'", { locale: es })}</span>
          </div>
        </TableCell>
        <TableCell className="p-6">
          <Badge className={cn("rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-widest italic border-none shadow-glow-pro", statusInfo.bgClass, statusInfo.textClass)}>
            {statusInfo.label}
          </Badge>
        </TableCell>
        <TableCell className="p-6 text-right">
          <div className="text-[14px] font-black font-space-grotesk italic text-foreground tracking-tighter">{formatCOP(order.total)}</div>
        </TableCell>
        <TableCell className="p-6 text-right">
          <div className="flex items-center justify-end gap-2">
            <Button onClick={onView} size="icon" variant="ghost" className="w-9 h-9 rounded-xl hover:bg-indigo-500/20 hover:text-indigo-400 transition-all shadow-pro border border-transparent hover:border-indigo-500/30">
              <Eye className="w-4 h-4" />
            </Button>
            {order.status !== 'cancelled' && (
              <>
                <Button onClick={onEdit} size="icon" variant="ghost" className="w-9 h-9 rounded-xl hover:bg-emerald-500/20 hover:text-emerald-400 transition-all shadow-pro border border-transparent hover:border-emerald-500/30">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button onClick={onCancel} size="icon" variant="ghost" className="w-9 h-9 rounded-xl hover:bg-red-500/20 hover:text-red-400 transition-all shadow-pro border border-transparent hover:border-red-500/30">
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
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic font-space-grotesk">Detalle de Productos</h4>
                    <div className="space-y-3">
                      {items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-muted/40 rounded-2xl border border-border/30 hover:border-primary/20 transition-all shadow-pro">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black font-space-grotesk uppercase italic text-foreground tracking-tight">{item.qty}x {item.name}</span>
                            <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-widest italic">{item.size || "Original"} — {formatCOP(item.price)}/u</span>
                          </div>
                          <span className="text-[11px] font-black font-space-grotesk italic text-foreground tracking-tighter">{formatCOP(item.qty * item.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-6 bg-muted/40 p-8 rounded-[2rem] border border-border/30 shadow-pro">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic font-space-grotesk">Resumen de Pago</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] italic">
                        <span>Método de Pago</span>
                        <span className="text-foreground">{order.payment_method?.toUpperCase() || "EFECTIVO"}</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] italic">
                        <span>Tipo de Orden</span>
                        <span className="text-foreground">{order.order_type?.toUpperCase() || "MOSTRADOR"}</span>
                      </div>
                      {order.delivery_fee && (
                        <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] italic">
                          <span>Envío</span>
                          <span className="text-emerald-500">{formatCOP(order.delivery_fee)}</span>
                        </div>
                      )}
                      <div className="pt-4 border-t border-border/30 flex justify-between items-center">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] italic">Total Final</span>
                        <span className="text-[18px] font-black font-space-grotesk italic text-foreground tracking-tighter">{formatCOP(order.total)}</span>
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
