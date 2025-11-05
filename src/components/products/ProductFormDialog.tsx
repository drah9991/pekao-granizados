import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/formatters";
import { Tables, Json, Enums } from "@/integrations/supabase/types";
import React, "react";

type Product = Tables<'products'>;
type ProductType = Enums<'product_type'>;
type SkuAcronym = Tables<'sku_acronyms'>;

interface ProductFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  formData: {
    name: string;
    sku: string;
    description: string;
    price: string;
    cost: string;
    active: boolean;
    category: string;
    is_public: boolean;
    images: string[];
    variants: Json | null;
    recipe: Json | null;
    type: ProductType;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    name: string;
    sku: string;
    description: string;
    price: string;
    cost: string;
    active: boolean;
    category: string;
    is_public: boolean;
    images: string[];
    variants: Json | null;
    recipe: Json | null;
    type: ProductType;
  }>>;
  onSave: () => void;
  isProcessing: boolean;
  productTypeOptions: { value: ProductType; label: string; icon: React.ElementType }[];
  skuAcronyms: SkuAcronym[]; // New prop for SKU acronyms
}

export default function ProductFormDialog({
  isOpen,
  onClose,
  editingProduct,
  formData,
  setFormData,
  onSave,
  isProcessing,
  productTypeOptions,
  skuAcronyms, // Destructure new prop
}: ProductFormDialogProps) {

  const generateSkuSuggestion = () => {
    const typeAcronym = skuAcronyms.find(a => a.type === formData.type)?.code || '';
    const namePart = formData.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (typeAcronym && namePart) {
      return `${typeAcronym}-${namePart}`;
    }
    return '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingProduct ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
          <DialogDescription>
            {editingProduct 
              ? "Actualiza la información del producto" 
              : "Completa los datos del nuevo producto"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Nombre del Producto *</Label>
              <Input
                id="name"
                placeholder="Ej: Granizado Fresa"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label htmlFor="type">Tipo de Producto *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: ProductType) => setFormData({ ...formData, type: value })}
                disabled={isProcessing}
              >
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {productTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="w-4 h-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Categoría</Label>
              <Input
                id="category"
                placeholder="Ej: Clásicos, Premium, Frutas"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="mt-2"
              />
            </div>

            <div className="col-span-2"> {/* Changed to col-span-2 for better layout with SKU suggestion */}
              <Label htmlFor="sku">SKU (Código)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="sku"
                  placeholder={generateSkuSuggestion() || "Ej: GRAN-FRES-001"}
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="flex-1 font-mono"
                />
                {!formData.sku && generateSkuSuggestion() && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setFormData({ ...formData, sku: generateSkuSuggestion() })}
                    className="whitespace-nowrap"
                  >
                    Sugerir SKU
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="price">Precio de Venta *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label htmlFor="cost">Costo del Producto</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="mt-2"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active" className="cursor-pointer">
                Producto activo
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
              <Label htmlFor="is_public" className="cursor-pointer">
                Visible al público (e-commerce)
              </Label>
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Describe el producto, ingredientes, características especiales..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-2"
                rows={4}
              />
            </div>
          </div>

          {formData.price && formData.cost && (
            <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
              <p className="text-sm text-muted-foreground mb-1">Margen de Ganancia</p>
              <p className="text-2xl font-bold text-accent">
                {formatCurrency(parseFloat(formData.price) - parseFloat(formData.cost))}
                <span className="text-sm ml-2">
                  ({(((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.price)) * 100).toFixed(1)}%)
                </span>
              </p>
            </div>
          )}

          {/* TODO: Add image upload, variants, recipe management */}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isProcessing || !formData.name || !formData.price}
            className="gradient-primary"
          >
            {isProcessing ? "Guardando..." : editingProduct ? "Actualizar" : "Crear Producto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}