import React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ClipboardCheck, DollarSign, TrendingUp } from "lucide-react";
import { formatCOP } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { ReportSummary, ReportType } from "@/hooks/useReports";

interface ReportStatsProps {
  summary: ReportSummary;
  reportType: ReportType;
}

export default function ReportStats({ summary, reportType }: ReportStatsProps) {
  return (
    <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
    >
        <Card className="bg-[#1C1F26] border border-white/5 rounded-[2.5rem] shadow-pro glass-pro p-8">
            <div className="flex items-center justify-between mb-4">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic font-space-grotesk">REGISTROS DETECTADOS</span>
                <ClipboardCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl lg:text-4xl font-black italic font-space-grotesk text-white tabular-nums">{summary.count}</div>
            <div className="mt-2 text-[9px] font-bold text-white/20 uppercase tracking-widest italic">Data Clusters Indexados</div>
        </Card>

        {reportType === 'sales' && (
            <Card className="bg-[#1C1F26] border border-white/5 rounded-[2.5rem] shadow-pro glass-pro p-8 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic font-space-grotesk">FLUJO DE RECAUDO</span>
                    <DollarSign className="w-4 h-4 text-emerald-500 shadow-glow-pro" />
                </div>
                <div className="text-2xl lg:text-4xl font-black italic font-space-grotesk text-white tabular-nums relative z-10">{formatCOP(summary.total || 0).replace("$", "")}</div>
                <div className="mt-2 text-[9px] font-bold text-emerald-500/40 uppercase tracking-widest italic relative z-10 font-space-grotesk">Capital Bruto (COP)</div>
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
            </Card>
        )}

        <Card className={cn(
            "bg-[#1C1F26] border border-white/5 rounded-[2.5rem] shadow-pro glass-pro p-8",
            reportType === 'inventory' && summary.secondary?.includes("ITEMS BAJO STOCK: 0") === false ? "border-rose-500/30" : ""
        )}>
            <div className="flex items-center justify-between mb-4">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic font-space-grotesk">INSIGHT OPERATIVO</span>
                <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-lg font-black italic font-space-grotesk text-white uppercase tracking-tight">{summary.secondary}</div>
            <div className="mt-2 text-[9px] font-bold text-white/20 uppercase tracking-widest italic">Observación Predictiva</div>
        </Card>
    </motion.div>
  );
}
