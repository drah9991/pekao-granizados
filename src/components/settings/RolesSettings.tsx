import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  { key: "sales", label: "Ventas" },
  { key: "products", label: "Productos" },
  { key: "inventory", label: "Inventario" },
  { key: "recipes", label: "Recetas" },
  { key: "reports", label: "Reportes" },
  { key: "settings", label: "Configuración" }
];

const actions = [
  { key: "create", label: "Crear" },
  { key: "read", label: "Ver" },
  { key: "update", label: "Editar" },
  { key: "delete", label: "Eliminar" }
];

export default function RolesSettings() {
  const [roles, setRoles] = useState<RoleConfig[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // New role state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rolesData, permsData] = await Promise.all([
        (supabase as any).from('roles').select('*').order('created_at', { ascending: true }),
        supabase.from('role_permissions').select('*')
      ]);

      if (rolesData.error) throw rolesData.error;
      if (permsData.error) throw permsData.error;

      setRoles(rolesData.data || []);
      setPermissions(permsData.data || []);
    } catch (error: any) {
      console.error('Error loading roles data:', error);
      toast.error('Error al cargar datos de roles: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('El nombre del rol es requerido');
      return;
    }
    
    // Auto-format name to lowercase, no spaces
    const formattedName = newRoleName.trim().toLowerCase().replace(/\s+/g, '_');
    
    if (roles.some(r => r.name === formattedName)) {
      toast.error('Ya existe un rol con ese nombre');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('roles')
        .insert([{
          name: formattedName,
          description: newRoleDescription.trim(),
          is_system: false
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      setRoles([...roles, data]);
      setNewRoleName("");
      setNewRoleDescription("");
      setIsAddModalOpen(false);
      toast.success('Rol creado exitosamente');
    } catch (error: any) {
      console.error('Error creating role:', error);
      toast.error('Error al crear rol: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteRole = async (roleObj: RoleConfig) => {
    if (roleObj.is_system) {
      toast.error('No se puede eliminar un rol del sistema');
      return;
    }
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el rol ${roleObj.name}? Esto podría afectar a los usuarios que lo tengan asignado.`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleObj.id);
        
      if (error) throw error;
      
      setRoles(roles.filter(r => r.id !== roleObj.id));
      setPermissions(permissions.filter(p => p.role !== roleObj.name));
      toast.success('Rol eliminado');
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast.error('Error al eliminar rol: ' + error.message);
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
          
          setPermissions(permissions.filter(p => p.id !== permission.id));
          toast.success('Permiso removido');
        }
      } else {
        const { data, error } = await supabase
          .from('role_permissions')
          .insert([{ role: roleName, resource, action }])
          .select()
          .single();
        
        if (error) throw error;
        if (data) {
          setPermissions([...permissions, data]);
          toast.success('Permiso agregado');
        }
      }
    } catch (error: any) {
      console.error('Error toggling permission:', error);
      toast.error('Error: ' + error.message);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando roles y permisos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Maestro de Roles y Permisos</h2>
          <p className="text-muted-foreground">
            Crea roles dinámicos y configura qué puede hacer cada uno
          </p>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm font-semibold">
              <Plus className="w-4 h-4" />
              Nuevo Rol
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Rol</DialogTitle>
              <DialogDescription>
                Añade un rol personalizado (ej: auditor, analista) y asígnale permisos debajo de la tabla principal.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="roleName">Identificador del Rol</Label>
                <Input 
                  id="roleName" 
                  placeholder="Ej: auditor_externo" 
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Se guardará en minúsculas y sin espacios.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleDesc">Descripción</Label>
                <Input 
                  id="roleDesc" 
                  placeholder="Ej: Solo tiene acceso de lectura a reportes." 
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddRole} disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar Rol"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {roles.map((roleObj) => (
          <Card key={roleObj.id} className="border shadow-card overflow-hidden transition-all duration-300 hover:shadow-hover">
            <CardHeader className="bg-muted/10 border-b pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl shadow-sm ${roleObj.name === 'admin' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'}`}>
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="capitalize text-xl font-bold">{roleObj.name.replace(/_/g, ' ')}</CardTitle>
                    <CardDescription className="mt-1">{roleObj.description || 'Sin descripción'}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {roleObj.is_system && (
                    <Badge variant="outline" className="text-xs font-semibold bg-primary/5 text-primary border-primary/20 px-2 py-0.5">
                      SISTEMA
                    </Badge>
                  )}
                  <Badge variant="secondary" className="px-3 py-1 font-mono uppercase tracking-wider text-xs">
                    {roleObj.name}
                  </Badge>
                  {!roleObj.is_system && (
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors ml-2" onClick={() => handleDeleteRole(roleObj)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 pb-6 bg-card">
              <div className="space-y-5">
                {resources.map((resource) => {
                  // Optimization: only render switches if this resource has actions
                  return (
                    <div key={resource.key} className="border border-border/50 rounded-xl p-5 bg-card/50 transition-colors hover:bg-muted/30">
                      <h4 className="font-semibold mb-4 flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground w-full border-b pb-2">
                        Módulo: {resource.label}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {actions.map((action) => {
                           const isChecked = hasPermission(roleObj.name, resource.key, action.key) || roleObj.name === 'admin';
                           return (
                            <div key={action.key} className={`flex items-center space-x-3 border px-4 py-3 rounded-lg transition-all duration-200 ${isChecked ? 'bg-primary/5 border-primary/30 shadow-sm' : 'bg-background hover:bg-muted/50'}`}>
                              <Switch
                                id={`${roleObj.name}-${resource.key}-${action.key}`}
                                checked={isChecked}
                                onCheckedChange={() => togglePermission(roleObj.name, resource.key, action.key)}
                                disabled={roleObj.name === 'admin'}
                                className="data-[state=checked]:bg-primary"
                              />
                              <Label
                                htmlFor={`${roleObj.name}-${resource.key}-${action.key}`}
                                className={`text-sm cursor-pointer font-medium ${isChecked ? 'text-foreground' : 'text-muted-foreground'}`}
                              >
                                {action.label}
                              </Label>
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
        ))}
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex gap-4 shadow-sm items-start">
        <Shield className="w-6 h-6 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-primary/90 leading-relaxed font-medium">
          <strong>Aviso de Seguridad:</strong> El rol "admin" tiene privilegios absolutos sobre todos los módulos. Sus permisos son de lectura permanente y no pueden ser revocados desde esta vista para evitar bloqueos (lockouts) en el sistema. Los permisos para el resto de los roles se aplican inmediatamente.
        </p>
      </div>
    </div>
  );
}