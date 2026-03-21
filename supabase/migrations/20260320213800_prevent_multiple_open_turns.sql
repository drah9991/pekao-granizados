-- 1. Cerrar todos los turnos abiertos antiguos excepto el más reciente (para evitar errores al aplicar el índice si hay duplicados existentes)
WITH ranked_turns AS (
  SELECT id,
         ROW_NUMBER() OVER(PARTITION BY store_id ORDER BY opened_at DESC) as rn
  FROM public.cash_turns
  WHERE status = 'open'
)
UPDATE public.cash_turns
SET status = 'closed',
    closed_at = now(),
    notes = coalesce(notes, '') || ' [Cierre automático por el sistema: Resolución de turnos duplicados]'
WHERE id IN (
  SELECT id FROM ranked_turns WHERE rn > 1
);

-- 2. Crear el índice único parcial para asegurar la regla de máximo 1 turno abierto por tienda
CREATE UNIQUE INDEX IF NOT EXISTS unique_open_turn_per_store 
ON public.cash_turns (store_id) 
WHERE status = 'open';
