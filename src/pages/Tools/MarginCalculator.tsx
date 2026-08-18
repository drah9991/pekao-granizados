import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calculator, TrendingUp, Percent, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MarginCalculator() {
  const [cost, setCost] = useState<string>('1500');
  const [price, setPrice] = useState<string>('5000');

  const costNum = parseFloat(cost) || 0;
  const priceNum = parseFloat(price) || 0;

  const profit = priceNum - costNum;
  const margin = priceNum > 0 ? (profit / priceNum) * 100 : 0;
  const markup = costNum > 0 ? (profit / costNum) * 100 : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4 relative overflow-hidden">
      <div className="absolute top-0 right-1/2 translate-x-1/2 w-full max-w-3xl h-[500px] bg-green-500/5 rounded-full blur-[100px] opacity-50 pointer-events-none" />
      
      <div className="w-full max-w-2xl relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
            <Calculator className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Calculadora de Margen de Ganancia</h1>
          <p className="text-lg text-muted-foreground">Calcula rápidamente tu margen bruto, rentabilidad y markup. Gratis y sin registro.</p>
        </div>

        <Card className="p-8 border shadow-xl bg-card/80 backdrop-blur-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="cost" className="text-base">Costo de Producción (COP)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    id="cost" 
                    type="number"
                    value={cost} 
                    onChange={(e) => setCost(e.target.value)} 
                    className="h-14 pl-10 text-lg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price" className="text-base">Precio de Venta (COP)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    id="price" 
                    type="number"
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)} 
                    className="h-14 pl-10 text-lg"
                  />
                </div>
              </div>
            </div>

            <div className="bg-muted/30 p-6 rounded-xl flex flex-col justify-center space-y-6 border">
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Ganancia Bruta (Profit)
                </p>
                <p className="text-3xl font-bold text-primary mt-1">
                  ${profit.toLocaleString('es-CO')}
                </p>
              </div>
              
              <div className="w-full h-px bg-border" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Percent className="w-3 h-3 text-green-500" /> Margen
                  </p>
                  <p className="text-xl font-bold text-green-500">{margin.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-amber-500" /> Markup
                  </p>
                  <p className="text-xl font-bold text-amber-500">{markup.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Lead Magnet CTA */}
        <div className="mt-12 bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center space-y-4">
          <h3 className="text-2xl font-bold text-green-700 dark:text-green-400">¿Cansado de calcular rentabilidades a mano?</h3>
          <p className="text-muted-foreground text-lg">
            Si tienes decenas de productos, el cálculo manual es un error. Con <strong>Pekao Central</strong>, el costo de cada receta se calcula en tiempo real para proteger tus ganancias diarias.
          </p>
          <Link to="/auth">
            <Button size="lg" className="mt-4 gap-2 text-base px-8 h-14 bg-green-600 hover:bg-green-700 text-white">
              Prueba Pekao Central Gratis
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
