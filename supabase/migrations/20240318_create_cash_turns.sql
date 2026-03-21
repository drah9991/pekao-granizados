-- Crear tabla de turnos de caja
CREATE TABLE IF NOT EXISTS public.cash_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  cashier_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opening_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_amount NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.cash_turns ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Cajeros pueden ver turnos de su tienda" 
ON public.cash_turns FOR SELECT 
USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Cajeros pueden insertar turnos en su tienda" 
ON public.cash_turns FOR INSERT 
WITH CHECK (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Cajeros pueden actualizar turnos de su tienda" 
ON public.cash_turns FOR UPDATE 
USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_cash_turns_store_status ON public.cash_turns(store_id, status);
