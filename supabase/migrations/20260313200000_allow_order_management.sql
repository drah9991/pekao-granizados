-- Allow admins and managers to delete orders
CREATE POLICY "Admins and managers can delete orders"
ON public.orders FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'manager')
  )
);

-- Ensure they can also update statuses (the current policy might already cover this, but let's be explicit if needed)
-- Current policy: "Staff can update orders" ... but it relies on store_id. 
-- Let's make sure admins/managers can update ANY order in the store.
DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
CREATE POLICY "Staff can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager') OR
  store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid())
);
