import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Rocket, Package, CheckCircle2, ChevronRight, Store } from 'lucide-react';
import { toast } from 'sonner';

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, storeId } = useAuth();

  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');

  const handleCreateProduct = async () => {
    if (!productName || !productPrice) {
      toast.error('Completa los campos del producto');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('products').insert([
        {
          name: productName,
          price: parseFloat(productPrice),
          active: true,
          sku: `SKU-${Math.floor(Math.random() * 1000)}`,
          store_id: storeId // Asumimos que el RLS o el trigger lo maneja, pero lo enviamos por seguridad
        }
      ]);

      if (error) throw error;
      toast.success('Producto creado mágicamente ✨');
      setStep(3);
    } catch (err: any) {
      toast.error('Error al crear el producto: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishOnboarding = () => {
    toast.success('¡Todo listo! Bienvenido a tu nuevo POS.');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="w-full max-w-lg bg-card border shadow-2xl rounded-2xl overflow-hidden relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
        
        {/* Header */}
        <div className="bg-primary/5 p-8 text-center border-b">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
            <Rocket className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">¡Bienvenido a tu Negocio!</h1>
          <p className="text-muted-foreground mt-2">Vamos a dejar todo listo para facturar en menos de 3 minutos.</p>
        </div>

        {/* Steps Progress */}
        <div className="flex items-center justify-center gap-2 p-6 bg-muted/30">
          <div className={`h-2 rounded-full flex-1 ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-2 rounded-full flex-1 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-2 rounded-full flex-1 ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {/* Step 1: Welcome & Context */}
        {step === 1 && (
          <div className="p-8 space-y-6 animate-in slide-in-from-right-4">
            <div className="space-y-4">
              <div className="flex gap-4 items-start p-4 rounded-lg bg-muted/50">
                <Store className="w-6 h-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold">Tu Tienda Virtual</h3>
                  <p className="text-sm text-muted-foreground">Ya hemos configurado tu espacio seguro. Ahora necesitamos algo que vender.</p>
                </div>
              </div>
            </div>
            <Button className="w-full h-12 text-lg group" onClick={() => setStep(2)}>
              Comenzar Configuración
              <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        )}

        {/* Step 2: First Product */}
        {step === 2 && (
          <div className="p-8 space-y-6 animate-in slide-in-from-right-4">
            <div className="text-center mb-6">
              <Package className="w-12 h-12 text-primary mx-auto mb-3 opacity-80" />
              <h2 className="text-xl font-semibold">Crea tu primer producto</h2>
              <p className="text-sm text-muted-foreground">Escribe el nombre de lo que más vendes.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="productName">Nombre del Producto (Ej. Granizado de Maracuyá)</Label>
                <Input 
                  id="productName" 
                  placeholder="Granizado..." 
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="h-12 text-lg"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productPrice">Precio de Venta (COP)</Label>
                <Input 
                  id="productPrice" 
                  type="number" 
                  placeholder="5000" 
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
            </div>

            <Button 
              className="w-full h-12 text-lg" 
              onClick={handleCreateProduct}
              disabled={loading || !productName || !productPrice}
            >
              {loading ? 'Creando...' : 'Guardar Producto'}
            </Button>
          </div>
        )}

        {/* Step 3: Success & CTA */}
        {step === 3 && (
          <div className="p-8 space-y-6 text-center animate-in zoom-in-95 duration-500">
            <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold">¡Lo Lograste!</h2>
            <p className="text-muted-foreground">
              Ya tienes un producto registrado. El sistema está listo para que registres tu primera venta.
            </p>
            
            <div className="pt-4">
              <Button className="w-full h-12 text-lg bg-green-600 hover:bg-green-700 text-white" onClick={handleFinishOnboarding}>
                Ir al Panel de Ventas (POS)
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Onboarding;
