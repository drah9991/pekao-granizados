-- Migration to add INSERT policy to notifications table
-- This allow admins and managers to trigger system notifications from the client side

CREATE POLICY "Admins and managers can create notifications for their store" 
ON public.notifications FOR INSERT 
WITH CHECK (
    store_id IN (
        SELECT store_id FROM profiles WHERE id = auth.uid()
    )
    AND 
    (
        public.has_role(auth.uid(), 'admin') 
        OR 
        public.has_role(auth.uid(), 'manager')
    )
);

-- Also Ensure update policy is robust
DROP POLICY IF EXISTS "Users can update their store notifications as read" ON public.notifications;

CREATE POLICY "Users can update their store notifications as read" 
ON public.notifications FOR UPDATE
USING (
  store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  )
);
