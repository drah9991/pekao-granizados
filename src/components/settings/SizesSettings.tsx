import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Ruler, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

type Size = Tables<'sizes'>;

export default function SizesSettings() {
  const [sizes, setSizes] = useState<Size[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userStoreId, setUserStoreId] = useState<string | null>(null);

  // Dialog states
  const [sizeDialogIsOpen, setSizeDialogIsOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<Size | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    multiplier: "1.0",
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchUserStoreId();
  }, []);

  useEffect(() => {
    if (userStoreId) {
      fetchSizes();
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
        toast.warning("No se encontró un ID de tienda para el usuario. No podrás gestionar tamaños.");
      }
    } catch (error: any) {
      console.error("Error fetching user's store ID:", error);
      toast.error("Error al obtener ID de tienda: " + error.message);
    }
  };

  const fetchSizes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sizes")
        .select("*")
        .eq('store_id', userStoreId!)
        .order("name", { ascending: true });

      if (error) throw error;
      setSizes(data || []);
    } catch (error: any) {
      console.error("Error fetching sizes:", error);
      toast.error("Error al cargar tamaños: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    if (!userStoreId) {
      toast.error("Debes tener una tienda asignada para crear tamaños.");
      return;
    }
    setEditingSize(null);
    setFormData({
      name: "",
      multiplier: "1.0",
    });
    setSizeDialogIsOpen(true);
  };

  const openEditDialog = (size: Size) => {
    setEditingSize(size);
    setFormData({
      name: size.name,
      multiplier: size.multiplier.toString(),
    });
    setSizeDialogIsOpen(true);
  };

  const handleSaveSize = async () => {
    if (!formData.name || !formData.multiplier) {
      toast.error("Nombre y multiplicador son obligatorios.");
      return;
    }
    if (isNaN(parseFloat(formData.multiplier)) || parseFloat(formData.multiplier) <= 0) {
      toast.error("El multiplicador debe ser un número positivo.");
      return;
    }
    if (!userStoreId) {
      toast.error("No se pudo determinar la tienda para este tamaño.");
      return;
    }

    setIsProcessing(true);
    try {
      const sizeData = {
        name: formData.name.trim(),
        multiplier: parseFloat(formData.multiplier),
        store_id: userStoreId,
      };

      if (editingSize) {
        // Update existing size
        const { error } = await supabase
          .from("sizes")
          .update(sizeData)
          .eq("id", editingSize.id);

        if (error) throw error;
        toast.success("Tamaño actualizado correctamente.");
      } else {
        // Create new size
        const { error } = await supabase
          .from("sizes")
          .insert([sizeData]);

        if (error) throw error;
        toast.success("Tamaño creado correctamente.");
      }

      setSizeDialogIsOpen(false);
      fetchSizes();
    } catch (error: any) {
      console.error("Error saving size:", error);
      toast.error("Error al guardar tamaño: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSize = async (size: Size) => {
    if (!confirm(`¿Estás seguro de eliminar el tamaño "${size.name}"?`)) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("sizes")
        .delete()
        .eq("id", size.id);

      if (error) throw error;
      toast.success("Tamaño eliminado correctamente.");
      fetchSizes();
    } catch (error: any) {
      console.error("Error deleting size:", error);
      toast.error("Error al eliminar tamaño: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredSizes = sizes.filter(size =>
    size.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Gestión de Tamaños</h2>
        <p className="text-muted-foreground">
          Define los diferentes tamaños de productos y sus multiplicadores de precio.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar tamaño..."
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
          Nuevo Tamaño
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando tamaños...</p>
        </div>
      ) : filteredSizes.length === 0 ? (
        <Card className="glass-card shadow-card">
          <CardContent className="text-center py-12">
            <Ruler className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay tamaños definidos</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "No se encontraron tamaños con la búsqueda aplicada"
                : "Comienza creando tu primer tamaño de producto"}
            </p>
            {!searchQuery && (
              <Button onClick={openCreateDialog} className="gradient-primary" disabled={!userStoreId}>
                <Plus className="mr-2 w-4 h-4" />
                Crear Primer Tamaño
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card shadow-card">
          <CardHeader>
            <CardTitle>Lista de Tamaños</CardTitle>
            <CardDescription>Gestiona los tamaños disponibles para tus productos.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Multiplicador de Precio</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSizes.map((size) => (
                    <TableRow key={size.id}>
                      <TableCell className="font-medium">{size.name}</TableCell>
                      <TableCell>{size.multiplier.toFixed(2)}x</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-accent hover:bg-accent/10"
                            onClick={() => openEditDialog(size)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteSize(size)}
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

      {/* Create/Edit Size Dialog */}
      <Dialog open={sizeDialogIsOpen} onOpenChange={setSizeDialogIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSize ? "Editar Tamaño" : "Nuevo Tamaño"}
            </DialogTitle>
            <DialogDescription>
              {editingSize
                ? "Actualiza la información del tamaño."
                : "Define un nuevo tamaño para tus productos."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveSize(); }} className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Nombre del Tamaño *</Label>
              <Input
                id="name"
                placeholder="Ej: Pequeño, Mediano, Grande"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label htmlFor="multiplier">Multiplicador de Precio *</Label>
              <Input
                id="multiplier"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="Ej: 0.8 (para pequeño), 1.0 (para mediano), 1.3 (para grande)"
                value={formData.multiplier}
                onChange={(e) => setFormData({ ...formData, multiplier: e.target.value })}
                className="mt-2"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Un multiplicador de 1.0 significa el precio base del producto.
              </p>
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSizeDialogIsOpen(false)}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || !formData.name || !formData.multiplier}
                className="gradient-primary"
              >
                {isProcessing ? "Guardando..." : editingSize ? "Actualizar Tamaño" : "Crear Tamaño"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}