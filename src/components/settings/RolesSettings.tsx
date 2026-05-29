import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Plus, Trash2, Key, Zap, Eye, Lock, Globe, Users, Settings as SettingsIcon, LayoutGrid, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useConfigStore } from "@/store/useConfigStore";
import { useAuth } from "@/context/AuthContext";

interface Permission {
  id: string;
  role: string;
  resource: string;
  action: string;
}

interface RoleConfig {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
}

const resources = [
  { key: "sales", label: "Arquitectura de Ventas", icon: Zap },
  { key: "products", label: "Catálogo de Activos", icon: LayoutGrid },
  { key: "inventory", label: "Supply Intelligence", icon: Globe },
  { key: "recipes", label: "Ingeniería de Mezclas", icon: Key },
  { key: "reports", label: "Business Analytics", icon: Eye },
  { key: "settings", label: "Núcleo de Sistema", icon: SettingsIcon }
];

const actions = [
  { key: "create", label: "Indexar", color: "text-emerald-500" },
  { key: "read", label: "Visualizar", color: "text-indigo-400" },
  { key: "update", label: "Modificar", color: "text-amber-500" },
  { key: "delete", label: "Remover", color: "text-rose-500" }
];

export default function RolesSettings() {
  const { storeId } = useAuth();
  const { roles, rolePermissions: permissions, fetchConfig, loading: isLoading } = useConfigStore();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('El identificador de identidad es requerido');
      return;
    }
    
    const formattedName = newRoleName.trim().toLowerCase().replace(/\s+/g, '_');
    
    if (roles.some(r => r.name === formattedName)) {
      toast.error('Este vector de identidad ya existe');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await (supabase as any)
        .from('roles')
        .insert([{
          name: formattedName,
          description: newRoleDescription.trim(),
          is_system: false
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      if (storeId) fetchConfig(storeId);
      setNewRoleName("");
      setNewRoleDescription("");
      setIsAddModalOpen(false);
      toast.success('Nueva identidad indexada correctamente');
    } catch (error: any) {
      console.error('Error creating role:', error);
      toast.error('Error en creación: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteRole = async (roleObj: RoleConfig) => {
    if (roleObj.is_system) {
      toast.error('No se puede desvincular un rol de sistema');
      return;
    }
    if (!window.confirm(`¿Confirmar remoción definitiva de la identidad ${roleObj.name.toUpperCase()}?`)) {
      return;
    }
    
    try {
      const { error } = await (supabase as any)
        .from('roles')
        .delete()
        .eq('id', roleObj.id);
        
      if (error) throw error;
      
      if (storeId) fetchConfig(storeId);
      toast.success('Identidad removida con éxito');
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast.error('Fallo técnico en borrado: ' + error.message);
    }
  };

  const hasPermission = (roleName: string, resource: string, action: string) => {
    return permissions.some(
      p => p.role === roleName && p.resource === resource && p.action === action
    );
  };

  const togglePermission = async (roleName: string, resource: string, action: string) => {
    const exists = hasPermission(roleName, resource, action);
    
    try {
      if (exists) {
        const permission = permissions.find(
          p => p.role === roleName && p.resource === resource && p.action === action
        );
        if (permission) {
          await supabase
            .from('role_permissions')
            .delete()
            .eq('id', permission.id);
          
          if (storeId) fetchConfig(storeId);
          toast.success('Acceso revocado');
        }
      } else {
        const { data, error } = await (supabase as any)
          .from('role_permissions')
          .insert([{ role: roleName, resource, action }])
          .select()
          .single();
        
        if (error) throw error;
        if (data) {
          if (storeId) fetchConfig(storeId);
          toast.success('Privilegio concedido ✓');
        }
      }
    } catch (error: any) {
      console.error('Error toggling permission:', error);
      toast.error('Conflicto en actualización de privilegios');
    }
  };

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
            <Loader2 className="w-12 h-12 animate-spin text-primary shadow-glow-pro" />
            <p className="text-[10px] font-black uppercase tracking-widest text-primary italic animate-pulse">Sincronizando Matriz de Protocolos...</p>
        </div>
    );
  }

  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-10"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h2 className="text-3xl font-black italic uppercase font-space-grotesk tracking-tight text-white leading-none">Permission Architecture</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mt-1 italic leading-relaxed">Matriz de Acceso Dinámico & Seguridad de Roles</p>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="h-14 px-8 rounded-2xl bg-indigo-500 text-white font-black italic uppercase tracking-widest text-[10px] shadow-glow-pro hover:shadow-indigo-500/40 transition-all gap-4 border-none shadow-pro font-space-grotesk">
              <Plus className="w-5 h-5" /> Indexar Identidad
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto custom-scrollbar bg-background border-white/10 rounded-[3rem] text-white shadow-pro">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                      <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">Crear Vector de Identidad</DialogTitle>
                    <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Asignación de privilegios personalizados en el ecosistema</DialogDescription>
                  </div>
              </div>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="roleName" className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">KEY IDENTIFIER</Label>
                <Input 
                  id="roleName" 
                  placeholder="EJ: AUDITOR_INTERNO" 
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value.toUpperCase())}
                  className="h-16 bg-white/5 border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest italic font-space-grotesk focus:ring-primary/20 shadow-pro transition-all"
                />
                <p className="text-[8px] text-white/20 font-bold uppercase tracking-widest italic pt-1 pl-2">El motor de sistema auto-formateará este campo para compatibilidad SQL.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleDesc" className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">SCOPE / PROPÓSITO</Label>
                <Input 
                  id="roleDesc" 
                  placeholder="EJ: ACCESO DE SOLO LECTURA PARA ANÁLISIS FINANCIERO" 
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value.toUpperCase())}
                  className="h-16 bg-white/5 border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest italic font-space-grotesk focus:ring-primary/20 shadow-pro transition-all"
                />
              </div>
            </div>
            <DialogFooter className="gap-4">
              <Button 
                variant="ghost" 
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase italic tracking-widest text-white/40 hover:text-white hover:bg-white/5"
              >
                Abortar
              </Button>
              <Button 
                onClick={handleAddRole} 
                disabled={isSubmitting}
                className="flex-1 h-14 rounded-2xl bg-indigo-500 text-white font-black italic uppercase tracking-widest shadow-glow-pro hover:shadow-indigo-500/40 transition-all font-space-grotesk"
              >
                {isSubmitting ? "SINCRO..." : "GUARDAR IDENTIDAD ✓"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-10">
        <AnimatePresence mode="popLayout">
            {roles.map((roleObj, rIdx) => (
            <motion.div
                key={roleObj.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: rIdx * 0.05 }}
            >
                <Card className="bg-[#1C1F26] border border-white/5 rounded-[3.5rem] shadow-pro glass-pro overflow-hidden group hover:border-indigo-500/30 transition-all duration-700">
                    <CardHeader className="p-10 border-b border-white/5 bg-white/[0.01]">
                    <div className="flex items-center justify-between flex-wrap gap-6">
                        <div className="flex items-center gap-6">
                            <div className={cn(
                                "p-4 rounded-[1.5rem] shadow-pro transition-transform group-hover:scale-110 duration-700",
                                roleObj.name === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-glow-pro' : 'bg-white/5 text-white/40 border border-white/10'
                            )}>
                                <Shield className="w-8 h-8" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black italic uppercase font-space-grotesk text-white tracking-tighter">
                                    {roleObj.name.replace(/_/g, ' ')}
                                </CardTitle>
                                <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 italic mt-1 leading-none">
                                    {roleObj.description || 'SIN ALCANCE DEFINIDO'}
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {roleObj.is_system && (
                                <div className="flex items-center gap-2 bg-indigo-500/10 px-4 h-8 rounded-full border border-indigo-500/20 font-black text-[8px] text-indigo-400 italic uppercase">
                                    <Lock className="w-3 h-3" /> System Restricted
                                </div>
                            )}
                            <Badge variant="secondary" className="px-5 h-8 font-space-grotesk font-black uppercase tracking-[0.2em] italic text-[10px] bg-white/5 text-white/60 border-white/10">
                                {roleObj.name}
                            </Badge>
                            {!roleObj.is_system && (
                                <Button 
                                    variant="ghost" size="icon" 
                                    className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/10 hover:bg-rose-500 hover:text-white transition-all shadow-pro" 
                                    onClick={() => handleDeleteRole(roleObj)}
                                >
                                    <Trash2 className="w-5 h-5" />
                                </Button>
                            )}
                        </div>
                    </div>
                    </CardHeader>
                    <CardContent className="p-10 bg-white/[0.005]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {resources.map((resource) => {
                        return (
                            <div key={resource.key} className="space-y-6">
                                <div className="flex items-center gap-3 px-2 border-l-2 border-indigo-500/40">
                                    <resource.icon className="w-4 h-4 text-white/20" />
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] font-space-grotesk italic text-white/60 group-hover:text-white transition-colors">
                                        {resource.label}
                                    </h4>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {actions.map((action) => {
                                        const isChecked = hasPermission(roleObj.name, resource.key, action.key) || roleObj.name === 'admin';
                                        return (
                                            <div 
                                                key={action.key} 
                                                className={cn(
                                                    "flex items-center justify-between px-4 py-3 rounded-2xl border transition-all duration-500 group/item",
                                                    isChecked ? "bg-indigo-500/5 border-indigo-500/20 shadow-pro" : "bg-white/[0.02] border-white/5 opacity-50 hover:opacity-100"
                                                )}
                                            >
                                                <Label
                                                    htmlFor={`${roleObj.id}-${resource.key}-${action.key}`}
                                                    className={cn(
                                                        "text-[9px] font-black uppercase italic tracking-widest cursor-pointer group-hover/item:translate-x-1 transition-transform",
                                                        isChecked ? action.color : "text-white/20"
                                                    )}
                                                >
                                                    {action.label}
                                                </Label>
                                                <Switch
                                                    id={`${roleObj.id}-${resource.key}-${action.key}`}
                                                    checked={isChecked}
                                                    onCheckedChange={() => togglePermission(roleObj.name, resource.key, action.key)}
                                                    disabled={roleObj.name === 'admin'}
                                                    className={cn(
                                                        "scale-90 data-[state=checked]:bg-indigo-500",
                                                        roleObj.name === 'admin' ? "opacity-50" : ""
                                                    )}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                        })}
                    </div>
                    </CardContent>
                </Card>
            </motion.div>
            ))}
        </AnimatePresence>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-indigo-500/5 border border-indigo-500/10 rounded-[2.5rem] p-10 flex gap-8 items-start relative overflow-hidden group shadow-pro"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
        <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400 group-hover:rotate-12 transition-transform duration-500">
            <Lock className="w-6 h-6" />
        </div>
        <div className="relative z-10">
            <p className="text-[11px] font-black text-white/50 uppercase italic tracking-widest mb-3 leading-none">Protocolo de Seguridad de Identidad</p>
            <p className="text-[11px] text-white/30 font-bold uppercase italic leading-relaxed tracking-tight max-w-4xl">
              <strong className="text-indigo-400/80">AVISO CRÍTICO:</strong> Los parámetros del rol <code className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-indigo-300">ADMIN</code> están blindados por el kernel del sistema para prevenir bloqueos accidentales. Todas las inyecciones de permisos en vectores externos se propagan de forma atómica en tiempo real a través de los nodos de sesión.
            </p>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />
      </motion.div>
    </motion.div>
  );
}