import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Unlock, Store, Activity, DollarSign, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { EditStoreDialog } from '@/components/superadmin/EditStoreDialog';

import { useNavigate } from 'react-router-dom';

export default function SuperAdmin() {
  const { isSuperAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState<any[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [storeToEdit, setStoreToEdit] = useState<any | null>(null);

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

  const getStoreStatus = (s: any) => s.subscription_status || s.config?.subscription_status || 'active';

  const toggleSubscription = async (storeId: string, rawStatus: string) => {
    const currentStatus = getStoreStatus(stores.find(s => s.id === storeId) || { subscription_status: rawStatus });
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      // Intentar actualizar la columna directa
      const { error: colError } = await supabase
        .from('stores')
        .update({ subscription_status: newStatus })
        .eq('id', storeId);

      if (colError) {
        console.warn("Columna subscription_status ausente en caché de esquema, usando respaldo config JSON:", colError);
        // Fallback a config JSON si el caché de Supabase PostgREST está desactualizado
        const targetStore = stores.find(s => s.id === storeId);
        const currentConfig = (targetStore?.config as Record<string, any>) || {};
        const { error: cfgError } = await supabase
          .from('stores')
          .update({ config: { ...currentConfig, subscription_status: newStatus } })
          .eq('id', storeId);

        if (cfgError) throw colError;
      }
      
      toast.success(`Suscripción cambiada a ${newStatus.toUpperCase()}`);
      fetchStores();
    } catch (err: any) {
      console.error("Error updating subscription:", err);
      toast.error('Error actualizando suscripción: ' + (err.message || 'Verifica la migración en Supabase'));
    }
  };

  if (isLoading) return <div className="p-8">Cargando...</div>;
  
  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const activeStores = stores.filter(s => getStoreStatus(s) === 'active');
  const inactiveStores = stores.filter(s => getStoreStatus(s) === 'inactive');
  const estimatedRevenue = activeStores.length * 50000;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95">
      <div className="flex items-center justify-between border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Panel SaaS Master</h1>
            <p className="text-muted-foreground">Centro de comando para administrar Pekao Central</p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          onClick={() => navigate('/dashboard')}
          className="gap-2"
        >
          Volver al Dashboard
        </Button>
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
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="gap-2"
                        onClick={() => setStoreToEdit(store)}
                      >
                        <Edit className="w-4 h-4" />
                        Editar
                      </Button>
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
      
      <EditStoreDialog
        store={storeToEdit}
        isOpen={!!storeToEdit}
        onClose={() => setStoreToEdit(null)}
        onSuccess={fetchStores}
      />
    </div>
  );
}
