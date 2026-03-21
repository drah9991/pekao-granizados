-- Drop the old constraint if it exists (assuming default naming convention)
ALTER TABLE public.cash_turns DROP CONSTRAINT IF EXISTS cash_turns_status_check;

-- Add the new constraint allowing 'paused'
ALTER TABLE public.cash_turns ADD CONSTRAINT cash_turns_status_check CHECK (status IN ('open', 'closed', 'paused'));

-- Update the unique index to enforce a maximum of 1 active turn (either open or paused) per store
DROP INDEX IF EXISTS unique_open_turn_per_store;

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_turn_per_store 
ON public.cash_turns (store_id) 
WHERE status IN ('open', 'paused');
