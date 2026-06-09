import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { Customer } from "@/hooks/useCustomers";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1, "El nombre completo es requerido").transform((v) => v.toUpperCase()),
  document_id: z.string().min(1, "El documento es requerido"),
  email: z.string().email("Formato de correo inválido").or(z.literal("")),
  phone: z.string().optional(),
  consent_habeas_data: z.boolean().refine((val) => val === true, "Debe autorizar el tratamiento de datos"),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingCustomer: Customer | null;
  onSave: (editingCustomer: Customer | null, formData: CustomerFormData) => Promise<boolean>;
  isProcessing: boolean;
}

export default function CustomerFormDialog({ isOpen, onClose, editingCustomer, onSave, isProcessing }: CustomerFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid }
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      document_id: "",
      email: "",
      phone: "",
      consent_habeas_data: false,
    }
  });

  const watchName = watch("name");
  const watchDoc = watch("document_id");
  const watchConsent = watch("consent_habeas_data");

  useEffect(() => {
    if (editingCustomer) {
      reset({
        name: editingCustomer.name || "",
        document_id: editingCustomer.document_id || "",
        email: editingCustomer.email || "",
        phone: editingCustomer.phone || "",
        consent_habeas_data: editingCustomer.consent_habeas_data || false,
      });
    } else {
      reset({
        name: "",
        document_id: "",
        email: "",
        phone: "",
        consent_habeas_data: false
      });
    }
  }, [editingCustomer, isOpen, reset]);

  const onFormSubmit = async (data: CustomerFormData) => {
    const success = await onSave(editingCustomer, data);
    if (success) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto custom-scrollbar bg-background border-white/10 rounded-[3rem] text-white shadow-pro">
            <DialogHeader className="mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-glow-pro">
                        <UserPlus className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">
                          {editingCustomer ? "Editar Identidad" : "Nueva Identidad CRM"}
                        </DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">
                          Registro y Validación de Cliente en Red Central
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">NOMBRE COMPLETO</Label>
                        <Input
                            placeholder="EJ: MARIA GÓMEZ"
                            {...register("name")}
                            className="h-14 bg-white/5 border-white/10 rounded-2xl text-xs font-black italic uppercase focus:ring-primary/20"
                        />
                        {errors.name && (
                          <span className="text-[9px] font-bold text-rose-500 px-2 block">{errors.name.message}</span>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">DOCUMENTO (CC/NIT)</Label>
                        <Input
                            placeholder="EJ: 1000123456"
                            {...register("document_id")}
                            className="h-14 bg-white/5 border-white/10 rounded-2xl text-xs font-black italic focus:ring-primary/20"
                        />
                        {errors.document_id && (
                          <span className="text-[9px] font-bold text-rose-500 px-2 block">{errors.document_id.message}</span>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">EMAIL CORP/PERS</Label>
                        <Input
                            type="email"
                            placeholder="EJ: MARIA@DOMINIO.COM"
                            {...register("email")}
                            className="h-14 bg-white/5 border-white/10 rounded-2xl text-xs font-black italic focus:ring-primary/20"
                        />
                        {errors.email && (
                          <span className="text-[9px] font-bold text-rose-500 px-2 block">{errors.email.message}</span>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">CANAL WHATSAPP</Label>
                        <Input
                            placeholder="EJ: 300 123 4567"
                            {...register("phone")}
                            className="h-14 bg-white/5 border-white/10 rounded-2xl text-xs font-black italic focus:ring-primary/20"
                        />
                        {errors.phone && (
                          <span className="text-[9px] font-bold text-rose-500 px-2 block">{errors.phone.message}</span>
                        )}
                    </div>
                </div>

                <div className="p-6 glass-pro bg-primary/5 rounded-[2rem] border border-primary/10 flex items-start gap-4">
                    <input
                        type="checkbox"
                        id="consent"
                        className="mt-1 w-5 h-5 rounded-lg border-white/10 bg-white/5 text-primary focus:ring-primary/40 cursor-pointer"
                        {...register("consent_habeas_data")}
                    />
                    <Label htmlFor="consent" className="text-[10px] font-black text-white/60 uppercase italic tracking-widest leading-relaxed cursor-pointer select-none">
                        Autorizo el tratamiento de datos personales conforme a la <span className="text-primary tracking-tighter">LEY 1581 DE 2012 (HÁBEAS DATA)</span> para fines de facturación y compliance digital.
                    </Label>
                </div>
                {errors.consent_habeas_data && (
                  <span className="text-[9px] font-bold text-rose-500 px-2 block">{errors.consent_habeas_data.message}</span>
                )}

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
                        disabled={isProcessing || !watchName || !watchDoc || !watchConsent || !isValid}
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
