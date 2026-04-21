import React, { useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useExpenses } from "@/hooks/useExpenses";
import ExpenseStats from "@/components/expenses/ExpenseStats";
import ExpenseCard from "@/components/expenses/ExpenseCard";
import ExpenseFormDialog from "@/components/expenses/ExpenseFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, LayoutGrid, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Expense } from "@/types/expense";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

export default function Expenses() {
  const { storeId, userRole: role } = useAuth();
  const {
    filteredExpenses,
    stats,
    loading,
    isProcessing,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    handleSaveExpense,
    handleDeleteExpense
  } = useExpenses(storeId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const canManage = role === "admin" || role === "manager" || role === "owner";

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
              Egresos Operativos
            </h1>
            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
              Control de Gasto y Desembolsos • Core Finance Pro Max
            </p>
          </div>
          <Button
            className="h-14 px-8 rounded-[1.5rem] bg-primary text-primary-foreground font-black italic uppercase tracking-widest shadow-glow-pro hover:shadow-primary/40 transition-all gap-3"
            onClick={() => { setEditingExpense(null); setIsDialogOpen(true); }}
            disabled={!canManage}
          >
            <Plus className="w-5 h-5" /> Registrar Gasto
          </Button>
        </motion.div>

        <motion.div variants={itemVariants}>
          <ExpenseStats stats={stats} />
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 relative group">
            <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="BUSCAR POR DESCRIPCIÓN O CATEGORÍA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-16 h-16 bg-muted/30 border-border/50 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk shadow-pro focus:border-primary/50 transition-all"
            />
          </div>
          <div className="relative">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-16 bg-muted/30 border-border/50 rounded-[1.5rem] text-[10px] font-black italic uppercase font-space-grotesk">
                <SelectValue placeholder="CATEGORÍA" />
              </SelectTrigger>
              <SelectContent className="glass-pro border-border/50 rounded-2xl">
                <SelectItem value="all" className="text-[9px] font-black italic uppercase p-4 border-b border-border/50">TODAS LAS CATEGORÍAS</SelectItem>
                <SelectItem value="Servicios" className="text-[9px] font-black italic uppercase p-4 border-b border-border/50">Servicios</SelectItem>
                <SelectItem value="Arriendo" className="text-[9px] font-black italic uppercase p-4 border-b border-border/50">Arriendo</SelectItem>
                <SelectItem value="Insumos" className="text-[9px] font-black italic uppercase p-4 border-b border-border/50">Insumos</SelectItem>
                <SelectItem value="Mantenimiento" className="text-[9px] font-black italic uppercase p-4 border-b border-border/50">Mantenimiento</SelectItem>
                <SelectItem value="Personal" className="text-[9px] font-black italic uppercase p-4 border-b border-border/50">Personal</SelectItem>
                <SelectItem value="Publicidad" className="text-[9px] font-black italic uppercase p-4 border-b border-border/50">Publicidad</SelectItem>
                <SelectItem value="Otros" className="text-[9px] font-black italic uppercase p-4 border-b border-border/50">Otros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight text-foreground leading-none">Historial de Salidas</h2>
            <div className="flex items-center gap-3 bg-muted/30 px-4 h-9 rounded-full border border-border font-black text-[9px] text-muted-foreground italic uppercase">
              <LayoutGrid className="w-3.5 h-3.5" /> Listado Atomizado
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-glow-pro mb-4" />
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] italic animate-pulse">Sincronizando flujo de caja...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-muted/20 rounded-[3.5rem] border border-dashed border-border/50">
              <CreditCard className="w-20 h-20 text-muted-foreground/20 mb-6" />
              <h3 className="text-xl font-black italic uppercase tracking-widest text-muted-foreground/40">SIN REGISTROS</h3>
              <p className="text-[10px] text-muted-foreground/30 font-black uppercase tracking-[0.2em] mt-3">No se han detectado salidas de dinero con estos parámetros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredExpenses.map((expense, idx) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    idx={idx}
                    onEdit={(exp) => { setEditingExpense(exp); setIsDialogOpen(true); }}
                    onDelete={handleDeleteExpense}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        <ExpenseFormDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={handleSaveExpense}
          editingExpense={editingExpense}
          isProcessing={isProcessing}
        />
      </motion.div>
    </Layout>
  );
}
