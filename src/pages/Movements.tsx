import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Search, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface Movement {
    id: string;
    type: string;
    qty: number;
    reason: string | null;
    created_at: string;
    product: { name: string } | null;
    user: { name: string | null } | null;
}

const typeMapping: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    entry: { label: "Entrada", icon: <TrendingUp className="w-4 h-4" />, color: "bg-green-500" },
    in: { label: "Entrada", icon: <TrendingUp className="w-4 h-4" />, color: "bg-green-500" },
    exit: { label: "Salida", icon: <TrendingDown className="w-4 h-4" />, color: "bg-red-500" },
    out: { label: "Salida", icon: <TrendingDown className="w-4 h-4" />, color: "bg-red-500" },
    sale: { label: "Venta", icon: <Activity className="w-4 h-4" />, color: "bg-primary" },
    waste: { label: "Merma", icon: <AlertTriangle className="w-4 h-4" />, color: "bg-red-500" },
};

export default function Movements() {
    const [movements, setMovements] = useState<Movement[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedType, setSelectedType] = useState<string | "all">("all");
    const [loading, setLoading] = useState(true);
    const { storeId } = useAuth();

    useEffect(() => {
        if (storeId) {
            fetchMovements();
        }
    }, [storeId]);

    const fetchMovements = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("movements")
                .select(`
          id,
          type,
          qty,
          reason,
          created_at,
          product:products(name)
        `)
                .eq("store_id", storeId)
                .order("created_at", { ascending: false })
                .limit(100); // Fetch last 100 for performance on initial view

            if (error) throw error;
            setMovements((data as any) || []);
        } catch (error: any) {
            console.error("Error fetching movements:", error);
            toast.error("Error al cargar movimientos: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredMovements = movements.filter((mov) => {
        const matchesSearch =
            !searchQuery ||
            (mov.product?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (mov.reason || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (mov.user?.name || "").toLowerCase().includes(searchQuery.toLowerCase());

        const matchesType = selectedType === "all" || 
            mov.type === selectedType || 
            (selectedType === "in" && mov.type === "entry") ||
            (selectedType === "out" && mov.type === "exit");
        return matchesSearch && matchesType;
    });

    return (
        <Layout>
            <div className="p-6 md:p-8 space-y-6 md:space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
                            Kardex de Inventario
                        </h1>
                        <p className="text-muted-foreground text-sm md:text-base">
                            Auditoría y trazabilidad de los movimientos de existencias
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <Card className="glass-card shadow-card">
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    placeholder="Buscar por producto, justificación o usuario..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={selectedType} onValueChange={setSelectedType}>
                                <SelectTrigger className="w-full md:w-48">
                                    <SelectValue placeholder="Filtrar por tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los Movimientos</SelectItem>
                                    <SelectItem value="in">Entradas</SelectItem>
                                    <SelectItem value="out">Salidas Manuales</SelectItem>
                                    <SelectItem value="sale">Ventas</SelectItem>
                                    <SelectItem value="waste">Mermas (Gasto)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* List */}
                <Card className="glass-card shadow-card">
                    <CardHeader>
                        <CardTitle>Historial Reciente</CardTitle>
                        <CardDescription>Visualizando los {filteredMovements.length} movimientos más recientes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                                <p className="text-muted-foreground">Cargando kardex...</p>
                            </div>
                        ) : filteredMovements.length === 0 ? (
                            <div className="text-center py-12">
                                <Activity className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                                <h3 className="text-lg font-semibold mb-2">No se encontraron movimientos</h3>
                                <p className="text-muted-foreground">
                                    Aún no hay transacciones de inventario con los filtros actuales.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Producto</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead className="text-right">Cantidad</TableHead>
                                            <TableHead>Justificación</TableHead>
                                            <TableHead>Responsable</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredMovements.map((mov) => {
                                            const typeData = typeMapping[mov.type] || { label: mov.type, icon: <Activity className="w-4 h-4" />, color: "bg-gray-500" };
                                            return (
                                                <TableRow key={mov.id}>
                                                    <TableCell className="whitespace-nowrap text-muted-foreground">
                                                        {new Date(mov.created_at).toLocaleString('es-CO')}
                                                    </TableCell>
                                                    <TableCell className="font-medium">{mov.product?.name || "Desconocido"}</TableCell>
                                                    <TableCell>
                                                        <Badge className={typeData.color + " flex w-fit items-center gap-1"}>
                                                            {typeData.icon} {typeData.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold">
                                                        <span className={(mov.type === 'in' || mov.type === 'entry') ? 'text-green-600' : 'text-red-600'}>
                                                            {(mov.type === 'in' || mov.type === 'entry') ? '+' : ''}{mov.qty}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                                                        {mov.reason || "-"}
                                                    </TableCell>
                                                    <TableCell>{mov.user?.name || "Sistema"}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout >
    );
}
