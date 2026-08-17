import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useConfigStore } from "@/store/useConfigStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DigitalMenuThemeStyles {
  bg: string;
  primary: string;
  text: string;
  font: string;
  style: string;
}

export interface DigitalMenuConfigForm {
  formTheme: string;
  setFormTheme: (v: string) => void;
  functionality: string;
  setFunctionality: (v: string) => void;
  kitchenType: string;
  setKitchenType: (v: string) => void;
  commercialName: string;
  setCommercialName: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  phones: string;
  setPhones: (v: string) => void;
  defaultTable: string;
  setDefaultTable: (v: string) => void;

  deliveryTime: string;
  setDeliveryTime: (v: string) => void;
  deliveryCost: string;
  setDeliveryCost: (v: string) => void;
  deliveryMinOrder: string;
  setDeliveryMinOrder: (v: string) => void;
  pickupTime: string;
  setPickupTime: (v: string) => void;
  pickupCost: string;
  setPickupCost: (v: string) => void;
  hours: Record<string, { open: string; close: string }>;
  setHours: Dispatch<SetStateAction<Record<string, { open: string; close: string }>>>;

  paymentCash: boolean;
  setPaymentCash: (v: boolean) => void;
  paymentTransfer: boolean;
  setPaymentTransfer: (v: boolean) => void;
  notifiedUsers: string[];
  setNotifiedUsers: Dispatch<SetStateAction<string[]>>;

  customBgColor: string;
  setCustomBgColor: (v: string) => void;
  customPrimaryColor: string;
  setCustomPrimaryColor: (v: string) => void;
  customTextColor: string;
  setCustomTextColor: (v: string) => void;
  customBgStyle: string;
  setCustomBgStyle: (v: string) => void;
  customFont: string;
  setCustomFont: (v: string) => void;

  activeStyles: DigitalMenuThemeStyles;
  isSaving: boolean;
  handleSaveConfig: () => Promise<void>;

  profiles: any[];
  selectedUserToNotify: string;
  setSelectedUserToNotify: (v: string) => void;
  handleAddNotifiedUser: () => void;
  handleRemoveNotifiedUser: (id: string) => void;
}

/**
 * Encapsula todo el estado y la lógica del formulario de configuración del
 * Menú Digital (tema, datos del negocio, domicilios/recogida, horarios,
 * medios de pago, usuarios notificados y tema personalizado), extraído de
 * src/pages/DigitalMenu.tsx sin cambios de comportamiento.
 */
