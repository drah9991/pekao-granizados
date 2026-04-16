import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Edit, Trash2, Users, MapPin, Phone, Mail, IdCard, MessageSquare, ShieldCheck, UserPlus, CreditCard, LayoutGrid, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatCOP } from "@/lib/currency";
import { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Customer = Tables<'customers'> & { document_id?: string; consent_habeas_data?: boolean };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  }
};

export default function Customers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        document_id: "",
        consent_habeas_data: false,
    });
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from("customers")
                .select("*")
                .order("name", { ascending: true, nullsFirst: false });

            if (error) throw error;
            setCustomers(data || []);
        } catch (error: any) {
            console.error("Error fetching customers:", error);
            toast.error("Error al cargar clientes: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const openCreateDialog = () => {
        setEditingCustomer(null);
        setFormData({ name: "", email: "", phone: "", document_id: "", consent_habeas_data: false });
        setDialogOpen(true);
    };

    const openEditDialog = (customer: Customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name || "",
            email: customer.email || "",
            phone: customer.phone || "",
            document_id: customer.document_id || "",
            consent_habeas_data: customer.consent_habeas_data || false,
        });
        setDialogOpen(true);
    };

    const handleSaveCustomer = async () => {
        if (!formData.name || !formData.document_id) {
            toast.error("El nombre y documento del cliente son obligatorios.");
            return;
        }
        if (!formData.consent_habeas_data) {
            toast.error("Debe autorizar el tratamiento de datos (Ley 1581) para continuar.");
            return;
        }

        setIsProcessing(true);
        try {
            const customerData = {
                name: formData.name.trim(),
                email: formData.email.trim() || null,
                phone: formData.phone.trim() || null,
                document_id: formData.document_id.trim() || null,
                consent_habeas_data: formData.consent_habeas_data,
            };

            if (editingCustomer) {
                const { error } = await supabase
                    .from("customers")
                    .update(customerData)
                    .eq("id", editingCustomer.id);

                if (error) throw error;
                toast.success("Perfil actualizado con éxito.");
            } else {
                const { error } = await supabase
                    .from("customers")
                    .insert([customerData]);

                if (error) throw error;
                toast.success("Cliente indexado correctamente.");
            }

            setDialogOpen(false);
            fetchCustomers();
        } catch (error: any) {
            console.error("Error saving customer:", error);
            toast.error("Error en la operación: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteCustomer = async (customer: Customer) => {
        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from("customers")
                .delete()
                .eq("id", customer.id);

            if (error) {
                if (error.code === '23503') {
                    throw new Error("Persistencia de datos activa: El cliente posee órdenes vinculadas.");
                }
                throw error;
            }
            toast.success("Entidad eliminada.");
            fetchCustomers();
        } catch (error: any) {
            console.error("Error deleting customer:", error);
            toast.error(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredCustomers = customers.filter(customer =>
        (customer.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.phone || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.document_id || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Layout>
            <motion.div 
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="min-h-screen text-foreground p-6 lg:p-10 space-y-10"
            >
                {/* Header Section */}
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

                {/* Top Metrics Bento */}
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
                            {formatCOP(customers.reduce((acc, c) => acc + (c as any).total_spent || 0, 0))}
                        </div>
                        <div className="mt-2 text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest italic">Facturación Acumulada CRM</div>
                    </Card>
                </motion.div>

                {/* Filter Area */}
                <motion.div variants={itemVariants} className="relative group max-w-2xl">
                    <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="BUSCAR POR NOMBRE, EMAIL, CC O TELÉFONO..."
                        className="pl-16 h-16 bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk focus:border-primary/50 focus:ring-primary/20 shadow-pro transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </motion.div>

                {/* Customer Identity Grid */}
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
                                    <motion.div
                                        key={customer.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className="bg-muted border border-border rounded-[2.5rem] p-8 glass-pro hover:bg-muted/80 hover:border-primary/20 hover:shadow-pro transition-all group relative overflow-hidden"
                                    >
                                        <div className="flex flex-col lg:flex-row gap-8 relative z-10">
                                            {/* Avatar / Initials */}
                                            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl lg:text-3xl font-black italic font-space-grotesk shadow-glow-pro group-hover:scale-110 transition-transform duration-500">
                                                {customer.name?.charAt(0).toUpperCase()}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="text-2xl font-black italic font-space-grotesk text-foreground tracking-tight truncate group-hover:text-primary transition-colors">
                                                        {customer.name || 'IDENTIDAD OCULTA'}
                                                    </h3>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="ghost" size="icon" className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 hover:bg-primary/20 hover:text-primary transition-all shadow-pro"
                                                            onClick={() => openEditDialog(customer)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost" size="icon" className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 hover:bg-rose-500/20 hover:text-rose-500 transition-all shadow-pro"
                                                            onClick={() => handleDeleteCustomer(customer)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mb-6">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 text-[10px] font-black text-white/40 italic uppercase tracking-widest">
                                                            <IdCard className="w-3.5 h-3.5 text-primary" /> CC: {customer.document_id || 'N/A'}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] font-black text-white/40 italic uppercase tracking-widest">
                                                            <Phone className="w-3.5 h-3.5 text-indigo-400" /> {customer.phone || 'NO PHONE'}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 text-[10px] font-black text-white/40 italic uppercase tracking-widest">
                                                            <Mail className="w-3.5 h-3.5 text-amber-500" /> {customer.email || 'NO EMAIL'}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] font-black text-white/40 italic uppercase tracking-widest">
                                                            <ShieldCheck className={cn("w-3.5 h-3.5", customer.consent_habeas_data ? "text-emerald-500" : "text-rose-500")} /> HABEAS: {customer.consent_habeas_data ? 'OK' : 'FAIL'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest italic leading-none mb-1">FACTURACIÓN ACUMULADA</p>
                                                        <p className="text-lg lg:text-xl font-black italic font-space-grotesk text-emerald-500 shadow-glow-pro-text">{formatCOP((customer as any).total_spent || 0)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest italic leading-none mb-1">ÚLTIMA COMPRA</p>
                                                        <p className="text-[10px] font-black text-white/60 italic font-space-grotesk uppercase">{customer.last_order_at ? new Date(customer.last_order_at).toLocaleDateString('es-CO') : 'SIN MOVIMIENTO'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </motion.div>

                {/* Create/Edit Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto custom-scrollbar glass-pro border-white/10 rounded-[3rem] text-white shadow-pro">
                        <DialogHeader className="mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-glow-pro">
                                    <UserPlus className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">{editingCustomer ? "Editar Identidad" : "Nueva Identidad CRM"}</DialogTitle>
                                    <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Registro y Validación de Cliente en Red Central</DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <form onSubmit={(e) => { e.preventDefault(); handleSaveCustomer(); }} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">NOMBRE COMPLETO</Label>
                                    <Input
                                        placeholder="EJ: MARIA GÓMEZ"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                                        className="h-14 bg-white/5 border-white/10 rounded-2xl text-xs font-black italic uppercase focus:ring-primary/20"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">DOCUMENTO (CC/NIT)</Label>
                                    <Input
                                        placeholder="EJ: 1000123456"
                                        value={formData.document_id}
                                        onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
                                        className="h-14 bg-white/5 border-white/10 rounded-2xl text-xs font-black italic focus:ring-primary/20"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">EMAIL CORP/PERS</Label>
                                    <Input
                                        type="email"
                                        placeholder="EJ: MARIA@DOMINIO.COM"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                                        className="h-14 bg-white/5 border-white/10 rounded-2xl text-xs font-black italic focus:ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">CANAL WHATSAPP</Label>
                                    <Input
                                        placeholder="EJ: 300 123 4567"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="h-14 bg-white/5 border-white/10 rounded-2xl text-xs font-black italic focus:ring-primary/20"
                                    />
                                </div>
                            </div>

                            <div className="p-6 glass-pro bg-primary/5 rounded-[2rem] border border-primary/10 flex items-start gap-4">
                                <input
                                    type="checkbox"
                                    id="consent"
                                    className="mt-1 w-5 h-5 rounded-lg border-white/10 bg-white/5 text-primary focus:ring-primary/40 cursor-pointer"
                                    checked={formData.consent_habeas_data}
                                    onChange={(e) => setFormData({ ...formData, consent_habeas_data: e.target.checked })}
                                    required
                                />
                                <Label htmlFor="consent" className="text-[10px] font-black text-white/60 uppercase italic tracking-widest leading-relaxed cursor-pointer select-none">
                                    Autorizo el tratamiento de datos personales conforme a la <span className="text-primary tracking-tighter">LEY 1581 DE 2012 (HÁBEAS DATA)</span> para fines de facturación y compliance digital.
                                </Label>
                            </div>

                            <DialogFooter className="gap-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setDialogOpen(false)}
                                    disabled={isProcessing}
                                    className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase italic tracking-widest text-white/40 hover:text-white hover:bg-white/5"
                                >
                                    ABORTAR
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isProcessing || !formData.name || !formData.document_id || !formData.consent_habeas_data}
                                    className="flex-1 h-14 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest shadow-glow-pro hover:shadow-primary/40 transition-all font-space-grotesk"
                                >
                                    {isProcessing ? "PROCESANDO..." : editingCustomer ? "GUARDAR CAMBIOS" : "INDEXAR ENTIDAD ✓"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </motion.div>
        </Layout>
    );
}
