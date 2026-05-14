import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Expense, ExpenseStats } from "@/types/expense";
import { startOfMonth, isToday, parseISO } from "date-fns";

export function useExpenses(storeId: string | null) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    if (storeId) {
      fetchExpenses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("store_id", storeId)
        .order("expense_date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      console.error("Error fetching expenses:", error);
      toast.error("Error al cargar gastos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo<ExpenseStats>(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);

    const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const todayAmount = expenses
      .filter(exp => isToday(parseISO(exp.expense_date)))
      .reduce((sum, exp) => sum + Number(exp.amount), 0);
    
    const monthlyAmount = expenses
      .filter(exp => parseISO(exp.expense_date) >= monthStart)
      .reduce((sum, exp) => sum + Number(exp.amount), 0);

    const categoryMap: Record<string, number> = {};
    expenses.forEach(exp => {
      categoryMap[exp.category] = (categoryMap[exp.category] || 0) + Number(exp.amount);
    });

    const categoryDistribution = Object.entries(categoryMap)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    return { totalAmount, todayAmount, monthlyAmount, categoryDistribution };
  }, [expenses]);

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = !searchQuery || exp.description.toLowerCase().includes(searchQuery.toLowerCase()) || exp.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || exp.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSaveExpense = async (expenseData: Partial<Expense>) => {
    if (!storeId) return;
    setIsProcessing(true);
    try {
      const isEditing = !!expenseData.id;
      const { error } = isEditing
        ? await supabase.from("expenses").update(expenseData).eq("id", expenseData.id)
        : await supabase.from("expenses").insert([{ ...expenseData, store_id: storeId }]);

      if (error) throw error;
      
      toast.success(isEditing ? "Gasto actualizado" : "Gasto registrado");
      fetchExpenses();
      return true;
    } catch (error: any) {
      toast.error("Error al guardar gasto: " + error.message);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este registro?")) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      toast.success("Gasto eliminado");
      fetchExpenses();
    } catch (error: any) {
      toast.error("Error al eliminar: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    expenses,
    filteredExpenses,
    stats,
    loading,
    isProcessing,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    handleSaveExpense,
    handleDeleteExpense,
    refresh: fetchExpenses
  };
}
