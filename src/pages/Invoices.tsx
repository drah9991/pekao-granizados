import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters"; // Import the formatter

const invoices = [
  {
    id: "INV-001",
    number: "F-2024-001",
    date: "2024-01-15",
    client: "Cliente General",
    amount: 45.50,
    status: "paid",
    items: 3,
  },
  {
    id: "INV-002",
    number: "F-2024-002",
    date: "2024-01-15",
    client: "María García",
    amount: 23.00,
    status: "paid",
    items: 2,
  },
  {
    id: "INV-003",
    number: "F-2024-003",
    date: "2024-01-15",
    client: "Juan Pérez",
    amount: 67.80,
    status: "pending",
    items: 5,
  },
  {
    id: "INV-004",
    number: "F-2024-004",
    date: "2024-01-14",
    client: "Ana Martínez",
    amount: 34.20,
    status: "paid",
    items: 2,
  },
];

const statusColors = {
  paid: { label: "Pagada", variant: "default" as const },
  pending: { label: "Pendiente", variant: "secondary" as const },
  cancelled: { label: "Anulada", variant: "destructive" as const },
};

export default function Invoices() {
  return (
    <Layout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Facturación</h1>
            <p className="text-muted-foreground">Gestión de facturas y documentos fiscales</p>
          </div>
          <Button className="shadow-card">
            <FileText className="mr-2" />
            Nueva Factura
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Facturado Hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-1">{formatCurrency(170.50)}</div>
              <p className="text-xs text-muted-foreground">12 facturas emitidas</p>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Este Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{formatCurrency(5234)}</div>
              <p className="text-xs text-accent font-medium">+12.5% vs mes anterior</p>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary mb-1">1</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(67.80)} por cobrar</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input placeholder="Buscar facturas..." className="pl-10" />
        </div>

        {/* Invoices List */}
        <Card className="glass-card shadow-card">
          <CardHeader>
            <CardTitle>Facturas Recientes</CardTitle>
            <CardDescription>Historial de documentos fiscales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div 
                  key={invoice.id} 
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-smooth"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center shadow-card">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold">{invoice.number}</h3>
                        <Badge variant={statusColors[invoice.status as keyof typeof statusColors].variant}>
                          {statusColors[invoice.status as keyof typeof statusColors].label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{invoice.client}</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.date} • {invoice.items} productos
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right mr-4">
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(invoice.amount)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => toast.info("Ver factura")}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => toast.success("Descargando PDF...")}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}