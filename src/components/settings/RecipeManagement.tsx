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
    const [selectedProductType, setSelectedProductType] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

    // Recipe Form State
    const [isAddingIngredient, setIsAddingIngredient] = useState(false);
    const [selectedInventoryItem, setSelectedInventoryItem] = useState<string>("");
    const [qtyRequired, setQtyRequired] = useState<number>(0);

    // Fetch product types config
    const { data: productTypes } = useQuery({
        queryKey: ['product_types_config'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('product_types_config')
                .select('*')
                .eq('active', true)
                .order('code');
            if (error) throw error;
            return data;
        },
        staleTime: 5 * 60_000, // 5 min — tipos de producto, rara vez cambian
    });

    // Fetch all products for this store
    const { data: products } = useQuery({
        queryKey: ['products', storeId],
        queryFn: async () => {
            if (!storeId) return [];
            const { data, error } = await supabase
                .from('products')
                .select('id, name, type')
                .eq('store_id', storeId)
                .eq('active', true)
                .order('name');
            if (error) throw error;
            return data;
        },
        enabled: !!storeId,
        staleTime: 30_000, // 30s — panel admin, cambios moderados
    });

    // Fetch inventory available
    const { data: inventoryItems } = useQuery({
        queryKey: ['inventory_items', storeId],
        queryFn: async () => {
            if (!storeId) return [];
            const { data, error } = await supabase
                .from('inventory_items')
                // @ts-expect-error - The real column in the DB is 'unit'
                .select('id, name, unit')
                .eq('store_id', storeId)
                .order('name');
            if (error) throw error;
            return data;
        },
        enabled: !!storeId,
        staleTime: 30_000, // 30s — panel admin
    });

    // Fetch recipes for the selected product
    const { data: recipes, isLoading: loadingRecipes } = useQuery({
        queryKey: ['recipes', selectedProduct],
        queryFn: async () => {
            if (!selectedProduct) return [];
            // we need to join with inventory_items to get the ingredient name
            const { data, error } = await supabase
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
        enabled: !!selectedProduct,
        staleTime: 30_000, // 30s — panel admin
    });

    const addIngredientMutation = useMutation({
        mutationFn: async (payload: { product_id: string, inventory_item_id: string, quantity_required: number }) => {
            const { error } = await supabase
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
            const { error } = await supabase
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

    const filteredProducts = products?.filter(p => p.type === selectedProductType) || [];
    const selectedTypeConfig = productTypes?.find(t => t.code === selectedProductType);

    return (
        <Layout>
            <div className="p-6 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-500">
                <div className="bg-card/50 backdrop-blur-sm p-6 rounded-2xl shadow-elevated border-2 border-border/50 space-y-6">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight bg-gradient-hero bg-clip-text text-transparent flex items-center gap-3">
                            <ChefHat className="h-8 w-8 text-primary" />
                            Recetas de Productos
                        </h2>
                        <p className="text-sm font-medium text-muted-foreground mt-1">
                            Asigna qué y cuánta materia prima se descuenta al vender cada producto.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="block font-bold">1. Categoría de Producto</Label>
                            <Select 
                                value={selectedProductType || ""} 
                                onValueChange={(val) => {
                                    setSelectedProductType(val);
                                    setSelectedProduct(null); // Reset product when type changes
                                }}
                            >
                                <SelectTrigger className="h-12 rounded-xl bg-white/5 border-2 border-border focus:border-primary/50 font-bold">
                                    <SelectValue placeholder="Ej. Granizado, Topping..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {productTypes?.map((t: Record<string, unknown>) => (
                                        <SelectItem key={t.code as string} value={t.code as string}>
                                            <div className="flex items-center gap-2">
                                                <span>{t.emoji_icon as string}</span>
                                                {t.label as string}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="block font-bold">2. Producto Específico</Label>
                            <Select 
                                value={selectedProduct || ""} 
                                onValueChange={setSelectedProduct}
                                disabled={!selectedProductType}
                            >
                                <SelectTrigger className="h-12 rounded-xl bg-white/5 border-2 border-border focus:border-primary/50 font-bold">
                                    <SelectValue placeholder={selectedProductType ? "Selecciona el producto..." : "Primero elige una categoría"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredProducts.length > 0 ? (
                                        filteredProducts.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))
                                    ) : (
                                        <div className="p-2 text-sm text-muted-foreground italic text-center">No hay productos activos</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {selectedProduct && selectedTypeConfig && (
                    <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-5 animate-in fade-in slide-in-from-top-2">
                        <div className="flex gap-4 items-start">
                           <span className="text-3xl filter drop-shadow-md">{selectedTypeConfig.emoji_icon}</span>
                           <div className="space-y-1">
                               <h4 className="font-black tracking-wide text-primary">
                                    Lógica de Descuento: {selectedTypeConfig.sales_mode === 'sizes' ? 'VOLUMÉTRICO (POR TAMAÑOS)' : 'UNIDAD DIRECTA (1 A 1)'}
                               </h4>
                               <p className="text-sm font-medium text-foreground/80 leading-relaxed">
                                   {selectedTypeConfig.sales_mode === 'sizes' 
                                     ? "El POS multiplicará la Cantidad Requerida que definas aquí por el tamaño del vaso (Onzas/Multiplicador del tamaño). Es decir, estás formulando la base para la medida unitaria (Ej: para 1 oz)."
                                     : "Este producto se vende por unidad. El POS descontará exactamente la cantidad que definas aquí por cada vez que se agregue al carrito, independientemente de los tamaños de otros productos."}
                               </p>
                           </div>
                        </div>
                    </div>
                )}

                {selectedProduct && (
                    <div className="bg-card/50 backdrop-blur-sm rounded-2xl shadow-elevated border-2 border-border/50 overflow-hidden">
                        <div className="p-5 border-b-2 border-border/50 flex justify-between items-center bg-primary/5">
                            <h3 className="font-bold text-foreground">Fórmula de Descuento</h3>
                            <Dialog open={isAddingIngredient} onOpenChange={setIsAddingIngredient}>
                                <DialogTrigger asChild>
                                    <Button size="sm">
                                        <Plus className="h-4 w-4 mr-1" /> Agregar Insumo
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-sm max-h-[90dvh] overflow-y-auto custom-scrollbar">
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
                                                            {inv.name} ({inv.unit || ""})
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
                                            <p className="text-xs text-muted-foreground">
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
                                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground font-medium">
                                            Este producto no tiene receta (no descontará insumos).
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    recipes?.map((row: Record<string, unknown>) => (
                                        <TableRow key={row.id}>
                                            <TableCell className="font-bold text-foreground">
                                                {((row.inventory_items as Record<string, unknown>)?.name as string) || "Desconocido"}
                                            </TableCell>
                                            <TableCell className="font-medium text-foreground/80">
                                                {row.quantity_required as number} {((row.inventory_items as Record<string, unknown>)?.unit as string) || ""}
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
