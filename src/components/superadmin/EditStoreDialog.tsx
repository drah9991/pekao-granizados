import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EditStoreDialogProps {
  store: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditStoreDialog({ store, isOpen, onClose, onSuccess }: EditStoreDialogProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [taxRate, setTaxRate] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (store) {
      setName(store.name || '');
      setAddress(store.address || '');
      setCurrency(store.currency || 'COP');
      setTaxRate(store.tax_rate || 0);
    }
  }, [store]);

  const handleSave = async () => {
    if (!store) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({
          name,
          address,
          currency,
          tax_rate: taxRate
        })
        .eq('id', store.id);

      if (error) throw error;
      toast.success('Tenant actualizado correctamente');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Error al actualizar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-pro border-white/10 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Tenant (Negocio)</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre del Negocio</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background/50"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="bg-background/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="currency">Moneda (Ej: COP, USD)</Label>
              <Input
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="taxRate">Tasa de Impuesto (%)</Label>
              <Input
                id="taxRate"
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="bg-background/50"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name}>
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
