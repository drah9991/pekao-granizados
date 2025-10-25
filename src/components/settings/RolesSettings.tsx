import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield, Save, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Enums } from "@/integrations/supabase/types";

interface Permission {
  id: string;
  role: Enums<'app_role'>; // Use app_role enum
  resource: string;
  action: string;
}

interface RoleConfig {
  role: Enums<'app_role'>; // Use app_role enum
  label: string;
  description: string;
  color: string;
}

const roles: RoleConfig[] = [
  {
    role: "admin",
    label: "Administrador",
    description: "Acceso completo al sistema",
    color: "bg-primary"
  },
  {
    role: "manager",
    label: "Gerente",
    description: "Gestión de productos, inventario y reportes",
    color: "bg-secondary"
  },
  {
    role: "cashier",
    label: "Cajero",
    description: "Solo puede realizar ventas",
    color: "bg-accent"
  }
];

const resources = [
  { key: "sales", label: "Ventas" },
  { key: "products", label: "Productos" },
  { key: "inventory", label: "Inventario" },
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
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*');

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast.error('Error al cargar permisos');
    }
  };

  const hasPermission = (role: Enums<'app_role'>, resource: string, action: string) => {
    return permissions.some(
      p => p.role === role && p.resource === resource && p.action === action
    );
  };

  const togglePermission = async (role: Enums<'app_role'>, resource: string, action: string) => {
    const exists = hasPermission(role, resource, action);
    
    try {
      if (exists) {
        const permission = permissions.find(
          p => p.role === role && p.resource === resource && p.action === action
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
          .insert([{ role, resource, action }])
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Gestión de Roles y Permisos</h2>
        <p className="text-muted-foreground">
          Configura qué puede hacer cada rol en el sistema
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {roles.map((roleConfig) => (
          <Card key={roleConfig.role} className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${roleConfig.color} bg-opacity-20`}>
                    <Shield className={`w-6 h-6 ${roleConfig.color.replace('bg-', 'text-')}`} />
                  </div>
                  <div>
                    <CardTitle>{roleConfig.label}</CardTitle>
                    <CardDescription>{roleConfig.description}</CardDescription>
                  </div>
                </div>
                <Badge className={roleConfig.color}>
                  {roleConfig.role.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resources.map((resource) => (
                  <div key={resource.key} className="border-2 rounded-xl p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      {resource.label}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {actions.map((action) => (
                        <div key={action.key} className="flex items-center space-x-2">
                          <Switch
                            id={`${roleConfig.role}-${resource.key}-${action.key}`}
                            checked={hasPermission(roleConfig.role, resource.key, action.key)}
                            onCheckedChange={() => togglePermission(roleConfig.role, resource.key, action.key)}
                            disabled={roleConfig.role === 'admin'} // Admin always has all permissions
                          />
                          <Label
                            htmlFor={`${roleConfig.role}-${resource.key}-${action.key}`}
                            className="text-sm cursor-pointer"
                          >
                            {action.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-muted/30 border-2 rounded-xl p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Nota:</strong> Los administradores siempre tienen todos los permisos habilitados.
          Los cambios se aplican inmediatamente a todos los usuarios con ese rol.
        </p>
      </div>
    </div>
  );
}