import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { User, Shield, UserCog, Trash2, Mail, Phone, Store, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserCardProps {
  user: Record<string, unknown>;
  stores: Record<string, unknown>[];
  idx: number;
  onEdit: (u: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  currentUserId?: string;
  canManage: boolean;
}

const getRoleStyle = (role: string | null) => {
  switch (role) {
    case 'admin': return { label: 'ADMINISTRADOR', bg: 'bg-rose-500/10', text: 'text-rose-500', glow: 'shadow-rose-500/20' };
    case 'manager': return { label: 'GERENCIA', bg: 'bg-indigo-500/10', text: 'text-indigo-400', glow: 'shadow-indigo-500/20' };
    case 'cashier': return { label: 'OPERATIVO', bg: 'bg-emerald-500/10', text: 'text-emerald-500', glow: 'shadow-emerald-500/20' };
    default: return { label: role?.toUpperCase() || 'SIN ROL', bg: 'bg-muted/50', text: 'text-muted-foreground', glow: '' };
  }
};

export default function UserCard({ user, stores, idx, onEdit, onDelete, currentUserId, canManage }: UserCardProps) {
  const rStyle = getRoleStyle(user.role);
  const userStore = stores.find(s => s.id === user.store_id)?.name || "ASIGNACIÓN PENDIENTE";

  return (
    <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: idx * 0.03 }}
        className="bg-muted border border-border rounded-[2.5rem] p-8 glass-pro hover:bg-muted/80 hover:shadow-pro transition-all group overflow-hidden relative"
    >
        <div className="flex flex-col lg:flex-row gap-8 relative z-10">
            <div className="w-24 h-24 rounded-3xl bg-muted border border-border flex items-center justify-center relative group-hover:scale-110 transition-transform duration-500 shadow-pro">
                <div className="absolute inset-0 bg-primary/10 blur-xl group-hover:bg-primary/20 transition-all rounded-full" />
                <User className="w-8 h-8 lg:w-10 lg:h-10 text-foreground relative z-10" />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-muted border border-border flex items-center justify-center">
                    <Shield className={cn("w-5 h-5", rStyle.text)} />
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-4">
                    <div>
                       <h3 className="text-xl lg:text-2xl font-black italic font-space-grotesk text-foreground tracking-tight group-hover:text-primary transition-colors truncate">
                          {user.name?.toUpperCase() || 'ANÓNIMO'}
                       </h3>
                       <div className={cn("inline-flex px-3 py-1 rounded-full text-[9px] font-black italic uppercase tracking-[0.2em] border border-border/50 mt-2", rStyle.bg, rStyle.text, rStyle.glow)}>
                          {rStyle.label}
                       </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost" size="icon" className="w-10 h-10 rounded-xl bg-muted border border-border hover:bg-primary/20 hover:text-primary transition-all shadow-pro"
                            onClick={() => onEdit(user)}
                            disabled={!canManage && user.id !== currentUserId}
                        >
                            <UserCog className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost" size="icon" className="w-10 h-10 rounded-xl bg-muted border border-border hover:bg-rose-500/20 hover:text-rose-500 transition-all shadow-pro"
                            onClick={() => onDelete(user.id)}
                            disabled={!canManage || user.id === currentUserId}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                   <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[10px] font-black text-white/40 italic uppercase tracking-widest">
                         <Mail className="w-3.5 h-3.5 text-primary" /> {user.email || 'NO AUTH EMAIL'}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black text-white/40 italic uppercase tracking-widest">
                         <Phone className="w-3.5 h-3.5 text-indigo-400" /> {user.phone || 'NO CONTACT'}
                      </div>
                   </div>
                   <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[10px] font-black text-white/40 italic uppercase tracking-widest">
                         <Store className="w-3.5 h-3.5 text-emerald-500" /> {userStore}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black text-white/40 italic uppercase tracking-widest">
                         <UserCheck className={cn("w-3.5 h-3.5", user.consent_habeas_data ? "text-emerald-500" : "text-rose-500")} /> HABEAS: {user.consent_habeas_data ? 'COMPLIANT' : 'PENDING'}
                      </div>
                   </div>
                </div>
            </div>
        </div>
    </motion.div>
  );
}
