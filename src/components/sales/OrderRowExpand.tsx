import { useOrderItems } from "@/hooks/useOrderItems";
import { formatCOP } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Receipt, Printer, XCircle, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInMinutes } from "date-fns";

interface OrderRowExpandProps {
  order: Record<string, unknown>;
  isOpen: boolean;
  onAnular: (order: Record<string, unknown>) => void;
  onVerFactura: (order: Record<string, unknown>) => void;
}

export function OrderRowExpand({ order, isOpen, onAnular, onVerFactura }: OrderRowExpandProps) {
  const { data: items, isLoading, error, refetch } = useOrderItems(isOpen ? order.id : null);

  if (!isOpen) return null;

  const canAnular = 
    order.status === 'completed' && 
    differenceInMinutes(new Date(), new Date(order.created_at)) < 30;

  return (
    <div className="bg-slate-950/40 border-y border-white/5 overflow-hidden animate-in slide-in-from-top-2 duration-300">
      <div className="p-8 lg:px-12 space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-50">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest">Cargando detalles...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 text-red-500">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p className="text-xs font-bold mb-4 text-center">No se pudo cargar el detalle.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="border-red-500/20 text-red-500 hover:bg-red-500/10 h-8 font-black uppercase text-[10px]">
              Reintentar
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Table of Items */}
              <div className="lg:col-span-8 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-500 text-[9px] font-black uppercase tracking-[0.15em] border-b border-white/5 pb-2">
                      <th className="pb-3 px-2">Producto</th>
                      <th className="pb-3">Categoría</th>
                      <th className="pb-3 text-center">Cant.</th>
                      <th className="pb-3">Precio</th>
                      <th className="pb-3 text-right pr-2">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {items?.map((item: Record<string, unknown>) => (
                      <tr key={item.id} className="group/item">
                        <td className="py-3 px-2">
                          <span className="text-xs font-bold text-slate-300 group-hover/item:text-white transition-colors">{item.name}</span>
                        </td>
                        <td className="py-3">
                          <span className="text-[10px] font-black uppercase text-slate-500 bg-white/5 px-2 py-0.5 rounded-md">
                            {(item.product as Record<string, unknown>)?.category as string || 'General'}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className="text-xs font-black text-slate-400">{item.qty}</span>
                        </td>
                        <td className="py-3">
                          <span className="text-xs font-bold text-slate-400 tabular-nums">{formatCOP(item.price)}</span>
                        </td>
                        <td className="py-3 text-right pr-2">
                          <span className="text-xs font-black text-white tabular-nums">{formatCOP(item.subtotal || item.price * item.qty)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary and Actions */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
                  <div className="space-y-1.5 pb-4 border-b border-white/5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-bold">Subtotal</span>
                      <span className="text-slate-300 font-black">{formatCOP(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-bold">Descuento</span>
                      <span className="text-emerald-500 font-black">{formatCOP(0)}</span>
                    </div>
                    {order.delivery_fee > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-cyan-500 font-bold">Domicilio</span>
                        <span className="text-cyan-500 font-black">{formatCOP(order.delivery_fee)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-baseline pt-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Orden</span>
                    <span className="text-2xl font-black text-white tabular-nums">{formatCOP(order.total)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-10 border-white/10 bg-white/5 hover:bg-white/10 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all"
                      onClick={() => onVerFactura(order)}
                    >
                      <Receipt className="w-3.5 h-3.5 mr-2 text-primary" />
                      Ver factura
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 h-10 border-white/10 bg-white/5 hover:bg-white/10 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all"
                      onClick={() => window.print()}
                    >
                      <Printer className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                      Reimprimir
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "w-full h-10 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all",
                      canAnular 
                        ? "text-red-500 hover:bg-red-500/10 hover:text-red-400" 
                        : "text-slate-700 cursor-not-allowed opacity-50"
                    )}
                    onClick={() => canAnular && onAnular(order)}
                    disabled={!canAnular}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-2" />
                    {canAnular ? "Anular orden" : "Anulación no permitida"}
                  </Button>
                  {!canAnular && order.status === 'completed' && (
                    <p className="text-[9px] text-slate-600 font-bold italic text-center px-4">
                      Superado el tiempo límite para anulación automática (30 min).
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-black border-t border-white/5 pt-6 uppercase tracking-wider">
              <div className="flex items-center gap-4">
                <span className="text-slate-500">Método: <span className="text-slate-300">
                  {order.payment ? Object.values(order.payment)[0] as string : 'Efectivo'}
                </span></span>
                <span className="text-slate-500">Cajero: <span className="text-slate-300">{order.creator_profile?.name || 'Sistema'}</span></span>
              </div>
              <div className="text-slate-500">
                Ubicación: <span className="text-slate-300">Sucursal Principal</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
