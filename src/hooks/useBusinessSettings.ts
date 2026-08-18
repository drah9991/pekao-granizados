import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SettingsSubTab = "business" | "document" | "resolutions" | "payments" | "objectives" | "advanced" | "currency" | "integrations" | "cajas";

/**
 * Hook con toda la lógica de estado y datos de BusinessSettings.tsx,
 * extraído sin cambios de comportamiento.
 */
export function useBusinessSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>("business");

  // Base Data
  const [storeId, setStoreId] = useState<string>("");

  // TAB: Negocio
  const [storeName, setStoreName] = useState("");
  const [nitDoc, setNitDoc] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("Colombia");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");

  // Flags Operativos
  const [flagBillingElectronic, setFlagBillingElectronic] = useState(false);
  const [flagIngredients, setFlagIngredients] = useState(true);
  const [flagMesas, setFlagMesas] = useState(true);
  const [flagDelivery, setFlagDelivery] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // TAB: Documento
  const [docType, setDocType] = useState("Factura");
  const [docPrefix, setDocPrefix] = useState("");
  const [docStartNumber, setDocStartNumber] = useState("1");
  const [docTipPercentage, setDocTipPercentage] = useState("0");
  const [docNameInDoc, setDocNameInDoc] = useState("NIT/Doc");
  const [docNote1, setDocNote1] = useState("");
  const [docNote2, setDocNote2] = useState("");
  const [docNote3, setDocNote3] = useState("");
  const [docTemplate, setDocTemplate] = useState("Tiquete");
  const [docFontSize, setDocFontSize] = useState("12px");

  // Checkboxes Documento
  const [showPrintWindow, setShowPrintWindow] = useState(true);
  const [showDocLogo, setShowDocLogo] = useState(false);
  const [showTotalInLetters, setShowTotalInLetters] = useState(false);
  const [useTurns, setUseTurns] = useState(false);
  const [printAnotherPage, setPrintAnotherPage] = useState(true);
  const [showPriceBeforeTax, setShowPriceBeforeTax] = useState(false);

  // TAB: Resoluciones (Historial mock para visualización idéntica)
  const [resolutionsHistory, setResolutionsHistory] = useState<any[]>([
    { fecha: "2026-07-09", usuario: "Richard Roa", tipo: "Creación", descripcion: "Resolución de facturación habilitada automáticamente" }
  ]);

  // TAB: Medios de pago
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["Efectivo", "T. Crédito", "T. Débito", "Transferencia"]);
  const [newPaymentName, setNewPaymentName] = useState("");

  // TAB: Objetivos
  const [objectiveToday, setObjectiveToday] = useState("0");
  const [objective7Days, setObjective7Days] = useState("0");
  const [objective30Days, setObjective30Days] = useState("0");
  const [objectiveYear, setObjectiveYear] = useState("0");

  useEffect(() => {
    loadBusinessSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBusinessSettings = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();

      if (!profile?.store_id) return;
      setStoreId(profile.store_id);

      const { data: store } = await supabase
        .from('stores')
        .select('*')
        .eq('id', profile.store_id)
        .single();

      if (store) {
        setStoreName(store.name || "");
        setAddress(store.address || "");

        const config = store.config as Record<string, any> || {};

        // Mapeo Negocio
        const business = config.business || {};
        setNitDoc(business.nit_doc || "90000000");
        setContactName(business.contact_name || "Richard Joaquin Roa Gomez");
        setEmail(business.email || "rroa2513@gmail.com");
        setCountry(business.country || "Colombia");
        setState(business.state || "");
        setCity(business.city || "");
        setPhone(business.phone || "3107112503");
        setWebsite(business.website || "");
        setLogoPreview(business.logo_url || null);

        setFlagBillingElectronic(!!business.billing_electronic);
        setFlagIngredients(business.ingredients !== false);
        setFlagMesas(business.mesas !== false);
        setFlagDelivery(!!business.delivery);

        // Mapeo Documento
        const doc = config.document || {};
        setDocType(doc.type || "Factura");
        setDocPrefix(doc.prefix || "");
        setDocStartNumber(doc.start_number?.toString() || "1");
        setDocTipPercentage(doc.tip_percentage?.toString() || "0");
        setDocNameInDoc(doc.name_in_doc || "NIT/Doc");
        setDocNote1(doc.note_1 || "");
        setDocNote2(doc.note_2 || "");
        setDocNote3(doc.note_3 || "");
        setDocTemplate(doc.template || "Tiquete");
        setDocFontSize(doc.font_size || "12px");

        setShowPrintWindow(doc.show_print_window !== false);
        setShowDocLogo(!!doc.show_logo);
        setShowTotalInLetters(!!doc.show_total_letters);
        setUseTurns(!!doc.use_turns);
        setPrintAnotherPage(doc.print_another_page !== false);
        setShowPriceBeforeTax(!!doc.show_price_before_tax);

        // Mapeo Medios de pago
        if (config.payment_methods_list) {
          setPaymentMethods(config.payment_methods_list);
        }

        // Mapeo Objetivos
        const obj = config.objectives || {};
        setObjectiveToday(obj.today?.toString() || "0");
        setObjective7Days(obj.seven_days?.toString() || "0");
        setObjective30Days(obj.thirty_days?.toString() || "0");
        setObjectiveYear(obj.year?.toString() || "0");
      }
    } catch (error) {
      console.error('Error loading business settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { data: store } = await supabase
        .from('stores')
        .select('config')
        .eq('id', storeId)
        .single();

      const currentConfig = (store?.config as Record<string, any>) || {};

      const updatedConfig = {
        ...currentConfig,
        business: {
          nit_doc: nitDoc,
          contact_name: contactName,
          email,
          country,
          state,
          city,
          phone,
          website,
          billing_electronic: flagBillingElectronic,
          ingredients: flagIngredients,
          mesas: flagMesas,
          delivery: flagDelivery,
          logo_url: logoPreview
        },
        document: {
          type: docType,
          prefix: docPrefix,
          start_number: parseInt(docStartNumber) || 1,
          tip_percentage: parseFloat(docTipPercentage) || 0,
          name_in_doc: docNameInDoc,
          note_1: docNote1,
          note_2: docNote2,
          note_3: docNote3,
          template: docTemplate,
          font_size: docFontSize,
          show_print_window: showPrintWindow,
          show_logo: showDocLogo,
          show_total_letters: showTotalInLetters,
          use_turns: useTurns,
          print_another_page: printAnotherPage,
          show_price_before_tax: showPriceBeforeTax
        },
        payment_methods_list: paymentMethods,
        objectives: {
          today: parseFloat(objectiveToday) || 0,
          seven_days: parseFloat(objective7Days) || 0,
          thirty_days: parseFloat(objective30Days) || 0,
          year: parseFloat(objectiveYear) || 0
        }
      };

      const { error } = await supabase
        .from('stores')
        .update({
          name: storeName.toUpperCase(),
          address: address.toUpperCase(),
          config: updatedConfig
        })
        .eq('id', storeId);

      if (error) throw error;
      toast.success('Configuración sincronizada con éxito.');
    } catch (error: unknown) {
      console.error('Error saving business settings:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Fallo al guardar: ' + message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPaymentMethod = () => {
    if (!newPaymentName.trim()) return;
    if (paymentMethods.includes(newPaymentName.trim())) {
      toast.warning("El medio de pago ya existe.");
      return;
    }
    setPaymentMethods(prev => [...prev, newPaymentName.trim()]);
    setNewPaymentName("");
    toast.success("Medio de pago agregado localmente.");
  };

  const handleRemovePaymentMethod = (name: string) => {
    setPaymentMethods(prev => prev.filter(m => m !== name));
  };

  return {
    isLoading, storeId,
    activeSubTab, setActiveSubTab,

    storeName, setStoreName,
    nitDoc, setNitDoc,
    contactName, setContactName,
    email, setEmail,
    address, setAddress,
    country, setCountry,
    state, setState,
    city, setCity,
    phone, setPhone,
    website, setWebsite,

    flagBillingElectronic, setFlagBillingElectronic,
    flagIngredients, setFlagIngredients,
    flagMesas, setFlagMesas,
    flagDelivery, setFlagDelivery,
    logoPreview, setLogoPreview,

    docType, setDocType,
    docPrefix, setDocPrefix,
    docStartNumber, setDocStartNumber,
    docTipPercentage, setDocTipPercentage,
    docNameInDoc, setDocNameInDoc,
    docNote1, setDocNote1,
    docNote2, setDocNote2,
    docNote3, setDocNote3,
    docTemplate, setDocTemplate,
    docFontSize, setDocFontSize,

    showPrintWindow, setShowPrintWindow,
    showDocLogo, setShowDocLogo,
    showTotalInLetters, setShowTotalInLetters,
    useTurns, setUseTurns,
    printAnotherPage, setPrintAnotherPage,
    showPriceBeforeTax, setShowPriceBeforeTax,

    resolutionsHistory,

    paymentMethods,
    newPaymentName, setNewPaymentName,
    handleAddPaymentMethod,
    handleRemovePaymentMethod,

    objectiveToday, setObjectiveToday,
    objective7Days, setObjective7Days,
    objective30Days, setObjective30Days,
    objectiveYear, setObjectiveYear,

    handleSave,
  };
}
