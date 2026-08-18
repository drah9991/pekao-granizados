import { Plus, Users, Split, ShoppingBag, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { formatCOP } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/lib/pos-types";
import type { SplitClient } from "@/hooks/useSplitBill";

interface ItemsSplitTabProps {
  cart: CartItem[];
  itemsClients: SplitClient[];
  isEverythingAssigned: boolean;
  paidCount: number;
  getUnassignedQuantity: (itemId: string, clientsList: SplitClient[]) => number;
  onAdjustItemQuantity: (clientIndex: number, itemId: string, delta: number) => void;
  onAddClient: () => void;
  onRemoveClient: (clientIndex: number) => void;
  onOpenPayment: (idx: number) => void;
}

/**
 * Tab "Dividir por Artículos" de SplitBillDialog.tsx, extraída sin cambios
 * de comportamiento.
 */
export function ItemsSplitTab({
  cart,
  itemsClients,
  isEverythingAssigned,
  paidCount,
  getUnassignedQuantity,
  onAdjustItemQuantity,
  onAddClient,
  onRemoveClient,
  onOpenPayment,
}: ItemsSplitTabProps) {
  return (
    <TabsContent value="items" className="flex-1 flex flex-col min-h-0 pt-4">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left Column: Cart items allocation */}
        <div className="lg:col-span-6 flex flex-col min-h-0 bg-white/5 border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
            <p className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" /> Distribución de Productos
            </p>
            {isEverythingAssigned ? (
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold uppercase">
                Todo Asignado
              </span>
            ) : (
              <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">
                Pendiente de Asignar
              </span>
            )}
          </div>

          {/* Products Scrollable */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
            {cart.map((item) => {
              const unassigned = getUnassignedQuantity(item.id, itemsClients);
              return (
                <div key={item.id} className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-foreground leading-tight">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Cant: {item.quantity} × {formatCOP(item.price)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                        unassigned > 0
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/15"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/15"
                      )}>
                        Disp: {unassigned}
                      </span>
                    </div>
                  </div>

                  {/* Client list inline to allot */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                    {itemsClients.map((client, idx) => {
                      const clientItem = client.items.find(i => i.id === item.id);
                      const clientQty = clientItem ? clientItem.quantity : 0;
                      return (
                        <div key={client.id} className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                          <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[60px]">
                            {client.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onAdjustItemQuantity(idx, item.id, -1)}
                              disabled={clientQty <= 0 || client.paid}
                              className="h-5 w-5 bg-white/5 hover:bg-white/10 rounded flex items-center justify-center text-[10px] font-bold disabled:opacity-30 transition-colors"
                            >
                              -
                            </button>
                            <span className="text-[10px] font-black w-3 text-center">{clientQty}</span>
                            <button
                              type="button"
                              onClick={() => onAdjustItemQuantity(idx, item.id, 1)}
                              disabled={unassigned <= 0 || client.paid}
                              className="h-5 w-5 bg-white/5 hover:bg-white/10 rounded flex items-center justify-center text-[10px] font-bold disabled:opacity-30 transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Clients and checkouts */}
        <div className="lg:col-span-6 flex flex-col min-h-0 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <p className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Clientes Compartiendo ({itemsClients.length})
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={onAddClient}
              disabled={itemsClients.length >= 6 || paidCount > 0}
              className="h-7 px-2.5 rounded-lg border-white/10 text-[10px] font-bold gap-1 uppercase"
            >
              <Plus className="w-3 h-3" /> Agregar Cliente
            </Button>
          </div>

          {/* Scrollable list of clients */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
            {itemsClients.map((client, idx) => (
              <div
                key={client.id}
                className={cn(
                  "p-3 rounded-xl border flex flex-col justify-between transition-all",
                  client.paid
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-white/5 border-white/5 hover:border-white/10"
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{client.name}</h4>
                    {client.items.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground mt-0.5">Sin productos asignados</p>
                    ) : (
                      <p className="text-[10px] text-primary mt-0.5 font-bold">
                        {client.items.reduce((sum, i) => sum + i.quantity, 0)} Productos asignados
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {client.paid ? (
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/25">
                        Pagado
                      </span>
                    ) : (
                      <>
                        {itemsClients.length > 2 && !client.paid && paidCount === 0 && (
                          <button
                            type="button"
                            onClick={() => onRemoveClient(idx)}
                            className="text-xs text-rose-400 hover:text-rose-300 uppercase font-bold hover:underline"
                          >
                            Quitar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Client Items summary inline */}
                {client.items.length > 0 && (
                  <div className="mt-2 bg-black/10 p-2 rounded border border-white/5 max-h-[80px] overflow-y-auto custom-scrollbar text-[10px] space-y-1">
                    {client.items.map(i => (
                      <div key={i.id} className="flex justify-between text-muted-foreground">
                        <span>{i.quantity}× {i.name}</span>
                        <span>{formatCOP(i.price * i.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-end mt-3 pt-2 border-t border-white/5">
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">Subtotal: {formatCOP(client.subtotal)}</span>
                    <p className="text-sm font-black text-foreground">{formatCOP(client.amount)}</p>
                  </div>
                  {!client.paid && client.items.length > 0 && (
                    <Button
                      size="sm"
                      disabled={!isEverythingAssigned}
                      onClick={() => onOpenPayment(idx)}
                      className={cn(
                        "h-8 rounded-lg text-xs font-bold px-3 gap-1 shadow-sm transition-all active:scale-95",
                        isEverythingAssigned ? "gradient-primary" : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10"
                      )}
                    >
                      Cobrar <ArrowRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!isEverythingAssigned && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Asignación Pendiente</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Para poder cobrar a los clientes, distribuye primero todas las unidades de los productos en el panel izquierdo.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </TabsContent>
  );
}
