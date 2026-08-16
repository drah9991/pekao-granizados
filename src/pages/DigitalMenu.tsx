import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useDigitalMenu } from "@/hooks/useDigitalMenu";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { useConfigStore } from "@/store/useConfigStore";
import { toast } from "sonner";
import { DigitalMenuClientView } from "@/components/digital-menu/DigitalMenuClientView";
import { AdminPanelHeader } from "@/components/digital-menu/AdminPanelHeader";
import { AdminTabs, type AdminTab } from "@/components/digital-menu/AdminTabs";
import { ConfigTab } from "@/components/digital-menu/ConfigTab";
import { ProductsTab } from "@/components/digital-menu/ProductsTab";
import { getThemeStyles } from "@/components/digital-menu/themeStyles";

export default function DigitalMenu() {
  const { storeId, storeName, user, userRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPreviewMode = searchParams.get("preview") === "true";

  // Si se pasa 'store' en la URL (cliente), usar ese storeId; si no, usar el del contexto de autenticación
  const queryStoreId = searchParams.get("store");
  const effectiveStoreId = queryStoreId || storeId;

  const handleStoreChange = (newStoreId: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("store", newStoreId);
    setSearchParams(newParams);
  };

  // Si no hay usuario autenticado o está en modo vista previa, renderizar la carta digital de cliente
  const showClientView = !user || isPreviewMode;

  const { categories, toggleProductVisibility, loading, storesList, profiles } = useDigitalMenu(
    effectiveStoreId,
    !showClientView
  );

  const [activeTab, setActiveTab] = useState<AdminTab>("config");
  const [selectedUserToNotify, setSelectedUserToNotify] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Estados del Formulario de Configuración
  const storeConfig = useConfigStore((state) => state.storeConfig) as Record<string, any>;
  const fetchConfig = useConfigStore((state) => state.fetchConfig);
  const updateStoreConfig = useConfigStore((state) => state.updateStoreConfig);

  const [formTheme, setFormTheme] = useState<string>("tema-1");
  const [functionality, setFunctionality] = useState<string>("visualizacion");
  const [kitchenType, setKitchenType] = useState<string>("Jugos y licuados");
  const [commercialName, setCommercialName] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [phones, setPhones] = useState<string>("");
  const [defaultTable, setDefaultTable] = useState<string>("Mesa 1");

  // Domicilios & Recogida
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

  // Medios de pago: Efectivo y Transferencia
  const [paymentCash, setPaymentCash] = useState<boolean>(true);
  const [paymentTransfer, setPaymentTransfer] = useState<boolean>(true);
  const [notifiedUsers, setNotifiedUsers] = useState<string[]>([]);

  // Configuración de Tema Personalizado
  const [customBgColor, setCustomBgColor] = useState<string>("#09090b");
  const [customPrimaryColor, setCustomPrimaryColor] = useState<string>("#9d00ff");
  const [customTextColor, setCustomTextColor] = useState<string>("#ffffff");
  const [customBgStyle, setCustomBgStyle] = useState<string>("classic"); // classic (arrugado) | liso
  const [customFont, setCustomFont] = useState<string>("space-grotesk"); // space-grotesk | sans | caveat

  // Categorías colapsadas para la tab de productos
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Cargar configuración de la sucursal activa
  useEffect(() => {
    if (effectiveStoreId) {
      fetchConfig(effectiveStoreId);
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

  const activeStyles = getThemeStyles(formTheme, {
    bgColor: customBgColor,
    primaryColor: customPrimaryColor,
    textColor: customTextColor,
    bgStyle: customBgStyle,
    font: customFont
  });

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

  const businessUrl = `${window.location.origin}/digital-menu?preview=true${effectiveStoreId ? `&store=${effectiveStoreId}` : ""}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(businessUrl)}`;

  // VISTA DEL CLIENTE (CARTA DIGITAL PÚBLICA CON ESTILOS DINÁMICOS)
  if (showClientView) {
    return (
      <DigitalMenuClientView
        storeName={storeName}
        commercialName={commercialName}
        phones={phones}
        formTheme={formTheme}
        activeStyles={activeStyles}
        storesList={storesList}
        effectiveStoreId={effectiveStoreId}
        onStoreChange={handleStoreChange}
        categories={categories}
        loading={loading}
      />
    );
  }

  // VISTA ADMINISTRATIVA (PANEL DE GESTIÓN DEL MENÚ DIGITAL)
  return (
    <Layout>
      <div className="space-y-8 w-full p-4 md:p-8">
        <AdminPanelHeader businessUrl={businessUrl} />

        <AdminTabs activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "config" && (
          <ConfigTab
            businessUrl={businessUrl}
            qrCodeUrl={qrCodeUrl}
            activeStyles={activeStyles}
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
            hours={hours}
            setHours={setHours}
            paymentCash={paymentCash}
            setPaymentCash={setPaymentCash}
            paymentTransfer={paymentTransfer}
            setPaymentTransfer={setPaymentTransfer}
            profiles={profiles}
            selectedUserToNotify={selectedUserToNotify}
            setSelectedUserToNotify={setSelectedUserToNotify}
            notifiedUsers={notifiedUsers}
            onAddNotifiedUser={handleAddNotifiedUser}
            onRemoveNotifiedUser={handleRemoveNotifiedUser}
            isSaving={isSaving}
            onSaveConfig={handleSaveConfig}
          />
        )}

        {activeTab === "products" && (
          <ProductsTab
            categories={categories}
            collapsedCategories={collapsedCategories}
            setCollapsedCategories={setCollapsedCategories}
            toggleProductVisibility={toggleProductVisibility}
          />
        )}
      </div>
    </Layout>
  );
}
