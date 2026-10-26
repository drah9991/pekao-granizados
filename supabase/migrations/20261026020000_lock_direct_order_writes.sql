-- =============================================================================
-- B6 · Cerrar las escrituras directas a orders y order_items
--
-- Antes, `authenticated` tenía INSERT, UPDATE, DELETE y TRUNCATE en ambas tablas:
-- cualquier miembro de la sede podía cambiar `total` o `payment`, pasar una venta
-- anulada a completada (sin descontar stock), anular una completada sin devolver
-- stock (desde "Editar orden" en Ventas) o borrar órdenes.
--
-- - Ventas, pedidos móviles y anulaciones de completadas van por RPC SECURITY
--   DEFINER (process_sale, create_mobile_order, cancel_sale_with_stock_restore),
--   que no dependen de estos permisos.
-- - El cliente solo conserva UPDATE de las columnas de estado y anulación: lo usan
--   "Editar orden" (web) y la cancelación de pedidos pendientes (app móvil).
-- - Una orden completada o anulada ya no se toca desde el cliente: la completada
--   se anula con la RPC (devuelve stock y deja kardex) y la anulada no se reabre.
-- - Al anular desde el cliente, quién y cuándo los pone el servidor.
--
-- Pendiente (fuera de este cambio): pasar de 'pending' a 'completed' por UPDATE
-- directo sigue sin descontar inventario. Hace falta una RPC para completar pedidos.
-- =============================================================================

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.orders, public.order_items
  FROM authenticated, anon;

GRANT UPDATE (status, cancellation_reason, cancelled_by, cancelled_at)
  ON public.orders
  TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_direct_order_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Las RPC SECURITY DEFINER corren como su dueño: solo se vigilan los UPDATE del cliente.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF OLD.status::text IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'La orden % está %: una venta completada se anula con cancel_sale_with_stock_restore y una anulada no se reabre',
      OLD.id, OLD.status
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status::text = 'cancelled' THEN
    NEW.cancelled_by := auth.uid();
    NEW.cancelled_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_direct_order_update ON public.orders;
CREATE TRIGGER guard_direct_order_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_direct_order_update();
