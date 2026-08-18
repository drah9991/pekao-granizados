import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Star, Download, TrendingUp, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export default function LoyaltyCRM() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { storeId } = useAuth();

  useEffect(() => {
    if (!storeId) return;
    fetchLoyaltyData();
  }, [storeId]);

  const fetchLoyaltyData = async () => {
    setLoading(true);
    try {
      // 1. Obtener todos los clientes
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*');
        
      if (customersError) throw customersError;

      // 2. Obtener todas las órdenes completadas para calcular LTV (Life Time Value) y frecuencia
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('customer_id, total, created_at')
        .eq('status', 'completed')
        .not('customer_id', 'is', null);

      if (ordersError) throw ordersError;

      // 3. Procesar y agrupar datos localmente
      const loyaltyMap = new Map();
      
      customersData.forEach(c => {
        loyaltyMap.set(c.id, {
          ...c,
          totalSpent: 0,
          purchaseCount: 0,
          lastPurchase: null,
          category: 'Nuevo'
        });
      });

      ordersData?.forEach(o => {
        if (loyaltyMap.has(o.customer_id)) {
          const c = loyaltyMap.get(o.customer_id);
          c.totalSpent += Number(o.total);
          c.purchaseCount += 1;
          
          if (!c.lastPurchase || new Date(o.created_at) > new Date(c.lastPurchase)) {
            c.lastPurchase = o.created_at;
          }
        }
      });

      // Categorización simple
      const processed = Array.from(loyaltyMap.values()).map(c => {
        if (c.purchaseCount >= 10) c.category = 'VIP 🌟';
        else if (c.purchaseCount >= 3) c.category = 'Recurrente';
        return c;
      }).sort((a, b) => b.totalSpent - a.totalSpent); // Sort by highest LTV

      setCustomers(processed);
    } catch (err: any) {
      toast.error('Error cargando datos del CRM: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Nombre', 'Email', 'Teléfono', 'Compras', 'Total Gastado', 'Categoría', 'Última Compra'];
    const csvContent = [
      headers.join(','),
      ...customers.map(c => [
        `"${c.name}"`,
        `"${c.email || ''}"`,
        `"${c.phone || ''}"`,
        c.purchaseCount,
        c.totalSpent,
        `"${c.category}"`,
        `"${c.lastPurchase ? new Date(c.lastPurchase).toLocaleDateString() : 'N/A'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "pekao_loyalty_customers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Base de datos exportada con éxito');
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Star className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CRM & Fidelización</h1>
            <p className="text-muted-foreground">Descubre quiénes son tus mejores clientes y lanza campañas de remarketing.</p>
          </div>
        </div>
        
        <Button onClick={exportToCSV} className="gap-2 bg-green-600 hover:bg-green-700">
          <Download className="w-4 h-4" />
          Exportar Contactos (.CSV)
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex items-center gap-4 glass-pro">
          <div className="p-3 bg-blue-500/10 rounded-full">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Clientes en Base</p>
            <h2 className="text-2xl font-bold">{customers.length}</h2>
          </div>
        </Card>
        
        <Card className="p-6 flex items-center gap-4 glass-pro border-amber-500/20">
          <div className="p-3 bg-amber-500/10 rounded-full">
            <Star className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Clientes VIP (10+ compras)</p>
            <h2 className="text-2xl font-bold">{customers.filter(c => c.category.includes('VIP')).length}</h2>
          </div>
        </Card>

        <Card className="p-6 flex items-center gap-4 glass-pro border-green-500/20">
          <div className="p-3 bg-green-500/10 rounded-full">
            <TrendingUp className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Ingresos por VIPs</p>
            <h2 className="text-2xl font-bold">
              ${customers.filter(c => c.category.includes('VIP')).reduce((acc, c) => acc + c.totalSpent, 0).toLocaleString('es-CO')}
            </h2>
          </div>
        </Card>
      </div>

      <Card className="border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center gap-4 bg-muted/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre o teléfono..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4 text-center">Categoría</th>
                <th className="px-6 py-4 text-right">Compras</th>
                <th className="px-6 py-4 text-right">Valor de Vida (LTV)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Analizando historial de ventas...</td></tr>
              ) : filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-medium">{customer.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    <div className="text-xs">{customer.phone || 'Sin teléfono'}</div>
                    <div className="text-xs">{customer.email || 'Sin correo'}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      customer.category.includes('VIP') ? 'bg-amber-500/10 text-amber-600' : 
                      customer.category === 'Recurrente' ? 'bg-blue-500/10 text-blue-600' : 
                      'bg-muted text-muted-foreground'
                    }`}>
                      {customer.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono">{customer.purchaseCount}</td>
                  <td className="px-6 py-4 text-right font-bold text-green-600 dark:text-green-400">
                    ${customer.totalSpent.toLocaleString('es-CO')}
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">No se encontraron clientes para mostrar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
