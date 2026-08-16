import { useState, useEffect, useCallback, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

export interface CanceledOrderItem {
  id: string;
  created_at: string;
  cancelled_at: string | null;
  cancellation_reason: string;
  created_by: string;
  cancelled_by: string;
  product_name: string;
  quantity: number;
}

export function useCanceledOrders() {
  // Filters
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // 7 days ago
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

  // Data State
  const [items, setItems] = useState<CanceledOrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Canceled Orders with Items
  const fetchCanceledOrders = useCallback(async () => {
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
      const flattened: CanceledOrderItem[] = [];
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
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchCanceledOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: FormEvent) => {
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

    const csvContent = "data:text/csv;charset=utf-8,﻿" + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pedidos_cancelados_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel/CSV exportado exitosamente");
  };

  return {
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    items,
    loading,
    handleSearch,
    handlePrint,
    handleExportExcel,
    refresh: fetchCanceledOrders
  };
}
