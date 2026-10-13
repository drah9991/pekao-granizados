import React, { useState } from 'react';
import { Bell, X, AlertCircle, Info, CheckCircle, AlertTriangle, Trash2, Eye } from 'lucide-react';
import { useNotificationStore, type AppNotification, type NotificationLevel } from '@/stores/notificationStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

const levelConfig: Record<NotificationLevel, {
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  borderColor: string;
}> = {
  error: {
    icon: AlertCircle,
    iconColor: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    borderColor: 'border-red-200 dark:border-red-900/30'
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
    borderColor: 'border-yellow-200 dark:border-yellow-900/30'
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    borderColor: 'border-green-200 dark:border-green-900/30'
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-900/30'
  },
};

function NotificationItem({ notification, onMarkRead, onClear }: {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
  onClear: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { icon: Icon, iconColor, bgColor, borderColor } = levelConfig[notification.level];
  const timeAgo = formatTimeAgo(notification.timestamp);

  return (
    <div
      className={cn(
        'p-4 border-b transition-colors',
        'bg-white dark:bg-slate-900/50',
        borderColor,
        !notification.read && 'bg-blue-50/50 dark:bg-blue-950/20'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-full', bgColor)}>
          <Icon className={cn('w-4 h-4', iconColor)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                {notification.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {notification.message}
              </p>

              {notification.context && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {notification.context.component && (
                    <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700">
                      {notification.context.component}
                    </Badge>
                  )}
                  {notification.context.action && (
                    <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700">
                      {notification.context.action}
                    </Badge>
                  )}
                </div>
              )}

              {notification.details && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 flex items-center gap-1 font-medium"
                >
                  <Eye className="w-3 h-3" />
                  {expanded ? 'Ocultar detalles' : 'Ver detalles'}
                </button>
              )}

              {expanded && notification.details && (
                <pre className="mt-2 p-3 bg-slate-100 dark:bg-slate-800 rounded text-xs overflow-x-auto max-h-40 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                  {notification.details}
                </pre>
              )}
            </div>

            <div className="flex items-center gap-1">
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  onClick={() => onMarkRead(notification.id)}
                  title="Marcar como leído"
                >
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                onClick={() => onClear(notification.id)}
                title="Eliminar"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">{timeAgo}</p>
        </div>
      </div>
    </div>
  );
}

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, clearNotification } = useNotificationStore();
  const [open, setOpen] = useState(false);

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  const handleClearAll = () => {
    if (confirm('¿Eliminar todas las notificaciones?')) {
      clearAll();
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <Button variant="ghost" size="sm" className="relative" onClick={() => setOpen(true)}>
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs font-bold"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Custom Panel (sin Radix Sheet) */}
      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] z-50 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-xl flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Notificaciones
                  </h2>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllRead}
                        className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                      >
                        Marcar todas
                      </Button>
                    )}
                    {notifications.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAll}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpen(false)}
                      className="h-8 w-8 p-0 text-slate-600 dark:text-slate-400"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1 bg-white dark:bg-slate-950">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <Bell className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">No hay notificaciones</p>
                  </div>
                ) : (
                  <div>
                    {notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkRead={markAsRead}
                        onClear={clearNotification}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'Hace un momento';
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)} días`;

  return new Date(timestamp).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
