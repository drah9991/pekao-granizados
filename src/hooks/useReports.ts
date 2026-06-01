import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { reportService, type ReportConfig } from "@/lib/ReportService";
import { formatCOP } from "@/lib/currency";

export type ReportType = "sales" | "inventory" | "movements";

export interface ReportSummary {
  total?: number;
  count?: number;
  secondary?: string;
}

export function useReports(storeId: string | null) {
  const [reportType, setReportType] = useState<ReportType>("sales");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<string>("none");
  const [summary, setSummary] = useState<ReportSummary | null>(null);

  useEffect(() => {
    setSelectedColumns(columnsByType[reportType].map(c => c.dataKey));
    setPreviewData([]);
    setSummary(null);
  }, [reportType]);

  const fetchSalesData = async () => {
    if (!storeId) return [];
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
      Metodo_Pago: ((order.payment as Record<string, unknown>)?.method as string) || 'N/A',
      Subtotal: order.subtotal,
      Total: order.total,
      Estado: order.status
    }));
  };

  const fetchInventoryData = async () => {
    if (!storeId) return [];
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('store_id', storeId)
      .order('name');

    if (error) throw error;

    return data.map(item => ({
      Nombre: item.name.toUpperCase(),
      SKU: item.sku || '-',
      Unidad: ((item as Record<string, unknown>).unit as string) || ((item as Record<string, unknown>).unit_of_measure as string) || '',
      Stock_Actual: item.stock,
      Stock_Minimo: item.min_stock || 0,
      Estado: item.stock <= (item.min_stock || 0) ? 'BAJO' : 'OK'
    }));
  };

  const fetchMovementsData = async () => {
    if (!storeId) return [];
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

  const calculateSummary = (data: Record<string, unknown>[]) => {
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

  const handleLoadPreview = async () => {
    if (!storeId) {
      toast.error("No se ha seleccionado una tienda");
      return;
    }

    setIsLoadingPreview(true);
    try {
      let data: Record<string, unknown>[] = [];
      if (reportType === "sales") data = await fetchSalesData();
      else if (reportType === "inventory") data = await fetchInventoryData();
      else if (reportType === "movements") data = await fetchMovementsData();

      calculateSummary(data);

      if (groupBy !== "none" && reportType === "sales") {
        const groupedMap: Record<string, Record<string, unknown>> = {};
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      console.error("Error exporting report:", error);
      toast.error("Error crítico en exportación de datos");
    } finally {
      setIsExporting(false);
    }
  };

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return {
    reportType,
    setReportType,
    dateRange,
    setDateRange,
    isExporting,
    isLoadingPreview,
    previewData,
    selectedColumns,
    toggleColumn,
    groupBy,
    setGroupBy,
    summary,
    handleLoadPreview,
    handleExport,
    columnsByType
  };
}
