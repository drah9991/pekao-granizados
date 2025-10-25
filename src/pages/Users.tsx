import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, User, Phone, Mail, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables, Enums } from "@/integrations/supabase/types";

type Profile = Tables<'profiles'>;
type UserRoleEnum = Enums<'user_role'>;

interface UserWithRole extends Profile {
  role: UserRoleEnum | null;
}

interface Store {
  id: string;
  name: string;
}

interface RoleConfig {
  role: UserRoleEnum;
  label: string;
  color: string;
}

const rolesConfig: RoleConfig[] = [
  { role: "admin", label: "Administrador", color: "bg-primary" },
  { role: "store_manager", label: "Gerente de Tienda", color: "bg-secondary" },
  { role: "cashier", label: "Cajero", color: "bg-accent" },
  { role: "delivery_driver", label: "Repartidor", color: "bg-blue-500" },
  { role: "customer", label: "Cliente", color: "bg-gray-500" },
];

export default function Users() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [currentUserStoreId, setCurrentUserStoreId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<UserRoleEnum | "all">("all");
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [userDialogIsOpen, setUserDialogIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    role: "cashier" as UserRoleEnum,
    store_id: null as string | null, // Added store_id to form data
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchStores();
    fetchCurrentUserStoreId();
  }, []);

  const fetchStores = async () => {
    const { data, error } = await supabase.from("stores").select("id, name").order("name");
    if (error) {
      console.error("Error fetching stores:", error);
      toast.error("Error al cargar tiendas");
    } else {
      setStores(data || []);
    }
  };

  const fetchCurrentUserStoreId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error("Error fetching current user's store ID:", error);
      } else {
        setCurrentUserStoreId(profile?.store_id || null);
      }
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          phone,
          created_at,
          updated_at,
          store_id,
          role
        `)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const usersWithRoles: UserWithRole[] = (profilesData || []).map(profile => ({
        ...profile,
        role: profile.role || null,
      }));
      
      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Error al cargar usuarios: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData({
      full_name: "",
      email: "",
      password: "",
      phone: "",
      role: "cashier",
      store_id: currentUserStoreId, // Default to current user's store
    });
    setUserDialogIsOpen(true);
  };

  const openEditDialog = (user: UserWithRole) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || "",
      email: user.email || "",
      password: "",
      phone: user.phone || "",
      role: user.role || "cashier",
      store_id: user.store_id || null, // Set from user's store_id
    });
    setUserDialogIsOpen(true);
  };

  const handleSaveUser = async () => {
    if (!formData.full_name || !formData.email || !formData.role) {
      toast.error("Nombre completo, email y rol son obligatorios.");
      return;
    }
    if (!editingUser && !formData.password) {
      toast.error("La contraseña es obligatoria para nuevos usuarios.");
      return;
    }

    setIsProcessing(true);
    try {
      if (editingUser) {
        // Update existing user profile
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({
            full_name: formData.full_name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim() || null,
            role: formData.role,
            store_id: formData.store_id, // Include store_id in update
          })
          .eq("id", editingUser.id);

        if (profileUpdateError) throw profileUpdateError;

        toast.success("Usuario actualizado correctamente.");
      } else {
        // Create new user in auth.users
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            data: {
              full_name: formData.full_name.trim(),
              phone: formData.phone.trim() || null,
            },
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("No se pudo crear el usuario de autenticación.");

        // Update the profile created by the trigger with the selected role and store_id
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({
            role: formData.role,
            store_id: formData.store_id,
          })
          .eq("id", authData.user.id);
        if (profileUpdateError) throw profileUpdateError;

        toast.success("Usuario creado correctamente. Se ha enviado un correo de verificación.");
      }

      setUserDialogIsOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Error saving user:", error);
      toast.error("Error al guardar usuario: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async (user: UserWithRole) => {
    if (!confirm(`¿Estás seguro de eliminar al usuario "${user.full_name}"? Esta acción es irreversible.`)) return;

    setIsProcessing(true);
    try {
      // Note: Deleting from 'profiles' table will cascade delete the user from 'auth.users'
      // if the foreign key constraint is set up with ON DELETE CASCADE.
      const { error: profileDeleteError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);
      if (profileDeleteError) throw profileDeleteError;

      toast.success("Usuario eliminado correctamente.");
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error("Error al eliminar usuario: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = selectedRoleFilter === "all" || user.role === selectedRoleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
            Maestro de Usuarios
          </h1>
          <p className="text-muted-foreground">Gestiona los usuarios y sus roles en el sistema</p>
        </div>
        <Button
          className="gradient-primary shadow-glow w-full md:w-auto"
          onClick={openCreateDialog}
        >
          <Plus className="mr-2 w-5 h-5" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="glass-card shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nombre, email, teléfono o rol..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={selectedRoleFilter} onValueChange={(value: UserRoleEnum | "all") => setSelectedRoleFilter(value)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Roles</SelectItem>
                {rolesConfig.map((role) => (
                  <SelectItem key={role.role} value={role.role}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando usuarios...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card className="glass-card shadow-card">
          <CardContent className="text-center py-12">
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay usuarios</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedRoleFilter !== "all"
                ? "No se encontraron usuarios con los filtros aplicados"
                : "Comienza creando tu primer usuario"}
            </p>
            {!searchQuery && selectedRoleFilter === "all" && (
              <Button onClick={openCreateDialog} className="gradient-primary">
                <Plus className="mr-2 w-4 h-4" />
                Crear Primer Usuario
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="glass-card shadow-card transition-smooth hover:shadow-elevated group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{user.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Badge
                    className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
                      rolesConfig.find(r => r.role === user.role)?.color || "bg-gray-500"
                    }`}
                  >
                    {rolesConfig.find(r => r.role === user.role)?.label || "Sin Rol"}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  {user.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground/70" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground/70" />
                    <span>{user.email}</span>
                  </div>
                  {user.store_id && (
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-muted-foreground/70" />
                      <span>Tienda: {stores.find(s => s.id === user.store_id)?.name || "Desconocida"}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:text-accent hover:bg-accent/10"
                    onClick={() => openEditDialog(user)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteUser(user)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Create/Edit User Dialog */}
      <Dialog open={userDialogIsOpen} onOpenChange={setUserDialogIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Actualiza la información del usuario y su rol."
                : "Crea una nueva cuenta de usuario y asigna un rol."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }} className="space-y-4 py-4">
            <div>
              <Label htmlFor="full_name">Nombre Completo *</Label>
              <Input
                id="full_name"
                placeholder="Ej: Juan Pérez"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="ejemplo@dominio.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-2"
                required
                disabled={!!editingUser}
              />
            </div>
            {!editingUser && (
              <div>
                <Label htmlFor="password">Contraseña *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>
            )}
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+57 300 123 4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="role">Rol *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRoleEnum) => setFormData({ ...formData, role: value })}
                disabled={isProcessing}
              >
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {rolesConfig.map((role) => (
                    <SelectItem key={role.role} value={role.role}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="store">Tienda</Label>
              <Select
                value={formData.store_id || ""}
                onValueChange={(value) => setFormData({ ...formData, store_id: value })}
                disabled={isProcessing}
              >
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="Selecciona una tienda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin tienda asignada</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUserDialogIsOpen(false)}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || !formData.full_name || !formData.email || !formData.role || (!editingUser && !formData.password)}
                className="gradient-primary"
              >
                {isProcessing ? "Guardando..." : editingUser ? "Actualizar Usuario" : "Crear Usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}