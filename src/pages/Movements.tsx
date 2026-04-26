import React from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, History, ArrowRightLeft, ShieldCheck, Filter, LayoutGrid } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useMovements } from "@/hooks/useMovements";
import MovementCard from "@/components/movements/MovementCard";

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants: Variants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

export default function Movements() {
    const { storeId } = useAuth();
    const {
        filteredMovements,
        searchQuery, setSearchQuery,
        selectedType, setSelectedType,
        loading
    } = useMovements(storeId);

    return (
        <Layout>
            <motion.div 
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="min-h-screen bg-transparent text-foreground p-6 lg:p-10 space-y-10"
            >
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
                                    {filteredMovements.map((mov, idx) => (
                                        <MovementCard key={mov.id} mov={mov} idx={idx} />
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </Card>
                </motion.div>
            </motion.div>
        </Layout>
    );
}
