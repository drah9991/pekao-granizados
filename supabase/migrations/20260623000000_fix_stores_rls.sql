-- Fix stores RLS policy to allow owner and manager to insert/update stores
DROP POLICY IF EXISTS "Admins can manage stores" ON public.stores;

CREATE POLICY "Admins and managers can manage stores"
  ON public.stores FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'owner')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'owner')
  );
