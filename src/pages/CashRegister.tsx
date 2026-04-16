import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Smartphone, RefreshCw, TrendingUp, Clock, Receipt, Banknote, Wallet, ChevronRight, ArrowUpRight } from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

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

    return (
        <Layout>
            <motion.div 
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="min-h-screen bg-[#0F1117] text-white p-6 lg:p-10 space-y-8"
            >
                {/* Header Section */}
                <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent italic uppercase font-space-grotesk whitespace-nowrap">
                            Libro de Turnos
                        </h1>
                        <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
                            Auditoría de Recaudación • Standard v2.0 Pro Max
                        </p>
                    </div>

                    <div className="flex items-center gap-3 self-start">
                        <Select value={selectedTurnId} onValueChange={setSelectedTurnId}>
                            <SelectTrigger className="w-[300px] h-14 bg-white/5 border border-white/10 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk shadow-pro backdrop-blur-xl">
                                <SelectValue placeholder="Seleccionar turno..." />
                            </SelectTrigger>
                            <SelectContent className="glass-pro border-white/10 rounded-[1.5rem]">
                                <SelectItem value="active" className="text-[10px] font-black uppercase tracking-widest italic">Turno Actual / Más Reciente</SelectItem>
                                {turnsHistory.map(turn => (
                                    <SelectItem key={turn.id} value={turn.id} className="text-[10px] font-black uppercase tracking-widest italic">
                                        {format(new Date(turn.opened_at), "d MMM hh:mm a", { locale: es })} - {(turn.status === 'open' || turn.status === 'paused') ? 'ACTUAL' : 'Cerrado'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            onClick={fetchDailyArqueo}
                            variant="ghost"
                            className="h-14 w-14 bg-white/5 border border-white/10 rounded-full hover:bg-primary/20 hover:text-white transition-all shadow-glow-pro p-0"
                            disabled={loading}
                        >
                            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                        </Button>
                    </div>
                </motion.div>

                {/* Hero Liquid Balance */}
                <motion.div variants={itemVariants}>
                    <Card className="bg-[#1C1F26] border border-white/10 rounded-[3rem] shadow-pro relative overflow-hidden glass-pro dim-layering group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50 group-hover:opacity-70 transition-opacity" />
                        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-primary/5 rounded-full blur-[10rem] -translate-y-1/2 translate-x-1/2" />
                        <CardContent className="p-10 lg:p-12 relative z-10">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12">
                                <div className="flex items-center gap-8">
                                    <div className="w-24 h-24 bg-primary/20 rounded-[2rem] flex items-center justify-center border border-primary/30 shadow-glow-pro animate-pulse-subtle">
                                        <Wallet className="w-10 h-10 text-primary" />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 font-space-grotesk italic mb-3 block">DISPONIBILIDAD LÍQUIDA ACTUAL</Label>
                                        <div className="text-3xl sm:text-5xl lg:text-8xl font-black tracking-tighter font-space-grotesk italic text-white flex items-baseline gap-2">
                                            {formatCOP(summary.total).replace("$", "")}
                                            <span className="text-xl lg:text-2xl text-primary font-black uppercase tracking-widest italic ml-2">COP</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 mt-6">
                                            <Badge className="bg-primary/20 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest italic px-4 h-8">
                                                <Receipt className="w-3.5 h-3.5 mr-2" />
                                                {orders.length} VENTAS REGISTRADAS
                                            </Badge>
                                            <Badge className="bg-white/5 text-white/60 border-white/10 text-[10px] font-black uppercase tracking-widest italic px-4 h-8">
                                                <TrendingUp className="w-3.5 h-3.5 mr-2" />
                                                TICKET AVG: {formatCOP(avgTicket).replace("$", "")}
                                            </Badge>
                                            {peakHour !== '--' && (
                                                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-black uppercase tracking-widest italic px-4 h-8">
                                                    <Clock className="w-3.5 h-3.5 mr-2" />
                                                    PICO: {peakHour}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Distribution Progress */}
                                <div className="flex flex-col gap-6 p-8 glass-pro rounded-[2.5rem] border border-white/10 min-w-[320px] shadow-glow-pro">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 font-space-grotesk italic mb-1">COMPOSICIÓN DE LIQUIDEZ</Label>
                                    
                                    <div className="space-y-4">
                                        {[
                                            { label: "Efectivo", color: "bg-emerald-500", val: summary.cash, pct: cashPercentage },
                                            { label: "Digital (Transf/QR)", color: "bg-cyan-500", val: summary.transfer + summary.qr, pct: transferPercentage },
                                            { label: "Tarjetas", color: "bg-violet-500", val: summary.card, pct: cardPercentage }
                                        ].map((item, idx) => (
                                            <div key={idx} className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("w-2 h-2 rounded-full", item.color)} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{item.label}</span>
                                                    </div>
                                                    <span className="text-[11px] font-black text-white italic font-space-grotesk">{formatCOP(item.val)}</span>
                                                </div>
                                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${item.pct}%` }}
                                                        transition={{ duration: 1, delay: 0.5 + idx * 0.1 }}
                                                        className={cn("h-full rounded-full transition-all shadow-glow-pro", item.color)} 
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Method Bento Grid */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: "EFECTIVO", icon: Banknote, val: summary.cash, pct: cashPercentage, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                        { label: "DIGITAL", icon: Smartphone, val: summary.transfer + summary.qr, pct: transferPercentage, color: "text-cyan-500", bg: "bg-cyan-500/10" },
                        { label: "TARJETAS", icon: CreditCard, val: summary.card, pct: cardPercentage, color: "text-violet-500", bg: "bg-violet-500/10" },
                        { label: "TICKET AVG", icon: TrendingUp, val: avgTicket, pct: null, color: "text-primary", bg: "bg-primary/10" }
                    ].map((item, i) => (
                        <Card key={i} className="bg-[#1C1F26] border border-white/5 rounded-[2.5rem] shadow-pro glass-pro group hover:scale-[1.02] transition-all duration-500 overflow-hidden">
                            <CardContent className="p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 grow">{item.label}</Label>
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-glow-pro", item.bg, item.color)}>
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="text-2xl lg:text-3xl font-black font-space-grotesk italic text-white tracking-tighter mb-2">
                                    {formatCOP(item.val).replace("$", "")}
                                </div>
                                {item.pct !== null ? (
                                    <div className="flex items-center gap-2">
                                        <div className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase italic", item.bg, item.color)}>
                                            {item.pct}% DEL FLUJO
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest italic">BASADO EN {orders.length} VENTAS</span>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </motion.div>

                {/* Transactions Table Bento */}
                <motion.div variants={itemVariants}>
                    <Card className="bg-[#1C1F26] border border-white/10 rounded-[3rem] p-10 shadow-pro glass-pro overflow-hidden">
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
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60 block">EFECTIVO FÍSICO</Label>
                                            <p className="text-lg lg:text-2xl font-black font-space-grotesk italic text-white tracking-tighter">{formatCOP(summary.cash)}</p>
                                        </div>
                                        <div className="w-px h-10 bg-white/10 hidden md:block" />
                                        <div className="space-y-1">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-cyan-500/60 block">DEPÓSITOS DIGITALES</Label>
                                            <p className="text-lg lg:text-2xl font-black font-space-grotesk italic text-white tracking-tighter">{formatCOP(summary.transfer + summary.qr)}</p>
                                        </div>
                                        <div className="w-px h-10 bg-white/10 hidden md:block" />
                                        <div className="space-y-1">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-violet-500/60 block">RECAUDO PLÁSTICO</Label>
                                            <p className="text-lg lg:text-2xl font-black font-space-grotesk italic text-white tracking-tighter">{formatCOP(summary.card)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 block mb-1">RECAUDACIÓN BRUTA</Label>
                                        <p className="text-2xl lg:text-5xl font-black font-space-grotesk italic text-primary tracking-tighter shadow-glow-pro-text">{formatCOP(summary.total)}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </motion.div>
            </motion.div>
        </Layout>
    );
}

const Label = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <span className={cn("block", className)}>{children}</span>
);
