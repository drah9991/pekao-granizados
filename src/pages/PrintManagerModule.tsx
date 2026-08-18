import Layout from '@/components/Layout';
import { usePrintCenter } from '@/hooks/usePrintCenter';
import { PrintCenterHeader } from '@/components/print-center/PrintCenterHeader';
import { PrintJobConfigPanel } from '@/components/print-center/PrintJobConfigPanel';
import { PrintCenterCheckoutPanel } from '@/components/print-center/PrintCenterCheckoutPanel';
import { PrintJobHistoryTable } from '@/components/print-center/PrintJobHistoryTable';

export default function PrintManagerModule() {
  const pc = usePrintCenter();

  return (
    <Layout>
      <div className="h-[calc(100vh-80px)] overflow-y-auto bg-[#030712] text-slate-100 font-sans p-4 lg:p-6 pb-32 flex flex-col gap-6 selection:bg-cyan-500/30">

        <PrintCenterHeader
          selectedTurnId={pc.selectedTurnId}
          setSelectedTurnId={pc.setSelectedTurnId}
          turnsHistory={pc.turnsHistory}
          activeTurn={pc.activeTurn}
        />

        {/* Distribución de Paneles de Vidrio (Glassmorphism Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <PrintJobConfigPanel
            origin={pc.origin}
            setOrigin={pc.setOrigin}
            colorMode={pc.colorMode}
            setColorMode={pc.setColorMode}
            paperSize={pc.paperSize}
            setPaperSize={pc.setPaperSize}
            pages={pc.pages}
            setPages={pc.setPages}
            sets={pc.sets}
            setSets={pc.setSets}
            isCedula={pc.isCedula}
            setIsCedula={pc.setIsCedula}
            cedulaQty={pc.cedulaQty}
            setCedulaQty={pc.setCedulaQty}
            isCopia={pc.isCopia}
            setIsCopia={pc.setIsCopia}
            pricing={pc.pricing}
            handleFastAdd={pc.handleFastAdd}
          />

          <PrintCenterCheckoutPanel
            totalImpressions={pc.totalImpressions}
            totalPrice={pc.totalPrice}
            paymentMethod={pc.paymentMethod}
            setPaymentMethod={pc.setPaymentMethod}
            isProcessing={pc.isProcessing}
            activeTurn={pc.activeTurn}
            handleProcessAndBill={pc.handleProcessAndBill}
            totalTurnImpressions={pc.totalTurnImpressions}
          />
        </div>

        <PrintJobHistoryTable
          history={pc.history}
          paginatedHistory={pc.paginatedHistory}
          historyPage={pc.historyPage}
          setHistoryPage={pc.setHistoryPage}
          historyTotalPages={pc.historyTotalPages}
          historyPageSize={pc.historyPageSize}
          handleCancelJob={pc.handleCancelJob}
        />

      </div>
    </Layout>
  );
}
