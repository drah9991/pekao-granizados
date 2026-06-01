import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Clock, Target, Percent, DollarSign, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingRuleFormData {
  name: string;
  description: string;
  type: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  target_type: string;
  target_id: string;
  discount_type: string;
  discount_value: number;
  active: boolean;
}

interface PricingRuleFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingRule: Record<string, unknown> | null;
  onSave: (id: string | undefined, ruleData: PricingRuleFormData) => Promise<unknown>;
  isProcessing: boolean;
  daysOfWeek: { value: number; label: string }[];
  storeId: string | null;
}

export default function PricingRuleForm({ isOpen, onClose, editingRule, onSave, isProcessing, daysOfWeek, storeId }: PricingRuleFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "time_based",
    start_time: "",
    end_time: "",
    days_of_week: [] as number[],
    target_type: "all",
    target_id: "",
    discount_type: "percentage",
    discount_value: 0,
    active: true,
  });

  useEffect(() => {
    if (editingRule) {
      setFormData({
        name: editingRule.name || "",
        description: editingRule.description || "",
        type: editingRule.type || "time_based",
        start_time: editingRule.start_time || "",
        end_time: editingRule.end_time || "",
        days_of_week: editingRule.days_of_week || [],
        target_type: editingRule.target_type || "all",
        target_id: editingRule.target_id || "",
        discount_type: editingRule.discount_type || "percentage",
        discount_value: editingRule.discount_value || 0,
        active: editingRule.active,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        type: "time_based",
        start_time: "",
        end_time: "",
        days_of_week: [],
        target_type: "all",
        target_id: "",
        discount_type: "percentage",
        discount_value: 0,
        active: true,
      });
    }
  }, [editingRule, isOpen]);

  const handleToggleDay = (dayValue: number) => {
    setFormData((prev) => {
      const currentDays = prev.days_of_week || [];
      if (currentDays.includes(dayValue)) {
        return { ...prev, days_of_week: currentDays.filter((d) => d !== dayValue) };
      } else {
        return { ...prev, days_of_week: [...currentDays, dayValue] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    
    const ruleData = {
      store_id: storeId,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      type: formData.type,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      days_of_week: formData.days_of_week.length > 0 ? formData.days_of_week : null,
      target_type: formData.target_type,
      target_id: formData.target_id || null,
      discount_type: formData.discount_type,
      discount_value: Number(formData.discount_value),
      active: formData.active,
    };

    await onSave(editingRule?.id, ruleData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto custom-scrollbar bg-background border-white/10 rounded-[3rem] text-white shadow-pro p-8">
            <DialogHeader className="mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-glow-pro">
                        <Megaphone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">
                            {editingRule ? 'Calibrar Algoritmo' : 'Nuevo Protocolo Dinámico'}
                        </DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Motor de Precios Basado en Tiempo y Demanda</DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-full space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">IDENTIFICADOR DE REGLA</Label>
                        <Input
                            placeholder="EJ: HAPPY HOUR JUEVES"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                            className="h-14 bg-white/5 border-white/10 rounded-2xl text-xs font-black italic uppercase focus:ring-primary/20"
                            required
                        />
                    </div>

                    <div className="col-span-full space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">DESCRIPCIÓN TÉCNICA</Label>
                        <Input
                            placeholder="PROPÓSITO DE LA REGLA..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value.toUpperCase() })}
                            className="h-14 bg-white/5 border-white/10 rounded-2xl text-xs font-black italic uppercase focus:ring-primary/20"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">MODALIDAD DE AJUSTE</Label>
                        <Select
                            value={formData.discount_type}
                            onValueChange={(value) => setFormData({ ...formData, discount_type: value })}
                        >
                            <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl text-xs font-black italic uppercase focus:ring-primary/20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="glass-pro border-white/10 rounded-xl">
                                <SelectItem value="percentage">PORCENTAJE (%)</SelectItem>
                                <SelectItem value="fixed">VALOR FIJO ($)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">VALOR NOMINAL</Label>
                        <div className="relative">
                            <Input
                                type="number"
                                min="0"
                                value={formData.discount_value}
                                onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                                className="h-14 bg-white/5 border-white/10 rounded-2xl text-xs font-black italic focus:ring-primary/20 pl-12"
                                required
                            />
                            {formData.discount_type === 'percentage' ? 
                                <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" /> : 
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                            }
                        </div>
                    </div>
                </div>

                <div className="p-8 glass-pro bg-primary/5 rounded-[2.5rem] border border-primary/10 space-y-6">
                    <h4 className="text-[10px] font-black italic uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                        <Clock className="w-4 h-4 shadow-glow-pro" /> VENTANA DE TIEMPO CRÍTICA
                    </h4>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 italic">HORA DE APERTURA</Label>
                            <Input
                                type="time"
                                value={formData.start_time}
                                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                className="h-12 bg-white/5 border-white/10 rounded-xl text-xs font-black italic"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 italic">HORA DE CIERRE</Label>
                            <Input
                                type="time"
                                value={formData.end_time}
                                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                className="h-12 bg-white/5 border-white/10 rounded-xl text-xs font-black italic"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 italic">RECURRENCIA SEMANAL</Label>
                        <div className="flex flex-wrap gap-2">
                            {daysOfWeek.map((day) => (
                                <Button
                                    key={day.value}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleDay(day.value)}
                                    className={cn(
                                        "h-9 px-4 rounded-full text-[8px] font-black uppercase italic tracking-widest transition-all",
                                        formData.days_of_week.includes(day.value) 
                                            ? "bg-primary text-white shadow-glow-pro border-transparent" 
                                            : "bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                                    )}
                                >
                                    {day.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                    <div className="space-y-4">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">AUDIENCIA / TARGET</Label>
                        <Select
                            value={formData.target_type}
                            onValueChange={(value) => setFormData({ ...formData, target_type: value, target_id: "" })}
                        >
                            <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl text-xs font-black italic uppercase">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="glass-pro border-white/10 rounded-xl">
                                <SelectItem value="all">CATÁLOGO GLOBAL</SelectItem>
                                <SelectItem value="category">CATEGORÍA ESPECÍFICA</SelectItem>
                                <SelectItem value="product">PRODUCTO UNITARIO</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 h-14">
                        <input
                            type="checkbox"
                            id="active"
                            checked={formData.active}
                            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                            className="w-5 h-5 rounded-lg border-white/10 bg-white/5 text-primary focus:ring-primary/40 cursor-pointer"
                        />
                        <Label htmlFor="active" className="text-[10px] font-black text-white/60 uppercase italic tracking-widest cursor-pointer select-none">
                            ACTIVAR PROTOCOLO INMEDIATAMENTE
                        </Label>
                    </div>
                </div>

                <DialogFooter className="pt-4 gap-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        disabled={isProcessing}
                        className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase italic tracking-widest text-white/40 hover:text-white hover:bg-white/5"
                    >
                        ABORTAR
                    </Button>
                    <Button
                        type="submit"
                        disabled={isProcessing || !formData.name || !formData.discount_value}
                        className="flex-1 h-14 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest shadow-glow-pro hover:shadow-primary/40 transition-all font-space-grotesk"
                    >
                        {isProcessing ? "SINCRONIZANDO..." : editingRule ? "ACTUALIZAR PROTOCOLO" : "DESPLEGAR REGLA ✓"}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
}
