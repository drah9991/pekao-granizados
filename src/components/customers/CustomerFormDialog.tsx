import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { Customer } from "@/hooks/useCustomers";

interface CustomerFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingCustomer: Customer | null;
  onSave: (editingCustomer: Customer | null, formData: any) => Promise<boolean>;
  isProcessing: boolean;
}

export default function CustomerFormDialog({ isOpen, onClose, editingCustomer, onSave, isProcessing }: CustomerFormDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    document_id: "",
    consent_habeas_data: false,
  });

  useEffect(() => {
    if (editingCustomer) {
      setFormData({
        name: editingCustomer.name || "",
        email: editingCustomer.email || "",
        phone: editingCustomer.phone || "",
        document_id: editingCustomer.document_id || "",
        consent_habeas_data: editingCustomer.consent_habeas_data || false,
      });
    } else {
      setFormData({ name: "", email: "", phone: "", document_id: "", consent_habeas_data: false });
    }
  }, [editingCustomer, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSave(editingCustomer, formData);
    if (success) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto custom-scrollbar glass-pro border-white/10 rounded-[3rem] text-white shadow-pro">
            <DialogHeader className="mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-glow-pro">
                        <UserPlus className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">{editingCustomer ? "Editar Identidad" : "Nueva Identidad CRM"}</DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Registro y Validación de Cliente en Red Central</DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">NOMBRE COMPLETO</Label>
                        <Input
                            placeholder="EJ: MARIA GÓMEZ"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                            className="h-14 bg-white/5 border-white/10 rounded-2xl text-xs font-black italic uppercase focus:ring-primary/20"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">DOCUMENTO (CC/NIT)</Label>
                        <Input
                            placeholder="EJ: 1000123456"
                            value={formData.document_id}
                            onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
                            className="h-14 bg-white/5 border-white/10 rounded-2xl text-xs font-black italic focus:ring-primary/20"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">EMAIL CORP/PERS</Label>
                        <Input
                            type="email"
                            placeholder="EJ: MARIA@DOMINIO.COM"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                            className="h-14 bg-white/5 border-white/10 rounded-2xl text-xs font-black italic focus:ring-primary/20"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">CANAL WHATSAPP</Label>
                        <Input
                            placeholder="EJ: 300 123 4567"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="h-14 bg-white/5 border-white/10 rounded-2xl text-xs font-black italic focus:ring-primary/20"
                        />
                    </div>
                </div>

                <div className="p-6 glass-pro bg-primary/5 rounded-[2rem] border border-primary/10 flex items-start gap-4">
                    <input
                        type="checkbox"
                        id="consent"
                        className="mt-1 w-5 h-5 rounded-lg border-white/10 bg-white/5 text-primary focus:ring-primary/40 cursor-pointer"
                        checked={formData.consent_habeas_data}
                        onChange={(e) => setFormData({ ...formData, consent_habeas_data: e.target.checked })}
                        required
                    />
                    <Label htmlFor="consent" className="text-[10px] font-black text-white/60 uppercase italic tracking-widest leading-relaxed cursor-pointer select-none">
                        Autorizo el tratamiento de datos personales conforme a la <span className="text-primary tracking-tighter">LEY 1581 DE 2012 (HÁBEAS DATA)</span> para fines de facturación y compliance digital.
                    </Label>
                </div>

                <DialogFooter className="gap-4">
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
                        disabled={isProcessing || !formData.name || !formData.document_id || !formData.consent_habeas_data}
                        className="flex-1 h-14 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest shadow-glow-pro hover:shadow-primary/40 transition-all font-space-grotesk"
                    >
                        {isProcessing ? "PROCESANDO..." : editingCustomer ? "GUARDAR CAMBIOS" : "INDEXAR ENTIDAD ✓"}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
}
