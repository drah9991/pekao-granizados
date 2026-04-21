import React, { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdministration } from "@/hooks/useAdministration";
import { useAuth } from "@/context/AuthContext";
import UserCard from "@/components/users/UserCard";
import UserFormDialog from "@/components/users/UserFormDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

export default function Users() {
  const { users, stores, roles, loading, isProcessing, handleSaveUser, handleDeleteUser } = useAdministration();
  const { user: currentUser, userRole: currentUserRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [userDialogIsOpen, setUserDialogIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchQuery || (u.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRoleFilter === "all" || u.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  const canManageUsers = currentUserRole === "admin" || currentUserRole === "manager";

  return (
    <Layout>
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="min-h-screen bg-transparent text-foreground p-6 lg:p-10 space-y-10"
      >
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
            onClick={() => { setEditingUser(null); setUserDialogIsOpen(true); }}
            disabled={!canManageUsers}
          >
            <Plus className="w-5 h-5" /> Vincular Identidad
          </Button>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 relative group">
                <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                <Input
                    placeholder="FILTRAR POR NOMBRE, ROL O IDENTIDAD..."
                    className="pl-16 h-16 bg-muted/30 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="relative">
                <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
                    <SelectTrigger className="h-16 bg-muted/30 border-border rounded-[1.5rem] text-[10px] font-black italic uppercase font-space-grotesk">
                        <SelectValue placeholder="FILTRAR ROL" />
                    </SelectTrigger>
                    <SelectContent className="glass-pro border-border rounded-2xl">
                        <SelectItem value="all" className="text-[9px] font-black italic uppercase p-4 border-b border-border/50">TODOS LOS ROLES</SelectItem>
                        {roles.map((role) => (
                            <SelectItem key={role.name} value={role.name} className="text-[9px] font-black italic uppercase p-4 border-b border-white/5 last:border-0 capitalize">
                                {role.name.replace(/_/g, ' ')}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </motion.div>

        <motion.div variants={itemVariants}>
           <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight text-foreground leading-none">Entidades del Sistema</h2>
              <div className="flex items-center gap-3 bg-muted/30 px-4 h-9 rounded-full border border-border font-black text-[9px] text-muted-foreground italic uppercase">
                 <LayoutGrid className="w-3.5 h-3.5" /> Directiva Activa
              </div>
           </div>

           {loading ? (
                <div className="flex flex-col items-center justify-center py-24"><div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-glow-pro" /></div>
           ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredUsers.map((user, idx) => (
                            <UserCard 
                                key={user.id} 
                                user={user} 
                                stores={stores} 
                                idx={idx} 
                                onEdit={(u) => { setEditingUser(u); setUserDialogIsOpen(true); }}
                                onDelete={handleDeleteUser}
                                currentUserId={currentUser?.id}
                                canManage={canManageUsers}
                            />
                        ))}
                    </AnimatePresence>
                </div>
           )}
        </motion.div>

        <UserFormDialog 
            isOpen={userDialogIsOpen} 
            onClose={() => setUserDialogIsOpen(false)} 
            editingUser={editingUser} 
            stores={stores} 
            roles={roles} 
            onSave={handleSaveUser} 
            isProcessing={isProcessing}
        />
      </motion.div>
    </Layout>
  );
}
