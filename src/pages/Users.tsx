import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, User, Phone, Mail, Shield, UserCheck, Store, Lock, ShieldAlert, LayoutGrid, Filter, UserCog, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import Layout from "@/components/Layout";
import { createNotification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  }
};

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
    }
  };

  const fetchStores = async () => {
    const { data, error } = await supabase.from("stores").select("id, name").order("name");
    if (!error) setStores(data || []);
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
      toast.error("Error al cargar el directorio: " + error.message);
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
      toast.error("Credenciales obligatorias para nuevos usuarios.");
      return;
    }

    setIsProcessing(true);
    try {
      if (editingUser) {
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

        if (formData.password) {
          const { data, error } = await supabase.functions.invoke('update-user', {
            body: { userId: editingUser.id, password: formData.password },
          });
          if (error || (data && data.error)) throw new Error(error?.message || data.error);
        }

        await supabase.from("user_roles").delete().eq("user_id", editingUser.id);
        const { error: roleError } = await (supabase as any)
          .from("user_roles")
          .insert({ user_id: editingUser.id, role: formData.role });

        if (roleError) throw roleError;
        toast.success("Perfil actualizado con éxito.");
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: { data: { name: formData.name.trim(), phone: formData.phone.trim() || null } },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Fallo en creación de identidad Auth.");

        const { error: profileUpdateError } = await (supabase as any)
          .from("profiles")
          .update({ 
            store_id: formData.store_id,
            document_id: formData.document_id.trim() || null,
            consent_habeas_data: formData.consent_habeas_data,
          })
          .eq("id", authData.user.id);
        if (profileUpdateError) throw profileUpdateError;

        const { error: roleError } = await (supabase as any)
          .from("user_roles")
          .insert({ user_id: authData.user.id, role: formData.role });
        if (roleError) throw roleError;

        toast.success("Usuario indexado. Correo de verificación enviado.");
      }

      setUserDialogIsOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Error saving user:", error);
      toast.error("Error en la operación: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async (user: UserWithRole) => {
    if (user.id === currentUserId) {
      toast.error("Acción restringida: No puede eliminar su propia identidad.");
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: user.id },
      });

      if (error || (data && data.error)) throw new Error(error?.message || data.error);

      toast.success("Entidad eliminada del sistema.");
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error("Fallo en eliminación: " + error.message);
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

  const getRoleStyle = (role: string | null) => {
    switch (role) {
      case 'admin': return { label: 'ADMINISTRADOR', bg: 'bg-rose-500/10', text: 'text-rose-500', glow: 'shadow-rose-500/20' };
      case 'manager': return { label: 'GERENCIA', bg: 'bg-indigo-500/10', text: 'text-indigo-400', glow: 'shadow-indigo-500/20' };
      case 'cashier': return { label: 'OPERATIVO', bg: 'bg-emerald-500/10', text: 'text-emerald-500', glow: 'shadow-emerald-500/20' };
      default: return { label: role?.toUpperCase() || 'SIN ROL', bg: 'bg-muted/50', text: 'text-muted-foreground', glow: '' };
    }
  };

  return (
    <Layout>
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="min-h-screen bg-transparent text-foreground p-6 lg:p-10 space-y-10"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent italic uppercase font-space-grotesk whitespace-nowrap">
              Maestro de Usuarios
            </h1>
            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
              Gestión de Permisos y Roles • Core Access Pro Max
            </p>
          </div>
          <Button
            className="h-14 px-8 rounded-[1.5rem] bg-primary text-primary-foreground font-black italic uppercase tracking-widest shadow-glow-pro hover:shadow-primary/40 transition-all gap-3"
            onClick={openCreateDialog}
            disabled={!canManageUsers}
          >
            <Plus className="w-5 h-5" /> Vincular Identidad
          </Button>
        </motion.div>

        {/* Filters Bento Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 relative group">
                <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                <Input
                    placeholder="FILTRAR POR NOMBRE, ROL O IDENTIDAD..."
                    className="pl-16 h-16 bg-muted/30 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk focus:border-primary/50 focus:ring-primary/20 shadow-pro transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={!canManageUsers}
                />
            </div>
            <div className="relative">
                <Filter className="absolute left-5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/60 z-10 pointer-events-none" />
                <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter} disabled={!canManageUsers}>
                    <SelectTrigger className="h-16 bg-muted/30 border-border rounded-[1.5rem] pl-14 text-[10px] font-black italic uppercase font-space-grotesk">
                        <SelectValue placeholder="FILTRAR ROL" />
                    </SelectTrigger>
                    <SelectContent className="glass-pro border-border rounded-2xl">
                        <SelectItem value="all" className="text-[9px] font-black italic uppercase p-4 border-b border-border/50 last:border-0">TODOS LOS ROLES</SelectItem>
                        {dbRoles.map((role) => (
                            <SelectItem key={role.name} value={role.name} className="text-[9px] font-black italic uppercase p-4 border-b border-white/5 last:border-0 capitalize">
                                {role.name.replace(/_/g, ' ')}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </motion.div>

        {/* User Identity Grid */}
        <motion.div variants={itemVariants}>
           <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight text-foreground leading-none">Entidades del Sistema</h2>
              <div className="flex items-center gap-3 bg-muted/30 px-4 h-9 rounded-full border border-border font-black text-[9px] text-muted-foreground italic uppercase">
                 <LayoutGrid className="w-3.5 h-3.5" /> Directiva Activa
              </div>
           </div>

           {loading ? (
               <div className="flex flex-col items-center justify-center py-24">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6 shadow-glow-pro" />
                  <p className="text-primary font-black uppercase tracking-widest text-[10px] italic animate-pulse">Sincronizando perfiles de acceso...</p>
               </div>
           ) : filteredUsers.length === 0 ? (
               <Card className="bg-muted border border-border rounded-[3.5rem] p-32 shadow-pro glass-pro text-center opacity-30">
                  <ShieldAlert className="w-24 h-24 mx-auto mb-6 text-foreground" />
                  <h3 className="text-xl font-black italic uppercase tracking-widest text-foreground">ZONA DESIERTA</h3>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-3">No se detectaron perfiles con el criterio actual.</p>
               </Card>
           ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredUsers.map((user, idx) => {
                            const rStyle = getRoleStyle(user.role);
                            const userStore = stores.find(s => s.id === user.store_id)?.name || "ASIGNACIÓN PENDIENTE";
                            
                            return (
                                <motion.div
                                    key={user.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="bg-muted border border-border rounded-[2.5rem] p-8 glass-pro hover:bg-muted/80 hover:shadow-pro transition-all group overflow-hidden relative"
                                >
                                    <div className="flex flex-col lg:flex-row gap-8 relative z-10">
                                        {/* Identity Seal */}
                                        <div className="w-24 h-24 rounded-3xl bg-muted border border-border flex items-center justify-center relative group-hover:scale-110 transition-transform duration-500 shadow-pro">
                                            <div className="absolute inset-0 bg-primary/10 blur-xl group-hover:bg-primary/20 transition-all rounded-full" />
                                            <User className="w-8 h-8 lg:w-10 lg:h-10 text-foreground relative z-10" />
                                            <div className="absolute -bottom-2 -right-2 w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-muted border border-border flex items-center justify-center">
                                                <Shield className={cn("w-5 h-5", rStyle.text)} />
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                   <h3 className="text-xl lg:text-2xl font-black italic font-space-grotesk text-foreground tracking-tight group-hover:text-primary transition-colors truncate">
                                                      {user.name?.toUpperCase() || 'ANÓNIMO'}
                                                   </h3>
                                                   <div className={cn("inline-flex px-3 py-1 rounded-full text-[9px] font-black italic uppercase tracking-[0.2em] border border-border/50 mt-2", rStyle.bg, rStyle.text, rStyle.glow)}>
                                                      {rStyle.label}
                                                   </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost" size="icon" className="w-10 h-10 rounded-xl bg-muted border border-border hover:bg-primary/20 hover:text-primary transition-all shadow-pro"
                                                        onClick={() => openEditDialog(user)}
                                                        disabled={!canManageUsers && user.id !== currentUserId}
                                                    >
                                                        <UserCog className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost" size="icon" className="w-10 h-10 rounded-xl bg-muted border border-border hover:bg-rose-500/20 hover:text-rose-500 transition-all shadow-pro"
                                                        onClick={() => handleDeleteUser(user)}
                                                        disabled={!canManageUsers || user.id === currentUserId}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                               <div className="space-y-3">
                                                  <div className="flex items-center gap-2 text-[10px] font-black text-white/40 italic uppercase tracking-widest">
                                                     <Mail className="w-3.5 h-3.5 text-primary" /> {user.email || 'NO AUTH EMAIL'}
                                                  </div>
                                                  <div className="flex items-center gap-2 text-[10px] font-black text-white/40 italic uppercase tracking-widest">
                                                     <Phone className="w-3.5 h-3.5 text-indigo-400" /> {user.phone || 'NO CONTACT'}
                                                  </div>
                                               </div>
                                               <div className="space-y-3">
                                                  <div className="flex items-center gap-2 text-[10px] font-black text-white/40 italic uppercase tracking-widest">
                                                     <Store className="w-3.5 h-3.5 text-emerald-500" /> {userStore}
                                                  </div>
                                                  <div className="flex items-center gap-2 text-[10px] font-black text-white/40 italic uppercase tracking-widest">
                                                     <UserCheck className={cn("w-3.5 h-3.5", user.consent_habeas_data ? "text-emerald-500" : "text-rose-500")} /> HABEAS: {user.consent_habeas_data ? 'COMPLIANT' : 'PENDING'}
                                                  </div>
                                               </div>
                                            </div>

                                            <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                                               <span className="text-[9px] font-black text-muted-foreground/30 uppercase italic tracking-widest">SISTEMA ID:</span>
                                               <span className="text-[9px] font-bold text-muted-foreground/50 italic font-space-grotesk truncate">{user.id}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
           )}
        </motion.div>

        {/* Form Dialog */}
        <Dialog open={userDialogIsOpen} onOpenChange={setUserDialogIsOpen}>
          <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto custom-scrollbar glass-pro border-border rounded-[3rem] text-foreground shadow-pro">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-glow-pro text-primary">
                    <UserCog className="w-6 h-6" />
                 </div>
                 <div>
                    <DialogTitle className="text-xl lg:text-2xl font-black italic uppercase font-space-grotesk tracking-tight">
                       {editingUser ? "Configuración de Perfil" : "Emisión de Identidad"}
                    </DialogTitle>
                    <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Administración de Credenciales y Protocolos de Acceso</DialogDescription>
                 </div>
              </div>
            </DialogHeader>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">NOMBRE COMPLETO</Label>
                        <Input
                            placeholder="EJ: JUAN PÉREZ"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                            className="h-14 bg-muted/40 border-border rounded-2xl text-xs font-black italic uppercase focus:ring-primary/20"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">CC / IDENTIDAD</Label>
                        <Input
                            placeholder="EJ: 1000123456"
                            value={formData.document_id}
                            onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
                            className="h-14 bg-muted/40 border-border rounded-2xl text-xs font-black italic focus:ring-primary/20"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">EMAIL DE ACCESO</Label>
                        <Input
                            type="email"
                            placeholder="CORREO@SISTEMA.COM"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                            className="h-14 bg-muted/40 border-border rounded-2xl text-xs font-black italic focus:ring-primary/20"
                            required={!editingUser}
                        />
                    </div>
                    <div className="space-y-2 relative">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">
                           {editingUser ? "SECURITY OVERRIDE (PWD)" : "PASSWORD DE ACCESO"}
                        </Label>
                        <Input
                            type="password"
                            placeholder={editingUser ? "SOLO PARA CAMBIO" : "MÍN. 6 CARACTERES"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="h-14 bg-muted/40 border-border rounded-2xl text-xs font-black italic focus:ring-primary/20"
                            required={!editingUser}
                            minLength={6}
                        />
                        <Key className="absolute right-4 top-10 w-4 h-4 text-muted-foreground/20" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">VECTOR DE ROL</Label>
                        <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                            <SelectTrigger className="h-14 bg-muted/40 border-border rounded-2xl text-xs font-black italic uppercase">
                                <SelectValue placeholder="SELECCIONAR ROL" />
                            </SelectTrigger>
                            <SelectContent className="glass-pro border-border rounded-2xl">
                                {dbRoles.map((role) => (
                                    <SelectItem key={role.name} value={role.name} className="text-[9px] font-black italic uppercase p-4 border-b border-border/50 last:border-0">
                                        {role.name.replace(/_/g, ' ')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">TIENDA ASIGNADA</Label>
                        <Select value={formData.store_id || ""} onValueChange={(v) => setFormData({ ...formData, store_id: v || null })}>
                            <SelectTrigger className="h-14 bg-muted/40 border-border rounded-2xl text-xs font-black italic uppercase">
                                <SelectValue placeholder="SELECCIONAR NODO" />
                            </SelectTrigger>
                            <SelectContent className="glass-pro border-border rounded-2xl">
                                {stores.map((s) => (
                                    <SelectItem key={s.id} value={s.id} className="text-[9px] font-black italic uppercase p-4 border-b border-border/50 last:border-0">{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="p-6 glass-pro bg-primary/5 rounded-[2rem] border border-primary/10 flex items-start gap-4">
                    <input
                        type="checkbox"
                        id="consent_user"
                        className="mt-1 w-5 h-5 rounded-lg border-border bg-muted text-primary focus:ring-primary/40 cursor-pointer"
                        checked={formData.consent_habeas_data}
                        onChange={(e) => setFormData({ ...formData, consent_habeas_data: e.target.checked })}
                        required
                    />
                    <Label htmlFor="consent_user" className="text-[10px] font-black text-muted-foreground uppercase italic tracking-widest leading-relaxed cursor-pointer select-none">
                        Certifico que el titular ha autorizado el tratamiento de datos personales conforme a la <span className="text-primary tracking-tighter">LEY 1581 DE 2012</span> para el registro operativo.
                    </Label>
                </div>

                <DialogFooter className="gap-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setUserDialogIsOpen(false)}
                        disabled={isProcessing}
                        className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase italic tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                        CANCELAR PROTOCOLO
                    </Button>
                    <Button
                        type="submit"
                        disabled={isProcessing || !formData.name || !formData.role || !formData.document_id || !formData.consent_habeas_data}
                        className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black italic uppercase tracking-widest shadow-glow-pro hover:shadow-primary/40 transition-all font-space-grotesk"
                    >
                        {isProcessing ? "VALIDANDO..." : editingUser ? "ACTUALIZAR PERFIL ✓" : "EMITIR IDENTIDAD ✓"}
                    </Button>
                </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>
    </Layout>
  );
}
