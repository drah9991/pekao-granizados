import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CreditCard, Smartphone, Calculator, RefreshCw, TrendingUp, Clock, Receipt, ArrowUpRight, Banknote, Wallet, PieChart as PieChartIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatCOP } from "@/lib/currency";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTurn } from "@/context/TurnContext";
import { cn } from "@/lib/utils";
import { es } from "date-fns/locale";

interface CashSummary {
    cash: number;
    transfer: number;
    card: number;
    qr: number;
    total: number;
}

interface OrderRecord {
    id: string;
    total: number;
    created_at: string;
    payment: any;
    user: { name: string | null } | null;
}

export default function CashRegister() {
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
    const [turnsHistory, setTurnsHistory] = useState<any[]>([]);
    const { storeId } = useAuth();
    const { reopenTurn } = useTurn();

    useEffect(() => {
        if (storeId) {
            fetchTurnsHistory();
        }
    }, [storeId]);

    useEffect(() => {
        if (turnsHistory.length > 0) {
            fetchDailyArqueo();
        }
    }, [turnsHistory, selectedTurnId]);

    const fetchTurnsHistory = async () => {
        if (!storeId) return;
        const { data, error } = await supabase
            .from("cash_turns")
            .select("*, profiles:cashier_id(name)")
            .eq("store_id", storeId)
            .order("opened_at", { ascending: false })
            .limit(50);
        if (!error && data) {
            setTurnsHistory(data);
        }
    };

    const fetchDailyArqueo = async () => {
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

                if (method === 'cash') {
                    totals.cash += amount;
                } else if (method === 'transfer') {
                    totals.transfer += amount;
                } else if (method === 'card') {
                    totals.card += amount;
                } else if (method === 'qr') {
                    totals.qr += amount;
                } else if (method === 'split' && payment.details) {
                    totals.cash += (Number(payment.details.cash) || 0);
                    totals.transfer += (Number(payment.details.transfer) || 0);
                } else {
                    totals.cash += amount;
                }
            });

            setSummary(totals);

        } catch (error: any) {
            console.error("Error fetching daily orders for cash register:", error);
            toast.error("Error al calcular el arqueo: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Computed metrics
    const avgTicket = orders.length > 0 ? Math.round(summary.total / orders.length) : 0;

    const cashPercentage = summary.total > 0 ? Math.round((summary.cash / summary.total) * 100) : 0;
    const transferPercentage = summary.total > 0 ? Math.round(((summary.transfer + summary.qr) / summary.total) * 100) : 0;
    const cardPercentage = summary.total > 0 ? Math.round((summary.card / summary.total) * 100) : 0;

    // Hourly distribution
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

    const getMethodBadge = (method: string) => {
        switch (method) {
            case 'transfer':
                return (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-500 text-[10px] font-black uppercase tracking-tight shadow-[0_0_12px_rgba(6,182,212,0.1)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                        Transferencia
                    </div>
                );
            case 'card':
                return (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/10 text-violet-500 text-[10px] font-black uppercase tracking-tight shadow-[0_0_12px_rgba(139,92,246,0.1)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                        Datáfono
                    </div>
                );
            case 'qr':
                return (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-tight shadow-[0_0_12px_rgba(99,102,241,0.1)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        QR
                    </div>
                );
            case 'split':
                return (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-tight shadow-[0_0_12px_rgba(245,158,11,0.1)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Mixto
                    </div>
                );
            default:
                return (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-tight shadow-[0_0_12px_rgba(16,185,129,0.1)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Efectivo
                    </div>
                );
        }
    };

    return (
        <Layout>
            <div className="min-h-screen bg-[#0F1117] text-white p-6 lg:p-10 space-y-8 animate-in fade-in duration-700">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-1 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                            Libro de Turnos
                        </h1>
                        <p className="text-slate-400 font-medium">
                            Arqueo de caja por jornada
                        </p>
                    </div>

                    <div className="flex items-center gap-3 self-start">
                        <Select value={selectedTurnId} onValueChange={setSelectedTurnId}>
                            <SelectTrigger className="w-[300px] h-11 bg-slate-900/50 border border-slate-800/50 rounded-2xl text-sm font-bold shadow-inner">
                                <SelectValue placeholder="Seleccionar turno..." />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1C1F26] border-slate-800/50 rounded-2xl">
                                <SelectItem value="active">Turno Actual / Más Reciente</SelectItem>
                                {turnsHistory.map(turn => (
                                    <SelectItem key={turn.id} value={turn.id}>
                                        {format(new Date(turn.opened_at), "d MMM hh:mm a", { locale: es })} - {(turn.status === 'open' || turn.status === 'paused') ? 'ACTUAL' : 'Cerrado'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            onClick={fetchDailyArqueo}
                            variant="ghost"
                            className="h-11 px-5 bg-slate-900/50 border border-slate-800/50 rounded-2xl text-sm font-bold hover:bg-slate-800/80 hover:text-white transition-all shadow-inner"
                            disabled={loading}
                        >
                            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                            Sincronizar
                        </Button>
                    </div>
                </div>

                {/* Hero KPI Card: Total */}
                <Card className="bg-gradient-to-br from-[#1C1F26] to-[#16181D] border-none rounded-[3rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-primary/5 pointer-events-none" />
                    <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                    <CardContent className="p-8 lg:p-10">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.15)]">
                                    <Wallet className="w-10 h-10 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2">Recaudación Total del Turno</p>
                                    <div className="text-5xl lg:text-6xl font-black tracking-tighter">
                                        {formatCOP(summary.total)}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 mt-3">
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black">
                                            <Receipt className="w-3 h-3" />
                                            {orders.length} ventas
                                        </div>
                                        {orders.length > 0 && (
                                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black">
                                                <TrendingUp className="w-3 h-3" />
                                                Ticket prom: {formatCOP(avgTicket)}
                                            </div>
                                        )}
                                        {peakHour !== '--' && (
                                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black">
                                                <Clock className="w-3 h-3" />
                                                Pico: {peakHour}
                                            </div>
                                        )}
                                        {(() => {
                                            const activeT = selectedTurnId === 'active' ? (turnsHistory.find(t => t.status === 'open' || t.status === 'paused') || turnsHistory[0]) : turnsHistory.find(t => t.id === selectedTurnId);
                                            if (activeT && activeT.status === 'closed') {
                                                return (
                                                    <Button 
                                                        onClick={() => reopenTurn(activeT.id).then(fetchTurnsHistory)} 
                                                        variant="outline" 
                                                        size="sm"
                                                        className="h-6 text-[10px] uppercase font-black tracking-widest border-blue-500/50 text-blue-500 hover:bg-blue-500/20 hover:text-blue-400 rounded-full ml-1"
                                                    >
                                                        <Clock className="w-3 h-3 mr-1" /> Reabrir Histórico
                                                    </Button>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Payment Distribution Mini Bars */}
                            {summary.total > 0 && (
                                <div className="flex flex-col gap-4 min-w-[260px]">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Distribución de Recaudo</p>
                                    {/* Cash */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                                <span className="text-[11px] font-black text-slate-300">Efectivo</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[11px] font-black text-white">{formatCOP(summary.cash)}</span>
                                                <span className="text-[10px] font-bold text-slate-500 ml-2">{cashPercentage}%</span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-1000" style={{ width: `${cashPercentage}%` }} />
                                        </div>
                                    </div>
                                    {/* Transfer */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
                                                <span className="text-[11px] font-black text-slate-300">Transferencias / QR</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[11px] font-black text-white">{formatCOP(summary.transfer + summary.qr)}</span>
                                                <span className="text-[10px] font-bold text-slate-500 ml-2">{transferPercentage}%</span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all duration-1000" style={{ width: `${transferPercentage}%` }} />
                                        </div>
                                    </div>
                                    {/* Card */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.4)]" />
                                                <span className="text-[11px] font-black text-slate-300">Datáfono</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[11px] font-black text-white">{formatCOP(summary.card)}</span>
                                                <span className="text-[10px] font-bold text-slate-500 ml-2">{cardPercentage}%</span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all duration-1000" style={{ width: `${cardPercentage}%` }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Method Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Cash */}
                    <Card className="bg-[#1C1F26] border-none rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0" />
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Efectivo</span>
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-[1rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <Banknote className="w-5 h-5 text-emerald-500" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black mb-2 tracking-tighter">{formatCOP(summary.cash)}</div>
                            <div className="flex items-center gap-2">
                                {summary.total > 0 ? (
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-500">
                                        {cashPercentage}% del total
                                    </div>
                                ) : (
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Sin movimientos</span>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Transfer + QR */}
                    <Card className="bg-[#1C1F26] border-none rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/40 to-cyan-500/0" />
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Transferencias / QR</span>
                            <div className="w-10 h-10 bg-cyan-500/10 rounded-[1rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <Smartphone className="w-5 h-5 text-cyan-500" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black mb-2 tracking-tighter">{formatCOP(summary.transfer + summary.qr)}</div>
                            <div className="flex items-center gap-2">
                                {summary.total > 0 ? (
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/10 text-cyan-500">
                                        {transferPercentage}% del total
                                    </div>
                                ) : (
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Sin movimientos</span>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card */}
                    <Card className="bg-[#1C1F26] border-none rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-violet-500/0 via-violet-500/40 to-violet-500/0" />
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Datáfono</span>
                            <div className="w-10 h-10 bg-violet-500/10 rounded-[1rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <CreditCard className="w-5 h-5 text-violet-500" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black mb-2 tracking-tighter">{formatCOP(summary.card)}</div>
                            <div className="flex items-center gap-2">
                                {summary.total > 0 ? (
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-violet-500/10 text-violet-500">
                                        {cardPercentage}% del total
                                    </div>
                                ) : (
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Sin movimientos</span>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Avg Ticket */}
                    <Card className="bg-[#1C1F26] border-none rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0" />
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Ticket Promedio</span>
                            <div className="w-10 h-10 bg-primary/10 rounded-[1rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <TrendingUp className="w-5 h-5 text-primary" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black mb-2 tracking-tighter">{formatCOP(avgTicket)}</div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">por venta completada</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Orders Table */}
                <Card className="bg-[#1C1F26] border-none rounded-[3.5rem] p-8 lg:p-10 shadow-2xl border-t border-white/5 overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <CardTitle className="text-2xl font-black tracking-tight mb-1">Desglose de Facturación</CardTitle>
                            <CardDescription className="text-slate-400 font-medium tracking-wide">
                                {orders.length} órdenes registradas
                            </CardDescription>
                        </div>
                        <div className="p-1 px-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                            Completadas
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
                            <p className="text-slate-400 font-bold animate-pulse">Calculando totales...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-40">
                            <Calculator className="w-20 h-20 mb-6" />
                            <h3 className="text-xl font-black mb-2">No hay ventas registradas</h3>
                            <p className="text-slate-400 font-medium text-sm text-center max-w-md">
                                Aún no se han completado órdenes en esta tienda durante el periodo seleccionado.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-8 lg:-mx-10 px-8 lg:px-10">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                                        <th className="pb-6 pl-2">Hora</th>
                                        <th className="pb-6">No. Orden</th>
                                        <th className="pb-6">Cajero(a)</th>
                                        <th className="pb-6">Método de Pago</th>
                                        <th className="pb-6 text-right pr-2">Monto Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {orders.map((order) => {
                                        const payment = order.payment && typeof order.payment === 'object' ? order.payment : { method: 'cash' };
                                        const method = payment.method;

                                        return (
                                            <tr key={order.id} className="group hover:bg-white/[0.02] transition-colors duration-200">
                                                <td className="py-5 pl-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-slate-800/50 rounded-xl flex items-center justify-center">
                                                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-300">
                                                            {new Date(order.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-5">
                                                    <span className="text-xs font-black text-slate-400 group-hover:text-white transition-colors font-mono bg-slate-800/30 px-2.5 py-1 rounded-lg">
                                                        {order.id.split('-')[0].toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="py-5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-black text-[10px] shadow-inner">
                                                            {order.user?.name?.charAt(0)?.toUpperCase() || '?'}
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-300">{order.user?.name || "Desconocido"}</span>
                                                    </div>
                                                </td>
                                                <td className="py-5">
                                                    {getMethodBadge(method)}
                                                </td>
                                                <td className="py-5 text-right pr-2">
                                                    <span className="font-black text-lg text-white tabular-nums">
                                                        {formatCOP(order.total)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Table Footer Summary */}
                            <div className="border-t border-white/5 mt-4 pt-6 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Efectivo</p>
                                            <p className="text-sm font-black text-white">{formatCOP(summary.cash)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Digital</p>
                                            <p className="text-sm font-black text-white">{formatCOP(summary.transfer + summary.qr)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.4)]" />
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Tarjeta</p>
                                            <p className="text-sm font-black text-white">{formatCOP(summary.card)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Gran Total</p>
                                    <p className="text-2xl font-black text-emerald-500">{formatCOP(summary.total)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </Layout>
    );
}
