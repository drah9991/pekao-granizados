import React from "react";
import { ExpenseStats as ExpenseStatsType } from "@/types/expense";
import { Card } from "@/components/ui/card";
import { TrendingDown, Calendar, CreditCard, PieChart } from "lucide-react";
import { motion } from "framer-motion";

interface ExpenseStatsProps {
  stats: ExpenseStatsType;
}

export default function ExpenseStats({ stats }: ExpenseStatsProps) {
  const cards = [
    {
      label: "Total Acumulado",
      value: `$${stats.totalAmount.toLocaleString()}`,
      icon: TrendingDown,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20"
    },
    {
      label: "Gasto Mensual",
      value: `$${stats.monthlyAmount.toLocaleString()}`,
      icon: Calendar,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
    {
      label: "Gasto del Día",
      value: `$${stats.todayAmount.toLocaleString()}`,
      icon: CreditCard,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20"
    },
    {
      label: "Categoría Top",
      value: stats.categoryDistribution[0]?.category || "N/A",
      subValue: stats.categoryDistribution[0] ? `$${stats.categoryDistribution[0].amount.toLocaleString()}` : "",
      icon: PieChart,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, idx) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <Card className="bg-muted/40 border border-border/50 p-6 rounded-[2.5rem] glass-pro overflow-hidden relative group">
            <div className={`absolute top-0 right-0 w-24 h-24 ${card.bg} rounded-full blur-3xl -mr-12 -mt-12 opacity-50 group-hover:opacity-100 transition-opacity`} />
            
            <div className="relative z-10">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border mb-4 shadow-glow-pro ${card.color} ${card.bg} ${card.border}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] italic mb-1">{card.label}</p>
              <h4 className="text-2xl font-black font-space-grotesk text-foreground tracking-tight leading-none">
                {card.value}
              </h4>
              {card.subValue && (
                <p className="text-[9px] font-black text-primary/60 uppercase italic tracking-widest mt-2">{card.subValue}</p>
              )}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
