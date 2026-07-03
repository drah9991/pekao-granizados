import React, { useMemo, useState } from 'react';
import { Smartphone, Copy, Scan, Printer, Plus, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useTurn } from '@/hooks/useTurn';
import { useConfigStore } from '@/store/useConfigStore';
import { usePOS } from '@/hooks/usePOS';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';


// Interfaces estrictas para el módulo
type OriginType = 'whatsapp' | 'physical' | 'scanner';
type ColorMode = 'bw' | 'color';
type PaperSize = 'letter' | 'legal';

interface PrintJob {
  id: string;
  origin: string;
  impressions: number;
  price: number;
  time: string;
  rawOrder?: any;
}

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
  
  const queryClient = useQueryClient();
  const { processSale } = usePOS();

  // Cargar configuración de la sucursal al montar el módulo
  React.useEffect(() => {
    if (user?.store_id) {
      fetchConfig(user.store_id);
    }
  }, [user?.store_id, fetchConfig]);
  
  // Historial desde Supabase (sólo las de este turno/tienda y origen print_center)
  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['print-center-history', activeTurn?.id],
    queryFn: async () => {
      if (!activeTurn) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          created_at,
          payment,
          status,
          order_items (
            name,
            qty
          )
        `)
        .eq('store_id', user?.store_id || '')
        .gte('created_at', activeTurn.opened_at)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching print history:", error);
        return [];
      }

      console.log("DEBUG Print Center: all fetched orders for shift:", data);

      // Filtrar por tag metadata (origin: 'print_center')
      const printOrders = data.filter(order => {
        let p = order.payment;
        if (typeof p === 'string') {
          try {
            p = JSON.parse(p);
          } catch (_) {
            return false;
          }
        }
        return p && (p as any).origin === 'print_center';
      });

      return printOrders.map(order => {
        let p = order.payment;
        if (typeof p === 'string') {
          try {
            p = JSON.parse(p);
          } catch (_) {}
        }
        const payObj = (p || {}) as any;
        return {
          id: order.id,
          origin: payObj.copy_origin || 'Desconocido',
          impressions: payObj.copy_pages || 1,
          price: order.total,
          time: new Date(order.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
          rawOrder: {
            ...order,
            payment_method: payObj.method || 'cash', // Se extrae del JSON payment
            status: order.status
          }
        } as PrintJob;
      });
    },
    enabled: !!activeTurn && !!user?.store_id
  });



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

  const handleCancelJob = async (job: PrintJob) => {
    if (!confirm('¿Estás seguro de que deseas anular este registro de impresión? Esto restará el dinero de tu caja.')) return;
    
    try {
      const { error } = await supabase.rpc('cancel_sale_with_stock_restore', {
        p_order_id: job.id,
        p_reason: 'Anulación manual desde Centro de Copiado'
      });

      if (error) throw error;
      
      toast.success('Registro anulado correctamente');
      refetchHistory();
      // Invalidate global sales query to update dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-v2-raw"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["products-grid"] });
      queryClient.invalidateQueries({ queryKey: ["tank-status"] });
    } catch (err: any) {
      console.error(err);
      toast.error('Error al anular: ' + (err.message || 'Desconocido'));
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#030712] text-slate-100 font-sans p-4 lg:p-6 flex flex-col gap-6 selection:bg-cyan-500/30">
        
        {/* Encabezado del Módulo */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
              <Printer className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-emerald-400 bg-clip-text text-transparent">
                Print Center
              </h1>
              <p className="text-xs text-slate-400">Gestión automatizada de copiado, escaneo y facturación de servicios</p>
            </div>
          </div>
          
          {/* Indicador de Estado del Turno */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium backdrop-blur-md ${
            activeTurn && activeTurn.status !== 'paused'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${activeTurn && activeTurn.status !== 'paused' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            {activeTurn && activeTurn.status !== 'paused' ? `Turno Activo` : 'Caja Cerrada / Pausada'}
          </div>
        </div>

        {/* Distribución de Paneles de Vidrio (Glassmorphism Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* PANEL IZQUIERDO: Configuración del Trabajo (7 Columnas) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-2xl shadow-2xl flex flex-col gap-5">
              
              {/* Selector de Origen */}
              <div>
                <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-3 block">Origen del Documento</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['whatsapp', 'physical', 'scanner'] as OriginType[]).map((type) => {
                    const icons = { whatsapp: Smartphone, physical: Copy, scanner: Scan };
                    const Icon = icons[type];
                    const labels = { whatsapp: 'WhatsApp / USB', physical: 'Copias', scanner: 'Escáner' };
                    
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setOrigin(type)}
                        className={`flex flex-col items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-medium transition-all duration-200 active:scale-95 ${
                          origin === type
                            ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                            : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {labels[type]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selección de Servicios (Cédula / Copia) */}
              {origin === 'physical' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cédula Card */}
                  <div className={`bg-slate-900/40 backdrop-blur-md border p-4 rounded-xl flex flex-col gap-3 transition-all ${isCedula ? 'border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'border-white/5 opacity-70'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="service-cedula"
                          checked={isCedula}
                          onCheckedChange={(checked) => setIsCedula(!!checked)}
                          className="w-5 h-5 border-slate-700 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500 rounded-md"
                        />
                        <label htmlFor="service-cedula" className="text-xs font-bold uppercase tracking-wider text-slate-200 cursor-pointer select-none">Cédula</label>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">${(pricing.copy?.cedula ?? 1000).toLocaleString('es-CO')} c/u</span>
                    </div>
                    {isCedula && (
                      <div className="flex flex-col gap-1.5 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Cantidad de Cédulas</label>
                        <div className="flex items-center justify-between border border-white/5 bg-slate-950/60 rounded-lg overflow-hidden h-9 px-2">
                          <input
                            type="number"
                            min="1"
                            value={cedulaQty}
                            onChange={(e) => setCedulaQty(Math.max(1, parseInt(e.target.value) || 0))}
                            className="bg-transparent text-sm font-bold border-none text-white focus:outline-none w-16"
                          />
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setCedulaQty(prev => Math.max(1, prev - 1))}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-xs"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() => setCedulaQty(prev => prev + 1)}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Copia Card */}
                  <div className={`bg-slate-900/40 backdrop-blur-md border p-4 rounded-xl flex flex-col gap-3 transition-all ${isCopia ? 'border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'border-white/5 opacity-70'}`}>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="service-copia"
                        checked={isCopia}
                        onCheckedChange={(checked) => setIsCopia(!!checked)}
                        className="w-5 h-5 border-slate-700 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500 rounded-md"
                      />
                      <label htmlFor="service-copia" className="text-xs font-bold uppercase tracking-wider text-slate-200 cursor-pointer select-none">Copia</label>
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">Habilita la configuración para copias normales (páginas y juegos).</span>
                  </div>
                </div>
              )}

              {/* Atributos (Modo de Color y Tamaño de Papel) */}
              {origin !== 'scanner' && (
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-200 ${origin === 'physical' && !isCopia ? 'opacity-30 pointer-events-none' : ''}`}>
                  {/* Modo de Color */}
                  <div>
                    <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2 block">Modo de Color</label>
                    <div className="flex bg-slate-950/60 p-1 border border-white/5 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setColorMode('bw')}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${colorMode === 'bw' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        Blanco & Negro
                      </button>
                      <button
                        type="button"
                        onClick={() => setColorMode('color')}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${colorMode === 'color' ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 shadow-[0_0_10px_rgba(217,70,239,0.1)]' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        Full Color
                      </button>
                    </div>
                  </div>

                  {/* Tamaño de Papel */}
                  <div>
                    <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2 block">Tamaño de Papel</label>
                    <div className="flex bg-slate-950/60 p-1 border border-white/5 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setPaperSize('letter')}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${paperSize === 'letter' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        Carta
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaperSize('legal')}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${paperSize === 'legal' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        Oficio (Legal)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Contadores Numéricos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Páginas */}
                <div className={`bg-slate-950/40 border border-white/5 p-4 rounded-xl flex flex-col gap-2 transition-opacity duration-200 ${origin === 'physical' && !isCopia ? 'opacity-30' : ''}`}>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Cantidad de Páginas</label>
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="number"
                      min="1"
                      disabled={origin === 'physical' && !isCopia}
                      value={origin === 'physical' && !isCopia ? 0 : pages}
                      onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 0))}
                      className="bg-transparent text-xl font-bold border-none text-white focus:outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:cursor-not-allowed"
                    />
                    <div className="flex gap-1">
                      {[1, 5, 10, 50].map((val) => (
                        <button
                          key={val}
                          type="button"
                          disabled={origin === 'physical' && !isCopia}
                          onClick={() => handleFastAdd(val)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-[10px] font-bold rounded border border-white/5 text-cyan-400 transition-colors"
                        >
                          +{val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Juegos / Sets */}
                <div className={`bg-slate-950/40 border border-white/5 p-4 rounded-xl flex flex-col gap-2 transition-opacity duration-200 ${origin === 'physical' && !isCopia ? 'opacity-30' : ''}`}>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Número de Juegos (Sets)</label>
                  <div className="flex items-center gap-4 justify-between">
                    <input
                      type="number"
                      min="1"
                      disabled={origin === 'physical' && !isCopia}
                      value={origin === 'physical' && !isCopia ? 0 : sets}
                      onChange={(e) => setSets(Math.max(1, parseInt(e.target.value) || 0))}
                      className="bg-transparent text-xl font-bold border-none text-white focus:outline-none w-20 disabled:cursor-not-allowed"
                    />
                    <div className="flex items-center border border-white/5 bg-slate-950 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        disabled={origin === 'physical' && !isCopia}
                        onClick={() => setSets(prev => Math.max(1, prev - 1))}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        -
                      </button>
                      <span className="px-4 text-xs font-bold text-slate-200">{origin === 'physical' && !isCopia ? 0 : sets}</span>
                      <button
                        type="button"
                        disabled={origin === 'physical' && !isCopia}
                        onClick={() => setSets(prev => prev + 1)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* PANEL DERECHO: Liquidación, Totales e Historial (5 Columnas) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Liquidación de Caja */}
            <div className="bg-gradient-to-b from-slate-900/60 to-slate-950/40 backdrop-blur-xl border border-white/5 p-6 rounded-2xl shadow-2xl flex flex-col gap-4">
              <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Cómputo de Operación</h2>
              
              <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-white/5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Total Impresiones / Caras:</span>
                  <span className="font-mono font-medium text-slate-200">{totalImpressions} págs</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-white/5">
                  <span className="text-sm font-medium text-slate-300">Total a Cobrar:</span>
                  <span className="text-2xl font-black font-mono text-emerald-400 shadow-glow">
                    ${totalPrice.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>

              {/* Selector de Método de Pago */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">Método de Pago</label>
                <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-1 border border-white/5 rounded-xl">
                  {[
                    { code: 'cash', label: 'Efectivo' },
                    { code: 'nequi', label: 'Nequi' },
                    { code: 'daviplata', label: 'Daviplata' },
                    { code: 'tarjeta', label: 'Tarjeta' },
                    { code: 'bancolombia', label: 'Bancolombia' },
                    { code: 'transfer', label: 'Transf.' }
                  ].map((pm) => (
                    <button
                      key={pm.code}
                      type="button"
                      onClick={() => setPaymentMethod(pm.code)}
                      className={`py-1.5 px-2 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all duration-150 ${
                        paymentMethod === pm.code
                          ? 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
                      }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botón de Acción Principal con micro-animaciones */}
              <button
                type="button"
                disabled={isProcessing || !activeTurn || activeTurn.status === 'paused'}
                onClick={handleProcessAndBill}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98] ${
                  !activeTurn || activeTurn.status === 'paused'
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_25px_rgba(52,211,153,0.4)] hover:brightness-110'
                }`}
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    FACTURAR & PROCESAR
                  </>
                )}
              </button>
            </div>

            {/* Monitor de Rendimiento del Turno */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Volumen del Turno</span>
              </div>
              <span className="font-mono text-sm font-bold bg-slate-950 px-3 py-1 border border-white/5 rounded-lg text-cyan-400">
                {totalTurnImpressions} impresiones
              </span>
            </div>

          </div>

        </div>

        {/* HISTORIAL EN TIEMPO REAL (Fila Inferior Completa) */}
        <div className="bg-slate-900/20 backdrop-blur-xl border border-white/5 rounded-2xl p-6 mt-2">
          <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-4">Registro de Trabajos Recientes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pl-2">ID Operación</th>
                  <th className="pb-3">Origen</th>
                  <th className="pb-3">Impresiones</th>
                  <th className="pb-3">Medio de Pago</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3">Importe</th>
                  <th className="pb-3 text-right">Hora</th>
                  <th className="pb-3 text-right pr-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-medium text-slate-300">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500 font-normal">
                      No se registran transacciones de impresión en este turno.
                    </td>
                  </tr>
                ) : (
                  history.map((job) => {
                    const isCancelled = job.rawOrder?.status === 'cancelled';
                    return (
                      <tr key={job.id} className={`hover:bg-white/[0.02] transition-colors group ${isCancelled ? 'opacity-50 line-through' : ''}`}>
                        <td className="py-3 pl-2 font-mono text-slate-500 group-hover:text-cyan-400 transition-colors">
                          #{job.id.slice(0, 8)}
                        </td>
                        <td className="py-3 capitalize">{job.origin}</td>
                        <td className="py-3 font-mono">{job.impressions} u.</td>
                        <td className="py-3 uppercase font-bold text-[10px] text-slate-400">
                          {job.rawOrder?.payment_method === 'cash' ? '💵 Efectivo' : 
                           job.rawOrder?.payment_method === 'nequi' ? '📱 Nequi' :
                           job.rawOrder?.payment_method === 'daviplata' ? '📱 Daviplata' :
                           job.rawOrder?.payment_method === 'tarjeta' ? '💳 Tarjeta' :
                           job.rawOrder?.payment_method === 'bancolombia' ? '🏦 Bancolombia' : 
                           `🏦 ${job.rawOrder?.payment_method || 'Otro'}`}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            isCancelled 
                              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400' 
                              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                          }`}>
                            {isCancelled ? 'Anulada' : 'Facturada'}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-emerald-400">${job.price.toLocaleString('es-CO')}</td>
                        <td className="py-3 text-right text-slate-500 font-mono">{job.time}</td>
                        <td className="py-3 text-right pr-2">
                           {!isCancelled && (
                             <button 
                               onClick={() => handleCancelJob(job)}
                               className="text-xs text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 px-2 py-1 rounded transition-colors border border-transparent hover:border-rose-500/30"
                             >
                               Anular
                             </button>
                           )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>



      </div>
    </Layout>
  );
}
