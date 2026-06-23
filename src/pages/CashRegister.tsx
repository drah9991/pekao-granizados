import Layout from "@/components/Layout";
import { useCashRegister } from "@/hooks/useCashRegister";
import { CashKPIs } from "@/components/cash/CashKPIs";
import { CashLiquidityCard } from "@/components/cash/CashLiquidityCard";
import { CashTransactionTable } from "@/components/cash/CashTransactionTable";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ActiveShiftCard } from "@/components/ActiveShiftCard";

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

export default function CashRegister() {
  const { storeId } = useAuth();
  const {
    loading,
    orders,
    summary,
    selectedTurnId,
    setSelectedTurnId,
    turnsHistory,
    stats,
    peakHour,
    refreshArqueo
  } = useCashRegister(storeId);
  const [, startTransition] = useTransition();
  const handleTurnChange = (value: string) => {
    startTransition(() => setSelectedTurnId(value));
  };

  return (
    <Layout>
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="min-h-screen bg-[#0F1117] text-white p-6 lg:p-10 space-y-8"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent italic uppercase font-space-grotesk whitespace-nowrap">
              Libro de Turnos
            </h1>
            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
              Auditoría de Recaudación • Standard v2.0 Pro Max
            </p>
          </div>

          <div className="flex flex-col items-end gap-3 self-start">
            <div className="flex items-center gap-3">
              <Select value={selectedTurnId} onValueChange={handleTurnChange}>
                <SelectTrigger className="w-[300px] h-14 bg-white/5 border border-white/10 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk shadow-pro">
                  <SelectValue placeholder="Seleccionar turno..." />
                </SelectTrigger>
                <SelectContent className="glass-pro border-white/10 rounded-[1.5rem]">
                  <SelectItem value="active" className="text-[10px] font-black uppercase tracking-widest italic">Turno Actual / Más Reciente</SelectItem>
                  {turnsHistory.map(turn => (
                    <SelectItem key={turn.id} value={turn.id} className="text-[10px] font-black uppercase tracking-widest italic">
                      {format(new Date(turn.opened_at), "d MMM hh:mm a", { locale: es })} - {(turn.status === 'open' || turn.status === 'paused') ? 'ACTUAL' : 'Cerrado'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={refreshArqueo}
                variant="ghost"
                className="h-14 w-14 bg-white/5 border border-white/10 rounded-full hover:bg-primary/20 hover:text-white transition-all shadow-glow-pro p-0"
                disabled={loading}
              >
                <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
              </Button>
            </div>
            
            {/* Turn Controls specifically placed here for mobile/desktop visibility */}
            <div className="w-full sm:w-auto max-w-[300px] bg-black/20 rounded-2xl border border-white/5 backdrop-blur-sm mt-2">
              <ActiveShiftCard />
            </div>
          </div>
        </motion.div>

        {/* Hero Liquid Balance */}
        <motion.div variants={itemVariants}>
          <CashLiquidityCard 
            summary={summary}
            stats={stats}
            orderCount={orders.length}
            peakHour={peakHour}
          />
        </motion.div>

        {/* Method Bento Grid */}
        <CashKPIs 
          summary={summary}
          stats={stats}
          orderCount={orders.length}
        />

        {/* Transactions Table Bento */}
        <motion.div variants={itemVariants}>
          <CashTransactionTable 
            orders={orders}
            loading={loading}
            summary={summary}
          />
        </motion.div>
      </motion.div>
    </Layout>
  );
}
