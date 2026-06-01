import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Droplets, History, Plus, AlertCircle, Info, TrendingUp, User, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import MixReloadDialog from "./MixReloadDialog";

interface InventoryItem {
  name: string;
  unit: string;
  stock: number;
  min_stock: number;
}

interface PreparationHistory {
  id: string;
  inventory_item_id: string;
  liters: number;
  ml_converted: number;
  expected_cups: number;
  notes: string;
  created_at: string;
  created_by: string;
}

const CUP_YIELD_BASE_ML = 300;

export default function MixManagement({ storeId }: { storeId: string }) {
  const [mixes, setMixes] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<PreparationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReloadOpen, setIsReloadOpen] = useState(false);

  useEffect(() => {
    if (storeId) {
      fetchMixes();
      fetchHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const fetchMixes = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("store_id", storeId)
        .eq("unit", "ml") // Assume mixes are measured in ml
        .order("name", { ascending: true });

      if (error) throw error;
      setMixes(data || []);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al cargar mezclas: " + msg);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("mix_preparations")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (error: unknown) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-muted-foreground font-space-grotesk animate-pulse">Sincronizando depósitos de mezcla...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-pro-in">
      {/* Header Info Banner (Pro Max Style) */}
      <div className="relative overflow-hidden rounded-[3rem] glass-pro border-white/10 p-10 shadow-pro group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Droplets className="w-80 h-80 -rotate-12 translate-x-12 -translate-y-12 text-primary" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
        
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h2 className="text-4xl font-black text-white font-space-grotesk mb-3 tracking-tighter italic uppercase">
              RESERVA DE <span className="text-primary text-glow">MEZCLAS</span>
            </h2>
            <p className="text-muted-foreground max-w-lg font-dm-sans text-sm leading-relaxed uppercase tracking-wider font-bold">
              Control volumétrico de insumos críticos. Monitoreo predictivo de niveles de producción en tiempo real.
            </p>
          </div>
          <Button 
            onClick={() => setIsReloadOpen(true)}
            className="rounded-[2rem] bg-primary text-white hover:shadow-glow-pro font-black px-10 h-16 active:scale-95 transition-all text-lg gap-3 font-space-grotesk italic border-2 border-white/20"
          >
            <Plus className="w-6 h-6" />
            NUEVA PREPARACIÓN
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {mixes.map((mix) => {
          const liters = mix.stock / 1000;
          const minLiters = mix.min_stock / 1000;
          const percentage = Math.min(100, (liters / (minLiters * 3 || 20)) * 100);
          const isCritical = liters <= minLiters;

          return (
            <Card key={mix.id} className={cn(
              "glass-pro border-white/5 group hover:border-primary/30 transition-all duration-500 overflow-hidden relative shadow-pro",
              isCritical && "border-red-500/30 shadow-glow-pro"
            )}>
              <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all">
                <Droplets className="w-32 h-32 text-primary" />
              </div>
              <CardHeader className="pb-4 relative z-10">
                <div className="flex justify-between items-start">
                  <div className={cn(
                    "p-3 rounded-2xl group-hover:rotate-12 transition-transform shadow-inner",
                    isCritical ? "bg-red-500/20 text-red-400" : "bg-primary/20 text-primary"
                  )}>
                    <Droplets className="w-6 h-6" />
                  </div>
                  <Badge className={cn(
                    "rounded-lg px-3 py-1 font-black text-[9px] uppercase tracking-widest border-none shadow-glow",
                    isCritical ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                  )}>
                    {isCritical ? "REFILL REQUIRED" : "OPERATIONAL"}
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-black font-space-grotesk mt-6 group-hover:text-primary transition-colors italic uppercase tracking-tighter">
                    {mix.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-5xl font-black font-space-grotesk italic tracking-tighter text-white">
                            {liters.toFixed(1)} <span className="text-xl text-primary font-bold not-italic ml-0.5">L</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-2 font-black uppercase tracking-widest opacity-60">Volumen en Depósito</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-muted-foreground italic">Reserva Estratégica</span>
                        <span className={cn("italic", isCritical ? "text-red-400" : "text-primary")}>{Math.round(percentage)}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000 shadow-glow", isCritical ? "bg-red-500" : "bg-primary")} 
                          style={{ width: `${percentage}%` }}
                        />
                    </div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-40 text-right tracking-tighter">
                        Capacidad: ~{Math.floor(mix.stock / CUP_YIELD_BASE_ML)} vasos standard
                    </p>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {mixes.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-white/5 grayscale">
                <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold text-muted-foreground">No se detectan mezclas líquidas</h3>
                <p className="text-sm text-blue-100/40">Los insumos deben tener unidad de medida 'ml' para aparecer aquí.</p>
            </div>
        )}
      </div>

      {/* History Audit Table */}
      <Card className="glass-pro border-white/5 overflow-hidden rounded-[2.5rem] shadow-pro">
        <CardHeader className="bg-white/5 border-b border-white/5 py-8 px-10">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-2xl text-primary shadow-glow-pro group-hover:rotate-12 transition-transform">
                    <History className="w-6 h-6" />
                </div>
                <div>
                   <CardTitle className="text-2xl font-black font-space-grotesk italic uppercase tracking-tighter">LOG DE PREPARACIÓN</CardTitle>
                   <CardDescription className="text-[10px] font-black uppercase tracking-widest text-primary/60 mt-1">Audit Trail • Registro Histórico de Terminales</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-container-pro max-h-[500px]">
            <Table>
              <TableHeader className="sticky-header-pro h-14">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="px-10 font-black uppercase tracking-[0.2em] text-[10px] text-muted-foreground whitespace-nowrap">PRODUCTO</TableHead>
                  <TableHead className="font-black uppercase tracking-[0.2em] text-[10px] text-muted-foreground whitespace-nowrap">CARGA</TableHead>
                  <TableHead className="font-black uppercase tracking-[0.2em] text-[10px] text-muted-foreground whitespace-nowrap">RENDIMIENTO</TableHead>
                  <TableHead className="font-black uppercase tracking-[0.2em] text-[10px] text-muted-foreground whitespace-nowrap">TIMESTAMP</TableHead>
                  <TableHead className="font-black uppercase tracking-[0.2em] text-[10px] text-muted-foreground text-right px-10 whitespace-nowrap">NOTAS</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id} className="border-white/5 hover:bg-white/5 transition-all group h-20">
                  <TableCell className="px-10 font-black font-space-grotesk italic uppercase text-white group-hover:text-primary transition-colors">
                    {mixes.find(m => m.id === item.inventory_item_id)?.name || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                        <span className="font-black text-emerald-400 font-space-grotesk italic text-lg leading-none">+{item.liters} L</span>
                        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">{item.ml_converted} ML</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-black italic uppercase tracking-widest px-2 h-6">
                        {item.expected_cups} VASOS 12OZ
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-primary/60" />
                        {new Date(item.created_at).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-10 text-[10px] font-dm-sans text-muted-foreground italic group-hover:text-white transition-colors">
                    {item.notes || "S/O"}
                  </TableCell>
                </TableRow>
              ))}

              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-24 text-center">
                    <Info className="w-10 h-10 text-white/10 mx-auto mb-4" />
                    <p className="font-black uppercase tracking-[0.3em] text-[10px] text-muted-foreground">No hay registros auditables</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <MixReloadDialog 
        isOpen={isReloadOpen}
        onOpenChange={setIsReloadOpen}
        mixes={mixes}
        storeId={storeId}
        onSuccess={() => {
            fetchMixes();
            fetchHistory();
        }}
      />
    </div>
  );
}
