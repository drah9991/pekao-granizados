import React from "react";
import { Expense } from "@/types/expense";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Calendar, Tag, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface ExpenseCardProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  idx: number;
}

const categoryColors: Record<string, string> = {
  "Servicios": "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "Arriendo": "text-purple-400 bg-purple-500/10 border-purple-500/20",
  "Insumos": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "Mantenimiento": "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "Personal": "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  "Publicidad": "text-pink-400 bg-pink-500/10 border-pink-500/20",
  "Otros": "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

export default function ExpenseCard({ expense, onEdit, onDelete, idx }: ExpenseCardProps) {
  const colorClass = categoryColors[expense.category] || categoryColors["Otros"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      whileHover={{ scale: 1.01 }}
      className="group"
    >
      <Card className="bg-muted/40 border border-border/50 p-6 rounded-[2rem] glass-pro overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-glow-pro ${colorClass}`}>
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black italic uppercase font-space-grotesk tracking-tight text-foreground group-hover:text-primary transition-colors">
                {expense.description}
              </h3>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <div className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest italic flex items-center gap-1.5 ${colorClass}`}>
                  <Tag className="w-3 h-3" /> {expense.category}
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground uppercase italic tracking-widest bg-muted/60 px-3 py-1 rounded-full border border-border/50">
                  <Calendar className="w-3 h-3" /> {format(parseISO(expense.expense_date), "dd MMMM, yyyy", { locale: es })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-6 md:gap-10">
            <div className="text-right">
              <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] italic mb-1">Monto Total</p>
              <p className="text-2xl font-black font-space-grotesk text-foreground tabular-nums">
                ${Number(expense.amount).toLocaleString()}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-xl bg-muted/60 border border-border/50 hover:bg-primary/20 hover:text-primary hover:border-primary/30 transition-all"
                onClick={() => onEdit(expense)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-xl bg-muted/60 border border-border/50 hover:bg-destructive/20 hover:text-destructive hover:border-destructive/30 transition-all"
                onClick={() => onDelete(expense.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
