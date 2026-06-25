/**
 * Tool: get-low-stock
 *
 * Consulta en Supabase todos los items de inventario cuyo stock actual
 * está por debajo o igual a su umbral mínimo (min_stock).
 *
 * TABLA REAL: inventory_items (no store_stock)
 * - stock:     número actual de unidades / mililitros
 * - min_stock: umbral mínimo configurado por el admin
 * - is_mixture: true si es mezcla de granizado (stock en mL)
 *
 * Validado contra: src/hooks/useLowStockCount.ts y migration 20260304000001
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default {
  description:
    "Consulta todos los items de inventario con stock por debajo del mínimo configurado. Opera sobre la tabla inventory_items. Retorna nombre, sucursal, stock actual, mínimo y si es mezcla (litros) o unidades.",

  parameters: {
    type: "object",
    properties: {
      store_id: {
        type: "string",
        description:
          "Opcional: UUID de la sucursal. Si se omite, revisa todas las sucursales.",
      },
    },
    required: [],
  },

  execute: async ({ store_id }: { store_id?: string }) => {
    // Traer todos los items con min_stock configurado (> 0)
    let query = supabase
      .from("inventory_items")
      .select("id, name, stock, min_stock, unit_of_measure, is_mixture, store_id, stores(name)")
      .not("min_stock", "is", null)
      .gt("min_stock", 0); // Solo los que tienen umbral configurado

    if (store_id) {
      query = query.eq("store_id", store_id);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error consultando inventory_items: ${error.message}`);
    }

    // Filtrar en memoria: stock <= min_stock
    const lowStockItems = (data ?? []).filter(
      (item) => Number(item.stock) <= Number(item.min_stock ?? 0)
    );

    if (lowStockItems.length === 0) {
      return {
        hasAlerts: false,
        count: 0,
        items: [],
        checkedAt: new Date().toLocaleString("es-CO", {
          timeZone: "America/Bogota",
        }),
      };
    }

    const items = lowStockItems.map((item) => {
      const store = item.stores as Record<string, unknown> | null;
      const isMixture = Boolean(item.is_mixture);
      const unit = item.unit_of_measure ?? (isMixture ? "mL" : "uds");

      // Las mezclas se miden en mL, convertir a litros para legibilidad
      const stockDisplay = isMixture
        ? `${(Number(item.stock) / 1000).toFixed(2)} L`
        : `${Number(item.stock)} ${unit}`;

      const minDisplay = isMixture
        ? `${(Number(item.min_stock) / 1000).toFixed(2)} L`
        : `${Number(item.min_stock)} ${unit}`;

      return {
        name: item.name,
        store: (store?.name as string) ?? "Sucursal desconocida",
        type: isMixture ? "mezcla" : "producto",
        stock_actual: stockDisplay,
        stock_minimo: minDisplay,
        deficit_raw: Number(item.min_stock) - Number(item.stock),
      };
    });

    return {
      hasAlerts: true,
      count: items.length,
      items,
      checkedAt: new Date().toLocaleString("es-CO", {
        timeZone: "America/Bogota",
      }),
    };
  },
};
