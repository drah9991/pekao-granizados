import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Package, Info, CheckCircle2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NotificationSetting {
  id: string;
  notification_type: string;
  allowed_roles: string[];
}

interface RoleConfig {
  id: string;
  name: string;
  description: string;
}

const NOTIFICATION_TYPES = [
  { 
    key: "inventory_low", 
    label: "Inventario Bajo", 
    icon: <Package className="w-5 h-5" />,
    description: "Alertas automáticas cuando un insumo cae por debajo del stock mínimo configurado."
  },
  { 
    key: "order_event", 
    label: "Eventos de Órdenes", 
    icon: <CheckCircle2 className="w-5 h-5" />,
    description: "Notificaciones sobre creación, cancelación o cambios de estado en pedidos."
  },
  { 
    key: "system_event", 
    label: "Eventos del Sistema", 
    icon: <Info className="w-5 h-5" />,
    description: "Información general, actualizaciones de sistema y alertas administrativas."
  }
];

export default function NotificationSettings() {
  const [roles, setRoles] = useState<RoleConfig[]>([]);
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();

      const storeId = profile?.store_id;
      if (!storeId) throw new Error("No se pudo identificar la tienda.");

      const [rolesData, settingsData] = await Promise.all([
        (supabase as any).from('roles').select('*').order('name', { ascending: true }),
        (supabase as any).from('notification_settings').select('*').eq('store_id', storeId)
      ]);

      if (rolesData.error) throw rolesData.error;
      if (settingsData.error) throw settingsData.error;

      setRoles(rolesData.data || []);
      setSettings(settingsData.data || []);
    } catch (error: any) {
      console.error('Error loading notification settings:', error);
      toast.error('Error al cargar configuración: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRoleForType = async (type: string, roleName: string) => {
    if (roleName === 'admin') return; // Admin always included at DB level logic, UI shows it enabled

    const currentSetting = settings.find(s => s.notification_type === type);
    if (!currentSetting) return;

    const isAllowed = currentSetting.allowed_roles.includes(roleName);
    const newRoles = isAllowed 
      ? currentSetting.allowed_roles.filter(r => r !== roleName)
      : [...currentSetting.allowed_roles, roleName];

    setIsUpdating(`${type}-${roleName}`);
    try {
      const { error } = await (supabase as any)
        .from('notification_settings')
        .update({ allowed_roles: newRoles, updated_at: new Date().toISOString() })
        .eq('id', currentSetting.id);

      if (error) throw error;

      setSettings(prev => prev.map(s => s.id === currentSetting.id ? { ...s, allowed_roles: newRoles } : s));
      toast.success(`Visibilidad actualizada para ${type}`);
    } catch (error: any) {
      console.error('Error updating notification setting:', error);
      toast.error('Error al actualizar: ' + error.message);
    } finally {
      setIsUpdating(null);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Configurando canales de alerta...</div>;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 border-b pb-6">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm">
          <Bell className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tight">Canales de Alerta</h2>
          <p className="text-muted-foreground">
            Define quién recibe qué notificaciones según su responsabilidad en el negocio.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {NOTIFICATION_TYPES.map((typeInfo) => {
          const setting = settings.find(s => s.notification_type === typeInfo.key);
          
          return (
            <Card key={typeInfo.key} className="border shadow-card overflow-hidden transition-all duration-300 hover:shadow-hover group">
              <CardHeader className="bg-muted/10 border-b pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-border/50 group-hover:scale-110 transition-transform">
                      {typeInfo.icon}
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold">{typeInfo.label}</CardTitle>
                      <CardDescription className="max-w-md mt-1 italic">
                        {typeInfo.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] tracking-widest font-bold uppercase py-1">
                    {typeInfo.key}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 pb-6">
                <Label className="text-xs font-bold uppercase text-muted-foreground mb-4 block tracking-wider">
                  Roles con acceso de visualización:
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {roles.map((role) => {
                    const isAllowed = setting?.allowed_roles.includes(role.name) || role.name === 'admin';
                    const isSystemAdmin = role.name === 'admin';

                    return (
                      <div 
                        key={role.id} 
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200",
                          isAllowed 
                            ? "bg-primary/5 border-primary/20 shadow-sm" 
                            : "bg-muted/10 border-transparent opacity-60 grayscale-[0.5]"
                        )}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className={cn("text-sm font-bold capitalize", isAllowed ? "text-primary" : "text-muted-foreground")}>
                            {role.name.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70 font-medium">
                            {isSystemAdmin ? "Acceso Permanente" : role.name}
                          </span>
                        </div>
                        <Switch
                          checked={isAllowed}
                          disabled={isSystemAdmin || (isUpdating === `${typeInfo.key}-${role.name}`)}
                          onCheckedChange={() => toggleRoleForType(typeInfo.key, role.name)}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 opacity-5">
           <ShieldAlert className="w-24 h-24 text-amber-900" />
        </div>
        <ShieldAlert className="w-8 h-8 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-2 relative z-10">
          <h4 className="font-bold text-amber-900 leading-tight">Privilegios y RLS</h4>
          <p className="text-sm text-amber-800 leading-relaxed font-medium max-w-2xl">
            Estos ajustes aplican **Seguridad a Nivel de Fila (RLS)**. Los usuarios que no tengan el rol permitido no verán los eventos en su lista, ni recibirán alertas sonoras o visuales para ese canal específico. El rol <code className="bg-amber-100 px-1 rounded">admin</code> tiene visibilidad total por diseño.
          </p>
        </div>
      </div>
    </div>
  );
}
