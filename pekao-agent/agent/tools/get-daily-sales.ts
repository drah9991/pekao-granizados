/**
 * Tool: get-daily-sales
 *
 * Consulta en Supabase el resumen de ventas de un día dado.
 * Por defecto retorna el día anterior (ayer).
 * Agrupa por sucursal e incluye: total de ingresos, número de órdenes,
 * ticket promedio y los 3 productos más vendidos.
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getYesterdayRange(timezone = "America/Bogota") {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: timezone })
  );
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const end = new Date(yesterday);
  end.setHours(23, 59, 59, 999);

  return {
    start: yesterday.toISOString(),
    end: end.toISOString(),
    label: yesterday.toLocaleDateString("es-CO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: timezone,
    }),
  };
}

export default {
  description:
    "Genera el resumen de ventas del día anterior por sucursal: ingresos totales, número de órdenes, ticket promedio y top 3 productos más vendidos.",

  parameters: {
    type: "object",
    properties: {
      store_id: {
        type: "string",
        description:
          "Opcional: UUID de la sucursal. Si se omite, consolida todas las sucursales.",
      },
      date_override: {
        type: "string",
        description:
          "Opcional: Fecha en formato ISO (YYYY-MM-DD) para reportes históricos. Por defecto usa ayer.",
      },
    },
    required: [],
  },

  execute: async ({
    store_id,
    date_override,
  }: {
    store_id?: string;
    date_override?: string;
  }) => {
    let range: { start: string; end: string; label: string };

    if (date_override) {
      const d = new Date(date_override + "T00:00:00-05:00");
      const end = new Date(date_override + "T23:59:59-05:00");
      range = {
        start: d.toISOString(),
        end: end.toISOString(),
        label: d.toLocaleDateString("es-CO", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      };
    } else {
      range = getYesterdayRange();
    }

    // Consulta de órdenes completadas
    let ordersQuery = supabase
      .from("orders")
      .select(
        `
        id,
        total,
        store_id,
        stores ( name ),
        order_items ( qty, name, price )
      `
      )
      .eq("status", "completed")
      .gte("created_at", range.start)
      .lte("created_at", range.end);

    if (store_id) {
      ordersQuery = ordersQuery.eq("store_id", store_id);
    }

    const { data: orders, error } = await ordersQuery;

    if (error) {
      throw new Error(`Error consultando ventas: ${error.message}`);
    }

    if (!orders || orders.length === 0) {
      return {
        hasSales: false,
        date: range.label,
        totalOrders: 0,
        totalRevenue: 0,
        averageTicket: 0,
        byStore: [],
        topProducts: [],
      };
    }

    // Agrupar por sucursal
    const byStore: Record<
      string,
      { name: string; orders: number; revenue: number }
    > = {};
    const productCounts: Record<string, { name: string; qty: number }> = {};

    for (const order of orders) {
      const store = order.stores as Record<string, unknown> | null;
      const storeName = (store?.name as string) ?? "Sin sucursal";
      const sid = order.store_id as string;

      if (!byStore[sid]) {
        byStore[sid] = { name: storeName, orders: 0, revenue: 0 };
      }
      byStore[sid].orders += 1;
      byStore[sid].revenue += Number(order.total ?? 0);

      // Contar productos
      const items = (order.order_items as Record<string, unknown>[]) ?? [];
      for (const item of items) {
        const key = item.name as string;
        if (!productCounts[key]) {
          productCounts[key] = { name: key, qty: 0 };
        }
        productCounts[key].qty += Number(item.qty ?? 0);
      }
    }

    const totalRevenue = orders.reduce(
      (sum, o) => sum + Number(o.total ?? 0),
      0
    );
    const totalOrders = orders.length;

    const topProducts = Object.values(productCounts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3);

    return {
      hasSales: true,
      date: range.label,
      totalOrders,
      totalRevenue: Math.round(totalRevenue),
      averageTicket: Math.round(totalRevenue / totalOrders),
      byStore: Object.values(byStore).map((s) => ({
        ...s,
        revenue: Math.round(s.revenue),
        averageTicket: Math.round(s.revenue / s.orders),
      })),
      topProducts,
      generatedAt: new Date().toLocaleString("es-CO", {
        timeZone: "America/Bogota",
      }),
    };
  },
};
