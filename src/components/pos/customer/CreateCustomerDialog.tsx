import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack } from "@astryxdesign/core/HStack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { toast } from "sonner";
import { createCustomer, type Customer, type NewCustomerInput } from "./customerApi";

interface CreateCustomerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreated: (customer: Customer) => void;
}

const EMPTY_FORM: NewCustomerInput = { name: "", documentId: "", phone: "", email: "" };

export function CreateCustomerDialog({ isOpen, onOpenChange, onCreated }: CreateCustomerDialogProps) {
  const [form, setForm] = useState<NewCustomerInput>(EMPTY_FORM);
  const [isNameMissing, setIsNameMissing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const setField = (field: keyof NewCustomerInput) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "name") setIsNameMissing(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setIsNameMissing(true);
      return;
    }
    setIsCreating(true);
    try {
      const customer = await createCustomer(form);
      toast.success("Cliente creado exitosamente");
      setForm(EMPTY_FORM);
      onCreated(customer);
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Error creating customer:", error);
      toast.error("Error al crear cliente: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={448} purpose="form">
      <DialogHeader
        title="Nuevo Cliente Rápido"
        subtitle="Registra un cliente nuevo directamente desde la caja."
        onOpenChange={onOpenChange}
      />
      <VStack gap={4} padding={4}>
        <TextInput
          label="Nombre Completo"
          isRequired
          value={form.name}
          onChange={setField("name")}
          placeholder="Ej: Juan Pérez"
          hasAutoFocus
          status={isNameMissing ? { type: "error", message: "El nombre es obligatorio" } : undefined}
          statusVariant="detached"
        />
        <TextInput
          label="Número de Documento (C.C.)"
          inputMode="numeric"
          value={form.documentId}
          onChange={setField("documentId")}
          placeholder="Ej: 1000123456"
        />
        <TextInput
          label="Teléfono / WhatsApp"
          type="tel"
          value={form.phone}
          onChange={setField("phone")}
          placeholder="Ej: 3001234567"
        />
        <TextInput
          label="Correo Electrónico"
          type="email"
          value={form.email}
          onChange={setField("email")}
          placeholder="Ej: cliente@ejemplo.com"
        />
        <HStack justify="end" gap={2}>
          <Button label="Cancelar" variant="secondary" isDisabled={isCreating} onClick={() => onOpenChange(false)} />
          <Button
            label={isCreating ? "Guardando..." : "Guardar y Seleccionar"}
            variant="primary"
            isLoading={isCreating}
            onClick={handleSave}
          />
        </HStack>
      </VStack>
    </Dialog>
  );
}
