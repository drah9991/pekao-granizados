import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessInfoCard } from "./BusinessInfoCard";
import { ThemePreviewCard } from "./ThemePreviewCard";
import { DeliveryPickupCard } from "./DeliveryPickupCard";
import { OpeningHoursCard } from "./OpeningHoursCard";
import { PaymentMethodsCard } from "./PaymentMethodsCard";
import { NotifiedUsersCard } from "./NotifiedUsersCard";
import { QrCodeCard } from "./QrCodeCard";
import type { ThemeStyles } from "./themeStyles";
import type { ProfileOption } from "@/hooks/useDigitalMenu";

interface ConfigTabProps {
  businessUrl: string;
  qrCodeUrl: string;
  activeStyles: ThemeStyles;

  formTheme: string;
  setFormTheme: (value: string) => void;
  functionality: string;
  setFunctionality: (value: string) => void;
  kitchenType: string;
  setKitchenType: (value: string) => void;
  commercialName: string;
  setCommercialName: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
  phones: string;
  setPhones: (value: string) => void;
  defaultTable: string;
  setDefaultTable: (value: string) => void;

  customBgColor: string;
  setCustomBgColor: (value: string) => void;
  customPrimaryColor: string;
  setCustomPrimaryColor: (value: string) => void;
  customTextColor: string;
  setCustomTextColor: (value: string) => void;
  customBgStyle: string;
  setCustomBgStyle: (value: string) => void;
  customFont: string;
  setCustomFont: (value: string) => void;

  deliveryTime: string;
  setDeliveryTime: (value: string) => void;
  deliveryCost: string;
  setDeliveryCost: (value: string) => void;
  deliveryMinOrder: string;
  setDeliveryMinOrder: (value: string) => void;
  pickupTime: string;
  setPickupTime: (value: string) => void;
  pickupCost: string;
  setPickupCost: (value: string) => void;

  hours: Record<string, { open: string; close: string }>;
  setHours: (updater: (prev: Record<string, { open: string; close: string }>) => Record<string, { open: string; close: string }>) => void;

  paymentCash: boolean;
  setPaymentCash: (value: boolean) => void;
  paymentTransfer: boolean;
  setPaymentTransfer: (value: boolean) => void;

  profiles: ProfileOption[];
  selectedUserToNotify: string;
  setSelectedUserToNotify: (value: string) => void;
  notifiedUsers: string[];
  onAddNotifiedUser: () => void;
  onRemoveNotifiedUser: (id: string) => void;

  isSaving: boolean;
  onSaveConfig: () => void;
}

export function ConfigTab({
  businessUrl,
  qrCodeUrl,
  formTheme,
  setFormTheme,
  functionality,
  setFunctionality,
  kitchenType,
  setKitchenType,
  commercialName,
  setCommercialName,
  address,
  setAddress,
  phones,
  setPhones,
  defaultTable,
  setDefaultTable,
  customBgColor,
  setCustomBgColor,
  customPrimaryColor,
  setCustomPrimaryColor,
  customTextColor,
  setCustomTextColor,
  customBgStyle,
  setCustomBgStyle,
  customFont,
  setCustomFont,
  activeStyles,
  deliveryTime,
  setDeliveryTime,
  deliveryCost,
  setDeliveryCost,
  deliveryMinOrder,
  setDeliveryMinOrder,
  pickupTime,
  setPickupTime,
  pickupCost,
  setPickupCost,
  hours,
  setHours,
  paymentCash,
  setPaymentCash,
  paymentTransfer,
  setPaymentTransfer,
  profiles,
  selectedUserToNotify,
  setSelectedUserToNotify,
  notifiedUsers,
  onAddNotifiedUser,
  onRemoveNotifiedUser,
  isSaving,
  onSaveConfig
}: ConfigTabProps) {
  return (
    <div className="space-y-6 animate-pro-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <BusinessInfoCard
          businessUrl={businessUrl}
          formTheme={formTheme}
          setFormTheme={setFormTheme}
          functionality={functionality}
          setFunctionality={setFunctionality}
          kitchenType={kitchenType}
          setKitchenType={setKitchenType}
          commercialName={commercialName}
          setCommercialName={setCommercialName}
          address={address}
          setAddress={setAddress}
          phones={phones}
          setPhones={setPhones}
          defaultTable={defaultTable}
          setDefaultTable={setDefaultTable}
          customBgColor={customBgColor}
          setCustomBgColor={setCustomBgColor}
          customPrimaryColor={customPrimaryColor}
          setCustomPrimaryColor={setCustomPrimaryColor}
          customTextColor={customTextColor}
          setCustomTextColor={setCustomTextColor}
          customBgStyle={customBgStyle}
          setCustomBgStyle={setCustomBgStyle}
          customFont={customFont}
          setCustomFont={setCustomFont}
        />

        <ThemePreviewCard activeStyles={activeStyles} commercialName={commercialName} />
      </div>

      {/* Configuración de Domicilios, Recogida y Horarios */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <DeliveryPickupCard
          deliveryTime={deliveryTime}
          setDeliveryTime={setDeliveryTime}
          deliveryCost={deliveryCost}
          setDeliveryCost={setDeliveryCost}
          deliveryMinOrder={deliveryMinOrder}
          setDeliveryMinOrder={setDeliveryMinOrder}
          pickupTime={pickupTime}
          setPickupTime={setPickupTime}
          pickupCost={pickupCost}
          setPickupCost={setPickupCost}
        />

        <OpeningHoursCard hours={hours} setHours={setHours} />
      </div>

      {/* Medios de Pago & Usuarios Notificados & Descarga QR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <PaymentMethodsCard
          paymentCash={paymentCash}
          setPaymentCash={setPaymentCash}
          paymentTransfer={paymentTransfer}
          setPaymentTransfer={setPaymentTransfer}
        />

        <NotifiedUsersCard
          profiles={profiles}
          selectedUserToNotify={selectedUserToNotify}
          setSelectedUserToNotify={setSelectedUserToNotify}
          notifiedUsers={notifiedUsers}
          onAddNotifiedUser={onAddNotifiedUser}
          onRemoveNotifiedUser={onRemoveNotifiedUser}
        />
      </div>

      <QrCodeCard qrCodeUrl={qrCodeUrl} businessUrl={businessUrl} />

      {/* Botón de Guardar General */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={onSaveConfig}
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
