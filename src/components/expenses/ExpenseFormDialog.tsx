import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Expense, ExpenseCategory } from "@/types/expense";
import { Save, X, CreditCard, FileText, Calendar, Tag } from "lucide-react";

interface ExpenseFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Partial<Expense>) => Promise<boolean>;
  editingExpense: Expense | null;
  isProcessing: boolean;
}

const categories: ExpenseCategory[] = [
  "Servicios",
  "Arriendo",
  "Insumos",
  "Mantenimiento",
  "Personal",
  "Publicidad",
  "Otros"
];

export default function ExpenseFormDialog({
  isOpen,
  onClose,
  onSave,
  editingExpense,
  isProcessing
}: ExpenseFormDialogProps) {
  const [formData, setFormData] = useState<Partial<Expense>>({
    description: "",
    amount: 0,
    category: "Otros",
    expense_date: new Date().toISOString().split("T")[0]
  });

  useEffect(() => {
    if (editingExpense) {
      setFormData(editingExpense);
    } else {
      setFormData({
        description: "",
        amount: 0,
        category: "Otros",
        expense_date: new Date().toISOString().split("T")[0]
      });
    }
  }, [editingExpense, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSave(formData);
    if (success) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-pro border-border/50 rounded-[2.5rem] max-w-lg p-0 overflow-hidden shadow-2xl">
        <div className="bg-primary/5 p-8 border-b border-border/30">
          <DialogHeader>
            <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center mb-4 border border-primary/20 shadow-glow-pro">
               <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tighter">
              {editingExpense ? "Modificar Registro" : "Nuevo Desembolso"}
            </DialogTitle>
            <DialogDescription className="text-[10px] font-black uppercase tracking-widest italic text-muted-foreground/60 mt-1">
              Registro de Auditoría Financiera • v2.0 Audit
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest italic ml-1">Descripción del Gasto</Label>
              <div className="relative group">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                <Input
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ej: Pago de Luz - Local Norte"
                  className="pl-12 h-14 bg-muted/40 border-border/50 rounded-2xl text-xs font-bold font-space-grotesk focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest italic ml-1">Monto ($)</Label>
                <Input
                  required
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="h-14 bg-muted/40 border-border/50 rounded-2xl text-xs font-bold font-space-grotesk focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest italic ml-1">Categoría</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val as ExpenseCategory })}
                >
                  <SelectTrigger className="h-14 bg-muted/40 border-border/50 rounded-2xl text-xs font-bold font-space-grotesk focus:ring-primary/20 transition-all">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent className="glass-pro border-border/50 rounded-xl">
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs font-bold font-space-grotesk italic uppercase py-3">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest italic ml-1">Fecha del Gasto</Label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                <Input
                  required
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  className="pl-12 h-14 bg-muted/40 border-border/50 rounded-2xl text-xs font-bold font-space-grotesk focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-12 flex-1 rounded-xl font-black italic uppercase tracking-widest text-[10px] border border-border/50"
            >
              <X className="w-4 h-4 mr-2" /> Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isProcessing}
              className="h-12 flex-[1.5] rounded-xl bg-primary text-primary-foreground font-black italic uppercase tracking-widest text-[10px] shadow-glow-pro"
            >
              <Save className="w-4 h-4 mr-2" /> {isProcessing ? "Procesando..." : "Confirmar Gasto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
