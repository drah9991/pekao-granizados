import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, CreditCard, Smartphone, Calculator, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { useAuth } from "@/hooks/useAuth";
import { startOfDay, endOfDay, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
    const [date, setDate] = useState<Date | undefined>(new Date());
    const { storeId } = useAuth();

    useEffect(() => {
        if (storeId) {
            fetchDailyArqueo();
        }
    }, [storeId, date]);

    const fetchDailyArqueo = async () => {
        setLoading(true);
        try {
            const selectedDate = date || new Date();
            const start = startOfDay(selectedDate).toISOString();
            const end = endOfDay(selectedDate).toISOString();

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

                // Extract payment method from JSON
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
                    totals.cash += amount; // fallback
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

    const currentDateTime = (date || new Date()).toLocaleDateString('es-CO', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <Layout>
            <div className="p-6 md:p-8 space-y-6 md:space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
                            Arqueo de Caja (Cierre Diario)
                        </h1>
                        <p className="text-muted-foreground text-sm md:text-base capitalize">
                            {currentDateTime}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] justify-start text-left font-normal shadow-sm",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                    locale={es}
                                />
                            </PopoverContent>
                        </Popover>
                        
                        <Button onClick={fetchDailyArqueo} variant="outline" className="shadow-sm" disabled={loading}>
                            <RefreshCw className={"w-4 h-4 mr-2 " + (loading ? "animate-spin" : "")} />
                            Actualizar
                        </Button>
                    </div>
                </div>

                {/* Global Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <Card className="glass-card shadow-card relative overflow-hidden group border-2 border-primary/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                        <CardContent className="p-6 flex flex-col justify-between min-h-[140px]">
                            <div className="flex items-start justify-between">
                                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Ventas</p>
                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                    <Calculator className="w-6 h-6" />
                                </div>
                            </div>
                            <p className="text-3xl md:text-4xl font-bold text-foreground mt-4">{formatCurrency(summary.total)}</p>
                        </CardContent>
                    </Card>

                    <Card className="glass-card shadow-card relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent pointer-events-none" />
                        <CardContent className="p-6 flex flex-col justify-between min-h-[140px]">
                            <div className="flex items-start justify-between">
                                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Efectivo Físico</p>
                                <div className="p-2 rounded-xl bg-green-500/10 text-green-500">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                            </div>
                            <p className="text-3xl md:text-4xl font-bold text-foreground mt-4">{formatCurrency(summary.cash)}</p>
                        </CardContent>
                    </Card>

                    <Card className="glass-card shadow-card relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none" />
                        <CardContent className="p-6 flex flex-col justify-between min-h-[140px]">
                            <div className="flex items-start justify-between">
                                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Transferencias / QR</p>
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                                    <Smartphone className="w-6 h-6" />
                                </div>
                            </div>
                            <p className="text-3xl md:text-4xl font-bold text-foreground mt-4">{formatCurrency(summary.transfer + summary.qr)}</p>
                        </CardContent>
                    </Card>

                    <Card className="glass-card shadow-card relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none" />
                        <CardContent className="p-6 flex flex-col justify-between min-h-[140px]">
                            <div className="flex items-start justify-between">
                                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pago Tarjeta (Datáfono)</p>
                                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                                    <CreditCard className="w-6 h-6" />
                                </div>
                            </div>
                            <p className="text-3xl md:text-4xl font-bold text-foreground mt-4">{formatCurrency(summary.card)}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Breakdown List */}
                <Card className="glass-card shadow-card">
                    <CardHeader>
                        <CardTitle>Desglose de Facturación</CardTitle>
                        <CardDescription>
                            {orders.length} órdenes registradas el {date ? format(date, "d 'de' MMMM", { locale: es }) : "día seleccionado"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                                <p className="text-muted-foreground">Calculando totales...</p>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-12">
                                <Calculator className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                                <h3 className="text-lg font-semibold mb-2">No hay ventas registradas</h3>
                                <p className="text-muted-foreground">Aún no se han completado órdenes en esta tienda durante el periodo seleccionado.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Hora</TableHead>
                                            <TableHead>No. Orden</TableHead>
                                            <TableHead>Cajero(a)</TableHead>
                                            <TableHead>Método</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orders.map((order) => {
                                            const payment = order.payment && typeof order.payment === 'object' ? order.payment : { method: 'cash' };
                                            const method = payment.method;
                                            let methodBadge = <Badge variant="default">Efectivo</Badge>;

                                            if (method === 'transfer') methodBadge = <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Transferencia</Badge>;
                                            if (method === 'card') methodBadge = <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20">Datáfono</Badge>;
                                            if (method === 'qr') methodBadge = <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20">QR</Badge>;
                                            if (method === 'split') methodBadge = <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20">Mixto (Efe+Tra)</Badge>;

                                            return (
                                                <TableRow key={order.id}>
                                                    <TableCell className="text-muted-foreground whitespace-nowrap">
                                                        {new Date(order.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-xs font-mono">
                                                        {order.id.split('-')[0].toUpperCase()}
                                                    </TableCell>
                                                    <TableCell>{order.user?.name || "Desconocido"}</TableCell>
                                                    <TableCell>{methodBadge}</TableCell>
                                                    <TableCell className="text-right font-bold text-foreground">
                                                        {formatCurrency(order.total)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
