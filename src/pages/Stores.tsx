import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Store as StoreIcon, MapPin, Clock, DollarSign, Settings as SettingsIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables, Enums } from "@/integrations/supabase/types";

type Store = Tables<'stores'>;
type UserRoleEnum = Enums<'user_role'>;

export default function Stores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true); // Corrected: useState(true)
  const [currentUserRole, setCurrentUserRole] = useState<UserRoleEnum | null>(null);

  // Dialog states
  const [storeDialogIsOpen, setStoreDialogIsOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    opening_hours: "",
    currency: "COP",
    tax_rate: "0",
    config: {} as any, // Initialize config as an empty object
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchStores();
    fetchCurrentUserRole();
  }, []);

  const fetchCurrentUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error("Error fetching current user's profile:", error);
      } else {
        setCurrentUserRole(profile?.role || null);
      }
    }
  };

  const fetchStores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setStores(data || []);
    } catch (error: any) {
      console.error("Error fetching stores:", error);
      toast.error("Error al cargar tiendas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingStore(null);
    setFormData({
      name: "",
      address: "",
      opening_hours: "",
      currency: "COP",
      tax_rate: "0",
      config: {},
    });
    setStoreDialogIsOpen(true);
  };

  const openEditDialog = (store: Store) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      address: store.address || "",
      opening_hours: store.opening_hours || "",
      currency: store.currency || "COP",
      tax_rate: store.tax_rate?.toString() || "0",
      config: store.config || {},
    });
    setStoreDialogIsOpen(true);
  };

  const handleSaveStore = async () => {
    if (!formData.name) {
      toast.error("El nombre de la tienda es obligatorio.");
      return;
    }

    setIsProcessing(true);
    try {
      const storeData = {
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        opening_hours: formData.opening_hours.trim() || null,
        currency: formData.currency.trim(),
        tax_rate: parseFloat(formData.tax_rate),
        config: formData.config,
      };

      if (editingStore) {
        // Update existing store
        const { error } = await supabase
          .from("stores")
          .update(storeData)
          .eq("id", editingStore.id);

        if (error) throw error;
        toast.success("Tienda actualizada correctamente.");
      } else {
        // Create new store
        const { error } = await supabase
          .from("stores")
          .insert([storeData]);

        if (error) throw error;
        toast.success("Tienda creada correctamente.");
      }

      setStoreDialogIsOpen(false);
      fetchStores();
    } catch (error: any) {
      console.error("Error saving store:", error);
      toast.error("Error al guardar tienda: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteStore = async (store: Store) => {
    if (!canManageStores) {
      toast.error("No tienes permiso para eliminar tiendas.");
      return;
    }
    if (!confirm(`¿Estás seguro de eliminar la tienda "${store.name}"? Esta acción es irreversible.`)) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("stores")
        .delete()
        .eq("id", store.id);

      if (error) throw error;
      toast.success("Tienda eliminada correctamente.");
      fetchStores();
    } catch (error: any) {
      console.error("Error deleting store:", error);
      toast.error("Error al eliminar tienda: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const canManageStores = currentUserRole === "admin" || currentUserRole === "store_manager";

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.currency.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
            Maestro de Tiendas
          </h1>
          <p className="text-muted-foreground">Gestiona las sucursales de tu negocio</p>
        </div>
        <Button
          className="gradient-primary shadow-glow w-full md:w-auto"
          onClick={openCreateDialog}
          disabled={!canManageStores}
        >
          <Plus className="mr-2 w-5 h-5" />
          Nueva Tienda
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="glass-card shadow-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Tiendas</p>
              <p className="text-2xl font-bold">{stores.length}</p>
            </div>
            <StoreIcon className="w-8 h-8 text-primary" />
          </CardContent>
        </Card>
        <Card className="glass-card shadow-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tiendas Activas</p>
              <p className="text-2xl font-bold text-accent">{stores.length}</p> {/* Assuming all are active for now */}
            </div>
            <SettingsIcon className="w-8 h-8 text-accent" />
          </CardContent>
        </Card>
        <Card className="glass-card shadow-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Moneda Predeterminada</p>
              <p className="text-2xl font-bold text-secondary">COP</p>
            </div>
            <DollarSign className="w-8 h-8 text-secondary" />
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="glass-card shadow-card">
        <CardContent className="pt-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nombre, dirección o moneda..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stores List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando tiendas...</p>
        </div>
      ) : filteredStores.length === 0 ? (
        <Card className="glass-card shadow-card">
          <CardContent className="text-center py-12">
            <StoreIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay tiendas registradas</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "No se encontraron tiendas con la búsqueda aplicada"
                : "Comienza creando tu primera tienda"}
            </p>
            {!searchQuery && (
              <Button onClick={openCreateDialog} className="gradient-primary" disabled={!canManageStores}>
                <Plus className="mr-2 w-4 h-4" />
                Crear Primera Tienda
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card shadow-card">
          <CardHeader>
            <CardTitle>Lista de Tiendas</CardTitle>
            <CardDescription>Gestiona los detalles de cada sucursal.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead>Moneda</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell className="font-medium">{store.name}</TableCell>
                      <TableCell>{store.address || 'N/A'}</TableCell>
                      <TableCell>{store.opening_hours || 'N/A'}</TableCell>
                      <TableCell>{store.currency}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-accent hover:bg-accent/10"
                            onClick={() => openEditDialog(store)}
                            disabled={!canManageStores}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteStore(store)}
                            disabled={!canManageStores}
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

      {/* Create/Edit Store Dialog */}
      <Dialog open={storeDialogIsOpen} onOpenChange={setStoreDialogIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStore ? "Editar Tienda" : "Nueva Tienda"}
            </DialogTitle>
            <DialogDescription>
              {editingStore
                ? "Actualiza la información de la tienda."
                : "Completa los datos para crear una nueva tienda."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveStore(); }} className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Nombre de la Tienda *</Label>
              <Input
                id="name"
                placeholder="Ej: Pekao Granizados - Centro"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label htmlFor="address">Dirección</Label>
              <Textarea
                id="address"
                placeholder="Ej: Calle 123 #45-67, Barrio Centro"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="mt-2"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="opening_hours">Horario de Apertura</Label>
              <Input
                id="opening_hours"
                placeholder="Ej: L-S 9:00 AM - 8:00 PM"
                value={formData.opening_hours}
                onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
                className="mt-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currency">Moneda</Label>
                <Input
                  id="currency"
                  placeholder="Ej: COP"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="tax_rate">IVA (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ej: 19"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                  className="mt-2"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStoreDialogIsOpen(false)}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || !formData.name}
                className="gradient-primary"
              >
                {isProcessing ? "Guardando..." : editingStore ? "Actualizar Tienda" : "Crear Tienda"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}