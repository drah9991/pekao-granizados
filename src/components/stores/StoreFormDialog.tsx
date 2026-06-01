import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Store as StoreIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StoreFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingStore: Record<string, unknown> | null;
  onSave: () => void;
  isProcessing: boolean;
}

export default function StoreFormDialog({ isOpen, onClose, editingStore, onSave, isProcessing }: StoreFormDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    currency: "COP",
    tax_rate: "0",
    config: {} as Record<string, unknown>,
  });

  useEffect(() => {
    if (editingStore) {
      setFormData({
        name: editingStore.name,
        address: editingStore.address || "",
        currency: editingStore.currency || "COP",
        tax_rate: editingStore.tax_rate?.toString() || "0",
        config: editingStore.config || {},
      });
    } else {
      setFormData({ name: "", address: "", currency: "COP", tax_rate: "0", config: {} });
    }
  }, [editingStore, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name,
        address: formData.address,
        currency: formData.currency,
        tax_rate: parseFloat(formData.tax_rate),
        config: formData.config
      };

      if (editingStore) {
        await supabase.from("stores").update(data).eq("id", editingStore.id);
        toast.success("Nodo actualizado");
      } else {
        await supabase.from("stores").insert([data]);
        toast.success("Nodo creado");
      }
      onSave();
      onClose();
    } catch (e) {
      toast.error("Error al guardar nodo");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl bg-background border-border rounded-[3rem] text-foreground shadow-pro">
        <DialogHeader className="mb-6">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary"><StoreIcon className="w-6 h-6" /></div>
              <div>
                 <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">{editingStore ? "Ajuste" : "Expansión"}</DialogTitle>
                 <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Configuración Técnica de Sucursal</DialogDescription>
              </div>
           </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">NOMBRE</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })} className="h-14 bg-muted/40 border-border rounded-2xl text-xs font-black italic uppercase" required />
                </div>
                <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">DIRECCIÓN</Label>
                    <Textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value.toUpperCase() })} className="bg-muted/40 border-border rounded-2xl text-xs font-black italic min-h-[100px]" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">MONEDA</Label>
                        <Input value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })} className="h-14 bg-muted/40 border-border rounded-2xl text-xs font-black italic" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">IVA (%)</Label>
                        <Input type="number" step="0.01" value={formData.tax_rate} onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })} className="h-14 bg-muted/40 border-border rounded-2xl text-xs font-black italic" />
                    </div>
                </div>
            </div>
            <DialogFooter className="gap-4">
                <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase italic tracking-widest text-muted-foreground">ABORTAR</Button>
                <Button type="submit" disabled={isProcessing || !formData.name} className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black italic uppercase tracking-widest shadow-glow-pro">
                    {isProcessing ? "VALIDANDO..." : "GUARDAR NODO ✓"}
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
