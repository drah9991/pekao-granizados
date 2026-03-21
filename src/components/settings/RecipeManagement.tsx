import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChefHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";

export const RecipeManagement = () => {
    const { storeId } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

    // Recipe Form State
    const [isAddingIngredient, setIsAddingIngredient] = useState(false);
    const [selectedInventoryItem, setSelectedInventoryItem] = useState<string>("");
    const [qtyRequired, setQtyRequired] = useState<number>(0);

    // Fetch all products for this store
    const { data: products } = useQuery({
        queryKey: ['products', storeId],
        queryFn: async () => {
            if (!storeId) return [];
            const { data, error } = await supabase
                .from('products')
                .select('id, name')
                .eq('store_id', storeId)
                .order('name');
            if (error) throw error;
            return data;
        },
        enabled: !!storeId
    });

    // Fetch inventory available
    const { data: inventoryItems } = useQuery({
        queryKey: ['inventory_items', storeId],
        queryFn: async () => {
            if (!storeId) return [];
            const { data, error } = await (supabase as any)
                .from('inventory_items')
                // @ts-ignore - The real column in the DB is 'unit'
                .select('id, name, unit')
                .eq('store_id', storeId)
                .order('name');
            if (error) throw error;
            return data;
        },
        enabled: !!storeId
    });

    // Fetch recipes for the selected product
    const { data: recipes, isLoading: loadingRecipes } = useQuery({
        queryKey: ['recipes', selectedProduct],
        queryFn: async () => {
            if (!selectedProduct) return [];
            // we need to join with inventory_items to get the ingredient name
            const { data, error } = await (supabase as any)
                .from('recipes')
                .select(`
          id, 
          product_id, 
          inventory_item_id, 
          quantity_required,
          inventory_items (name, unit)
        `)
                .eq('product_id', selectedProduct);
            if (error) throw error;
            return data;
        },
        enabled: !!selectedProduct
    });

    const addIngredientMutation = useMutation({
        mutationFn: async (payload: { product_id: string, inventory_item_id: string, quantity_required: number }) => {
            const { error } = await (supabase as any)
                .from('recipes')
                .insert([payload]);
            if (error) {
                if (error.code === '23505') throw new Error("Este ingrediente ya es parte de la receta.");
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recipes', selectedProduct] });
            toast({ title: "Agregado", description: "Ingrediente añadido a la receta." });
            setIsAddingIngredient(false);
            setSelectedInventoryItem("");
            setQtyRequired(0);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const removeIngredientMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any)
                .from('recipes')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recipes', selectedProduct] });
            toast({ title: "Eliminado", description: "Ingrediente removido de la receta." });
        }
    });

    const handleAddIngredient = () => {
        if (!selectedProduct || !selectedInventoryItem || qtyRequired <= 0) {
            toast({ title: "Datos inválidos", description: "Selecciona un insumo y una cantidad mayor a 0", variant: "destructive" });
            return;
        }

        addIngredientMutation.mutate({
            product_id: selectedProduct,
            inventory_item_id: selectedInventoryItem,
            quantity_required: qtyRequired
        });
    };

    return (
        <Layout>
            <div className="p-6 md:p-8 space-y-6 md:space-y-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent flex items-center gap-2">
                            <ChefHat className="h-6 w-6 text-purple-600" />
                            Recetas de Productos
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Asigna qué y cuánta materia prima se descuenta al vender cada producto.
                        </p>
                    </div>

                    <div className="max-w-md">
                        <Label className="mb-2 block">Selecciona un Producto Base</Label>
                        <Select value={selectedProduct || ""} onValueChange={setSelectedProduct}>
                            <SelectTrigger>
                                <SelectValue placeholder="Ej. Granizado de Maracuyá Base" />
                            </SelectTrigger>
                            <SelectContent>
                                {products?.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {selectedProduct && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-semibold text-gray-800">Fórmula de Descuento</h3>
                            <Dialog open={isAddingIngredient} onOpenChange={setIsAddingIngredient}>
                                <DialogTrigger asChild>
                                    <Button size="sm">
                                        <Plus className="h-4 w-4 mr-1" /> Agregar Insumo
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-sm">
                                    <DialogHeader>
                                        <DialogTitle>Añadir a la receta</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <Label>Insumo / Materia Prima</Label>
                                            <Select value={selectedInventoryItem} onValueChange={setSelectedInventoryItem}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccione insumo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {inventoryItems?.map(inv => (
                                                        <SelectItem key={inv.id} value={inv.id}>
                                                            {inv.name} ({(inv as any).unit || (inv as any).unit_of_measure})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Cantidad a descontar</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={qtyRequired || ""}
                                                onChange={(e) => setQtyRequired(Number(e.target.value))}
                                                placeholder="Ej. 1.5, 250"
                                            />
                                            <p className="text-xs text-gray-500">
                                                Unidades usadas por cada venta.
                                            </p>
                                        </div>
                                        <Button onClick={handleAddIngredient} className="w-full" disabled={addIngredientMutation.isPending}>
                                            Añadir a Fórmula
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ingrediente (Insumo)</TableHead>
                                    <TableHead>Cantidad Requerida</TableHead>
                                    <TableHead className="text-right">Remover</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingRecipes ? (
                                    <TableRow><TableCell colSpan={3} className="text-center py-4">Cargando receta...</TableCell></TableRow>
                                ) : recipes?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                                            Este producto no tiene receta (no descontará insumos).
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    recipes?.map((row: any) => (
                                        <TableRow key={row.id}>
                                            <TableCell className="font-medium text-gray-800">
                                                {row.inventory_items?.name || "Desconocido"}
                                            </TableCell>
                                            <TableCell>
                                                {row.quantity_required} {(row.inventory_items as any)?.unit || (row.inventory_items as any)?.unit_of_measure}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => removeIngredientMutation.mutate(row.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </Layout>
    );
};
