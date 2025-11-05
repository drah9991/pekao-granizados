import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Tag, Code } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables, Enums } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";

type SkuAcronym = Tables<'sku_acronyms'>;
type ProductType = Enums<'product_type'>;

export default function SkuAcronymsSettings() {
  const { userRole, isLoading: isLoadingAuth } = useAuth();
  const [acronyms, setAcronyms] = useState<SkuAcronym[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [acronymDialogIsOpen, setAcronymDialogIsOpen] = useState(false);
  const [editingAcronym, setEditingAcronym] = useState<SkuAcronym | null>(null);
  const [formData, setFormData] = useState({
    type: "" as ProductType | "",
    code: "",
    description: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchAcronyms();
  }, []);

  const fetchAcronyms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sku_acronyms")
        .select("*")
        .order("type", { ascending: true });

      if (error) throw error;
      setAcronyms(data || []);
    } catch (error: any) {
      console.error("Error fetching SKU acronyms:", error);
      toast.error("Error al cargar acrónimos SKU: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingAcronym(null);
    setFormData({
      type: "",
      code: "",
      description: "",
    });
    setAcronymDialogIsOpen(true);
  };

  const openEditDialog = (acronym: SkuAcronym) => {
    setEditingAcronym(acronym);
    setFormData({
      type: acronym.type as ProductType,
      code: acronym.code,
      description: acronym.description || "",
    });
    setAcronymDialogIsOpen(true);
  };

  const handleSaveAcronym = async () => {
    if (!formData.type || !formData.code) {
      toast.error("Tipo y Código son obligatorios.");
      return;
    }

    setIsProcessing(true);
    try {
      const acronymData = {
        type: formData.type,
        code: formData.code.toUpperCase().trim(),
        description: formData.description.trim() || null,
      };

      if (editingAcronym) {
        // Update existing acronym
        const { error } = await supabase
          .from("sku_acronyms")
          .update(acronymData)
          .eq("id", editingAcronym.id);

        if (error) throw error;
        toast.success("Acrónimo SKU actualizado correctamente.");
      } else {
        // Create new acronym
        const { error } = await supabase
          .from("sku_acronyms")
          .insert([acronymData]);

        if (error) throw error;
        toast.success("Acrónimo SKU creado correctamente.");
      }

      setAcronymDialogIsOpen(false);
      fetchAcronyms();
    } catch (error: any) {
      console.error("Error saving SKU acronym:", error);
      toast.error("Error al guardar acrónimo SKU: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAcronym = async (acronym: SkuAcronym) => {
    if (!canManageSkuAcronyms) {
      toast.error("No tienes permiso para eliminar acrónimos SKU.");
      return;
    }
    if (!confirm(`¿Estás seguro de eliminar el acrónimo "${acronym.code}" para el tipo "${acronym.type}"?`)) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("sku_acronyms")
        .delete()
        .eq("id", acronym.id);

      if (error) throw error;
      toast.success("Acrónimo SKU eliminado correctamente.");
      fetchAcronyms();
    } catch (error: any) {
      console.error("Error deleting SKU acronym:", error);
      toast.error("Error al eliminar acrónimo SKU: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const canManageSkuAcronyms = userRole === "admin" || userRole === "store_manager";

  const filteredAcronyms = acronyms.filter(acronym =>
    acronym.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acronym.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acronym.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Maestro de Acrónimos SKU</h2>
        <p className="text-muted-foreground">
          Define y gestiona los códigos cortos para los tipos de productos que se usarán en los SKUs.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por tipo o código..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          className="gradient-primary shadow-glow w-full md:w-auto"
          onClick={openCreateDialog}
          disabled={!canManageSkuAcronyms}
        >
          <Plus className="mr-2 w-5 h-5" />
          Nuevo Acrónimo
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando acrónimos SKU...</p>
        </div>
      ) : filteredAcronyms.length === 0 ? (
        <Card className="glass-card shadow-card">
          <CardContent className="text-center py-12">
            <Code className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay acrónimos SKU definidos</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "No se encontraron acrónimos con la búsqueda aplicada"
                : "Comienza creando tu primer acrónimo SKU"}
            </p>
            {!searchQuery && (
              <Button onClick={openCreateDialog} className="gradient-primary" disabled={!canManageSkuAcronyms}>
                <Plus className="mr-2 w-4 h-4" />
                Crear Primer Acrónimo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card shadow-card">
          <CardHeader>
            <CardTitle>Lista de Acrónimos SKU</CardTitle>
            <CardDescription>Gestiona los códigos cortos para los tipos de productos.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de Producto</TableHead>
                    <TableHead>Código SKU</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAcronyms.map((acronym) => (
                    <TableRow key={acronym.id}>
                      <TableCell className="font-medium">{acronym.type}</TableCell>
                      <TableCell className="font-mono text-primary">{acronym.code}</TableCell>
                      <TableCell>{acronym.description || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-accent hover:bg-accent/10"
                            onClick={() => openEditDialog(acronym)}
                            disabled={!canManageSkuAcronyms}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteAcronym(acronym)}
                            disabled={!canManageSkuAcronyms}
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

      {/* Create/Edit Acronym Dialog */}
      <Dialog open={acronymDialogIsOpen} onOpenChange={setAcronymDialogIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAcronym ? "Editar Acrónimo SKU" : "Nuevo Acrónimo SKU"}
            </DialogTitle>
            <DialogDescription>
              {editingAcronym
                ? "Actualiza la información del acrónimo SKU."
                : "Define un nuevo código corto para un tipo de producto."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveAcronym(); }} className="space-y-4 py-4">
            <div>
              <Label htmlFor="type">Tipo de Producto *</Label>
              <Input
                id="type"
                placeholder="Ej: granizado, topping, sachet, sweet"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="mt-2"
                required
                disabled={!!editingAcronym} {/* Type should not be editable after creation */}
              />
            </div>
            <div>
              <Label htmlFor="code">Código SKU (3-4 letras) *</Label>
              <Input
                id="code"
                placeholder="Ej: GRN, TOP"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="mt-2"
                maxLength={4}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Input
                id="description"
                placeholder="Ej: Acrónimo para Granizados"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-2"
              />
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAcronymDialogIsOpen(false)}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || !formData.type || !formData.code}
                className="gradient-primary"
              >
                {isProcessing ? "Guardando..." : editingAcronym ? "Actualizar Acrónimo" : "Crear Acrónimo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}