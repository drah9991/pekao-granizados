import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Cherry, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { formatCurrency } from "@/lib/formatters"; // Import the formatter

type Topping = Tables<'toppings'>;

export default function ToppingsSettings() {
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userStoreId, setUserStoreId] = useState<string | null>(null);

  // Dialog states
  const [toppingDialogIsOpen, setToppingDialogIsOpen] = useState(false);
  const [editingTopping, setEditingTopping] = useState<Topping | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "0.00",
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchUserStoreId();
  }, []);

  useEffect(() => {
    if (userStoreId) {
      fetchToppings();
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
        toast.warning("No se encontró un ID de tienda para el usuario. No podrás gestionar toppings.");
      }
    } catch (error: any) {
      console.error("Error fetching user's store ID:", error);
      toast.error("Error al obtener ID de tienda: " + error.message);
    }
  };

  const fetchToppings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("toppings")
        .select("*")
        .eq('store_id', userStoreId!)
        .order("name", { ascending: true });

      if (error) throw error;
      setToppings(data || []);
    } catch (error: any) {
      console.error("Error fetching toppings:", error);
      toast.error("Error al cargar toppings: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    if (!userStoreId) {
      toast.error("Debes tener una tienda asignada para crear toppings.");
      return;
    }
    setEditingTopping(null);
    setFormData({
      name: "",
      price: "0.00",
    });
    setToppingDialogIsOpen(true);
  };

  const openEditDialog = (topping: Topping) => {
    setEditingTopping(topping);
    setFormData({
      name: topping.name,
      price: topping.price?.toString() || "0.00",
    });
    setToppingDialogIsOpen(true);
  };

  const handleSaveTopping = async () => {
    if (!formData.name || isNaN(parseFloat(formData.price))) {
      toast.error("Nombre y precio son obligatorios y el precio debe ser un número.");
      return;
    }
    if (!userStoreId) {
      toast.error("No se pudo determinar la tienda para este topping.");
      return;
    }

    setIsProcessing(true);
    try {
      const toppingData = {
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        store_id: userStoreId,
      };

      if (editingTopping) {
        // Update existing topping
        const { error } = await supabase
          .from("toppings")
          .update(toppingData)
          .eq("id", editingTopping.id);

        if (error) throw error;
        toast.success("Topping actualizado correctamente.");
      } else {
        // Create new topping
        const { error } = await supabase
          .from("toppings")
          .insert([toppingData]);

        if (error) throw error;
        toast.success("Topping creado correctamente.");
      }

      setToppingDialogIsOpen(false);
      fetchToppings();
    } catch (error: any) {
      console.error("Error saving topping:", error);
      toast.error("Error al guardar topping: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteTopping = async (topping: Topping) => {
    if (!confirm(`¿Estás seguro de eliminar el topping "${topping.name}"?`)) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("toppings")
        .delete()
        .eq("id", topping.id);

      if (error) throw error;
      toast.success("Topping eliminado correctamente.");
      fetchToppings();
    } catch (error: any) {
      console.error("Error deleting topping:", error);
      toast.error("Error al eliminar topping: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredToppings = toppings.filter(topping =>
    topping.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Gestión de Toppings</h2>
        <p className="text-muted-foreground">
          Define los toppings adicionales disponibles para tus productos.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar topping..."
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
          Nuevo Topping
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando toppings...</p>
        </div>
      ) : filteredToppings.length === 0 ? (
        <Card className="glass-card shadow-card">
          <CardContent className="text-center py-12">
            <Cherry className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay toppings definidos</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "No se encontraron toppings con la búsqueda aplicada"
                : "Comienza creando tu primer topping"}
            </p>
            {!searchQuery && (
              <Button onClick={openCreateDialog} className="gradient-primary" disabled={!userStoreId}>
                <Plus className="mr-2 w-4 h-4" />
                Crear Primer Topping
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card shadow-card">
          <CardHeader>
            <CardTitle>Lista de Toppings</CardTitle>
            <CardDescription>Gestiona los toppings disponibles para tus productos.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Precio Adicional</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredToppings.map((topping) => (
                    <TableRow key={topping.id}>
                      <TableCell className="font-medium">{topping.name}</TableCell>
                      <TableCell>{formatCurrency(topping.price || 0)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-accent hover:bg-accent/10"
                            onClick={() => openEditDialog(topping)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteTopping(topping)}
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

      {/* Create/Edit Topping Dialog */}
      <Dialog open={toppingDialogIsOpen} onOpenChange={setToppingDialogIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTopping ? "Editar Topping" : "Nuevo Topping"}
            </DialogTitle>
            <DialogDescription>
              {editingTopping
                ? "Actualiza la información del topping."
                : "Define un nuevo topping adicional."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveTopping(); }} className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Nombre del Topping *</Label>
              <Input
                id="name"
                placeholder="Ej: Leche Condensada, Fruta Extra"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2"
                required
              />
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
                onClick={() => setToppingDialogIsOpen(false)}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || !formData.name || isNaN(parseFloat(formData.price))}
                className="gradient-primary"
              >
                {isProcessing ? "Guardando..." : editingTopping ? "Actualizar Topping" : "Crear Topping"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}