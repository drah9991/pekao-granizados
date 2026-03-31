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
import { Calendar as CalendarIcon, FileSpreadsheet, FileText, Download, Loader2, BarChart3, Eye, RefreshCcw, Check, ChevronRight, Hash, DollarSign, Package as PackageIcon, ShoppingCart } from "lucide-react";
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

type ReportType = "sales" | "inventory" | "movements";

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

  // Available columns per report type
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

  // Reset columns when report type changes
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
      Cliente: order.customers?.name || 'Genérico',
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
      Nombre: item.name,
      SKU: item.sku || '-',
      Unidad: item.unit_of_measure,
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
      Producto: mov.products?.name || 'N/A',
      Tipo: mov.type === 'entry' ? 'Entrada' : 'Salida',
      Cantidad: mov.qty,
      Motivo: mov.reason || '-',
      Usuario: mov.profiles?.name || 'N/A'
    }));
  };

  const calculateSummary = (data: any[]) => {
    if (reportType === "sales") {
      const total = data.reduce((acc, curr) => acc + (curr.Total || 0), 0);
      setSummary({ total, count: data.length, secondary: `Ticket Promedio: ${formatCOP(total / (data.length || 1))}` });
    } else if (reportType === "inventory") {
      const lowStock = data.filter(i => i.Estado === "Crítico").length;
      setSummary({ count: data.length, secondary: `Items Bajo Stock: ${lowStock}` });
    } else if (reportType === "movements") {
      const entries = data.filter(m => m.Tipo === "ENTRADA").length;
      setSummary({ count: data.length, secondary: `Entradas: ${entries} / Salidas: ${data.length - entries}` });
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

      const rawDataCount = data.length;
      calculateSummary(data);

      // Apply grouping logic if enabled
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
      toast.error("Error al cargar vista previa");
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
        title: reportType === 'sales' ? "Reporte de Ventas" : reportType === 'inventory' ? "Estado de Inventario" : "Kardex de Movimientos",
        subtitle: `${reportType === 'sales' ? 'Ventas' : reportType === 'inventory' ? 'Inventario' : 'Movimientos'} desde ${format(dateRange.from, 'dd/MM/yyyy')} hasta ${format(dateRange.to, 'dd/MM/yyyy')}`,
        fileName: `reporte_${reportType}`,
        columns: filteredColumns
      };

      if (formatType === "excel") {
        reportService.exportToExcel(data, config);
      } else {
        reportService.exportToPDF(data, config);
      }
      toast.success("Reporte generado con éxito");
    } catch (error: any) {
      console.error("Error exporting report:", error);
      toast.error("Error al generar reporte");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="text-primary h-8 w-8" />
              Reportes Ejecutivos
            </h1>
            <p className="text-muted-foreground mt-1">Genera y exporta informes detallados de tu negocio.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Configuración del Reporte */}
          <Card className="md:col-span-1 bg-slate-900/50 border-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Configuración</CardTitle>
              <CardDescription>Selecciona el tipo y rango.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Tipo de Informe</label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                  <SelectTrigger className="bg-slate-950/50 border-white/10 text-white">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    <SelectItem value="sales">Ventas Mensuales</SelectItem>
                    <SelectItem value="inventory">Estado de Inventario</SelectItem>
                    <SelectItem value="movements">Kardex de Movimientos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reportType !== "inventory" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Rango de Fechas</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-slate-950/50 border-white/10 text-white",
                          !dateRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "dd LLL", { locale: es })} -{" "}
                              {format(dateRange.to, "dd LLL", { locale: es })}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Seleccionar fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range: any) => range?.from && range?.to && setDateRange(range)}
                        numberOfMonths={1}
                        className="bg-slate-900 text-white"
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="space-y-4">
                <Label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Personalización</Label>
                <div className="grid grid-cols-1 gap-2">
                  <p className="text-xs text-muted-foreground mb-1">Columnas a incluir:</p>
                  <div className="flex flex-wrap gap-2">
                    {columnsByType[reportType].map((col) => (
                      <Badge 
                        key={col.dataKey}
                        variant="secondary"
                        className={cn(
                          "cursor-pointer px-3 py-1.5 transition-all border",
                          selectedColumns.includes(col.dataKey) 
                            ? "bg-primary/20 text-primary border-primary/30" 
                            : "bg-white/5 text-muted-foreground border-transparent opacity-50"
                        )}
                        onClick={() => toggleColumn(col.dataKey)}
                      >
                        {selectedColumns.includes(col.dataKey) && <Check className="w-3 h-3 mr-1" />}
                        {col.header}
                      </Badge>
                    ))}
                  </div>
                </div>

                {reportType === "sales" && (
                   <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-2">Agrupar por:</p>
                    <Select value={groupBy} onValueChange={setGroupBy}>
                      <SelectTrigger className="bg-white/5 border-white/10 h-10">
                        <SelectValue placeholder="Sin agrupar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin agrupar</SelectItem>
                        <SelectItem value="payment">Método de Pago</SelectItem>
                        <SelectItem value="employee">Cajero/Vendedor</SelectItem>
                      </SelectContent>
                    </Select>
                   </div>
                )}
              </div>

              <Separator className="bg-white/5" />

              <div className="pt-2 space-y-3">
                <Button 
                  onClick={handleLoadPreview} 
                  variant="secondary"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white border-none shadow-lg shadow-blue-900/20 h-12"
                  disabled={isLoadingPreview}
                >
                  {isLoadingPreview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4 text-white/80" />}
                  Generar Datos
                </Button>
                
                <div className="pt-2 grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => handleExport("excel")} 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white border-none h-12"
                    disabled={isExporting || previewData.length === 0}
                  >
                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                    Excel
                  </Button>
                  <Button 
                    onClick={() => handleExport("pdf")} 
                    variant="outline"
                    className="flex-1 border-white/10 bg-rose-950/20 hover:bg-rose-900/30 text-rose-200 h-12 hover:text-white"
                    disabled={isExporting || previewData.length === 0}
                  >
                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vista Previa Interactiva */}
          <div className="md:col-span-2 space-y-6">
            {/* Resumen Ejecutivo */}
            {summary && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-slate-900/50 border-white/5 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-500/10 rounded-xl">
                        <Hash className="h-6 w-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Registros</p>
                        <p className="text-2xl font-bold">{summary.count}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {reportType === 'sales' && (
                  <Card className="bg-slate-900/50 border-white/5 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl">
                          <DollarSign className="h-6 w-6 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Ventas</p>
                             {formatCOP(summary.total || 0)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <Card className="bg-slate-900/50 border-white/5 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-500/10 rounded-xl">
                        {reportType === 'sales' ? <ShoppingCart className="h-6 w-6 text-amber-500" /> : <PackageIcon className="h-6 w-6 text-amber-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Observación</p>
                        <p className="text-sm font-bold text-slate-300">{summary.secondary}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="bg-slate-900/50 border-white/5 backdrop-blur-sm relative overflow-hidden h-[500px] flex flex-col">
              <CardHeader className="flex-none bg-slate-950/20">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Vista Previa de {reportType.toUpperCase()}</CardTitle>
                    <CardDescription>
                      {previewData.length > 0 
                        ? `Mostrando ${previewData.length} registros.`
                        : 'Utiliza el panel lateral para generar los datos.'}
                    </CardDescription>
                  </div>
                  {previewData.length > 0 && (
                    <div className="flex gap-2">
                       <Badge variant="outline" className="text-[10px] border-white/10 uppercase font-black tracking-widest text-primary/80">
                         {selectedColumns.length} columnas
                       </Badge>
                       {groupBy !== 'none' && (
                         <Badge variant="outline" className="text-[10px] border-emerald-500/20 bg-emerald-500/5 text-emerald-400 uppercase font-black tracking-widest">
                           Agrupado por {groupBy}
                         </Badge>
                       )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                {previewData.length > 0 ? (
                  <ScrollArea className="h-full w-full">
                    <Table>
                      <TableHeader className="bg-slate-950 sticky top-0 z-20 shadow-md">
                        <TableRow className="border-white/5 hover:bg-slate-950">
                          {columnsByType[reportType].filter(c => selectedColumns.includes(c.dataKey)).map((col: any) => (
                            <TableHead key={col.dataKey} className="text-slate-400 font-black uppercase text-[10px] tracking-wider py-5">
                              {col.header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((row, idx) => (
                          <TableRow key={idx} className="border-white/5 hover:bg-white/5 transition-colors group">
                            {columnsByType[reportType].filter(c => selectedColumns.includes(c.dataKey)).map((col: any) => (
                              <TableCell key={col.dataKey} className="text-slate-300 py-4 font-medium text-sm group-hover:text-white">
                                {typeof row[col.dataKey] === 'number' && (col.dataKey.toLowerCase().includes('price') || col.dataKey.toLowerCase().includes('total'))
                                  ? formatCOP(row[col.dataKey])
                                  : row[col.dataKey]}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="p-8 bg-slate-950/50 rounded-full border border-white/5 shadow-inner">
                      <BarChart3 className="h-16 w-16 text-slate-800 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-400">Panel de Inspector vacío</h3>
                      <p className="text-sm text-slate-500 max-w-xs mx-auto">
                        Configura tus requerimientos a la izquierda y haz clic en "Generar Datos" para iniciar el análisis.
                      </p>
                    </div>
                    <Button onClick={handleLoadPreview} variant="outline" className="mt-4 border-white/10 hover:bg-white/5">
                       Cargar datos ahora
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
