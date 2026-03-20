import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { formatCurrency } from "@/lib/formatters";

export const InventoryManagement = () => {
    const { storeId } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    // Form State
    const [name, setName] = useState("");
    const [sku, setSku] = useState("");
    const [unitOfMeasure, setUnitOfMeasure] = useState("");
    const [stock, setStock] = useState<number>(0);
    const [minStock, setMinStock] = useState<number>(0);
    const [costPerUnit, setCostPerUnit] = useState<number>(0);

    const { data: inventoryItems, isLoading } = useQuery({
        queryKey: ['inventory_items', storeId],
        queryFn: async () => {
            if (!storeId) return [];
            const { data, error } = await (supabase as any)
                .from('inventory_items')
                .select('*')
                .eq('store_id', storeId)
                .order('name');

            if (error) throw error;
            return data;
        },
        enabled: !!storeId
    });

    const saveMutation = useMutation({
        mutationFn: async (item: any) => {
            if (editingItem) {
                const { error } = await supabase
                    .from('inventory_items')
                    .update(item)
                    .eq('id', editingItem.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('inventory_items')
                    .insert([{ ...item, store_id: storeId }]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
            toast({ title: "Éxito", description: "Insumo guardado correctamente." });
            handleClose();
        },
        onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('inventory_items')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
            toast({ title: "Éxito", description: "Insumo eliminado." });
        }
    });

    const handleOpenEdit = (item: any) => {
        setEditingItem(item);
        setName(item.name);
        setSku(item.sku || "");
        setUnitOfMeasure(item.unit_of_measure);
        setStock(item.stock);
        setMinStock(item.min_stock || 0);
        setCostPerUnit(item.cost_per_unit || 0);
        setIsOpen(true);
    };

    const handleClose = () => {
        setIsOpen(false);
        setEditingItem(null);
        setName("");
        setSku("");
        setUnitOfMeasure("");
        setStock(0);
        setMinStock(0);
        setCostPerUnit(0);
    };

    const handleSave = () => {
        if (!name || !unitOfMeasure) {
            toast({ title: "Error", description: "Faltan requeridos", variant: "destructive" });
            return;
        }
        saveMutation.mutate({
            name,
            sku: sku || null,
            unit_of_measure: unitOfMeasure,
            stock,
            min_stock: minStock,
            cost_per_unit: costPerUnit
        });
    };

    return (
        <Layout>
            <div className="p-6 md:p-8 space-y-6 md:space-y-8">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                            Materia Prima e Insumos
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Gestiona el catálogo base para construir tus recetas.
                        </p>
                    </div>

                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={handleClose} className="rounded-full shadow-sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Nuevo Insumo
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>{editingItem ? 'Editar Insumo' : 'Crear Insumo'}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label>Nombre del Insumo</Label>
                                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Leche Entera" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>SKU / Código</Label>
                                        <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="OPCIONAL" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Unidad de Medida</Label>
                                        <Input value={unitOfMeasure} onChange={(e) => setUnitOfMeasure(e.target.value)} placeholder="Ej. ml, gr, und" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Inventario Actual</Label>
                                        <Input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Stock Mínimo (Alerta)</Label>
                                        <Input type="number" value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Costo por Unidad ($)</Label>
                                    <Input type="number" value={costPerUnit} onChange={(e) => setCostPerUnit(Number(e.target.value))} />
                                </div>
                                <Button onClick={handleSave} className="w-full" disabled={saveMutation.isPending}>
                                    Guardar
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50/50">
                            <TableRow>
                                <TableHead>Insumo</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Stock / Medida</TableHead>
                                <TableHead>Costo U.</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8">Cargando...</TableCell></TableRow>
                            ) : inventoryItems?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                                        <Tag className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                        No hay insumos registrados
                                    </TableCell>
                                </TableRow>
                            ) : (
                                inventoryItems?.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <TableCell className="font-medium text-gray-900">{item.name}</TableCell>
                                        <TableCell className="text-gray-500">{item.sku || '-'}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.stock <= (item.min_stock || 0) ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                {item.stock} {item.unit_of_measure}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-gray-600">${item.cost_per_unit}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)}>
                                                <Pencil className="h-4 w-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                if (confirm('¿Eliminar insumo?')) deleteMutation.mutate(item.id);
                                            }}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </Layout>
    );
};
