import React, { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Megaphone, Clock, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMarketing } from "@/hooks/useMarketing";
import PricingRuleCard from "@/components/marketing/PricingRuleCard";
import PricingRuleForm from "@/components/marketing/PricingRuleForm";

const DAYS_OF_WEEK = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 7, label: "Domingo" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

export default function Marketing() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  
  const { 
    rules, 
    isLoading, 
    isProcessing, 
    saveRule, 
    deleteRule, 
    storeId 
  } = useMarketing();

  const openCreateDialog = () => {
    setEditingRule(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (rule: any) => {
    setEditingRule(rule);
    setIsDialogOpen(true);
  };

  return (
    <Layout>
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="min-h-screen text-foreground p-6 lg:p-10 space-y-10"
        >
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent italic uppercase font-space-grotesk whitespace-nowrap">
                        Dynamic Engine
                    </h1>
                    <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
                        Protocolos de Precios Dinámicos • Marketing Intelligence
                    </p>
                </div>
                <Button 
                    onClick={openCreateDialog} 
                    className="h-14 px-8 rounded-[1.5rem] bg-primary text-primary-foreground font-black italic uppercase tracking-widest shadow-glow-pro hover:shadow-primary/40 transition-all gap-3"
                >
                    <Plus className="w-5 h-5" /> Nueva Regla
                </Button>
            </motion.div>

            <motion.div variants={itemVariants} className="relative group max-w-2xl bg-muted/20 border border-border p-6 rounded-[2rem] glass-pro">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Megaphone className="w-5 h-5 text-primary shadow-glow-pro" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black italic uppercase tracking-wider text-foreground mb-1">Optimización Automática</h3>
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest italic leading-relaxed">
                            Configura ventanas de tiempo y ajustes de valor para maximizar el flujo de caja en horas valle o eventos especiales.
                        </p>
                    </div>
                </div>
            </motion.div>

            <motion.div variants={itemVariants}>
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight text-foreground leading-none">Algoritmos de Precios</h2>
                    </div>
                    <div className="flex items-center gap-3 bg-muted/20 px-4 h-9 rounded-full border border-border font-black text-[9px] text-muted-foreground italic uppercase">
                       <LayoutGrid className="w-3.5 h-3.5" /> Matriz de Reglas
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6 shadow-glow-pro" />
                        <p className="text-primary font-black uppercase tracking-widest text-[10px] italic animate-pulse">Sincronizando protocolos dinámicos...</p>
                    </div>
                ) : rules && rules.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <AnimatePresence mode="popLayout">
                            {rules.map((rule) => (
                                <PricingRuleCard 
                                    key={rule.id} 
                                    rule={rule} 
                                    onEdit={openEditDialog} 
                                    onDelete={deleteRule}
                                    daysOfWeek={DAYS_OF_WEEK}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 opacity-30">
                        <Clock className="w-24 h-24 mb-6 text-white" />
                        <h3 className="text-xl font-black italic uppercase tracking-widest text-white tracking-tighter">SIN REGLAS ACTIVAS</h3>
                        <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em] mt-3 text-center">Inicie el despliegue de protocolos de precios dinámicos para optimizar ventas.</p>
                        <Button 
                            onClick={openCreateDialog} 
                            variant="outline" 
                            className="mt-10 rounded-2xl border-white/10 hover:bg-white/5 font-black text-[9px] uppercase tracking-widest italic"
                        >
                            Inicializar Primer Protocolo
                        </Button>
                    </div>
                )}
            </motion.div>

            <PricingRuleForm 
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                editingRule={editingRule}
                onSave={saveRule}
                isProcessing={isProcessing}
                daysOfWeek={DAYS_OF_WEEK}
                storeId={storeId}
            />
        </motion.div>
    </Layout>
  );
}
