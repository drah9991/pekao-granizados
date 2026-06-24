import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Smartphone, Printer, Scan, FileText, Settings2, Plus, Calculator, CheckCircle2, Copy, History, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCOP } from '@/lib/currency';
import { toast } from 'sonner';

// --- Interfaces & Types ---
type OriginType = 'whatsapp' | 'physical' | 'scanner';
type ColorMode = 'bw' | 'color';
type DuplexMode = 'simplex' | 'duplex';
type PaperSize = 'letter' | 'legal';

interface PrintPricing {
  bw_letter: number;
  bw_legal: number;
  color_letter: number;
  color_legal: number;
  scanner: number;
}

interface PrintPayload {
  id: string;
  created_at: string;
  origin: OriginType;
  color_mode: ColorMode;
  duplex_mode: DuplexMode;
  paper_size: PaperSize;
  pages: number;
  sets: number;
  total_impressions: number;
  total_price: number;
  status: 'completed' | 'pending';
}

// --- Mock Data & Config ---
const PRICING: PrintPricing = {
  bw_letter: 200,
  bw_legal: 300,
  color_letter: 1000,
  color_legal: 1200,
  scanner: 500, // Flat rate per scanned page
};

const MOCK_INITIAL_HISTORY: PrintPayload[] = [
  { id: 'TX-001', created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), origin: 'whatsapp', color_mode: 'bw', duplex_mode: 'simplex', paper_size: 'letter', pages: 45, sets: 1, total_impressions: 45, total_price: 9000, status: 'completed' },
  { id: 'TX-002', created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), origin: 'physical', color_mode: 'color', duplex_mode: 'duplex', paper_size: 'letter', pages: 10, sets: 2, total_impressions: 20, total_price: 20000, status: 'completed' },
];

