-- Fix Security Definer vulnerability on public.vw_customer_loyalty by enforcing SECURITY INVOKER
-- This ensures Row Level Security (RLS) policies of the querying user (tenant isolation) are enforced.
ALTER VIEW public.vw_customer_loyalty SET (security_invoker = on);
