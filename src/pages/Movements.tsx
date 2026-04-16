import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Search, TrendingDown, TrendingUp, AlertTriangle, Package, History, ArrowRightLeft, User, Calendar, ShieldCheck, Filter, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Movement {
    id: string;
    type: string;
    qty: number;
    reason: string | null;
    created_at: string;
    product: { name: string } | null;
    user: { name: string | null } | null;
}

const typeMapping: Record<string, { label: string; icon: any; bg: string; text: string; glow: string }> = {
    entry: { label: "INYECCIÓN", icon: TrendingUp, bg: "bg-emerald-500/10", text: "text-emerald-500", glow: "shadow-emerald-500/20" },
    in: { label: "INYECCIÓN", icon: TrendingUp, bg: "bg-emerald-500/10", text: "text-emerald-500", glow: "shadow-emerald-500/20" },
    exit: { label: "EXTRACCIÓN", icon: TrendingDown, bg: "bg-rose-500/10", text: "text-rose-500", glow: "shadow-rose-500/20" },
    out: { label: "EXTRACCIÓN", icon: TrendingDown, bg: "bg-rose-500/10", text: "text-rose-500", glow: "shadow-rose-500/20" },
    sale: { label: "TRANSACCIÓN", icon: Activity, bg: "bg-indigo-500/10", text: "text-indigo-500", glow: "shadow-indigo-500/20" },
    waste: { label: "MERMA/DAÑO", icon: AlertTriangle, bg: "bg-amber-500/10", text: "text-amber-500", glow: "shadow-amber-500/20" },
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 100, damping: 15 }
    }
};

