import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useTurn } from '@/hooks/useTurn';
import { useConfigStore } from '@/store/useConfigStore';
import { usePOS } from '@/hooks/usePOS';
import { usePrintManager } from '@/hooks/usePrintManager';
import PrintManagerHeader from '@/components/print-manager/PrintManagerHeader';
import JobConfigPanel from '@/components/print-manager/JobConfigPanel';
import BillingSummaryCard from '@/components/print-manager/BillingSummaryCard';
import TurnVolumeMonitor from '@/components/print-manager/TurnVolumeMonitor';
import PrintJobHistoryTable from '@/components/print-manager/PrintJobHistoryTable';
import type { ColorMode, OriginType, PaperSize } from '@/components/print-manager/types';

export default function PrintManagerModule() {
  const { user, userRole } = useAuth();
  const { activeTurn } = useTurn();

  const storeConfig = useConfigStore((state) => state.storeConfig) as Record<string, any>;
  const fetchConfig = useConfigStore((state) => state.fetchConfig);
  const pricing = storeConfig?.copyCenter?.pricing || {
    print: { bw_letter: 500, bw_legal: 500, color_letter: 1000, color_legal: 1200 },
    copy: { bw_letter: 300, bw_legal: 500, color_letter: 1000, color_legal: 1200, cedula: 1000 },
    scanner: 500
  };

  // Estados del formulario
  const [origin, setOrigin] = useState<OriginType>('whatsapp');
  const [colorMode, setColorMode] = useState<ColorMode>('bw');
  const [paperSize, setPaperSize] = useState<PaperSize>('letter');
  const [pages, setPages] = useState<number>(1);
  const [sets, setSets] = useState<number>(1);
  const [isCedula, setIsCedula] = useState<boolean>(false);
  const [cedulaQty, setCedulaQty] = useState<number>(1);
  const [isCopia, setIsCopia] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const historyPageSize = 10;

  const [selectedTurnId, setSelectedTurnId] = useState<string>("active");

  const { processSale } = usePOS();
  const { turnsHistory, history, refetchHistory, handleCancelJob } = usePrintManager({
    storeId: user?.store_id,
    activeTurn,
    selectedTurnId
  });

  // Cargar configuración de la sucursal al montar el módulo
  React.useEffect(() => {
    if (user?.store_id) {
      fetchConfig(user.store_id);
    }
  }, [user?.store_id, fetchConfig]);

  // Reset Cédula and Copia check if origin is not physical
  React.useEffect(() => {
    if (origin !== 'physical') {
      setIsCedula(false);
      setIsCopia(true);
    }
  }, [origin]);

  // OPTIMIZACIÓN: Estado derivado puro y síncrono mediante useMemo
  const { totalImpressions, totalPrice } = useMemo(() => {
    let pricePerPage = 0;

    if (origin === 'scanner') {
      pricePerPage = pricing.scanner; // Tarifa dinámica escáner
    } else {
      const activeMatrix = origin === 'physical' ? pricing.copy : pricing.print;
      if (colorMode === 'bw') {
        pricePerPage = paperSize === 'letter' ? activeMatrix.bw_letter : activeMatrix.bw_legal;
      } else {
        pricePerPage = paperSize === 'letter' ? activeMatrix.color_letter : activeMatrix.color_legal;
      }
    }

    let impressions = 0;
    let price = 0;

    if (origin === 'physical') {
      if (isCopia) {
        impressions += Math.max(0, pages) * Math.max(0, sets);
        price += Math.max(0, pages) * Math.max(0, sets) * pricePerPage;
      }
      if (isCedula) {
        impressions += Math.max(0, cedulaQty);
        price += Math.max(0, cedulaQty) * (pricing.copy?.cedula ?? 1000);
      }
    } else {
      // whatsapp or scanner
      impressions = Math.max(0, pages) * Math.max(0, sets);
      price = impressions * pricePerPage;
    }

    return {
      totalImpressions: impressions,
      totalPrice: price
    };
  }, [origin, colorMode, paperSize, pages, sets, pricing, isCedula, cedulaQty, isCopia]);

  // Rendimiento total acumulado en el turno (excluye anuladas)
  const totalTurnImpressions = useMemo(() => {
    return history
      .filter(job => job.rawOrder?.status !== 'cancelled')
      .reduce((acc, job) => acc + job.impressions, 0);
  }, [history]);

  // Paginación local del historial
  const historyTotalPages = Math.max(1, Math.ceil(history.length / historyPageSize));
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    if (start >= history.length) {
      return history.slice(0, historyPageSize);
    }
    return history.slice(start, start + historyPageSize);
  }, [history, historyPage, historyPageSize]);

  React.useEffect(() => {
    if (historyPage > historyTotalPages || historyPage < 1) {
      setHistoryPage(1);
    }
  }, [history.length, historyTotalPages, historyPage]);

  // Manejadores de adición rápida (Fast-add)
  const handleFastAdd = (amount: number) => {
    setPages((prev) => Math.max(1, (prev <= 0 ? 0 : prev) + amount));
  };

  // Procesamiento, Facturación y Copiado automatizado
  const handleProcessAndBill = async () => {
    // AUDITORÍA DE SEGURIDAD: Validación de roles en tiempo de ejecución
    if (!user || (userRole !== 'cashier' && userRole !== 'admin' && userRole !== 'manager')) {
      toast.error('Acceso denegado: Permisos insuficientes para facturar.');
      return;
    }

    if (!activeTurn || activeTurn.status === 'paused') {
      toast.error('Operación bloqueada: Requiere un turno de caja activo.');
      return;
    }

    if (origin === 'physical') {
      if (!isCopia && !isCedula) {
        toast.error('Debe seleccionar al menos un servicio (Cédula o Copia).');
        return;
      }
      if (isCopia && (pages <= 0 || sets <= 0)) {
        toast.error('La cantidad de páginas y juegos para copias debe ser mayor a cero.');
        return;
      }
      if (isCedula && cedulaQty <= 0) {
        toast.error('La cantidad de cédulas debe ser mayor a cero.');
        return;
      }
    } else {
      if (pages <= 0 || sets <= 0) {
        toast.error('La cantidad de páginas y juegos debe ser mayor a cero.');
        return;
      }
    }

    setIsProcessing(true);

    try {
      let formattedOriginName = '';
      if (origin === 'whatsapp') {
        formattedOriginName = 'Impresión WhatsApp/USB';
      } else if (origin === 'scanner') {
        formattedOriginName = 'Escáner';
      } else {
        const parts = [];
        if (isCopia) parts.push('Copia Física');
        if (isCedula) parts.push(`Cédula (x${cedulaQty})`);
        formattedOriginName = parts.join(' + ') || 'Copia Vacía';
      }

      const dummyCart = [{
        productId: 'generic-copy-service',
        quantity: 1,
        price: totalPrice,
        name: `Servicio Centro de Copiado (${formattedOriginName})`,
        sizeMultiplier: 1,
        baseVolume: 0,
        toppings: []
      }];

      const orderResult = await processSale(
        dummyCart,
        totalPrice, // saleTotal
        totalPrice, // saleSubtotal
        0, // discountAmount
        null, // customer
        paymentMethod, // payment method
        totalPrice, // amountReceived
        undefined, // deliveryData
        undefined, // splitDetails
        {
          origin: 'print_center',
          copy_origin: formattedOriginName,
          copy_pages: totalImpressions,
          is_cedula: isCedula,
          cedula_qty: isCedula ? cedulaQty : 0,
          is_copia: isCopia
        } // metadata
      );

      if (orderResult) {
        // Generación de mensaje automatizado para el portapapeles
        const whatsappMessage = `¡Hola! Tu documento está listo. El total de tus ${totalImpressions} páginas es de $${totalPrice.toLocaleString('es-CO')}. Puedes pasar a caja.`;
        await navigator.clipboard.writeText(whatsappMessage).catch(() => console.log('Clipboard no disponible'));

        toast.success('Servicio facturado correctamente en la caja global', {
          className: 'border-emerald-500/40 bg-slate-950 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
        });

        // Resetear formulario
        setPages(1);
        setSets(1);
        setCedulaQty(1);

        // Refrescar historial
        refetchHistory();
      }
    } catch (error) {
      toast.error('Error crítico al registrar el trabajo de impresión.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-80px)] overflow-y-auto bg-[#030712] text-slate-100 font-sans p-4 lg:p-6 pb-32 flex flex-col gap-6 selection:bg-cyan-500/30">

        <PrintManagerHeader
          selectedTurnId={selectedTurnId}
          setSelectedTurnId={setSelectedTurnId}
          turnsHistory={turnsHistory}
          activeTurn={activeTurn}
        />

        {/* Distribución de Paneles de Vidrio (Glassmorphism Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* PANEL IZQUIERDO: Configuración del Trabajo (7 Columnas) */}
          <div className="lg:col-span-7 space-y-6">
            <JobConfigPanel
              origin={origin}
              setOrigin={setOrigin}
              isCedula={isCedula}
              setIsCedula={setIsCedula}
              cedulaQty={cedulaQty}
              setCedulaQty={setCedulaQty}
              isCopia={isCopia}
              setIsCopia={setIsCopia}
              pricing={pricing}
              colorMode={colorMode}
              setColorMode={setColorMode}
              paperSize={paperSize}
              setPaperSize={setPaperSize}
              pages={pages}
              setPages={setPages}
              sets={sets}
              setSets={setSets}
              handleFastAdd={handleFastAdd}
            />
          </div>

          {/* PANEL DERECHO: Liquidación, Totales e Historial (5 Columnas) */}
          <div className="lg:col-span-5 space-y-6">
            <BillingSummaryCard
              totalImpressions={totalImpressions}
              totalPrice={totalPrice}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              isProcessing={isProcessing}
              activeTurn={activeTurn}
              handleProcessAndBill={handleProcessAndBill}
            />
            <TurnVolumeMonitor totalTurnImpressions={totalTurnImpressions} />
          </div>

        </div>

        {/* HISTORIAL EN TIEMPO REAL (Fila Inferior Completa) */}
        <PrintJobHistoryTable
          history={history}
          paginatedHistory={paginatedHistory}
          historyPage={historyPage}
          setHistoryPage={setHistoryPage}
          historyTotalPages={historyTotalPages}
          historyPageSize={historyPageSize}
          handleCancelJob={handleCancelJob}
        />

      </div>
    </Layout>
  );
}
