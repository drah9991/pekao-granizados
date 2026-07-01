import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Save, Loader2, Beaker } from 'lucide-react';
import { toast } from 'sonner';

interface RecipeIngredient {
  inventory_item_id: string;
  quantity: number;
}

export function RecipeBuilder() {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [newItemId, setNewItemId] = useState<string>('');
  const [newQuantity, setNewQuantity] = useState<string>('');

  // Fetch products
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['products-for-recipe'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, recipe')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch inventory items
  const { data: inventoryItems, isLoading: loadingInventory } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, unit')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const updateRecipeMutation = useMutation({
    mutationFn: async ({ productId, recipe }: { productId: string, recipe: RecipeIngredient[] }) => {
      const { error } = await supabase
        .from('products')
        .update({ recipe })
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Receta guardada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['products-for-recipe'] });
    },
    onError: (error: Error) => {
      toast.error('Error al guardar la receta: ' + error.message);
    }
  });

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    const product = products?.find(p => p.id === productId);
    if (product && product.recipe && Array.isArray(product.recipe)) {
      setIngredients(product.recipe);
    } else {
      setIngredients([]);
    }
    setNewItemId('');
    setNewQuantity('');
  };

  const handleAddIngredient = () => {
    if (!newItemId || !newQuantity || isNaN(Number(newQuantity)) || Number(newQuantity) <= 0) {
      toast.error('Por favor selecciona un ingrediente y una cantidad válida.');
      return;
    }

    if (ingredients.some(i => i.inventory_item_id === newItemId)) {
      toast.error('El ingrediente ya está en la receta.');
      return;
    }

    setIngredients([
      ...ingredients,
      { inventory_item_id: newItemId, quantity: Number(newQuantity) }
    ]);
    setNewItemId('');
    setNewQuantity('');
  };

  const handleRemoveIngredient = (id: string) => {
    setIngredients(ingredients.filter(i => i.inventory_item_id !== id));
  };

  const handleSaveRecipe = () => {
    if (!selectedProductId) return;
    updateRecipeMutation.mutate({ productId: selectedProductId, recipe: ingredients });
  };

  const getInventoryItemDetails = (id: string) => {
    return inventoryItems?.find(i => i.id === id);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-sm">
      <CardHeader className="bg-muted/30 border-b">
        <CardTitle className="text-2xl flex items-center gap-2">
          <Beaker className="h-6 w-6 text-primary" />
          Constructor de Recetas
        </CardTitle>
        <CardDescription>
          Configura los ingredientes y cantidades necesarias para crear cada producto.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-6 space-y-8">
        {/* Selector de Producto */}
        <div className="space-y-3">
          <Label htmlFor="product-select" className="text-base font-semibold">Producto</Label>
          <Select 
            value={selectedProductId || undefined} 
            onValueChange={handleProductSelect}
            disabled={loadingProducts}
          >
            <SelectTrigger id="product-select" className="w-full md:w-[400px]">
              <SelectValue placeholder="Selecciona un producto para editar su receta" />
            </SelectTrigger>
            <SelectContent>
              {products?.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProductId && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="p-4 bg-muted/20 border-b flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2 w-full">
                  <Label>Ingrediente / Insumo</Label>
                  <Select value={newItemId} onValueChange={setNewItemId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar insumo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryItems?.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} ({item.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full md:w-32 space-y-2">
                  <Label>Cantidad</Label>
                  <Input 
                    type="number" 
                    min="0.01" 
                    step="0.01"
                    placeholder="Ej. 1.5" 
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleAddIngredient} 
                  variant="secondary"
                  className="w-full md:w-auto flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Agregar
                </Button>
              </div>

              {/* Lista de ingredientes */}
              {ingredients.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingrediente</TableHead>
                      <TableHead>Cantidad Requerida</TableHead>
                      <TableHead className="w-[100px] text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ingredients.map((ing) => {
                      const itemDetail = getInventoryItemDetails(ing.inventory_item_id);
                      return (
                        <TableRow key={ing.inventory_item_id}>
                          <TableCell className="font-medium">
                            {itemDetail?.name || 'Cargando...'}
                          </TableCell>
                          <TableCell>
                            {ing.quantity} {itemDetail?.unit}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleRemoveIngredient(ing.inventory_item_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground border-dashed border-2 m-4 rounded-lg">
                  No hay ingredientes en esta receta.
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {selectedProductId && (
        <CardFooter className="bg-muted/20 border-t px-6 py-4 flex justify-end">
          <Button 
            onClick={handleSaveRecipe}
            disabled={updateRecipeMutation.isPending}
            className="flex items-center gap-2"
          >
            {updateRecipeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar Receta
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default RecipeBuilder;