export function useDigitalMenuConfigForm(
  effectiveStoreId: string | undefined | null,
  storeName: string | undefined | null
): DigitalMenuConfigForm {
  const storeConfig = useConfigStore((state) => state.storeConfig) as Record<string, any>;
  const fetchConfig = useConfigStore((state) => state.fetchConfig);
  const updateStoreConfig = useConfigStore((state) => state.updateStoreConfig);

  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedUserToNotify, setSelectedUserToNotify] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const [formTheme, setFormTheme] = useState<string>("tema-1");
  const [functionality, setFunctionality] = useState<string>("visualizacion");
  const [kitchenType, setKitchenType] = useState<string>("Jugos y licuados");
  const [commercialName, setCommercialName] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [phones, setPhones] = useState<string>("");
  const [defaultTable, setDefaultTable] = useState<string>("Mesa 1");

  const [deliveryTime, setDeliveryTime] = useState<string>("20 min");
  const [deliveryCost, setDeliveryCost] = useState<string>("");
  const [deliveryMinOrder, setDeliveryMinOrder] = useState<string>("");
  const [pickupTime, setPickupTime] = useState<string>("15 min");
  const [pickupCost, setPickupCost] = useState<string>("");
  const [hours, setHours] = useState<Record<string, { open: string; close: string }>>({
    lunes: { open: "08:00", close: "22:00" },
    martes: { open: "08:00", close: "22:00" },
    miercoles: { open: "08:00", close: "22:00" },
    jueves: { open: "08:00", close: "22:00" },
    viernes: { open: "08:00", close: "22:00" },
    sabado: { open: "08:00", close: "22:00" },
    domingo: { open: "08:00", close: "22:00" }
  });

  const [paymentCash, setPaymentCash] = useState<boolean>(true);
  const [paymentTransfer, setPaymentTransfer] = useState<boolean>(true);
  const [notifiedUsers, setNotifiedUsers] = useState<string[]>([]);

  const [customBgColor, setCustomBgColor] = useState<string>("#09090b");
  const [customPrimaryColor, setCustomPrimaryColor] = useState<string>("#9d00ff");
  const [customTextColor, setCustomTextColor] = useState<string>("#ffffff");
  const [customBgStyle, setCustomBgStyle] = useState<string>("classic"); // classic (arrugado) | liso
  const [customFont, setCustomFont] = useState<string>("space-grotesk"); // space-grotesk | sans | caveat

  // Cargar configuración de la sucursal activa
  useEffect(() => {
    if (effectiveStoreId) {
      fetchConfig(effectiveStoreId);
      const fetchProfiles = async () => {
        const { data } = await supabase.from("profiles").select("id, full_name, email");
        if (data) setProfiles(data);
      };
      fetchProfiles();
    }
  }, [effectiveStoreId, fetchConfig]);

  // Cargar valores de configuración iniciales
  useEffect(() => {
    if (storeConfig?.digitalMenu) {
      const dm = storeConfig.digitalMenu;
      if (dm.theme_id) setFormTheme(dm.theme_id);
      if (dm.functionality) setFunctionality(dm.functionality);
      if (dm.kitchen_type) setKitchenType(dm.kitchen_type);
      if (dm.commercial_name) setCommercialName(dm.commercial_name);
      if (dm.address) setAddress(dm.address);
      if (dm.phones) setPhones(dm.phones);
      if (dm.default_table) setDefaultTable(dm.default_table);

      if (dm.delivery) {
        setDeliveryTime(dm.delivery.estimated_time || "20 min");
        setDeliveryCost(dm.delivery.cost?.toString() || "");
        setDeliveryMinOrder(dm.delivery.min_order?.toString() || "");
      }
      if (dm.pickup) {
        setPickupTime(dm.pickup.estimated_time || "15 min");
        setPickupCost(dm.pickup.cost?.toString() || "");
      }
      if (dm.opening_hours) {
        setHours(dm.opening_hours);
      }
      if (dm.payment_methods) {
        setPaymentCash(!!dm.payment_methods.cash);
        setPaymentTransfer(!!dm.payment_methods.transfer);
      }
      if (dm.notification_users) {
        setNotifiedUsers(dm.notification_users);
      }
      if (dm.custom_theme) {
        setCustomBgColor(dm.custom_theme.bg_color || "#09090b");
        setCustomPrimaryColor(dm.custom_theme.primary_color || "#9d00ff");
        setCustomTextColor(dm.custom_theme.text_color || "#ffffff");
        setCustomBgStyle(dm.custom_theme.bg_style || "liso");
        setCustomFont(dm.custom_theme.font || "sans");
      }
    } else if (storeName) {
      setCommercialName(storeName);
    }
  }, [storeConfig, storeName]);

  // Función para obtener los estilos aplicados al tema actual
  const getThemeStyles = (themeId: string): DigitalMenuThemeStyles => {
    if (themeId === "tema-1") {
      return { bg: "#09090b", primary: "#9d00ff", text: "#ffffff", font: "font-space-grotesk", style: "classic" };
    }
    if (themeId === "tema-2") {
      return { bg: "#0b0f19", primary: "#0ea5e9", text: "#f8fafc", font: "font-sans", style: "liso" };
    }
    if (themeId === "tema-3") {
      return { bg: "#fffbeb", primary: "#ff5722", text: "#78350f", font: "font-caveat", style: "liso" };
    }
    if (themeId === "tema-4") {
      return { bg: "#f0fdf4", primary: "#10b981", text: "#064e3b", font: "font-sans", style: "liso" };
    }
    if (themeId === "tema-5") {
      return { bg: "#f0f9ff", primary: "#06b6d4", text: "#0c4a6e", font: "font-space-grotesk", style: "liso" };
    }
    // Personalizado
    return {
      bg: customBgColor,
      primary: customPrimaryColor,
      text: customTextColor,
      font: customFont === "caveat" ? "font-caveat" : customFont === "space-grotesk" ? "font-space-grotesk" : "font-sans",
      style: customBgStyle
    };
  };

  const activeStyles = getThemeStyles(formTheme);

  const handleSaveConfig = async () => {
    if (!effectiveStoreId) return;
    setIsSaving(true);

    const updatedConfig = {
      ...storeConfig,
      digitalMenu: {
        theme_id: formTheme,
        functionality,
        kitchen_type: kitchenType,
        commercial_name: commercialName,
        country: "Colombia",
        address,
        phones,
        default_table: defaultTable,
        delivery: {
          estimated_time: deliveryTime,
          cost: parseFloat(deliveryCost) || 0,
          min_order: parseFloat(deliveryMinOrder) || 0
        },
        pickup: {
          estimated_time: pickupTime,
          cost: parseFloat(pickupCost) || 0
        },
        opening_hours: hours,
        payment_methods: {
          cash: paymentCash,
          transfer: paymentTransfer
        },
        notification_users: notifiedUsers,
        custom_theme: {
          bg_color: customBgColor,
          primary_color: customPrimaryColor,
          text_color: customTextColor,
          bg_style: customBgStyle,
          font: customFont
        }
      }
    };

    try {
      await updateStoreConfig(effectiveStoreId, updatedConfig);
      toast.success("Configuración del Menú Digital guardada con éxito.");
    } catch (err) {
      console.error("Error saving digital menu config:", err);
      toast.error("Error al guardar la configuración.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNotifiedUser = () => {
    if (!selectedUserToNotify) return;
    if (notifiedUsers.includes(selectedUserToNotify)) {
      toast.warning("El usuario ya está asignado para recibir notificaciones.");
      return;
    }
    setNotifiedUsers(prev => [...prev, selectedUserToNotify]);
    setSelectedUserToNotify("");
  };

  const handleRemoveNotifiedUser = (id: string) => {
    setNotifiedUsers(prev => prev.filter(uId => uId !== id));
  };

  return {
    formTheme, setFormTheme,
    functionality, setFunctionality,
    kitchenType, setKitchenType,
    commercialName, setCommercialName,
    address, setAddress,
    phones, setPhones,
    defaultTable, setDefaultTable,

    deliveryTime, setDeliveryTime,
    deliveryCost, setDeliveryCost,
    deliveryMinOrder, setDeliveryMinOrder,
    pickupTime, setPickupTime,
    pickupCost, setPickupCost,
    hours, setHours,

    paymentCash, setPaymentCash,
    paymentTransfer, setPaymentTransfer,
    notifiedUsers, setNotifiedUsers,

    customBgColor, setCustomBgColor,
    customPrimaryColor, setCustomPrimaryColor,
    customTextColor, setCustomTextColor,
    customBgStyle, setCustomBgStyle,
    customFont, setCustomFont,

    activeStyles,
    isSaving,
    handleSaveConfig,

    profiles,
    selectedUserToNotify, setSelectedUserToNotify,
    handleAddNotifiedUser,
    handleRemoveNotifiedUser,
  };
}
