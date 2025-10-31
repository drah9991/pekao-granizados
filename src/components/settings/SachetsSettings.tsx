import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, Wine, Coffee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables, Enums } from "@/integrations/supabase/types";
import { formatCurrency } from "@/lib/formatters"; // Import the formatter

type Sachet = Tables<'sachets'>;
type SachetType = Enums<'sachet_type'>;

const sachetTypeOptions: { value: SachetType; label: string; icon: React.ElementType }[] = [
  { value: "non_alcohol", label: "Sin Alcohol", icon: Coffee },
  { value: "alcohol", label: "Con Alcohol", icon: Wine },
];

export default function SachetsSettings() {
  const [sachets, setSachets] = useState<Sachet[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userStoreId, setUserStoreId] = useState<string | null>(null);

  // Dialog states
  const [sachetDialogIsOpen, setSachetDialogIsOpen] = useState(false);
  const [editingSachet, setEditingSachet] = useState<Sachet | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "0.00",
    type: "non_alcohol" as SachetType,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchUserStoreId();
  }, []);

  useEffect(() => {
    if (userStoreId) {
      fetchSachets();
    }
  }, [userStoreId]);

  const fetchUserStoreId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuario no autenticado.");
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (profile?.store_id) {
        setUserStoreId(profile.store_id);
      } else {
        toast.warning("No se encontró un ID de tienda para el usuario. No podrás gestionar sachets.");
      }
    } catch (error: any) {
      console.error("Error fetching user's store ID:", error);
      toast.error("Error al obtener ID de tienda: " + error.message);
    }
  };

  const fetchSachets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sachets")
        .select("*")
        .eq('store_id', userStoreId!)
        .order("name", { ascending: true });

      if (error) throw error;
      setSachets(data || []);
    } catch (error: any) {
      console.error("Error fetching sachets:", error);
      toast.error("Error al cargar sachets: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    if (!userStoreId) {
      toast.error("Debes tener una tienda asignada para crear sachets.");
      return;
    }
    setEditingSachet(null);
    setFormData({
      name: "",
      price: "0.00",
      type: "non_alcohol",
    });
    setSachetDialogIsOpen(true);
  };

  const openEditDialog = (sachet: Sachet) => {
    setEditingSachet(sachet);
    setFormData({
      name: sachet.name,
      price: sachet.price.toString(),
      type: sachet.type,
    });
    setSachetDialogIsOpen(true);
  };

  const handleSaveSachet = async () => {
    if (!formData.name || isNaN(parseFloat(formData.price))) {
      toast.error("Nombre y precio son obligatorios y el precio debe ser un número.");
      return;
    }
    if (!userStoreId) {
      toast.error("No se pudo determinar la tienda para este sachet.");
      return;
    }

    setIsProcessing(true);
    try {
      const sachetData = {
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        type: formData.type,
        store_id: userStoreId,
      };

      if (editingSachet) {
        // Update existing sachet
        const { error } = await supabase
          .from("sachets")
          .update(sachetData)
          .eq("id", editingSachet.id);

        if (error) throw error;
        toast.success("Sachet actualizado correctamente.");
      } else {
        // Create new sachet
        const { error } = await supabase
          .from("sachets")
          .insert([sachetData]);

        if (error) throw error;
        toast.success("Sachet creado correctamente.");
      }

      setSachetDialogIsOpen(false);
      fetchSachets();
    } catch (error: any) {
      console.error("Error saving sachet:", error);
      toast.error("Error al guardar sachet: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSachet = async (sachet: Sachet) => {
    if (!confirm(`¿Estás seguro de eliminar el sachet "${sachet.name}"?`)) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("sachets")
        .delete()
        .eq("id", sachet.id);

      if (error) throw error;
      toast.success("Sachet eliminado correctamente.");
      fetchSachets();
    } catch (error: any) {
      console.error("Error deleting sachet:", error);
      toast.error("Error al eliminar sachet: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredSachets = sachets.filter(sachet =>
    sachet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sachetTypeOptions.find(opt => opt.value === sachet.type)?.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Gestión de Sachets</h2>
        <p className="text-muted-foreground">
          Define los sachets (con y sin alcohol) disponibles para tus productos.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar sachet..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!userStoreId}
          />
        </div>
        <Button
          className="gradient-primary shadow-glow w-full md:w-auto"
          onClick={openCreateDialog}
          disabled={!userStoreId}
        >
          <Plus className="mr-2 w-5 h-5" />
          Nuevo Sachet
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando sachets...</p>
        </div>
      ) : filteredSachets.length === 0 ? (
        <Card className="glass-card shadow-card">
          <CardContent className="text-center py-12">
            <Wine className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay sachets definidos</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "No se encontraron sachets con la búsqueda aplicada"
                : "Comienza creando tu primer sachet"}
            </p>
            {!searchQuery && (
              <Button onClick={openCreateDialog} className="gradient-primary" disabled={!userStoreId}>
                <Plus className="mr-2 w-4 h-4" />
                Crear Primer Sachet
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card shadow-card">
          <CardHeader>
            <CardTitle>Lista de Sachets</CardTitle>
            <CardDescription>Gestiona los sachets disponibles para tus productos.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Precio Adicional</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSachets.map((sachet) => {
                    const SachetIcon = sachetTypeOptions.find(opt => opt.value === sachet.type)?.icon || Coffee;
                    return (
                      <TableRow key={sachet.id}>
                        <TableCell className="font-medium">{sachet.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <SachetIcon className="w-4 h-4 text-muted-foreground" />
                            {sachetTypeOptions.find(opt => opt.value === sachet.type)?.label}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(sachet.price)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:text-accent hover:bg-accent/10"
                              onClick={() => openEditDialog(sachet)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteSachet(sachet)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Sachet Dialog */}
      <Dialog open={sachetDialogIsOpen} onOpenChange={setSachetDialogIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSachet ? "Editar Sachet" : "Nuevo Sachet"}
            </DialogTitle>
            <DialogDescription>
              {editingSachet
                ? "Actualiza la información del sachet."
                : "Define un nuevo sachet adicional."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveSachet(); }} className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Nombre del Sachet *</Label>
              <Input
                id="name"
                placeholder="Ej: Sachet de Ron, Sachet de Leche"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label htmlFor="type">Tipo de Sachet *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: SachetType) => setFormData({ ...formData, type: value })}
                disabled={isProcessing}
              >
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {sachetTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="w-4 h-4 text-muted-foreground" />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="price">Precio Adicional *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="mt-2"
                required
              />
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSachetDialogIsOpen(false)}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || !formData.name || isNaN(parseFloat(formData.price))}
                className="gradient-primary"
              >
                {isProcessing ? "Guardando..." : editingSachet ? "Actualizar Sachet" : "Crear Sachet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}