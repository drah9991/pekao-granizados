import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, IdCard, Phone, Mail, ShieldCheck } from "lucide-react";
import { formatCOP } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { Customer } from "@/hooks/useCustomers";

interface CustomerCardProps {
  customer: Customer;
  idx: number;
  onEdit: (c: Customer) => void;
  onDelete: (id: string) => void;
}

export default function CustomerCard({ customer, idx, onEdit, onDelete }: CustomerCardProps) {
  return (
    <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: idx * 0.03 }}
        className="bg-muted border border-border rounded-[2.5rem] p-8 glass-pro hover:bg-muted/80 hover:border-primary/20 hover:shadow-pro transition-all group relative overflow-hidden"
    >
        <div className="flex flex-col lg:flex-row gap-8 relative z-10">
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
                            onClick={() => onEdit(customer)}
                        >
                            <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost" size="icon" className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 hover:bg-rose-500/20 hover:text-rose-500 transition-all shadow-pro"
                            onClick={() => onDelete(customer.id)}
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
  );
}
