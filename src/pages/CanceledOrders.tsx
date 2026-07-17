import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Printer, FileSpreadsheet, Search, Calendar, RefreshCcw } from "lucide-react";

export default function CanceledOrders() {
  const { storeId } = useAuth();

  // Filters
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // 7 days ago
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

  // Data State
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Canceled Orders with Items
  const fetchCanceledOrders = async () => {
    setLoading(true);
    try {
      // 1. Fetch cancelled orders
      let query = supabase
        .from("orders")
        .select(`
          id,
          created_at,
          cancelled_at,
          cancellation_reason,
          created_by_profile:profiles!orders_created_by_fkey(name),
          cancelled_by_profile:profiles!orders_cancelled_by_fkey(name),
          order_items(
            id,
            quantity,
            products(name)
          )
        `)
        .eq("status", "cancelled");

      if (fromDate) {
        query = query.gte("created_at", `${fromDate}T00:00:00Z`);
      }
      if (toDate) {
        query = query.lte("created_at", `${toDate}T23:59:59Z`);
      }

      const { data, error } = await query.order("cancelled_at", { ascending: false });

      if (error) throw error;

      // 2. Flatten order items for display
      const flattened: any[] = [];
      (data || []).forEach((order: any) => {
        const orderItems = order.order_items || [];
        if (orderItems.length === 0) {
          flattened.push({
            id: order.id,
            created_at: order.created_at,
            cancelled_at: order.cancelled_at,
            cancellation_reason: order.cancellation_reason || "Sin especificar",
            created_by: order.created_by_profile?.name || "Desconocido",
            cancelled_by: order.cancelled_by_profile?.name || "Desconocido",
            product_name: "Sin productos",
            quantity: 0
          });
        } else {
          orderItems.forEach((item: any) => {
            flattened.push({
              id: order.id + "-" + item.id,
              created_at: order.created_at,
              cancelled_at: order.cancelled_at,
              cancellation_reason: order.cancellation_reason || "Sin especificar",
              created_by: order.created_by_profile?.name || "Desconocido",
              cancelled_by: order.cancelled_by_profile?.name || "Desconocido",
              product_name: item.products?.name || "Producto desconocido",
              quantity: item.quantity
            });
          });
        }
      });

      setItems(flattened);
    } catch (e: any) {
      toast.error("Error al cargar pedidos cancelados: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCanceledOrders();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCanceledOrders();
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rowsHtml = items.map(item => `
      <tr>
        <td>${format(new Date(item.created_at), "dd/MM/yyyy HH:mm")}</td>
        <td>${item.cancelled_at ? format(new Date(item.cancelled_at), "dd/MM/yyyy HH:mm") : "N/A"}</td>
        <td>${item.product_name}</td>
        <td>${item.quantity}</td>
        <td>${item.cancellation_reason}</td>
        <td>${item.cancelled_by}</td>
        <td>${item.created_by}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Reporte de Pedidos Cancelados</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; font-size: 20px; margin-bottom: 25px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 11px; }
            th { bg-color: #f2f2f2; font-weight: bold; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h1>PEKAO - REPORTE DE PEDIDOS CANCELADOS</h1>
          <div>Rango: ${fromDate} a ${toDate}</div>
          <table>
            <thead>
              <tr>
                <th>Fecha Pedido</th>
                <th>Fecha Cancelación</th>
                <th>Producto</th>
                <th>Cant</th>
                <th>Motivo</th>
                <th>Cancelado por</th>
                <th>Pedido por</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportExcel = () => {
    // Generate CSV and trigger download
    const headers = ["Fecha Pedido", "Fecha Cancelacion", "Producto", "Cantidad", "Motivo", "Cancelado Por", "Pedido Por"];
    const csvRows = [headers.join(",")];

    items.forEach(item => {
      const row = [
        format(new Date(item.created_at), "dd/MM/yyyy HH:mm"),
        item.cancelled_at ? format(new Date(item.cancelled_at), "dd/MM/yyyy HH:mm") : "N/A",
        `"${item.product_name.replace(/"/g, '""')}"`,
        item.quantity,
        `"${item.cancellation_reason.replace(/"/g, '""')}"`,
        `"${item.cancelled_by.replace(/"/g, '""')}"`,
        `"${item.created_by.replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pedidos_cancelados_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel/CSV exportado exitosamente");
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground p-6 lg:p-10 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent italic uppercase font-space-grotesk whitespace-nowrap">
              Pedidos Cancelados
            </h1>
            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
              Auditoría y control de cancelaciones
            </p>
          </div>
        </div>

        {/* Filters Form */}
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4 bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] backdrop-blur-md">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-wider italic font-space-grotesk text-slate-400">Fecha Inicio</Label>
            <div className="relative w-64">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="pl-10 bg-white/5 border-white/10 rounded-2xl h-10 text-xs" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-wider italic font-space-grotesk text-slate-400">Fecha Fin</Label>
            <div className="relative w-64">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="pl-10 bg-white/5 border-white/10 rounded-2xl h-10 text-xs" />
            </div>
          </div>

          <Button type="submit" className="bg-primary hover:bg-primary/95 text-white font-space-grotesk font-black uppercase tracking-widest italic rounded-2xl h-10 px-6 border border-primary/20">
            <Search className="w-4 h-4 mr-2" />
            Buscar
          </Button>
        </form>

        {/* Table Content */}
        <div className="bg-white/[0.01] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md">
          <Table>
            <TableHeader className="bg-white/5 border-b border-white/10">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4">Fecha pedido</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4">Fecha cancelación</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4">Producto</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4">Cantidad</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4">Motivo</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4">Cancelado por</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4">Pedido por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-xs font-bold text-slate-500 uppercase tracking-widest italic">Cargando cancelaciones...</TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-xs font-bold text-slate-500 uppercase tracking-widest italic">No se encontraron cancelaciones</TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell className="text-xs font-bold font-space-grotesk">{format(new Date(item.created_at), "dd/MM/yyyy hh:mm a")}</TableCell>
                    <TableCell className="text-xs font-bold font-space-grotesk">
                      {item.cancelled_at ? format(new Date(item.cancelled_at), "dd/MM/yyyy hh:mm a") : "N/A"}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-300">{item.product_name}</TableCell>
                    <TableCell className="text-xs font-black font-space-grotesk text-primary">{item.quantity}</TableCell>
                    <TableCell className="text-xs font-medium text-rose-400 italic">{item.cancellation_reason}</TableCell>
                    <TableCell className="text-xs font-bold text-slate-300">{item.cancelled_by}</TableCell>
                    <TableCell className="text-xs font-bold text-slate-300">{item.created_by}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button onClick={handlePrint} className="bg-primary hover:bg-primary-foreground text-white font-space-grotesk font-black uppercase tracking-widest italic rounded-xl px-5 h-10 border border-primary/20">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={handleExportExcel} className="bg-lime-600 hover:bg-lime-500 text-white font-space-grotesk font-black uppercase tracking-widest italic rounded-xl px-5 h-10">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>

      </div>
    </Layout>
  );
}
