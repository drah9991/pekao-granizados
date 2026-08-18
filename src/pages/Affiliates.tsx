import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { Copy, Gift, Share2, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function Affiliates() {
  const { storeId } = useAuth();
  const [copied, setCopied] = useState(false);

  // El enlace de afiliado usa el storeId como código de referencia
  const referralLink = `${window.location.origin}/auth?ref=${storeId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Enlace copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95">
      <div className="flex items-center gap-4 border-b pb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Gift className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Programa de Embajadores</h1>
          <p className="text-muted-foreground">Refiere a otros negocios y gana meses de suscripción gratis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-2 space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Tu Enlace Único</h3>
            <p className="text-muted-foreground text-sm">
              Comparte este enlace con dueños de otros negocios. Cuando se registren y realicen su primer pago, ambos recibirán 1 mes gratis en su suscripción.
            </p>
          </div>

          <div className="flex gap-2">
            <Input 
              value={referralLink} 
              readOnly 
              className="font-mono text-primary bg-primary/5 border-primary/20"
            />
            <Button onClick={handleCopy} className="gap-2 shrink-0">
              {copied ? <Share2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "¡Copiado!" : "Copiar"}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" /> 
              ¿Cómo funciona?
            </h4>
            <ul className="space-y-3 text-sm text-muted-foreground list-disc list-inside">
              <li>Envía tu enlace a amigos, grupos de Facebook o WhatsApp.</li>
              <li>El nuevo negocio obtiene una prueba gratuita extendida.</li>
              <li>Cuando ellos pagan su primer mes, el sistema automáticamente acredita 1 mes gratis a tu cuenta.</li>
              <li>No hay límite. Si refieres 12 negocios, ¡tienes un año gratis!</li>
            </ul>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Negocios Referidos</p>
              <h2 className="text-4xl font-bold mt-2">0</h2>
            </div>
          </Card>

          <Card className="p-6 text-center space-y-4 border-green-500/20">
            <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
              <Gift className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Meses Ganados</p>
              <h2 className="text-4xl font-bold mt-2 text-green-500">0</h2>
            </div>
            <p className="text-xs text-muted-foreground">Equivalente a $0 COP ahorrados</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
