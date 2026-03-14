-- Migration to add notification role settings
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    notification_type public.notification_type NOT NULL,
    allowed_roles JSONB NOT NULL DEFAULT '["admin", "manager"]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(store_id, notification_type)
);

-- Index for store lookup
CREATE INDEX idx_notification_settings_store ON public.notification_settings(store_id);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Policies for notification_settings
CREATE POLICY "Admins and managers can manage notification settings" 
ON public.notification_settings FOR ALL 
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'manager'))
);

CREATE POLICY "Everyone can read notification settings for their store" 
ON public.notification_settings FOR SELECT 
USING (
    store_id IN (
        SELECT store_id FROM profiles WHERE id = auth.uid()
    )
);

-- Seed defaults for existing stores
INSERT INTO public.notification_settings (store_id, notification_type, allowed_roles)
SELECT id, 'inventory_low', '["admin", "manager"]'::jsonb FROM public.stores
ON CONFLICT DO NOTHING;

INSERT INTO public.notification_settings (store_id, notification_type, allowed_roles)
SELECT id, 'system_event', '["admin", "manager"]'::jsonb FROM public.stores
ON CONFLICT DO NOTHING;

INSERT INTO public.notification_settings (store_id, notification_type, allowed_roles)
SELECT id, 'order_event', '["admin", "manager", "cashier"]'::jsonb FROM public.stores
ON CONFLICT DO NOTHING;

-- Update Notifications RLS to respect these settings
DROP POLICY IF EXISTS "Users can view notifications for their store" ON public.notifications;

CREATE POLICY "Users can view notifications for their store based on roles" 
ON public.notifications FOR SELECT 
USING (
    store_id IN (
        SELECT store_id FROM profiles WHERE id = auth.uid()
    )
    AND (
        -- If it's a super admin, they see everything
        public.has_role(auth.uid(), 'admin')
        OR
        -- Otherwise check if their role is in the allowed list for this notification type
        EXISTS (
            SELECT 1 FROM public.notification_settings ns
            JOIN public.user_roles ur ON ur.user_id = auth.uid()
            WHERE ns.store_id = public.notifications.store_id
            AND ns.notification_type = public.notifications.type
            AND ns.allowed_roles ? ur.role::text
        )
    )
);
