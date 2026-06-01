import React, { useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, Star, CreditCard, LayoutGrid, UserPlus } from "lucide-react";
import { formatCOP } from "@/lib/currency";
import { motion, AnimatePresence } from "framer-motion";
import { useCustomers, Customer } from "@/hooks/useCustomers";
import CustomerCard from "@/components/customers/CustomerCard";
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

export default function Customers() {
    const {
        customers,
        filteredCustomers,
        searchQuery, setSearchQuery,
        loading,
        isProcessing,
        handleSaveCustomer,
        handleDeleteCustomer
    } = useCustomers();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    const openCreateDialog = () => {
        setEditingCustomer(null);
        setDialogOpen(true);
    };

    const openEditDialog = (customer: Customer) => {
        setEditingCustomer(customer);
        setDialogOpen(true);
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
                            Identidad CRM
                        </h1>
                        <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
                            Maestro de Clientes Pro Max • Data Intelligence
                        </p>
                    </div>
                    <Button 
                        onClick={openCreateDialog} 
                        className="h-14 px-8 rounded-[1.5rem] bg-primary text-primary-foreground font-black italic uppercase tracking-widest shadow-glow-pro hover:shadow-primary/40 transition-all gap-3"
                    >
                        <UserPlus className="w-5 h-5" /> Vincular Cliente
                    </Button>
                </motion.div>

                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="bg-muted border border-border rounded-[2.5rem] shadow-pro glass-pro p-8 col-span-1">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic font-space-grotesk">TOTAL CLIENTES</span>
                            <Users className="w-5 h-5 text-primary shadow-glow-pro" />
                        </div>
                        <div className="text-2xl lg:text-4xl font-black italic font-space-grotesk text-foreground tabular-nums">{customers.length}</div>
                        <div className="mt-2 text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest italic">Entidades Registradas</div>
                    </Card>

                    <Card className="bg-muted border border-border rounded-[2.5rem] shadow-pro glass-pro p-8 col-span-1">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic font-space-grotesk">SCORE PROMEDIO</span>
                            <Star className="w-5 h-5 text-amber-500 shadow-glow-pro" />
                        </div>
                        <div className="text-2xl lg:text-4xl font-black italic font-space-grotesk text-foreground">4.8</div>
                        <div className="mt-2 text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest italic">Nivel de Lealtad</div>
                    </Card>

                    <Card className="bg-muted border border-border rounded-[2.5rem] shadow-pro glass-pro p-8 md:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic font-space-grotesk">VOLUMEN DE CARTERA</span>
                            <CreditCard className="w-5 h-5 text-emerald-500 shadow-glow-pro" />
                        </div>
                        <div className="text-2xl lg:text-4xl font-black italic font-space-grotesk text-foreground tabular-nums">
                            {formatCOP(customers.reduce((acc, c) => acc + (c.total_spent ?? 0), 0))}
                        </div>
                        <div className="mt-2 text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest italic">Facturación Acumulada CRM</div>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants} className="relative group max-w-2xl">
                    <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="BUSCAR POR NOMBRE, EMAIL, CC O TELÉFONO..."
                        className="pl-16 h-16 bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk focus:border-primary/50 focus:ring-primary/20 shadow-pro transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight text-foreground leading-none">Registros de Identidad</h2>
                        </div>
                        <div className="flex items-center gap-3 bg-muted/20 px-4 h-9 rounded-full border border-border font-black text-[9px] text-muted-foreground italic uppercase">
                           <LayoutGrid className="w-3.5 h-3.5" /> Listado Auditado
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                           <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6 shadow-glow-pro" />
                           <p className="text-primary font-black uppercase tracking-widest text-[10px] italic animate-pulse">Indexando base de datos CRM...</p>
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 opacity-30">
                           <Users className="w-24 h-24 mb-6 text-white" />
                           <h3 className="text-xl font-black italic uppercase tracking-widest text-white tracking-tighter">SIN COINCIDENCIAS</h3>
                           <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em] mt-3 text-center">No se encontraron identidades con los parámetros de búsqueda.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <AnimatePresence mode="popLayout">
                                {filteredCustomers.map((customer, idx) => (
                                    <CustomerCard 
                                        key={customer.id} 
                                        customer={customer} 
                                        idx={idx} 
                                        onEdit={openEditDialog}
                                        onDelete={handleDeleteCustomer}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </motion.div>

                <CustomerFormDialog 
                    isOpen={dialogOpen} 
                    onClose={() => setDialogOpen(false)} 
                    editingCustomer={editingCustomer} 
                    onSave={handleSaveCustomer}
                    isProcessing={isProcessing}
                />
            </motion.div>
        </Layout>
    );
}
