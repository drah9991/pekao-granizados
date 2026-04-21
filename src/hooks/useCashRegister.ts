import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CashSummary, OrderRecord, CashTurn } from "@/types/cashRegister";

export function useCashRegister(storeId: string | null) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [summary, setSummary] = useState<CashSummary>({
    cash: 0,
    transfer: 0,
    card: 0,
    qr: 0,
    total: 0,
  });
  const [selectedTurnId, setSelectedTurnId] = useState<string>("active");
  const [turnsHistory, setTurnsHistory] = useState<CashTurn[]>([]);

  const fetchTurnsHistory = async () => {
    if (!storeId) return;
    const { data, error } = await supabase
      .from("cash_turns")
      .select("*, profiles:cashier_id(name)")
      .eq("store_id", storeId)
      .order("opened_at", { ascending: false })
      .limit(50);
    if (!error && data) {
      setTurnsHistory(data as unknown as CashTurn[]);
    }
  };

  const fetchDailyArqueo = async () => {
    if (!storeId || turnsHistory.length === 0) return;
    setLoading(true);
    try {
      let turnToAudit = null;
      if (selectedTurnId === "active") {
        turnToAudit = turnsHistory.find(t => t.status === 'open' || t.status === 'paused') || turnsHistory[0];
      } else {
        turnToAudit = turnsHistory.find(t => t.id === selectedTurnId);
      }

      if (!turnToAudit) {
        setOrders([]);
        setSummary({ cash: 0, transfer: 0, card: 0, qr: 0, total: 0 });
        setLoading(false);
        return;
      }

      const start = turnToAudit.opened_at;
      const end = turnToAudit.closed_at || new Date().toISOString();

      const { data, error } = await supabase
        .from("orders")
        .select("id, total, created_at, payment, user:profiles!orders_created_by_fkey(name)")
        .eq("store_id", storeId)
        .eq("status", "completed")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const records = (data as any) || [];
      setOrders(records);

      let totals = { cash: 0, transfer: 0, card: 0, qr: 0, total: 0 };
      records.forEach((order: any) => {
        const amount = Number(order.total) || 0;
        totals.total += amount;
        const payment = order.payment && typeof order.payment === 'object' ? order.payment : { method: 'cash' };
        const method = payment.method;

        if (method === 'cash') totals.cash += amount;
        else if (method === 'transfer') totals.transfer += amount;
        else if (method === 'card') totals.card += amount;
        else if (method === 'qr') totals.qr += amount;
        else if (method === 'split' && payment.details) {
          totals.cash += (Number(payment.details.cash) || 0);
          totals.transfer += (Number(payment.details.transfer) || 0);
        } else totals.cash += amount;
      });

      setSummary(totals);
    } catch (error: any) {
      toast.error("Error al calcular el arqueo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) fetchTurnsHistory();
  }, [storeId]);

  useEffect(() => {
    fetchDailyArqueo();
  }, [turnsHistory, selectedTurnId]);

  const stats = useMemo(() => {
    const total = summary.total;
    return {
      avgTicket: orders.length > 0 ? Math.round(total / orders.length) : 0,
      cashPercentage: total > 0 ? Math.round((summary.cash / total) * 100) : 0,
      transferPercentage: total > 0 ? Math.round(((summary.transfer + summary.qr) / total) * 100) : 0,
      cardPercentage: total > 0 ? Math.round((summary.card / total) * 100) : 0,
    };
  }, [summary, orders]);

  const hourlyData = useMemo(() => {
    const hours: Record<number, { count: number; total: number }> = {};
    orders.forEach(o => {
      const h = new Date(o.created_at).getHours();
      if (!hours[h]) hours[h] = { count: 0, total: 0 };
      hours[h].count += 1;
      hours[h].total += Number(o.total) || 0;
    });
    return hours;
  }, [orders]);

  const peakHour = useMemo(() => {
    let maxTotal = 0;
    let peak = '--';
    Object.entries(hourlyData).forEach(([h, data]) => {
      if (data.total > maxTotal) {
        maxTotal = data.total;
        peak = `${h}:00`;
      }
    });
    return peak;
  }, [hourlyData]);

  return {
    loading,
    orders,
    summary,
    selectedTurnId,
    setSelectedTurnId,
    turnsHistory,
    stats,
    peakHour,
    refreshArqueo: fetchDailyArqueo
  };
}
