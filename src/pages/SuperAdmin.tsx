import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Unlock, Store, Activity, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdmin() {
  const { isSuperAdmin, isLoading } = useAuth();
  const [stores, setStores] = useState<any[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);

  const fetchStores = async () => {
    setLoadingStores(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (err: any) {
      toast.error('Error al cargar negocios: ' + err.message);
    } finally {
      setLoadingStores(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchStores();
    }
  }, [isSuperAdmin]);

  const toggleSubscription = async (storeId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('stores')
        .update({ subscription_status: newStatus })
        .eq('id', storeId);

      if (error) throw error;
      
      toast.success(`Suscripción cambiada a ${newStatus}`);
      fetchStores();
    } catch (err: any) {
      toast.error('Error actualizando suscripción: ' + err.message);
    }
  };

  if (isLoading) return <div className="p-8">Cargando...</div>;
  
  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const activeStores = stores.filter(s => s.subscription_status === 'active' || !s.subscription_status);
  const inactiveStores = stores.filter(s => s.subscription_status === 'inactive');
  const estimatedRevenue = activeStores.length * 50000;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95">
      <div className="flex items-center gap-4 border-b pb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel SaaS Master</h1>
          <p className="text-muted-foreground">Centro de comando para administrar Pekao Central</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex items-center gap-4 glass-pro border-primary/20">
          <div className="p-3 bg-primary/10 rounded-full">
            <Store className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Negocios</p>
            <h2 className="text-2xl font-bold">{stores.length}</h2>
          </div>
        </Card>
        
        <Card className="p-6 flex items-center gap-4 glass-pro border-green-500/20">
          <div className="p-3 bg-green-500/10 rounded-full">
            <DollarSign className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">MRR (COP Mensual)</p>
            <h2 className="text-2xl font-bold">${estimatedRevenue.toLocaleString('es-CO')}</h2>
          </div>
        </Card>

        <Card className="p-6 flex items-center gap-4 glass-pro border-amber-500/20">
          <div className="p-3 bg-amber-500/10 rounded-full">
            <Activity className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Suscripciones Inactivas</p>
            <h2 className="text-2xl font-bold">{inactiveStores.length}</h2>
          </div>
        </Card>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/20">
          <h3 className="text-lg font-semibold">Listado de Tenants (Negocios)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Negocio</th>
                <th className="px-6 py-4">ID de Tenant</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones (Candado)</th>
              </tr>
            </thead>
            <tbody>
              {loadingStores ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Cargando negocios...</td></tr>
              ) : stores.map((store) => {
                const isActive = store.subscription_status !== 'inactive';
                return (
                  <tr key={store.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium">{store.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{store.id}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isActive ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-destructive/10 text-destructive'
                      }`}>
                        {isActive ? 'Activo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant={isActive ? "destructive" : "default"} 
                        size="sm"
                        className="gap-2"
                        onClick={() => toggleSubscription(store.id, store.subscription_status)}
                      >
                        {isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        {isActive ? 'Forzar Bloqueo' : 'Desbloquear'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
