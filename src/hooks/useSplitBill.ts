import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatCOP } from "@/lib/currency";
import type { CartItem } from "@/lib/pos-types";
import type { Customer } from "@/components/pos/CustomerSelection";
import type { PaymentMethod } from "@/components/pos/PaymentDialog";

export interface SplitClient {
  id: string;
  name: string;
  amount: number;
  subtotal: number;
  discount: number;
  items: CartItem[];
  paid: boolean;
  paymentMethod: PaymentMethod | null;
  amountReceived: number;
  splitDetails?: { cash: number; transfer: number };
  orderData?: any;
}

type ProcessSaleFn = (
  cart: any[],
  saleTotal: number,
  saleSubtotal: number,
  saleDiscountAmount: number,
  saleCustomer: any | null,
  method: PaymentMethod,
  amountReceived: number,
  deliveryData?: any,
  splitDetails?: { cash: number; transfer: number }
) => Promise<any | null>;

/**
 * Encapsula todo el estado y la lógica de SplitBillDialog.tsx (división de
 * cuenta por partes iguales o por artículos, cobro por cliente y
 * facturación parcial), extraído sin cambios de comportamiento.
 */
export function useSplitBill(
  isOpen: boolean,
  cart: CartItem[],
  subtotal: number,
  discountAmount: number,
  total: number,
  selectedCustomer: Customer | null,
  processSale: ProcessSaleFn
) {
  const [splitMode, setSplitModeRaw] = useState<"even" | "items">("even");
  const [evenCount, setEvenCount] = useState<number>(2);
  const [evenClients, setEvenClients] = useState<SplitClient[]>([]);
  const [itemsClients, setItemsClients] = useState<SplitClient[]>([]);
  const [activePaymentIndex, setActivePaymentIndex] = useState<number | null>(null);

  // Active Payment Form State
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [mixCash, setMixCash] = useState<string>("");
  const [mixTransfer, setMixTransfer] = useState<string>("");
  const [isSubmitProcessing, setIsSubmitProcessing] = useState<boolean>(false);
  const [viewingReceiptIndex, setViewingReceiptIndex] = useState<number | null>(null);

  const updateEvenSplits = (count: number) => {
    const splitTotal = Math.round(total / count);
    const splitSubtotal = Math.round(subtotal / count);
    const splitDiscount = Math.round(discountAmount / count);

    const clients: SplitClient[] = Array.from({ length: count }, (_, i) => {
      // The last client absorbs rounding differences
      const isLast = i === count - 1;
      const clientAmount = isLast ? total - (splitTotal * (count - 1)) : splitTotal;
      const clientSubtotal = isLast ? subtotal - (splitSubtotal * (count - 1)) : splitSubtotal;
      const clientDiscount = isLast ? discountAmount - (splitDiscount * (count - 1)) : splitDiscount;

      // We split item quantities equally
      const clientItems = cart.map(item => ({
        ...item,
        quantity: item.quantity / count
      }));

      return {
        id: `even-${i + 1}`,
        name: `Cliente ${i + 1}`,
        amount: clientAmount,
        subtotal: clientSubtotal,
        discount: clientDiscount,
        items: clientItems,
        paid: false,
        paymentMethod: null,
        amountReceived: 0
      };
    });
    setEvenClients(clients);
  };

  // Initialize Split Clients
  useEffect(() => {
    if (isOpen) {
      setActivePaymentIndex(null);
      setViewingReceiptIndex(null);

      // Initialize Even Split
      updateEvenSplits(evenCount);

      // Initialize Items Split with 2 clients
      setItemsClients([
        { id: "1", name: "Cliente 1", amount: 0, subtotal: 0, discount: 0, items: [], paid: false, paymentMethod: null, amountReceived: 0 },
        { id: "2", name: "Cliente 2", amount: 0, subtotal: 0, discount: 0, items: [], paid: false, paymentMethod: null, amountReceived: 0 }
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, total, subtotal, discountAmount, cart]);

  const handleEvenCountChange = (delta: number) => {
    const newCount = Math.max(2, Math.min(10, evenCount + delta));
    setEvenCount(newCount);
    updateEvenSplits(newCount);
  };

  // Helper to get quantities assigned to all clients for a specific cart item
  const getAssignedQuantity = (itemId: string, clientsList: SplitClient[]) => {
    return clientsList.reduce((sum, client) => {
      const clientItem = client.items.find(i => i.id === itemId);
      return sum + (clientItem ? clientItem.quantity : 0);
    }, 0);
  };

  const getUnassignedQuantity = (itemId: string, clientsList: SplitClient[]) => {
    const originalItem = cart.find(i => i.id === itemId);
    if (!originalItem) return 0;
    const assigned = getAssignedQuantity(itemId, clientsList);
    // Use floating precision protection
    const diff = originalItem.quantity - assigned;
    return diff > 0.001 ? Math.round(diff * 100) / 100 : 0;
  };

  // Check if all items are fully assigned across clients
  const isEverythingAssigned = useMemo(() => {
    return cart.every(item => getUnassignedQuantity(item.id, itemsClients) <= 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, itemsClients]);

  // Update client totals based on assigned items
  const recalculateItemsClients = (clients: SplitClient[]): SplitClient[] => {
    return clients.map(client => {
      const clientSubtotal = client.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Proportional discount allocation
      const proportion = subtotal > 0 ? (clientSubtotal / subtotal) : 0;
      const clientDiscount = Math.round(discountAmount * proportion);
      const clientTotal = Math.max(0, clientSubtotal - clientDiscount);

      return {
        ...client,
        subtotal: clientSubtotal,
        discount: clientDiscount,
        amount: clientTotal
      };
    });
  };

  const handleAdjustItemQuantity = (clientIndex: number, itemId: string, delta: number) => {
    const client = itemsClients[clientIndex];
    if (client.paid) return;

    const originalItem = cart.find(i => i.id === itemId);
    if (!originalItem) return;

    const currentClientItem = client.items.find(i => i.id === itemId);
    const currentQtyInClient = currentClientItem ? currentClientItem.quantity : 0;

    const nextQty = currentQtyInClient + delta;
    if (nextQty < 0) return;

    if (delta > 0) {
      // Check if we have unassigned stock available
      const unassigned = getUnassignedQuantity(itemId, itemsClients);
      if (unassigned <= 0) {
        toast.warning("No hay más unidades disponibles de este producto");
        return;
      }
    }

    let updatedItems = [...client.items];
    if (nextQty === 0) {
      updatedItems = updatedItems.filter(i => i.id !== itemId);
    } else {
      const itemIndex = updatedItems.findIndex(i => i.id === itemId);
      if (itemIndex >= 0) {
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], quantity: nextQty };
      } else {
        updatedItems.push({ ...originalItem, quantity: nextQty });
      }
    }

    const updatedClients = itemsClients.map((c, idx) => {
      if (idx === clientIndex) {
        return { ...c, items: updatedItems };
      }
      return c;
    });

    setItemsClients(recalculateItemsClients(updatedClients));
  };

  const handleAddClient = () => {
    if (itemsClients.length >= 6) {
      toast.warning("Máximo 6 clientes en división por artículos");
      return;
    }
    const newClient: SplitClient = {
      id: (itemsClients.length + 1).toString(),
      name: `Cliente ${itemsClients.length + 1}`,
      amount: 0,
      subtotal: 0,
      discount: 0,
      items: [],
      paid: false,
      paymentMethod: null,
      amountReceived: 0
    };
    setItemsClients([...itemsClients, newClient]);
  };

  const handleRemoveClient = (clientIndex: number) => {
    const client = itemsClients[clientIndex];
    if (client.paid) {
      toast.error("No se puede eliminar un cliente que ya ha pagado");
      return;
    }

    const updatedClients = itemsClients.filter((_, idx) => idx !== clientIndex);
    // Reindex clients to keep names clean
    const reindexedClients = updatedClients.map((c, idx) => ({
      ...c,
      name: `Cliente ${idx + 1}`
    }));
    setItemsClients(recalculateItemsClients(reindexedClients));
  };

  // Derived properties
  const activeClients = splitMode === "even" ? evenClients : itemsClients;
  const isFullySettled = activeClients.length > 0 && activeClients.every(c => c.paid || (splitMode === "items" && c.items.length === 0));
  const paidCount = activeClients.filter(c => c.paid).length;
  const totalPaidAmount = activeClients.reduce((sum, c) => sum + (c.paid ? c.amount : 0), 0);

  const setSplitMode = (val: "even" | "items") => {
    if (paidCount > 0) {
      toast.warning("No se puede cambiar el modo de división una vez iniciado el cobro");
      return;
    }
    setSplitModeRaw(val);
  };

  const handleOpenPayment = (index: number) => {
    const clientsList = splitMode === "even" ? evenClients : itemsClients;
    const client = clientsList[index];
    if (client.paid) return;

    setActivePaymentIndex(index);
    setSelectedMethod("cash");
    setCashReceived(Math.round(client.amount).toString());
    setMixCash("");
    setMixTransfer("");
  };

  const handleSelectMethod = (method: PaymentMethod) => {
    if (activePaymentIndex === null) return;
    setSelectedMethod(method);
    setCashReceived(Math.round(activeClients[activePaymentIndex].amount).toString());
    setMixCash("");
    setMixTransfer("");
  };

  const handleCancelPayment = () => {
    setActivePaymentIndex(null);
  };

  const handleConfirmClientPayment = async () => {
    if (activePaymentIndex === null) return;

    const clientsList = splitMode === "even" ? evenClients : itemsClients;
    const client = clientsList[activePaymentIndex];
    const finalTotal = client.amount;

    // Validation
    if (selectedMethod === "cash" && parseFloat(cashReceived || "0") < finalTotal) {
      toast.error("El monto recibido es insuficiente");
      return;
    }

    if (selectedMethod === "split") {
      const cash = parseFloat(mixCash || "0");
      const transfer = parseFloat(mixTransfer || "0");
      if (Math.abs((cash + transfer) - finalTotal) > 1) {
        toast.error(`La suma de efectivo y transferencia (${formatCOP(cash + transfer)}) debe ser igual al total (${formatCOP(finalTotal)})`);
        return;
      }
    }

    setIsSubmitProcessing(true);

    try {
      const splitDetails = selectedMethod === "split"
        ? { cash: parseFloat(mixCash || "0"), transfer: parseFloat(mixTransfer || "0") }
        : undefined;

      const amountRec = selectedMethod === "cash" ? parseFloat(cashReceived || "0") : finalTotal;

      const orderData = await processSale(
        client.items,
        client.amount,
        client.subtotal,
        client.discount,
        selectedCustomer,
        selectedMethod,
        amountRec,
        undefined, // Delivery is pickup for split bills
        splitDetails
      );

      if (orderData) {
        const updatedClient = {
          ...client,
          paid: true,
          paymentMethod: selectedMethod,
          amountReceived: amountRec,
          splitDetails,
          orderData
        };

        if (splitMode === "even") {
          setEvenClients(prev => prev.map((c, idx) => idx === activePaymentIndex ? updatedClient : c));
        } else {
          setItemsClients(prev => prev.map((c, idx) => idx === activePaymentIndex ? updatedClient : c));
        }

        toast.success(`Pago de ${client.name} procesado exitosamente`);
        setActivePaymentIndex(null);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Error al procesar el pago: " + (e.message || "Error desconocido"));
    } finally {
      setIsSubmitProcessing(false);
    }
  };

  return {
    splitMode, setSplitMode,
    evenCount,
    evenClients,
    itemsClients,
    activePaymentIndex,
    selectedMethod, handleSelectMethod,
    cashReceived, setCashReceived,
    mixCash, setMixCash,
    mixTransfer, setMixTransfer,
    isSubmitProcessing,
    viewingReceiptIndex, setViewingReceiptIndex,
    handleEvenCountChange,
    getUnassignedQuantity,
    isEverythingAssigned,
    handleAdjustItemQuantity,
    handleAddClient,
    handleRemoveClient,
    handleOpenPayment,
    handleCancelPayment,
    handleConfirmClientPayment,
    activeClients,
    isFullySettled,
    paidCount,
    totalPaidAmount,
  };
}
