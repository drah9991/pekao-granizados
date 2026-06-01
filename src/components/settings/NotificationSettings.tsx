import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Package, Info, CheckCircle2, ShieldAlert, Zap, Lock, Eye, Activity, Loader2, Signal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { typedFrom } from "@/integrations/supabase/types-extensions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
    label: "Supply Intelligence", 
    icon: <Package className="w-6 h-6" />,
    description: "Alertas autonómicas de stock crítico y reabastecimiento proactivo."
  },
  { 
    key: "order_event", 
    label: "Transactional Flow", 
    icon: <Activity className="w-6 h-6" />,
    description: "Trazabilidad en tiempo real de órdenes, cancelaciones y mutaciones de estado."
  },
  { 
    key: "system_event", 
    label: "Core System Alerts", 
    icon: <Info className="w-6 h-6" />,
    description: "Telemetría administrativa, actualizaciones críticas y eventos de núcleo."
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
      if (!storeId) throw new Error("Nodo no identificado en el contexto de sesión.");

      const [rolesData, settingsData] = await Promise.all([
        typedFrom.roles().select('*').order('name', { ascending: true }),
        typedFrom.notification_settings().select('*').eq('store_id', storeId)
      ]);

      if (rolesData.error) throw rolesData.error;
      if (settingsData.error) throw settingsData.error;

      setRoles(rolesData.data || []);
      setSettings(settingsData.data || []);
    } catch (error: unknown) {
      console.error('Error loading notification settings:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Fallo técnico en carga de protocolos: ' + message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRoleForType = async (type: string, roleName: string) => {
    if (roleName === 'admin') return; 

    const currentSetting = settings.find(s => s.notification_type === type);
    if (!currentSetting) return;

    const isAllowed = currentSetting.allowed_roles.includes(roleName);
    const newRoles = isAllowed 
      ? currentSetting.allowed_roles.filter(r => r !== roleName)
      : [...currentSetting.allowed_roles, roleName];

    setIsUpdating(`${type}-${roleName}`);
    try {
      const { error } = await typedFrom.notification_settings()
        .update({ allowed_roles: newRoles, updated_at: new Date().toISOString() })
        .eq('id', currentSetting.id);

      if (error) throw error;

      setSettings(prev => prev.map(s => s.id === currentSetting.id ? { ...s, allowed_roles: newRoles } : s));
      toast.success(`Visibilidad ${isAllowed ? 'revocada' : 'concedida'} para el vector ${type}`);      } catch (error: unknown) {
      console.error('Error updating notification setting:', error);
      toast.error('Conflicto en actualización de privilegios');
    } finally {
      setIsUpdating(null);
    }
  };

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
            <Loader2 className="w-12 h-12 animate-spin text-primary shadow-glow-pro" />
            <p className="text-[10px] font-black uppercase tracking-widest text-primary italic animate-pulse">Sincronizando Canales de Alerta...</p>
        </div>
    );
  }

  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-10"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 pb-10">
        <div>
          <h2 className="text-3xl font-black italic uppercase font-space-grotesk tracking-tight text-white leading-none text-white">Broadcast Architecture</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mt-1 italic leading-relaxed">Configuración de Visibilidad y Protocolos de Notificación</p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 px-4 h-10 rounded-full border border-white/10 font-black text-[9px] text-white/40 italic uppercase tracking-widest leading-none">
            <Signal className="w-4 h-4 text-emerald-500 animate-pulse" /> Live Status: Active
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <AnimatePresence mode="popLayout">
            {NOTIFICATION_TYPES.map((typeInfo, idx) => {
            const setting = settings.find(s => s.notification_type === typeInfo.key);
            
            return (
                <motion.div
                    key={typeInfo.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                >
                    <Card className="bg-[#1C1F26] border border-white/5 rounded-[3.5rem] shadow-pro glass-pro overflow-hidden group hover:border-primary/20 transition-all duration-700">
                    <CardHeader className="p-10 border-b border-white/5 bg-white/[0.01]">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="flex gap-6">
                            <div className="w-16 h-16 bg-white/[0.03] rounded-[2rem] border border-white/5 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-700 shadow-pro">
                            {typeInfo.icon}
                            </div>
                            <div>
                            <CardTitle className="text-2xl font-black italic uppercase font-space-grotesk text-white tracking-tighter">{typeInfo.label}</CardTitle>
                            <CardDescription className="max-w-xl text-[10px] font-black uppercase tracking-[0.1em] text-white/30 italic mt-1 leading-relaxed">
                                {typeInfo.description}
                            </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="h-8 px-4 font-space-grotesk font-black uppercase tracking-[0.3em] italic text-[9px] bg-white/5 text-white/20 border-white/5">
                                {typeInfo.key}
                            </Badge>
                        </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10 bg-white/[0.005]">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-6 block italic px-2">
                        Control de Acceso de Subscripción:
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {roles.map((role) => {
                            const isAllowed = setting?.allowed_roles.includes(role.name) || role.name === 'admin';
                            const isSystemAdmin = role.name === 'admin';
                            const updatingKey = `${typeInfo.key}-${role.name}`;

                            return (
                            <div 
                                key={role.id} 
                                className={cn(
                                "flex items-center justify-between px-5 py-4 rounded-[2rem] border transition-all duration-500 group/item",
                                isAllowed 
                                    ? "bg-primary/5 border-primary/20 shadow-pro" 
                                    : "bg-white/[0.02] border-white/5 opacity-40 hover:opacity-100"
                                )}
                            >
                                <div className="flex flex-col gap-0.5 min-w-0">
                                <span className={cn("text-[10px] font-black uppercase italic tracking-widest font-space-grotesk truncate", isAllowed ? "text-white" : "text-white/40")}>
                                    {role.name.replace(/_/g, ' ')}
                                </span>
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", isAllowed ? "bg-primary shadow-glow-pro" : "bg-white/10")} />
                                    <span className="text-[8px] text-white/20 font-bold uppercase tracking-widest italic truncate">
                                        {isSystemAdmin ? "PROTOCOL: CORE" : `LVL: ${role.name.slice(0, 3)}`}
                                    </span>
                                </div>
                                </div>
                                <Switch
                                checked={isAllowed}
                                disabled={isSystemAdmin || (isUpdating === updatingKey)}
                                onCheckedChange={() => toggleRoleForType(typeInfo.key, role.name)}
                                className={cn(
                                    "scale-90 data-[state=checked]:bg-primary",
                                    isSystemAdmin ? "opacity-30" : ""
                                )}
                                />
                            </div>
                            );
                        })}
                        </div>
                    </CardContent>
                    </Card>
                </motion.div>
            );
            })}
        </AnimatePresence>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-primary/5 border border-primary/10 rounded-[2.5rem] p-10 flex gap-8 items-start relative overflow-hidden group shadow-pro"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 text-primary group-hover:rotate-12 transition-transform duration-500 shadow-glow-pro">
            <Lock className="w-6 h-6" />
        </div>
        <div className="relative z-10">
            <p className="text-[11px] font-black text-white/50 uppercase italic tracking-widest mb-3 leading-none">Security Masking & Visibility Control</p>
            <p className="text-[11px] text-white/30 font-bold uppercase italic leading-relaxed tracking-tight max-w-4xl">
              <strong className="text-primary/80">INTEGRIDAD RLS:</strong> Estas configuraciones inyectan parámetros de visibilidad condicional en la capa de datos. Los usuarios que no pertenezcan a los roles permitidos no solo dejarán de recibir alertas sonoras, sino que los eventos serán filtrados atómicamente de su <code className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-primary/60">Audit Trail</code>.
            </p>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] w-32 h-32 bg-primary/5 rounded-full blur-3xl opacity-20" />
      </motion.div>
    </motion.div>
  );
}
