import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DigitalMenuConfigForm } from "@/hooks/useDigitalMenuConfigForm";
import { BusinessInfoCard } from "@/components/menu/BusinessInfoCard";
import { ThemePreviewCard } from "@/components/menu/ThemePreviewCard";
import { DeliveryPickupCard } from "@/components/menu/DeliveryPickupCard";
import { OpeningHoursCard } from "@/components/menu/OpeningHoursCard";
import { PaymentMethodsCard } from "@/components/menu/PaymentMethodsCard";
import { NotifiedUsersCard } from "@/components/menu/NotifiedUsersCard";
import { MenuQrCard } from "@/components/menu/MenuQrCard";

interface DigitalMenuConfigTabProps {
  form: DigitalMenuConfigForm;
  businessUrl: string;
  qrCodeUrl: string;
}

/**
 * Tab de configuración del Menú Digital: compone las cards de información
 * del negocio, vista previa de tema, domicilios/recogida, horarios, medios
 * de pago, usuarios notificados, QR y el botón de guardado general.
 * Extraída de src/pages/DigitalMenu.tsx sin cambios de comportamiento.
 */
export function DigitalMenuConfigTab({ form, businessUrl, qrCodeUrl }: DigitalMenuConfigTabProps) {
  const { activeStyles, commercialName, isSaving, handleSaveConfig } = form;

  return (
    <div className="space-y-6 animate-pro-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <BusinessInfoCard form={form} businessUrl={businessUrl} />
        <ThemePreviewCard activeStyles={activeStyles} commercialName={commercialName} />
      </div>

      {/* Configuración de Domicilios, Recogida y Horarios */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <DeliveryPickupCard form={form} />
        <OpeningHoursCard form={form} />
      </div>

      {/* Medios de Pago & Usuarios Notificados & Descarga QR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <PaymentMethodsCard form={form} />
        <NotifiedUsersCard form={form} />
      </div>

      {/* Código QR de Domicilio */}
      <MenuQrCard businessUrl={businessUrl} qrCodeUrl={qrCodeUrl} />

      {/* Botón de Guardar General */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSaveConfig}
          disabled={isSaving}
          className="bg-primary text-white font-space-grotesk text-xs uppercase tracking-widest px-8 py-3 rounded-xl shadow-glow-pro"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Guardando...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Guardar Configuración
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
