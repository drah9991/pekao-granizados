import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, Beaker, Box, AlertTriangle, ArrowUpRight, ArrowDownRight, Plus, Pencil, Trash2 } from "lucide-react";
import Layout from "@/components/Layout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCOP } from "@/lib/currency";

export const InventoryManagement = () => {
    const { storeId } = useAuth();
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
    const [isMixture, setIsMixture] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

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
                const { error } = await (supabase as any)
                    .from('inventory_items')
                    .update(item)
                    .eq('id', editingItem.id);
                if (error) throw error;
            } else {
                const { error } = await (supabase as any)
                    .from('inventory_items')
                    .insert([{ ...item, store_id: storeId }]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
            toast.success("Insumo guardado correctamente.");
            handleClose();
        },
        onError: (error: any) => {
            toast.error("Error: " + error.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any)
                .from('inventory_items')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
            toast.success("Insumo eliminado.");
        }
    });

    const handleOpenEdit = (item: any) => {
        setEditingItem(item);
        setName(item.name);
        setSku(item.sku || "");
        setUnitOfMeasure((item as any).unit || item.unit_of_measure || "");
        setStock(item.stock);
        setMinStock(item.min_stock || 0);
        setCostPerUnit(item.cost_per_unit || 0);
        setIsMixture(item.is_mixture || false);
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
        setIsMixture(false);
    };

    const handleSave = () => {
        if (!name || !unitOfMeasure) {
            toast.error("Faltan campos requeridos");
            return;
        }
        saveMutation.mutate({
            name,
            sku: sku || null,
            // @ts-ignore
            unit: unitOfMeasure,
            stock,
            min_stock: minStock,
            cost_per_unit: costPerUnit,
            is_mixture: isMixture
        });
    };

    const filteredItems = inventoryItems?.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout>
            <div className="space-y-6 p-6 md:p-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
                            Materia Prima e Insumos
                        </h1>
                        <p className="text-muted-foreground">Gestiona el catálogo base para tus recetas y granizados</p>
                    </div>
                    
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={handleClose} className="gradient-primary shadow-glow">
                                <Plus className="h-4 w-4 mr-2" />
                                Nuevo Insumo
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto custom-scrollbar">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold">{editingItem ? 'Editar Insumo' : 'Crear Insumo'}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label className="font-semibold">Nombre del Insumo</Label>
                                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Leche Entera" />
                                </div>

                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border">
                                    <div className="space-y-0.5">
                                        <Label className="font-bold">¿Es una Mezcla?</Label>
                                        <p className="text-[10px] text-muted-foreground">Activa esto para registrar producciones de granizados</p>
                                    </div>
                                    <Switch checked={isMixture} onCheckedChange={setIsMixture} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="font-semibold">SKU / Código</Label>
                                        <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="OPCIONAL" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-semibold">Unidad de Medida</Label>
                                        <Input value={unitOfMeasure} onChange={(e) => setUnitOfMeasure(e.target.value)} placeholder="Ej. ml, gr, un" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="font-semibold">Inventario Actual</Label>
                                        <Input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-semibold">Alerta Stock Bajo</Label>
                                        <Input type="number" value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-semibold">Costo por Unidad ($)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input 
                                            type="number" 
                                            value={costPerUnit} 
                                            onChange={(e) => setCostPerUnit(Number(e.target.value))} 
                                            className="pl-7 font-bold"
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleSave} className="w-full gradient-primary shadow-glow h-12 text-base font-bold" disabled={saveMutation.isPending}>
                                    {editingItem ? 'Actualizar Insumo' : 'Guardar Insumo'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar por nombre o SKU..." 
                        className="pl-10 bg-card shadow-sm border-border/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="py-4 pl-6">Insumo</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Inventario / Medida</TableHead>
                                <TableHead>Costo Unitario</TableHead>
                                <TableHead className="text-right pr-6">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-12">Cargando catálogo...</TableCell></TableRow>
                            ) : filteredItems?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">
                                        No hay insumos registrados
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredItems?.map((item) => {
                                    const isLow = item.stock <= (item.min_stock || 0);
                                    const unit = (item as any).unit || item.unit_of_measure;
                                    const displayStock = (item.is_mixture && unit === 'ml') 
                                        ? `${(item.stock / 1000).toFixed(1)} L` 
                                        : `${item.stock} ${unit}`;

                                    return (
                                        <TableRow key={item.id} className="hover:bg-muted/10 transition-colors">
                                            <TableCell className="py-4 pl-6 font-bold">
                                                <div className="flex items-center gap-2">
                                                    {item.is_mixture ? <Beaker className="w-4 h-4 text-primary" /> : <Box className="w-4 h-4 text-muted-foreground" />}
                                                    {item.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] font-mono">{item.sku || '-'}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={isLow ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}>
                                                    {isLow && <AlertTriangle className="w-3 h-3 mr-1" />}
                                                    {displayStock}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-600">{formatCOP(item.cost_per_unit || 0)}</TableCell>
                                            <TableCell className="text-right pr-6 space-x-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="hover:text-primary">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => {
                                                    if (confirm('¿Eliminar insumo?')) deleteMutation.mutate(item.id);
                                                }} className="hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </Layout>
    );
};