export default function PrintManagerModule() {
  // --- State ---
  const [origin, setOrigin] = useState<OriginType>('whatsapp');
  const [colorMode, setColorMode] = useState<ColorMode>('bw');
  const [duplexMode, setDuplexMode] = useState<DuplexMode>('simplex');
  const [paperSize, setPaperSize] = useState<PaperSize>('letter');
  
  const [pages, setPages] = useState<number>(1);
  const [sets, setSets] = useState<number>(1);
  
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [totalImpressions, setTotalImpressions] = useState<number>(0);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<PrintPayload[]>(MOCK_INITIAL_HISTORY);

  // --- Reactivity: Price Calculation ---
  useEffect(() => {
    let pricePerPage = 0;
    
    if (origin === 'scanner') {
      pricePerPage = PRICING.scanner;
    } else {
      if (colorMode === 'bw') {
        pricePerPage = paperSize === 'letter' ? PRICING.bw_letter : PRICING.bw_legal;
      } else {
        pricePerPage = paperSize === 'letter' ? PRICING.color_letter : PRICING.color_legal;
      }
    }

    const impressions = pages * sets;
    setTotalImpressions(impressions);
    setTotalPrice(impressions * pricePerPage);
  }, [origin, colorMode, duplexMode, paperSize, pages, sets]);

  // --- Mock Supabase Functions ---
  const mockSupabaseInsert = async (payload: Omit<PrintPayload, 'id' | 'created_at'>): Promise<PrintPayload> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ...payload,
          id: `TX-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          created_at: new Date().toISOString(),
        });
      }, 600); // Simulate network delay
    });
  };

  // --- Handlers ---
  const handleProcessAndBill = async () => {
    if (pages <= 0 || sets <= 0) {
      toast.error("La cantidad de páginas y juegos debe ser mayor a cero.");
      return;
    }

    setIsProcessing(true);
    
    try {
      const newJob = await mockSupabaseInsert({
        origin,
        color_mode: colorMode,
        duplex_mode: duplexMode,
        paper_size: paperSize,
        pages,
        sets,
        total_impressions: totalImpressions,
        total_price: totalPrice,
        status: 'completed'
      });

      // Update history (Simulating realtime subscription)
      setHistory(prev => [newJob, ...prev]);

      // Clipboard action
      const whatsappMessage = `¡Hola! Tu documento está listo. El total de tus ${totalImpressions} páginas es de ${formatCOP(totalPrice)}. Puedes pasar a caja.`;
      await navigator.clipboard.writeText(whatsappMessage);
      
      toast.success("Trabajo facturado exitosamente", {
        description: "Mensaje copiado al portapapeles.",
        style: { background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.5)', color: '#10b981' }
      });

      // Reset fast inputs
      setPages(1);
      setSets(1);
      
    } catch (error) {
      toast.error("Error al procesar el trabajo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFastAdd = (amount: number) => {
    setPages(prev => prev + amount);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  };

  // --- Cyberpunk / Neon Styles ---
  const glassPanel = "bg-[#0a0a0f]/80 backdrop-blur-xl border border-white/5 rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]";
  const neonCyan = "text-cyan-400 border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.2)] bg-cyan-400/10";
  const neonFuchsia = "text-fuchsia-400 border-fuchsia-400/50 shadow-[0_0_15px_rgba(232,121,249,0.2)] bg-fuchsia-400/10";
  const neonGreen = "text-emerald-400 border-emerald-400/50 shadow-[0_0_20px_rgba(52,211,153,0.3)] bg-emerald-400/10";

  return (
    <Layout>
      <div className="min-h-screen bg-[#050508] text-slate-300 font-sans p-4 lg:p-6 flex flex-col selection:bg-cyan-500/30">
      
      {/* Header */}
      <header className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-400/10 rounded-xl border border-cyan-400/20">
            <Terminal className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-widest uppercase font-space-grotesk">Comando Operativo</h1>
            <p className="text-xs text-cyan-400/70 font-mono tracking-wider">PUNTO PLAY PAUSA // PRINT_SYS</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Estado de Red</p>
            <div className="flex items-center gap-2 justify-end">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></span>
              <span className="text-xs font-mono text-emerald-400">ONLINE_SECURE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
        
        {/* ZONA A: PANEL DE INYECCIÓN OPERATIVA (Izquierda) */}
        <section className={`col-span-1 lg:col-span-8 flex flex-col gap-6 h-full`}>
          
          {/* Row 1: Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Origin Selector */}
            <div className={cn(glassPanel, "p-5")}>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                <Settings2 className="w-3 h-3" /> Origen de Datos
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'whatsapp', label: 'WhatsApp', icon: Smartphone, color: 'text-emerald-400' },
                  { id: 'physical', label: 'Copia', icon: Copy, color: 'text-cyan-400' },
                  { id: 'scanner', label: 'Escáner', icon: Scan, color: 'text-fuchsia-400' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setOrigin(item.id as OriginType)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all duration-200",
                      origin === item.id 
                        ? (item.id === 'whatsapp' ? neonGreen : item.id === 'physical' ? neonCyan : neonFuchsia)
                        : "border-white/5 bg-white/5 hover:bg-white/10 text-slate-400"
                    )}
                  >
                    <item.icon className={cn("w-6 h-6", origin === item.id ? "" : "opacity-50")} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Attributes Selector */}
            <div className={cn(glassPanel, "p-5")}>
               <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                <Settings2 className="w-3 h-3" /> Atributos de Renderizado
              </h2>
              <div className="flex flex-col gap-3">
                {/* BW vs Color */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                  <button onClick={() => setColorMode('bw')} className={cn("py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all", colorMode === 'bw' ? "bg-white text-black shadow-md" : "text-slate-400 hover:text-white")}>
                    Blanco & Negro
                  </button>
                  <button onClick={() => setColorMode('color')} className={cn("py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all", colorMode === 'color' ? neonFuchsia : "text-slate-400 hover:text-white")}>
                    Full Color
                  </button>
                </div>
                {/* Simplex vs Duplex & Size */}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setDuplexMode(prev => prev === 'simplex' ? 'duplex' : 'simplex')} className={cn("flex items-center justify-center py-3 rounded-xl border border-white/5 text-xs font-bold uppercase tracking-wider transition-all", duplexMode === 'duplex' ? neonCyan : "bg-white/5 text-slate-400 hover:bg-white/10")}>
                    {duplexMode === 'simplex' ? 'Una Cara' : 'Dúplex'}
                  </button>
                  <button onClick={() => setPaperSize(prev => prev === 'letter' ? 'legal' : 'letter')} className={cn("flex items-center justify-center py-3 rounded-xl border border-white/5 text-xs font-bold uppercase tracking-wider transition-all", paperSize === 'legal' ? neonCyan : "bg-white/5 text-slate-400 hover:bg-white/10")}>
                    {paperSize === 'letter' ? 'CARTA' : 'OFICIO'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: High Speed Numeric Panel */}
          <div className={cn(glassPanel, "p-6 flex-1 flex flex-col justify-center relative overflow-hidden")}>
             {/* Background watermark */}
             <Calculator className="absolute -right-10 -bottom-10 w-64 h-64 text-white/[0.02] pointer-events-none" />
             
             <div className="grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
                {/* Pages Input & Fast Add */}
                <div className="md:col-span-8 flex flex-col justify-center">
                  <label className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400 mb-3 ml-1 font-mono">CANTIDAD DE PÁGINAS</label>
                  <div className="flex items-center gap-4 mb-4">
                    <input 
                      type="number" 
                      min="1"
                      value={pages}
                      onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 1))}
                      className="bg-black/50 border border-cyan-400/30 rounded-2xl h-24 w-40 text-center text-6xl font-black text-white font-space-grotesk focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all"
                    />
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      {[1, 5, 10, 50].map((num) => (
                        <button 
                          key={num} 
                          onClick={() => handleFastAdd(num)}
                          className="h-11 bg-white/5 hover:bg-cyan-400/20 border border-white/10 hover:border-cyan-400/50 rounded-xl text-cyan-400 font-black text-lg flex items-center justify-center gap-1 transition-all"
                        >
                          <Plus className="w-4 h-4" />{num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sets (Juegos) Input */}
                <div className="md:col-span-4 flex flex-col justify-center border-l border-white/10 pl-8">
                  <label className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-400 mb-3 ml-1 font-mono">MULTIP. (JUEGOS)</label>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl text-fuchsia-400/50 font-black">×</span>
                    <input 
                      type="number" 
                      min="1"
                      value={sets}
                      onChange={(e) => setSets(Math.max(1, parseInt(e.target.value) || 1))}
                      className="bg-black/50 border border-fuchsia-400/30 rounded-2xl h-20 w-full text-center text-4xl font-black text-white font-space-grotesk focus:outline-none focus:border-fuchsia-400 focus:shadow-[0_0_20px_rgba(232,121,249,0.2)] transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-3 text-center">Total Impresiones: <strong className="text-white">{totalImpressions}</strong></p>
                </div>
             </div>
          </div>

          {/* Row 3: Main Action Button */}
          <button 
            onClick={handleProcessAndBill}
            disabled={isProcessing}
            className={cn(
              "relative overflow-hidden w-full h-24 rounded-[2rem] font-black uppercase tracking-[0.2em] flex items-center justify-between px-8 transition-all group",
              isProcessing 
                ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.6)] active:scale-[0.98]"
            )}
          >
            {/* Holographic reflection effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            
            <div className="flex items-center gap-4 relative z-10">
               {isProcessing ? (
                 <div className="w-8 h-8 border-4 border-black/20 border-t-black rounded-full animate-spin" />
               ) : (
                 <Printer className="w-8 h-8" />
               )}
               <span className="text-2xl font-space-grotesk">{isProcessing ? 'PROCESANDO...' : 'FACTURAR & PROCESAR'}</span>
            </div>
            
            <div className="text-right relative z-10 flex flex-col items-end">
               <span className="text-[10px] opacity-70 tracking-widest font-bold">TOTAL CALC.</span>
               <span className="text-4xl font-space-grotesk">{formatCOP(totalPrice)}</span>
            </div>
          </button>

        </section>

        {/* ZONA B: REGISTRO DE TRANSACCIONES (Derecha) */}
        <aside className={cn(glassPanel, "col-span-1 lg:col-span-4 flex flex-col overflow-hidden")}>
          <div className="p-5 border-b border-white/5 bg-white/[0.02]">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" /> Historial de Turno
            </h2>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Live Sync • Supabase Edge</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {history.map((job) => (
              <div key={job.id} className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-cyan-400/30 transition-colors group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {job.origin === 'whatsapp' && <Smartphone className="w-3 h-3 text-emerald-400" />}
                    {job.origin === 'physical' && <Copy className="w-3 h-3 text-cyan-400" />}
                    {job.origin === 'scanner' && <Scan className="w-3 h-3 text-fuchsia-400" />}
                    <span className="text-[10px] font-mono text-slate-400">{job.id}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{formatTime(job.created_at)}</span>
                </div>
                
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm font-bold text-white uppercase tracking-wider font-space-grotesk">
                      {job.total_impressions} PÁGS <span className="text-slate-600">|</span> {job.color_mode === 'bw' ? 'B/N' : 'CLR'}
                    </p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">
                      {job.paper_size === 'letter' ? 'CARTA' : 'OFICIO'} • {job.duplex_mode === 'simplex' ? '1-CARA' : 'DUPLEX'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-emerald-400 font-mono">{formatCOP(job.total_price)}</p>
                    <p className="text-[8px] text-emerald-400/60 uppercase tracking-widest flex items-center justify-end gap-1 mt-1">
                      <CheckCircle2 className="w-2 h-2" /> Cobrado
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t border-white/5 bg-black/20">
             <div className="flex justify-between items-center text-[10px] font-mono uppercase text-slate-500">
                <span>Rendimiento Turno</span>
                <span className="text-cyan-400 font-bold">{history.reduce((acc, curr) => acc + curr.total_impressions, 0)} PÁGS TOTALES</span>
             </div>
          </div>
        </aside>

      </div>
    </div>
    </Layout>
  );
}
