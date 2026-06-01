import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { typedFrom, type NotificationRow, type NotificationType, type NotificationPriority } from "@/integrations/supabase/types-extensions";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export type Notification = NotificationRow;

export const useNotifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const { storeId } = useAuth();

    useEffect(() => {
        if (storeId) {
            fetchNotifications();
            subscribeToNotifications();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId]);

    const fetchNotifications = async () => {
        if (!storeId) return;

        const { data, error } = await typedFrom.notifications()
            .select('*')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error("Error fetching notifications:", error);
            return;
        }

        const notifs = (data || []) as unknown as Notification[];
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.is_read).length);
        setLoading(false);
    };

    const subscribeToNotifications = () => {
        const channel = supabase
            .channel('notifications_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `store_id=eq.${storeId}`
                },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications(prev => [newNotif, ...prev.slice(0, 19)]);
                    setUnreadCount(prev => prev + 1);
                    
                    // Show a toast for high priority notifications
                    if (newNotif.priority === 'high' || newNotif.priority === 'urgent') {
                        toast(newNotif.title, {
                            description: newNotif.message,
                            duration: 5000,
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const markAsRead = async (id: string) => {
        const { error } = await typedFrom.notifications()
            .update({ is_read: true })
            .eq('id', id);

        if (!error) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    };

    const markAllAsRead = async () => {
        if (!storeId) return;

        const { error } = await typedFrom.notifications()
            .update({ is_read: true })
            .eq('store_id', storeId)
            .eq('is_read', false);

        if (!error) {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        }
    };

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifications
    };
};

export const createNotification = async (notification: {
    store_id: string;
    title: string;
    message: string;
    type: NotificationType;
    priority: NotificationPriority;
    metadata?: Record<string, unknown>;
}) => {
    const { error } = await typedFrom.notifications()
        .insert([{
            ...notification,
            is_read: false
        }]);

    if (error) {
        console.error("Error creating notification:", error);
        return { error };
    }
    return { data: true };
};
