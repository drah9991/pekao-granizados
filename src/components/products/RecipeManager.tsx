import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Beaker, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
}

interface RecipeItem {
  inventory_item_id: string;
  quantity_oz: number;
  name?: string;
  unit?: string;
}

interface RecipeManagerProps {
  recipe: RecipeItem[];
  onChange: (recipe: RecipeItem[]) => void;
  storeId: string | null;
}

const OZ_TO_ML = 29.57;

export default function RecipeManager({ recipe, onChange, storeId }: RecipeManagerProps) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [qtyOz, setQtyOz] = useState<string>("");
  const [selectedUnit, setSelectedUnit] = useState<string>("oz");

  const inventoryMap = useMemo(() => {
    return new Map(inventoryItems.map((item) => [item.id, item]));
  }, [inventoryItems]);

  useEffect(() => {
    if (storeId) {
      fetchInventoryItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const fetchInventoryItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, unit")
        .eq("store_id", storeId);

      if (error) throw error;
      setInventoryItems(data || []);
    } catch (error: any) {
      console.error("Error fetching inventory items:", error);
      toast.error("Error al cargar insumos");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!selectedItem || !qtyOz || parseFloat(qtyOz) <= 0) {
      toast.error("Selecciona un insumo y una cantidad válida");
      return;
    }

    const item = inventoryMap.get(selectedItem);
    if (!item) return;

    // Check if already in recipe
    if (recipe.some((r) => r.inventory_item_id === selectedItem)) {
      toast.error("Este insumo ya está en la receta");
      return;
    }

    const newItem: RecipeItem = {
      inventory_item_id: selectedItem,
      quantity_oz: parseFloat(qtyOz),
      name: item.name,
      unit: selectedUnit,
    };

    onChange([...recipe, newItem]);
    setSelectedItem("");
    setQtyOz("");
  };

  const handleRemoveItem = (id: string) => {
    onChange(recipe.filter((item) => item.inventory_item_id !== id));
  };

  return (
    <Card className="p-8 glass-pro border-white/10 shadow-pro rounded-[2.5rem] relative overflow-hidden animate-pro-in">
      <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Beaker className="w-24 h-24 text-primary" />
      </div>
      
      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-2xl text-primary border border-primary/20 shadow-glow-pro">
                <Beaker className="w-6 h-6" />
            </div>
            <div>
                <h3 className="text-xl font-black font-space-grotesk italic tracking-tighter uppercase text-white leading-none">ARQUITECTURA DE RECETA</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mt-1 italic">Ingeniería de Mezcla & Control Insumos</p>
            </div>
          </div>
          <Badge className="bg-white/5 text-white/40 border-white/5 font-black text-[9px] uppercase tracking-widest italic px-3 h-6">SISTEMA ATÓMICO</Badge>
        </div>

        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
             <Info className="w-4 h-4 text-primary mt-0.5" />
             <p className="text-[10px] text-primary/80 font-dm-sans italic leading-relaxed">
                Define la composición técnica del producto. El sistema descontará automáticamente estas cantidades del inventario maestro durante cada venta en el POS.
             </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-white/5 p-6 rounded-[2rem] border border-white/5 shadow-inner">
          <div className="md:col-span-2 space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 font-space-grotesk italic">INSUMO MATRIZ</Label>
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl font-black font-space-grotesk tracking-widest uppercase italic text-[10px] focus:ring-primary/20 transition-all hover:bg-white/10">
                <SelectValue placeholder="SELECCIONAR..." />
              </SelectTrigger>
              <SelectContent className="glass-pro border-white/10">
                {inventoryItems.map((item) => (
                  <SelectItem key={item.id} value={item.id} className="font-black font-space-grotesk italic text-[10px] tracking-widest uppercase">
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-1 space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 font-space-grotesk italic">DENSIDAD</Label>
            <Input
              type="number"
              step="0.1"
              placeholder="0.0"
              value={qtyOz}
              onChange={(e) => setQtyOz(e.target.value)}
              className="h-12 bg-white/5 border-white/10 rounded-xl font-black font-space-grotesk italic tracking-tighter text-sm focus:border-primary/50 text-white transition-all shadow-inner"
            />
          </div>

          <div className="md:col-span-1 space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 font-space-grotesk italic">U. M.</Label>
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl font-black font-space-grotesk tracking-widest uppercase italic text-[10px] focus:ring-primary/20 transition-all hover:bg-white/10">
                <SelectValue placeholder="UM" />
              </SelectTrigger>
              <SelectContent className="glass-pro border-white/10">
                <SelectItem value="oz" className="font-black font-space-grotesk italic text-[10px] tracking-widest uppercase">ONZAS (OZ)</SelectItem>
                <SelectItem value="ml" className="font-black font-space-grotesk italic text-[10px] tracking-widest uppercase">MILILITROS (ML)</SelectItem>
                <SelectItem value="un" className="font-black font-space-grotesk italic text-[10px] tracking-widest uppercase">UNIDAD (UN)</SelectItem>
                <SelectItem value="gr" className="font-black font-space-grotesk italic text-[10px] tracking-widest uppercase">GRAMOS (GR)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="button" onClick={handleAddItem} className="h-12 rounded-xl bg-primary text-white font-black italic uppercase tracking-widest text-[10px] shadow-glow-pro active:scale-95 transition-all border-2 border-white/20 hover:brightness-110">
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-3">
          <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 font-space-grotesk italic mb-4 block">COMPOSICIÓN ACTUAL</Label>
          {recipe.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-[2rem] bg-white/2 opacity-30 group hover:opacity-50 transition-opacity">
               <div className="p-4 bg-white/5 rounded-full w-fit mx-auto mb-4 grayscale">
                   <Beaker className="w-8 h-8 text-primary" />
               </div>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] italic">Sin componentes estructurales</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
                {recipe.map((item) => (
                <div key={item.inventory_item_id} className="flex items-center justify-between p-5 glass-pro rounded-2xl border border-white/5 group hover:border-primary/30 transition-all animate-pro-in">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-10 bg-primary/20 rounded-full group-hover:bg-primary transition-colors shadow-glow-pro" />
                        <div>
                            <p className="text-sm font-black italic uppercase tracking-tighter text-white font-space-grotesk">{item.name || inventoryMap.get(item.inventory_item_id)?.name || "Insumo"}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                                    CONSUMO ACTIVO: {item.quantity_oz} {item.unit || 'oz'}
                                </span> 
                                { (item.unit === 'oz' || !item.unit) && (
                                    <>
                                        <span className="text-white/10 text-[6px]">•</span>
                                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tighter italic">
                                            EQUIV: {(item.quantity_oz * OZ_TO_ML).toFixed(1)} ML
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveItem(item.inventory_item_id)}
                        className="h-10 w-10 glass-pro rounded-xl text-red-400 hover:bg-red-500/20 hover:text-white shadow-pro transition-transform hover:-translate-y-1"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
