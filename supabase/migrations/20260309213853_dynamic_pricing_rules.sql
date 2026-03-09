-- Create the pricing_rules table
CREATE TABLE IF NOT EXISTS public.pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('time_based', 'demand_based')),
    start_time TIME WITHOUT TIME ZONE,
    end_time TIME WITHOUT TIME ZONE,
    days_of_week INTEGER[], -- Array of integers 1-7 (1=Monday, 7=Sunday)
    target_type TEXT NOT NULL CHECK (target_type IN ('all', 'category', 'product')),
    target_id TEXT, -- Can be category name or product uuid
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for efficient querying by store and active status
CREATE INDEX idx_pricing_rules_store_active ON public.pricing_rules(store_id, active);

-- Set up Row Level Security (RLS)
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users"
    ON public.pricing_rules FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Policy: Allow admin and manager to insert
CREATE POLICY "Allow admin and manager to create rules"
    ON public.pricing_rules FOR INSERT
    WITH CHECK (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'manager')
    );

-- Policy: Allow admin and manager to update
CREATE POLICY "Allow admin and manager to update rules"
    ON public.pricing_rules FOR UPDATE
    USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'manager')
    );

-- Policy: Allow admin and manager to delete
CREATE POLICY "Allow admin and manager to delete rules"
    ON public.pricing_rules FOR DELETE
    USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'manager')
    );

-- Trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_pricing_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pricing_rules_updated_at_trigger
BEFORE UPDATE ON public.pricing_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_pricing_rules_updated_at();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