export default function Movements() {
    const [movements, setMovements] = useState<Movement[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedType, setSelectedType] = useState<string | "all">("all");
    const [loading, setLoading] = useState(true);
    const { storeId } = useAuth();

    useEffect(() => {
        if (storeId) {
            fetchMovements();
        }
    }, [storeId]);

    const fetchMovements = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("movements")
                .select(`
                  id,
                  type,
                  qty,
                  reason,
                  created_at,
                  product:products(name)
                `)
                .eq("store_id", storeId)
                .order("created_at", { ascending: false })
                .limit(100);

            if (error) throw error;
            setMovements((data as any) || []);
        } catch (error: any) {
            console.error("Error fetching movements:", error);
            toast.error("Error al cargar movimientos: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredMovements = movements.filter((mov) => {
        const matchesSearch =
            !searchQuery ||
            (mov.product?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (mov.reason || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (mov.user?.name || "").toLowerCase().includes(searchQuery.toLowerCase());

        const matchesType = selectedType === "all" || 
            mov.type === selectedType || 
            (selectedType === "in" && mov.type === "entry") ||
            (selectedType === "out" && mov.type === "exit");
        return matchesSearch && matchesType;
    });

    return (
        <Layout>
            <motion.div 
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="min-h-screen bg-transparent text-foreground p-6 lg:p-10 space-y-10"
            >
                {/* Header Section */}
                <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent italic uppercase font-space-grotesk whitespace-nowrap">
                            Kardex Digital
                        </h1>
                        <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
                            Trazabilidad Atómica de Activos • v2.0 Audit
                        </p>
                    </div>
                    <div className="flex items-center gap-3 bg-muted/40 p-2 rounded-[1.5rem] border border-border backdrop-blur-md">
                         <div className="px-4 py-2 bg-primary/20 rounded-xl border border-primary/20 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                            <span className="text-[9px] font-black text-primary uppercase italic tracking-widest leading-none">Safe Environment</span>
                         </div>
                    </div>
                </motion.div>

                {/* Filters Bento Area */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3 relative group">
                        <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="FILTRAR POR PRODUCTO, JUSTIFICACIÓN O USUARIO RESPONSABLE..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-16 h-16 bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk focus:border-primary/50 focus:ring-primary/20 shadow-pro transition-all"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/40 z-10 pointer-events-none" />
                        <Select value={selectedType} onValueChange={setSelectedType}>
                            <SelectTrigger className="h-16 bg-muted/40 border-border rounded-[1.5rem] pl-14 text-[10px] font-black italic uppercase font-space-grotesk focus:ring-primary/20 transition-all">
                                <SelectValue placeholder="VECTOR DE FLUJO" />
                            </SelectTrigger>
                            <SelectContent className="glass-pro border-border rounded-2xl">
                                <SelectItem value="all" className="text-[9px] font-black italic uppercase p-4 border-b border-border last:border-0">TODOS LOS VECTORES</SelectItem>
                                <SelectItem value="in" className="text-[9px] font-black italic uppercase p-4 border-b border-border last:border-0 text-emerald-500">INYECCIONES (+)</SelectItem>
                                <SelectItem value="out" className="text-[9px] font-black italic uppercase p-4 border-b border-border last:border-0 text-rose-500">EXTRACCIONES (-)</SelectItem>
                                <SelectItem value="sale" className="text-[9px] font-black italic uppercase p-4 border-b border-border last:border-0 text-indigo-400">VENTAS DIRECTAS</SelectItem>
                                <SelectItem value="waste" className="text-[9px] font-black italic uppercase p-4 border-b border-border last:border-0 text-amber-500">MERMA / SCRAP</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </motion.div>

                {/* Main Content Area */}
                <motion.div variants={itemVariants}>
                    <Card className="bg-muted border border-border rounded-[3.5rem] p-10 shadow-pro glass-pro overflow-hidden">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center shadow-glow-pro text-indigo-400">
                                   <History className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl lg:text-2xl font-black italic uppercase font-space-grotesk tracking-tight text-foreground leading-none">Fila de Auditoría</h2>
                                    <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest italic mt-1">Sincronización en Tiempo Real</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-muted/60 px-4 h-9 rounded-full border border-border font-black text-[9px] text-muted-foreground/40 italic uppercase">
                               <LayoutGrid className="w-3.5 h-3.5" /> {filteredMovements.length} EVENTOS REGISTRADOS
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24">
                                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6 shadow-glow-pro" />
                                <p className="text-primary font-black uppercase tracking-widest text-[10px] italic animate-pulse">Consultando registro central...</p>
                            </div>
                        ) : filteredMovements.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 opacity-30">
                                <ArrowRightLeft className="w-24 h-24 mb-6 text-foreground" />
                                <h3 className="text-xl font-black italic uppercase tracking-widest text-foreground">SILENCIO OPERATIVO</h3>
                                <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-[0.2em] mt-3 text-center max-w-xs">No se han detectado desplazamientos de stock con los parámetros actuales.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <AnimatePresence mode="popLayout">
                                    {filteredMovements.map((mov, idx) => {
                                        const typeData = typeMapping[mov.type] || { label: mov.type.toUpperCase(), icon: Activity, bg: "bg-gray-500/10", text: "text-gray-500", glow: "" };
                                        const isEntry = mov.type === 'in' || mov.type === 'entry';
                                        
                                        return (
                                            <motion.div
                                                key={mov.id}
                                                layout
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ delay: idx * 0.02 }}
                                                className="flex flex-col lg:flex-row lg:items-center justify-between p-6 bg-muted/40 border border-border rounded-[2.5rem] hover:bg-muted/80 hover:border-primary/20 hover:shadow-pro transition-all group overflow-hidden relative"
                                            >
                                                {/* Background Flow Hint */}
                                                <div className={cn("absolute inset-0 opacity-[0.03] transition-opacity group-hover:opacity-[0.05]", isEntry ? "bg-emerald-500" : "bg-rose-500")} />

                                                <div className="flex items-center gap-6 flex-1 relative z-10">
                                                    <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center shadow-pro group-hover:scale-110 transition-transform duration-500 border", typeData.bg, typeData.text, "border-border/50")}>
                                                        <typeData.icon className={cn("w-7 h-7", typeData.glow)} />
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                            <div className={cn("px-4 py-1.5 rounded-full text-[9px] font-black italic uppercase tracking-[0.2em] border border-border/50 shadow-pro", typeData.bg, typeData.text)}>
                                                                {typeData.label}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground/20 italic font-space-grotesk tracking-widest">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                {format(new Date(mov.created_at), "dd MMM yyyy • HH:mm", { locale: es })}
                                                            </div>
                                                        </div>
                                                        <h3 className="text-base lg:text-xl font-black italic font-space-grotesk text-foreground tracking-tight group-hover:text-primary transition-colors truncate pr-2">
                                                            {mov.product?.name || "RECURSO INDETERMINADO"}
                                                        </h3>
                                                        <div className="flex items-center gap-4 mt-2">
                                                            <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground/40 italic uppercase tracking-widest">
                                                                <User className="w-3.5 h-3.5 text-primary" />
                                                                {mov.user?.name || "SYSTEM AUTO-PROCESS"}
                                                            </div>
                                                            {mov.reason && (
                                                                <div className="text-[10px] font-bold text-indigo-400 italic px-3 py-1 bg-indigo-500/5 rounded-lg border border-indigo-500/10 truncate max-w-[240px]">
                                                                    "{mov.reason}"
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-end gap-10 w-full lg:w-auto mt-6 lg:mt-0 pt-6 lg:pt-0 border-t lg:border-t-0 border-border relative z-10">
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.3em] italic mb-1">CANTIDAD VECTOR</p>
                                                        <div className={cn("text-2xl sm:text-3xl lg:text-4xl font-black italic font-space-grotesk tabular-nums leading-none tracking-tighter flex items-center justify-end gap-1", isEntry ? "text-emerald-500" : "text-rose-500")}>
                                                            <span className="text-xl mb-0.5">{isEntry ? '+' : '−'}</span>
                                                            {Math.abs(mov.qty)}
                                                            <span className="text-[10px] ml-1 text-muted-foreground/20 uppercase font-bold tracking-widest">UNIT</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="w-[1px] h-12 bg-border hidden lg:block" />

                                                    <div className="w-12 h-12 rounded-2xl bg-muted border border-border hover:bg-primary/20 hover:text-primary transition-all cursor-crosshair">
                                                        <Package className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                </Card>
            </motion.div>
        </Layout>
    );
}
