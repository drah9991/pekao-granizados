import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, User, Phone, Mail, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import Layout from "@/components/Layout";
import { createNotification } from "@/hooks/useNotifications";

type Profile = Tables<'profiles'>;

interface UserWithRole extends Profile {
  role: string | null;
  email?: string;
  document_id?: string;
  consent_habeas_data?: boolean;
}

interface Store {
  id: string;
  name: string;
}

interface RoleDb {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean | null;
}

export default function Users() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [dbRoles, setDbRoles] = useState<RoleDb[]>([]);
  const [currentUserStoreId, setCurrentUserStoreId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [userDialogIsOpen, setUserDialogIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "cashier",
    store_id: null as string | null,
    document_id: "",
    consent_habeas_data: false,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchDbRoles();
    fetchUsers();
    fetchStores();
    fetchCurrentUserStoreAndRole();
  }, []);

  const fetchDbRoles = async () => {
    const { data, error } = await (supabase as any).from('roles').select('*').order('name');
    if (!error && data) {
      setDbRoles(data);
    } else {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchStores = async () => {
    const { data, error } = await supabase.from("stores").select("id, name").order("name");
    if (error) {
      console.error("Error fetching stores:", error);
      toast.error("Error al cargar tiendas");
    } else {
      setStores(data || []);
    }
  };

  const fetchCurrentUserStoreAndRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data: profile } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();

      setCurrentUserStoreId(profile?.store_id || null);

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      setCurrentUserRole(roleData?.role || null);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user_roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const rolesMap = new Map<string, string>();
      (rolesData || []).forEach(r => rolesMap.set(r.user_id, r.role));

      const usersWithRoles: UserWithRole[] = (profilesData || []).map(profile => ({
        ...profile,
        role: rolesMap.get(profile.id) || null,
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
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "cashier",
      store_id: currentUserStoreId,
      document_id: "",
      consent_habeas_data: false,
    });
    setUserDialogIsOpen(true);
  };

  const openEditDialog = (user: UserWithRole) => {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      password: "",
      phone: user.phone || "",
      role: user.role || "cashier",
      store_id: user.store_id || null,
      document_id: user.document_id || "",
      consent_habeas_data: user.consent_habeas_data || false,
    });
    setUserDialogIsOpen(true);
  };

  const handleSaveUser = async () => {
    if (!formData.name || !formData.role || !formData.document_id) {
      toast.error("Nombre, documento y rol son obligatorios.");
      return;
    }
    if (!formData.consent_habeas_data) {
      toast.error("Debe autorizar el tratamiento de datos (Ley 1581) para continuar.");
      return;
    }
    if (!editingUser && (!formData.email || !formData.password)) {
      toast.error("Email y contraseña son obligatorios para nuevos usuarios.");
      return;
    }

    setIsProcessing(true);
    try {
      if (editingUser) {
        // Update profile
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({
            name: formData.name.trim(),
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            store_id: formData.store_id,
            document_id: formData.document_id.trim() || null,
            consent_habeas_data: formData.consent_habeas_data,
          })
          .eq("id", editingUser.id);

        if (profileUpdateError) throw profileUpdateError;

        // Update password if provided via Edge Function
        if (formData.password) {
          if (formData.password.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres.");
            setIsProcessing(false);
            return;
          }
          const { data, error } = await supabase.functions.invoke('update-user', {
            body: { userId: editingUser.id, password: formData.password },
          });

          if (error) throw new Error(error.message);
          if (data && data.error) throw new Error(data.error);
        }

        // Update role
        await supabase.from("user_roles").delete().eq("user_id", editingUser.id);

        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: editingUser.id,
            role: formData.role,
          });

        if (roleError) throw roleError;

        toast.success("Usuario actualizado correctamente.");

        if (currentUserStoreId) {
          await createNotification({
            store_id: currentUserStoreId,
            title: "Usuario Actualizado",
            message: `El usuario "${formData.name}" ha sido actualizado.`,
            type: "system_event",
            priority: "low"
          });
        }
      } else {
        // Create new user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            data: {
              name: formData.name.trim(),
              phone: formData.phone.trim() || null,
            },
          },
        });

        if (authError) {
          if (authError.message.includes("User already registered")) {
            toast.error("Ya existe una cuenta con este email.");
          } else {
            throw authError;
          }
          return;
        }

        if (!authData.user) {
          throw new Error("No se pudo crear el usuario de autenticación.");
        }

        // Update profile with store_id and document details
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({ 
            store_id: formData.store_id,
            document_id: formData.document_id.trim() || null,
            consent_habeas_data: formData.consent_habeas_data,
          })
          .eq("id", authData.user.id);
        if (profileUpdateError) throw profileUpdateError;

        // Assign role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: authData.user.id, role: formData.role });
        if (roleError) throw roleError;

        if (currentUserStoreId) {
          await createNotification({
            store_id: currentUserStoreId,
            title: "Nuevo Usuario",
            message: `El usuario "${formData.name}" ha sido creado con el rol ${formData.role}.`,
            type: "system_event",
            priority: "medium"
          });
        }

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
    if (!canManageUsers) {
      toast.error("No tienes permiso para eliminar usuarios.");
      return;
    }
    if (user.id === currentUserId) {
      toast.error("No puedes eliminar tu propia cuenta desde aquí.");
      return;
    }

    if (!window.confirm(`¿Estás seguro de eliminar al usuario "${user.name}"? Esta acción es irreversible.`)) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: user.id },
      });

      if (error) throw new Error(error.message);
      if (data && data.error) throw new Error(data.error);

      if (currentUserStoreId) {
        await createNotification({
          store_id: currentUserStoreId,
          title: "Usuario Eliminado",
          message: `El usuario "${user.name}" ha sido eliminado del sistema.`,
          type: "system_event",
          priority: "high"
        });
      }

      toast.success("Usuario eliminado correctamente.");
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error("Error al eliminar usuario: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const canManageUsers = currentUserRole === "admin" || currentUserRole === "manager";

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = selectedRoleFilter === "all" || user.role === selectedRoleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6 md:space-y-8">
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
            disabled={!canManageUsers}
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
                  placeholder="Buscar por nombre, teléfono o rol..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={!canManageUsers}
                />
              </div>

              <Select
                value={selectedRoleFilter}
                onValueChange={(value: string) => setSelectedRoleFilter(value)}
                disabled={!canManageUsers}
              >
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Roles</SelectItem>
                  {dbRoles.map((role) => (
                    <SelectItem key={role.name} value={role.name}>
                      <span className="capitalize">{role.name.replace(/_/g, ' ')}</span>
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
                <Button onClick={openCreateDialog} className="gradient-primary" disabled={!canManageUsers}>
                  <Plus className="mr-2 w-4 h-4" />
                  Crear Primer Usuario
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card shadow-card">
            <CardHeader>
              <CardTitle>Lista de Usuarios</CardTitle>
              <CardDescription>Gestiona los detalles de cada usuario.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Tienda</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.email || 'N/A'}</TableCell>
                        <TableCell>{user.phone || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs px-3 py-1.5 rounded-full font-semibold ${user.role === 'admin' ? 'bg-primary' : 'bg-secondary'}`}
                          >
                            <span className="capitalize">{user.role ? user.role.replace(/_/g, ' ') : "Sin Rol"}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>{stores.find(s => s.id === user.store_id)?.name || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:text-accent hover:bg-accent/10"
                              onClick={() => openEditDialog(user)}
                              disabled={!canManageUsers && user.id !== (currentUserId || '')}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteUser(user)}
                              disabled={!canManageUsers || user.id === (currentUserId || '')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
                <Label htmlFor="name">Nombre Completo *</Label>
                <Input
                  id="name"
                  placeholder="Ej: Juan Pérez"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="document_id">Documento de Identidad (C.C.) *</Label>
                <Input
                  id="document_id"
                  placeholder="Ej: 1000123456"
                  value={formData.document_id}
                  onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required={!editingUser} // Email is required only for new users
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  {editingUser ? "Nueva Contraseña (Dejar en blanco para no cambiar)" : "Contraseña *"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={editingUser ? "Opcional" : "Mínimo 6 caracteres"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  minLength={6}
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  placeholder="Ej: +57 300 123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="role">Rol *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: string) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {dbRoles.map((role) => (
                      <SelectItem key={role.name} value={role.name}>
                        <span className="capitalize">{role.name.replace(/_/g, ' ')}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="store_id">Tienda Asignada</Label>
                <Select
                  value={formData.store_id || ""}
                  onValueChange={(value) => setFormData({ ...formData, store_id: value || null })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Seleccionar tienda" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <input
                  type="checkbox"
                  id="consent_user"
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  checked={formData.consent_habeas_data}
                  onChange={(e) => setFormData({ ...formData, consent_habeas_data: e.target.checked })}
                  required
                />
                <Label htmlFor="consent_user" className="text-sm font-normal text-muted-foreground leading-snug cursor-pointer">
                  Autorizo el tratamiento de mis datos personales conforme a la <strong>Ley 1581 de 2012 (Hábeas Data)</strong>. *
                </Label>
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
                  disabled={isProcessing || !formData.name || !formData.role || !formData.document_id || !formData.consent_habeas_data}
                  className="gradient-primary"
                >
                  {isProcessing ? "Guardando..." : editingUser ? "Actualizar Usuario" : "Crear Usuario"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
