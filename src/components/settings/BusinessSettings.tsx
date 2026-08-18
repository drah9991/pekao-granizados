import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { BusinessSettingsTabs } from "@/components/settings/BusinessSettingsTabs";
import { BusinessInfoTab } from "@/components/settings/BusinessInfoTab";
import { DocumentSettingsTab } from "@/components/settings/DocumentSettingsTab";
import { ResolutionsHistoryTab } from "@/components/settings/ResolutionsHistoryTab";
import { PaymentMethodsSettingsTab } from "@/components/settings/PaymentMethodsSettingsTab";
import { ObjectivesTab } from "@/components/settings/ObjectivesTab";
import { PlaceholderSettingsTab } from "@/components/settings/PlaceholderSettingsTab";

export default function BusinessSettings() {
  const bs = useBusinessSettings();

  if (bs.isLoading && !bs.storeId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <Loader2 className="w-12 h-12 animate-spin text-primary shadow-glow-pro" />
        <p className="text-[10px] font-black uppercase tracking-widest text-primary italic animate-pulse">Indexando Módulo de Control...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <BusinessSettingsTabs activeSubTab={bs.activeSubTab} setActiveSubTab={bs.setActiveSubTab} />

      <AnimatePresence mode="wait">
        {bs.activeSubTab === "business" && (
          <BusinessInfoTab
            storeName={bs.storeName} setStoreName={bs.setStoreName}
            nitDoc={bs.nitDoc} setNitDoc={bs.setNitDoc}
            contactName={bs.contactName} setContactName={bs.setContactName}
            email={bs.email} setEmail={bs.setEmail}
            address={bs.address} setAddress={bs.setAddress}
            country={bs.country} setCountry={bs.setCountry}
            state={bs.state} setState={bs.setState}
            city={bs.city} setCity={bs.setCity}
            phone={bs.phone} setPhone={bs.setPhone}
            website={bs.website} setWebsite={bs.setWebsite}
            flagBillingElectronic={bs.flagBillingElectronic} setFlagBillingElectronic={bs.setFlagBillingElectronic}
            flagIngredients={bs.flagIngredients} setFlagIngredients={bs.setFlagIngredients}
            flagMesas={bs.flagMesas} setFlagMesas={bs.setFlagMesas}
            flagDelivery={bs.flagDelivery} setFlagDelivery={bs.setFlagDelivery}
            logoPreview={bs.logoPreview} setLogoPreview={bs.setLogoPreview}
          />
        )}

        {bs.activeSubTab === "document" && (
          <DocumentSettingsTab
            docType={bs.docType} setDocType={bs.setDocType}
            docPrefix={bs.docPrefix} setDocPrefix={bs.setDocPrefix}
            docStartNumber={bs.docStartNumber} setDocStartNumber={bs.setDocStartNumber}
            docTipPercentage={bs.docTipPercentage} setDocTipPercentage={bs.setDocTipPercentage}
            docNameInDoc={bs.docNameInDoc} setDocNameInDoc={bs.setDocNameInDoc}
            docNote1={bs.docNote1} setDocNote1={bs.setDocNote1}
            docNote2={bs.docNote2} setDocNote2={bs.setDocNote2}
            docNote3={bs.docNote3} setDocNote3={bs.setDocNote3}
            docTemplate={bs.docTemplate} setDocTemplate={bs.setDocTemplate}
            docFontSize={bs.docFontSize} setDocFontSize={bs.setDocFontSize}
            showPrintWindow={bs.showPrintWindow} setShowPrintWindow={bs.setShowPrintWindow}
            showDocLogo={bs.showDocLogo} setShowDocLogo={bs.setShowDocLogo}
            showTotalInLetters={bs.showTotalInLetters} setShowTotalInLetters={bs.setShowTotalInLetters}
            useTurns={bs.useTurns} setUseTurns={bs.setUseTurns}
            printAnotherPage={bs.printAnotherPage} setPrintAnotherPage={bs.setPrintAnotherPage}
            showPriceBeforeTax={bs.showPriceBeforeTax} setShowPriceBeforeTax={bs.setShowPriceBeforeTax}
          />
        )}

        {bs.activeSubTab === "resolutions" && (
          <ResolutionsHistoryTab resolutionsHistory={bs.resolutionsHistory} />
        )}

        {bs.activeSubTab === "payments" && (
          <PaymentMethodsSettingsTab
            paymentMethods={bs.paymentMethods}
            newPaymentName={bs.newPaymentName}
            setNewPaymentName={bs.setNewPaymentName}
            handleAddPaymentMethod={bs.handleAddPaymentMethod}
            handleRemovePaymentMethod={bs.handleRemovePaymentMethod}
          />
        )}

        {bs.activeSubTab === "objectives" && (
          <ObjectivesTab
            objectiveToday={bs.objectiveToday} setObjectiveToday={bs.setObjectiveToday}
            objective7Days={bs.objective7Days} setObjective7Days={bs.setObjective7Days}
            objective30Days={bs.objective30Days} setObjective30Days={bs.setObjective30Days}
            objectiveYear={bs.objectiveYear} setObjectiveYear={bs.setObjectiveYear}
          />
        )}

        {["advanced", "currency", "integrations", "cajas"].includes(bs.activeSubTab) && (
          <PlaceholderSettingsTab activeSubTab={bs.activeSubTab} />
        )}
      </AnimatePresence>

      {/* Botón de Sincronización */}
      <div className="flex justify-end pt-6 border-t border-white/5">
        <Button
          onClick={bs.handleSave}
          disabled={bs.isLoading}
          className="h-14 px-8 rounded-xl bg-primary text-white font-space-grotesk text-[10px] uppercase font-black tracking-widest hover:opacity-90 shadow-glow-pro"
        >
          {bs.isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Sincronizando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar cambios
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
