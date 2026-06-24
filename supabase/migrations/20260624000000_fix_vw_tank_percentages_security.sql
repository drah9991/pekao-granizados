-- Fix for SECURITY DEFINER warning on vw_tank_percentages view
-- This alters the view to be SECURITY INVOKER, which enforces the RLS policies of the querying user.
ALTER VIEW public.vw_tank_percentages SET (security_invoker = on);
