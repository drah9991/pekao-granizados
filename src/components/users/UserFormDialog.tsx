import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCog, Key } from "lucide-react";

interface UserFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingUser: any;
  stores: any[];
  roles: any[];
  onSave: (formData: any, editingUser: any) => void;
  isProcessing: boolean;
}

export default function UserFormDialog({ isOpen, onClose, editingUser, stores, roles, onSave, isProcessing }: UserFormDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "cashier",
    store_id: null as string | null,
    document_id: "",
    consent_habeas_data: false,
  });

  useEffect(() => {
    if (editingUser) {
      setFormData({
        name: editingUser.name || "",
        email: editingUser.email || "",
        password: "",
        phone: editingUser.phone || "",
        role: editingUser.role || "cashier",
        store_id: editingUser.store_id || null,
        document_id: editingUser.document_id || "",
        consent_habeas_data: editingUser.consent_habeas_data || false,
      });
    } else {
      setFormData({
        name: "", email: "", password: "", phone: "", role: "cashier",
        store_id: null, document_id: "", consent_habeas_data: false,
      });
    }
  }, [editingUser, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto custom-scrollbar bg-background border-border rounded-[3rem] text-foreground shadow-pro">
        <DialogHeader className="mb-6">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-glow-pro text-primary"><UserCog className="w-6 h-6" /></div>
              <div>
                 <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">{editingUser ? "Configuración" : "Emisión"}</DialogTitle>
                 <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Gestión de Perfiles y Protocolos</DialogDescription>
              </div>
           </div>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData, editingUser); }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">NOMBRE</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })} className="h-14 bg-muted/40 border-border rounded-2xl text-xs font-black italic uppercase" required />
                </div>
                <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">DOCUMENTO</Label>
                    <Input value={formData.document_id} onChange={(e) => setFormData({ ...formData, document_id: e.target.value })} className="h-14 bg-muted/40 border-border rounded-2xl text-xs font-black italic" required />
                </div>
                <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">EMAIL</Label>
                    <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })} className="h-14 bg-muted/40 border-border rounded-2xl text-xs font-black italic" required={!editingUser} />
                </div>
                <div className="space-y-2 relative">
                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">PASSWORD</Label>
                    <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="h-14 bg-muted/40 border-border rounded-2xl text-xs font-black italic" required={!editingUser} minLength={6} />
                    <Key className="absolute right-4 top-10 w-4 h-4 text-muted-foreground/20" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">ROL</Label>
                    <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                        <SelectTrigger className="h-14 bg-muted/40 border-border rounded-2xl text-xs font-black italic uppercase"><SelectValue /></SelectTrigger>
                        <SelectContent className="glass-pro border-border rounded-2xl">
                            {roles.map((r) => <SelectItem key={r.name} value={r.name} className="text-[9px] font-black italic uppercase p-4 border-b border-border/50 last:border-0">{r.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">TIENDA</Label>
                    <Select value={formData.store_id || ""} onValueChange={(v) => setFormData({ ...formData, store_id: v || null })}>
                        <SelectTrigger className="h-14 bg-muted/40 border-border rounded-2xl text-xs font-black italic uppercase"><SelectValue /></SelectTrigger>
                        <SelectContent className="glass-pro border-border rounded-2xl">
                            {stores.map((s) => <SelectItem key={s.id} value={s.id} className="text-[9px] font-black italic uppercase p-4 border-b border-border/50 last:border-0">{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="p-6 glass-pro bg-primary/5 rounded-[2rem] border border-primary/10 flex items-start gap-4">
                <input type="checkbox" id="consent" className="mt-1 w-5 h-5 cursor-pointer" checked={formData.consent_habeas_data} onChange={(e) => setFormData({ ...formData, consent_habeas_data: e.target.checked })} required />
                <Label htmlFor="consent" className="text-[10px] font-black text-muted-foreground uppercase italic tracking-widest leading-relaxed cursor-pointer select-none">Certifico tratamiento de datos personales LEY 1581</Label>
            </div>
            <DialogFooter className="gap-4">
                <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase italic tracking-widest text-muted-foreground">CANCELAR</Button>
                <Button type="submit" disabled={isProcessing || !formData.consent_habeas_data} className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black italic uppercase tracking-widest shadow-glow-pro">
                    {isProcessing ? "VALIDANDO..." : editingUser ? "ACTUALIZAR ✓" : "EMITIR ✓"}
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
