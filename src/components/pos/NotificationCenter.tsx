import { useState } from "react";
import { 
  Bell, 
  Package, 
  Info, 
  AlertCircle, 
  CheckCheck,
  Circle,
  Settings
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const getIcon = (type: Notification['type'], priority: Notification['priority']) => {
    switch (type) {
      case 'inventory_low':
        return <Package className="w-4 h-4 text-orange-500" />;
      case 'order_event':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'system_event':
        return <Settings className="w-4 h-4 text-purple-500" />;
      default:
        return priority === 'high' || priority === 'urgent' 
          ? <AlertCircle className="w-4 h-4 text-destructive" />
          : <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative group overflow-visible"
          aria-label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : "Notificaciones"}
        >
          <Bell className={cn(
            "w-5 h-5 transition-transform",
            unreadCount > 0 && "animate-wiggle text-primary"
          )} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-sm">
              {unreadCount > 9 ? '+9' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0 shadow-elevated border-border/50 bg-card/95 backdrop-blur-md" align="end">
        <DropdownMenuLabel className="p-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-bold">Notificaciones</span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Eventos de Sistema</span>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-[10px] uppercase font-bold text-primary hover:bg-primary/10"
              onClick={() => markAllAsRead()}
            >
              <CheckCheck className="w-3 h-3 mr-1" /> Marcar Todo
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[350px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-medium">No hay notificaciones</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                className={cn(
                  "flex flex-col items-start gap-1 p-4 cursor-pointer transition-colors focus:bg-accent/50",
                  !notif.is_read && "bg-primary/5"
                )}
                onClick={() => markAsRead(notif.id)}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                        "p-1.5 rounded-lg",
                        notif.is_read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                    )}>
                        {getIcon(notif.type, notif.priority)}
                    </div>
                    <span className={cn("text-xs font-bold leading-none", !notif.is_read ? "text-foreground" : "text-muted-foreground")}>
                        {notif.title}
                    </span>
                  </div>
                  {!notif.is_read && <Circle className="w-2 h-2 fill-primary text-primary shrink-0" />}
                </div>
                <p className={cn(
                    "text-[11px] leading-relaxed line-clamp-2 mt-1",
                    !notif.is_read ? "text-foreground/80" : "text-muted-foreground"
                )}>
                  {notif.message}
                </p>
                <span className="text-[9px] text-muted-foreground/60 font-medium mt-1">
                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: es })}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="p-2">
            <Button 
              variant="ghost" 
              className="w-full h-8 text-xs font-medium text-muted-foreground hover:text-primary" 
              onClick={() => {
                setOpen(false);
                navigate('/movements');
              }}
            >
                Ver todas las actividades
            </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
