import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, FileSpreadsheet, FileText, Download, Loader2, BarChart3, Eye, RefreshCcw, Check, ChevronRight, Hash, DollarSign, Package as PackageIcon, ShoppingCart, Zap, TrendingUp, TrendingDown, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { reportService, type ReportConfig } from "@/lib/ReportService";
import { formatCOP } from "@/lib/currency";
import { motion, AnimatePresence } from "framer-motion";

type ReportType = "sales" | "inventory" | "movements";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  }
};

export default function Reports() {
  const { storeId } = useAuth();
  const [reportType, setReportType] = useState<ReportType>("sales");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewConfig, setPreviewConfig] = useState<any>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<string>("none");
  const [summary, setSummary] = useState<{ total?: number; count?: number; secondary?: string } | null>(null);

  const columnsByType: Record<string, { header: string; dataKey: string }[]> = {
    sales: [
      { header: "ID", dataKey: "ID" },
      { header: "Fecha", dataKey: "Fecha" },
      { header: "Cliente", dataKey: "Cliente" },
      { header: "Empleado", dataKey: "Empleado" },
      { header: "Metodo", dataKey: "Metodo_Pago" },
      { header: "Total", dataKey: "Total" }
    ],
    inventory: [
      { header: "Nombre", dataKey: "Nombre" },
      { header: "SKU", dataKey: "SKU" },
      { header: "Unidad", dataKey: "Unidad" },
      { header: "Stock", dataKey: "Stock_Actual" },
      { header: "Mínimo", dataKey: "Stock_Minimo" },
      { header: "Estado", dataKey: "Estado" }
    ],
    movements: [
      { header: "Fecha", dataKey: "Fecha" },
      { header: "Producto", dataKey: "Producto" },
      { header: "Tipo", dataKey: "Tipo" },
      { header: "Cant.", dataKey: "Cantidad" },
      { header: "Motivo", dataKey: "Motivo" },
      { header: "Usuario", dataKey: "Usuario" }
    ]
  };

  useEffect(() => {
    setSelectedColumns(columnsByType[reportType].map(c => c.dataKey));
    setPreviewData([]);
    setSummary(null);
  }, [reportType]);

  const fetchSalesData = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        created_at,
        total,
        subtotal,
        status,
        payment,
        profiles!created_by (name),
        customers (name)
      `)
      .eq('store_id', storeId)
      .gte('created_at', dateRange.from.toISOString())
      .lte('created_at', dateRange.to.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return data.map(order => ({
      ID: order.id.slice(0, 8),
      Fecha: format(new Date(order.created_at!), 'dd/MM/yyyy HH:mm'),
      Cliente: order.customers?.name || 'GENÉRICO',
      Empleado: order.profiles?.name || 'N/A',
      Metodo_Pago: (order.payment as any)?.method || 'N/A',
      Subtotal: order.subtotal,
      Total: order.total,
      Estado: order.status
    }));
  };

  const fetchInventoryData = async () => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('store_id', storeId)
      .order('name');

    if (error) throw error;

    return data.map(item => ({
      Nombre: item.name.toUpperCase(),
      SKU: item.sku || '-',
      Unidad: (item as any).unit || (item as any).unit_of_measure,
      Stock_Actual: item.stock,
      Stock_Minimo: item.min_stock || 0,
      Estado: item.stock <= (item.min_stock || 0) ? 'BAJO' : 'OK'
    }));
  };

  const fetchMovementsData = async () => {
    const { data, error } = await supabase
      .from('movements')
      .select(`
        created_at,
        type,
        qty,
        reason,
        profiles (name),
        products (name)
      `)
      .eq('store_id', storeId)
      .gte('created_at', dateRange.from.toISOString())
      .lte('created_at', dateRange.to.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(mov => ({
      Fecha: format(new Date(mov.created_at!), 'dd/MM/yyyy HH:mm'),
      Producto: (mov.products?.name || 'N/A').toUpperCase(),
      Tipo: mov.type === 'entry' ? 'ENTRADA' : 'SALIDA',
      Cantidad: mov.qty,
      Motivo: mov.reason || '-',
      Usuario: mov.profiles?.name || 'N/A'
    }));
  };

  const calculateSummary = (data: any[]) => {
    if (reportType === "sales") {
      const total = data.reduce((acc, curr) => acc + (curr.Total || 0), 0);
      setSummary({ total, count: data.length, secondary: `TICKET PROMEDIO: ${formatCOP(total / (data.length || 1))}` });
    } else if (reportType === "inventory") {
      const lowStock = data.filter(i => i.Estado === "BAJO").length;
      setSummary({ count: data.length, secondary: `ITEMS BAJO STOCK: ${lowStock}` });
    } else if (reportType === "movements") {
      const entries = data.filter(m => m.Tipo === "ENTRADA").length;
      setSummary({ count: data.length, secondary: `ENTRADAS: ${entries} / SALIDAS: ${data.length - entries}` });
    }
  };

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleLoadPreview = async () => {
    if (!storeId) {
      toast.error("No se ha seleccionado una tienda");
      return;
    }

    setIsLoadingPreview(true);
    try {
      let data: any[] = [];
      if (reportType === "sales") data = await fetchSalesData();
      else if (reportType === "inventory") data = await fetchInventoryData();
      else if (reportType === "movements") data = await fetchMovementsData();

      calculateSummary(data);

      if (groupBy !== "none" && reportType === "sales") {
        const groupedMap: Record<string, any> = {};
        const dateDisplay = format(dateRange.from, 'dd/MM/yyyy') === format(dateRange.to, 'dd/MM/yyyy')
          ? format(dateRange.from, 'dd/MM/yyyy')
          : `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`;

        data.forEach(item => {
          const key = groupBy === "payment" ? item.Metodo_Pago : item.Empleado;
          if (!groupedMap[key]) {
            groupedMap[key] = { 
              Metodo_Pago: groupBy === "payment" ? key : 'VARIOS', 
              Empleado: groupBy === "employee" ? key : 'VARIOS', 
              Total: 0, 
              ID: 'GRUPO', 
              Fecha: dateDisplay, 
              Cliente: 'MÚLTIPLES' 
            };
          }
          groupedMap[key].Total += item.Total;
        });
        data = Object.values(groupedMap);
      }

      setPreviewData(data);
      if (data.length === 0) {
        toast.info("No hay datos para previsualizar");
      }
    } catch (error: any) {
      console.error("Error loading preview:", error);
      toast.error("Fallo técnico en generación de vista previa");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleExport = async (formatType: "excel" | "pdf") => {
    if (!storeId) {
      toast.error("No se ha seleccionado una tienda");
      return;
    }

    setIsExporting(true);
    try {
      let data = previewData;
      if (data.length === 0) {
        if (reportType === "sales") data = await fetchSalesData();
        else if (reportType === "inventory") data = await fetchInventoryData();
        else if (reportType === "movements") data = await fetchMovementsData();
      }

      const filteredColumns = columnsByType[reportType].filter(c => selectedColumns.includes(c.dataKey));
      
      const config: ReportConfig = {
        title: reportType === 'sales' ? "REPORTE DE VENTAS" : reportType === 'inventory' ? "ESTADO DE INVENTARIO" : "KARDEX DE MOVIMIENTOS",
        subtitle: `${reportType === 'sales' ? 'VENTAS' : reportType === 'inventory' ? 'INVENTARIO' : 'MOVIMIENTOS'} DESDE ${format(dateRange.from, 'dd/MM/yyyy')} HASTA ${format(dateRange.to, 'dd/MM/yyyy')}`,
        fileName: `REPORTE_PEKAO_${reportType.toUpperCase()}`,
        columns: filteredColumns
      };

      if (formatType === "excel") {
        reportService.exportToExcel(data, config);
      } else {
        reportService.exportToPDF(data, config);
      }
      toast.success("Documento generado y exportado");
    } catch (error: any) {
      console.error("Error exporting report:", error);
      toast.error("Error crítico en exportación de datos");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Layout>
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="min-h-screen text-foreground p-6 lg:p-10 space-y-10"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-8 animate-pro-in">
            <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-glow-pro group-hover:scale-110 transition-all duration-700 overflow-hidden relative">
                    <BarChart3 className="w-10 h-10 text-indigo-400 relative z-10" />
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent" />
                </div>
                <div>
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent italic uppercase font-space-grotesk whitespace-nowrap">
                    Executive Analytics
                    </h1>
                    <p className="text-indigo-400 font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
                    Business Intelligence • Data Visualization v2.0
                    </p>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
                <Button 
                    onClick={handleLoadPreview} 
                    className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black italic uppercase tracking-widest text-[10px] hover:shadow-glow-pro transition-all gap-4 border-none shadow-pro"
                    disabled={isLoadingPreview}
                >
                    {isLoadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" /> }
                    Refrescar Telemetría
                </Button>
            </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
            {/* Left Column: Configuration Bento */}
            <motion.div variants={itemVariants} className="xl:col-span-4 space-y-8">
                <Card className="bg-muted border border-border rounded-[3rem] shadow-pro glass-pro p-10 group overflow-hidden relative">
                    <CardHeader className="px-0 pt-0 pb-8 border-b border-border/50 mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-muted border border-border rounded-2xl text-foreground/40">
                                <Zap className="w-5 h-5" />
                            </div>
                            <CardTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">Configuration</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="px-0 space-y-8">
                        <div className="space-y-3">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">PARÁMETRO DE REPORTE</label>
                            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                                <SelectTrigger className="h-16 bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk focus:ring-primary/20 shadow-pro transition-all">
                                    <SelectValue placeholder="SELECCIONAR TIPO" />
                                </SelectTrigger>
                                <SelectContent className="glass-pro border-border rounded-3xl">
                                    <SelectItem value="sales" className="text-[10px] font-black uppercase italic">VENTAS MENSUALES</SelectItem>
                                    <SelectItem value="inventory" className="text-[10px] font-black uppercase italic">ESTADO DE INVENTARIO</SelectItem>
                                    <SelectItem value="movements" className="text-[10px] font-black uppercase italic">KARDEX DE MOVIMIENTOS</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {reportType !== "inventory" && (
                            <div className="space-y-3">
                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">VENTANA DE TIEMPO</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            className="w-full h-16 bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk justify-start px-6 gap-3 hover:bg-muted transition-all border shadow-pro"
                                        >
                                            <CalendarIcon className="w-4 h-4 text-indigo-400" />
                                            {dateRange?.from ? (
                                                dateRange.to ? (
                                                    <span className="text-foreground">
                                                        {format(dateRange.from, "dd LLL", { locale: es })} — {format(dateRange.to, "dd LLL", { locale: es })}
                                                    </span>
                                                ) : (
                                                    format(dateRange.from, "LLL dd, y")
                                                )
                                            ) : (
                                                <span>Seleccionar fecha</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-background border-border rounded-3xl shadow-pro" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={dateRange?.from}
                                            selected={{ from: dateRange.from, to: dateRange.to }}
                                            onSelect={(range: any) => range?.from && range?.to && setDateRange(range)}
                                            numberOfMonths={1}
                                            className="text-foreground"
                                            locale={es}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}

                        <div className="space-y-6">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">COLUMN MASTER (FILTER)</label>
                            <div className="flex flex-wrap gap-3">
                                {columnsByType[reportType].map((col) => (
                                    <button 
                                        key={col.dataKey}
                                        onClick={() => toggleColumn(col.dataKey)}
                                        className={cn(
                                            "px-4 h-9 rounded-xl text-[9px] font-black uppercase italic tracking-widest transition-all border",
                                            selectedColumns.includes(col.dataKey) 
                                                ? "bg-primary/20 text-primary border-primary/40 shadow-glow-pro" 
                                                : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                                        )}
                                    >
                                        {col.header}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {reportType === "sales" && (
                            <div className="space-y-3 pt-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">AGRUPACIÓN TÁCTICA</label>
                                <Select value={groupBy} onValueChange={setGroupBy}>
                                    <SelectTrigger className="h-14 bg-muted/40 border-border rounded-2xl text-[10px] font-black uppercase tracking-widest italic font-space-grotesk focus:ring-primary/20 transition-all">
                                        <SelectValue placeholder="SIN AGRUPAR" />
                                    </SelectTrigger>
                                    <SelectContent className="glass-pro border-border rounded-2xl">
                                        <SelectItem value="none" className="text-[10px] font-black uppercase italic">DIRECTO (DETALLADO)</SelectItem>
                                        <SelectItem value="payment" className="text-[10px] font-black uppercase italic">VÍA MÉTODO DE PAGO</SelectItem>
                                        <SelectItem value="employee" className="text-[10px] font-black uppercase italic">VÍA ANALISTA DE CAJA</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="pt-10 grid grid-cols-2 gap-4">
                            <Button 
                                onClick={() => handleExport("excel")} 
                                className="h-16 rounded-[1.5rem] bg-emerald-500/10 text-emerald-500 font-black italic uppercase tracking-widest text-[10px] hover:bg-emerald-500 hover:text-primary-foreground transition-all shadow-pro border border-emerald-500/20 gap-3"
                                disabled={isExporting || previewData.length === 0}
                            >
                                <FileSpreadsheet className="w-4 h-4" /> Excel Matrix
                            </Button>
                            <Button 
                                onClick={() => handleExport("pdf")} 
                                className="h-16 rounded-[1.5rem] bg-rose-500/10 text-rose-500 font-black italic uppercase tracking-widest text-[10px] hover:bg-rose-500 hover:text-primary-foreground transition-all shadow-pro border border-rose-500/20 gap-3"
                                disabled={isExporting || previewData.length === 0}
                            >
                                <FileText className="w-4 h-4" /> PDF Report
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Right Column: Intelligence Bento Grid */}
            <motion.div variants={itemVariants} className="xl:col-span-8 space-y-10">
                {/* Summary Tiles */}
                <AnimatePresence mode="wait">
                    {summary && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-1 md:grid-cols-3 gap-6"
                        >
                            <Card className="bg-[#1C1F26] border border-white/5 rounded-[2.5rem] shadow-pro glass-pro p-8">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic font-space-grotesk">REGISTROS DETECTADOS</span>
                                    <ClipboardCheck className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div className="text-2xl lg:text-4xl font-black italic font-space-grotesk text-white tabular-nums">{summary.count}</div>
                                <div className="mt-2 text-[9px] font-bold text-white/20 uppercase tracking-widest italic tracking-widest">Data Clusters Indexados</div>
                            </Card>

                            {reportType === 'sales' && (
                                <Card className="bg-[#1C1F26] border border-white/5 rounded-[2.5rem] shadow-pro glass-pro p-8 relative overflow-hidden">
                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic font-space-grotesk">FLUJO DE RECAUDO</span>
                                        <DollarSign className="w-4 h-4 text-emerald-500 shadow-glow-pro" />
                                    </div>
                                    <div className="text-2xl lg:text-4xl font-black italic font-space-grotesk text-white tabular-nums relative z-10">{formatCOP(summary.total || 0).replace("$", "")}</div>
                                    <div className="mt-2 text-[9px] font-bold text-emerald-500/40 uppercase tracking-widest italic relative z-10 font-space-grotesk">Capital Bruto (COP)</div>
                                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
                                </Card>
                            )}

                            <Card className={cn(
                                "bg-[#1C1F26] border border-white/5 rounded-[2.5rem] shadow-pro glass-pro p-8",
                                reportType === 'inventory' && summary.secondary?.includes("ITEMS BAJO STOCK: 0") === false ? "border-rose-500/30" : ""
                            )}>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic font-space-grotesk">INSIGHT OPERATIVO</span>
                                    <TrendingUp className="w-4 h-4 text-amber-500" />
                                </div>
                                <div className="text-lg font-black italic font-space-grotesk text-white uppercase tracking-tight">{summary.secondary}</div>
                                <div className="mt-2 text-[9px] font-bold text-white/20 uppercase tracking-widest italic">Observación Predictiva</div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Data Inspector Table */}
                <Card className="bg-[#1C1F26] border border-white/5 rounded-[3.5rem] shadow-pro glass-pro overflow-hidden flex flex-col min-h-[500px] xl:h-[700px]">
                    <CardHeader className="p-10 border-b border-white/5 flex flex-row items-center justify-between bg-white/[0.02]">
                        <div>
                            <CardTitle className="text-xl lg:text-3xl font-black italic uppercase font-space-grotesk tracking-tighter">Data Inspector</CardTitle>
                            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mt-1 italic font-space-grotesk">
                                {previewData.length > 0 ? `SYNC ACTIVE: ${previewData.length} NODOS DE DATOS` : "WAITING FOR GENERATION COMMAND"}
                            </CardDescription>
                        </div>
                        {previewData.length > 0 && (
                            <div className="flex gap-4">
                               <div className="flex items-center gap-2 bg-indigo-500/10 px-4 h-9 rounded-full border border-indigo-500/20 font-black text-[9px] text-indigo-400 italic uppercase">
                                  <Hash className="w-3.5 h-3.5" /> {selectedColumns.length} COLS
                               </div>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-hidden relative">
                        {previewData.length > 0 ? (
                            <ScrollArea className="h-full w-full">
                                <Table>
                                    <TableHeader className="bg-[#12141a] sticky top-0 z-20 shadow-pro">
                                        <TableRow className="border-white/5 hover:bg-[#12141a]">
                                            {columnsByType[reportType].filter(c => selectedColumns.includes(c.dataKey)).map((col: any) => (
                                                <TableHead key={col.dataKey} className="px-10 h-20 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] font-space-grotesk italic">
                                                    {col.header}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <AnimatePresence mode="popLayout">
                                            {previewData.map((row, idx) => (
                                                <motion.tr
                                                    key={idx}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: idx * 0.005 }}
                                                    className="border-white/5 hover:bg-white/[0.04] transition-all group h-20"
                                                >
                                                    {columnsByType[reportType].filter(c => selectedColumns.includes(c.dataKey)).map((col: any) => (
                                                        <TableCell key={col.dataKey} className="px-10 text-white font-black font-space-grotesk italic text-sm tracking-tight group-hover:text-indigo-400 transition-colors">
                                                            {typeof row[col.dataKey] === 'number' && (col.dataKey.toLowerCase().includes('price') || col.dataKey.toLowerCase().includes('total'))
                                                                ? formatCOP(row[col.dataKey])
                                                                : row[col.dataKey]}
                                                        </TableCell>
                                                    ))}
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-8 p-20 opacity-30">
                                <div className="w-32 h-32 rounded-[2.5rem] bg-white/5 border border-dashed border-white/20 flex items-center justify-center">
                                    <BarChart3 className="w-16 h-16 text-white" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-2xl font-black italic uppercase font-space-grotesk tracking-widest text-white">Inspector Inactivo</h3>
                                    <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em] mt-3 max-w-xs mx-auto italic leading-relaxed">
                                        Configure los parámetros en el panel lateral y ejecute el comando de telemetría para visualizar la red de datos.
                                    </p>
                                </div>
                                <Button onClick={handleLoadPreview} variant="ghost" className="h-14 px-10 rounded-2xl border border-white/10 font-black italic uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all text-white/40">
                                    INIT DATA FLOW ✓
                                </Button>
                            </div>
                        )}
                        {/* Dimensional Gradient overlays */}
                        <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-[#1C1F26] to-transparent pointer-events-none z-10" />
                        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#1C1F26] to-transparent pointer-events-none z-10" />
                    </CardContent>
                </Card>
            </motion.div>
        </div>
      </motion.div>
    </Layout>
  );
}
