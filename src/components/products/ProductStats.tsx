import { Card, CardContent } from "@/components/ui/card";
import { Package, DollarSign, TrendingUp } from "lucide-react";
import { formatCOP } from "@/lib/currency";

interface ProductStatsProps {
  total: number;
  active: number;
  inactive: number;
  avgPrice: number;
}

export default function ProductStats({ total, active, inactive, avgPrice }: ProductStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="glass-card shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Productos</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <Package className="w-8 h-8 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Activos</p>
              <p className="text-2xl font-bold text-accent">{active}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-accent" />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Inactivos</p>
              <p className="text-2xl font-bold text-muted-foreground">{inactive}</p>
            </div>
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Precio Promedio</p>
              <p className="text-2xl font-bold text-primary">{formatCOP(avgPrice)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}