import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Megaphone, Clock, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const DAYS_OF_WEEK = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 7, label: "Domingo" },
];

export default function Marketing() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const { storeId } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "time_based",
    start_time: "",
    end_time: "",
    days_of_week: [] as number[],
    target_type: "all",
    target_id: "",
    discount_type: "percentage",
    discount_value: 0,
    active: true,
  });

  const { data: rules, isLoading } = useQuery({
    queryKey: ["pricing_rules", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("pricing_rules")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });

  const openCreateDialog = () => {
    setEditingRule(null);
    setFormData({
      name: "",
      description: "",
      type: "time_based",
      start_time: "",
      end_time: "",
      days_of_week: [],
      target_type: "all",
      target_id: "",
      discount_type: "percentage",
      discount_value: 0,
      active: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (rule: any) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name || "",
      description: rule.description || "",
      type: rule.type || "time_based",
      start_time: rule.start_time || "",
      end_time: rule.end_time || "",
      days_of_week: rule.days_of_week || [],
      target_type: rule.target_type || "all",
      target_id: rule.target_id || "",
      discount_type: rule.discount_type || "percentage",
      discount_value: rule.discount_value || 0,
      active: rule.active,
    });
    setIsDialogOpen(true);
  };

  const handleSaveRule = async () => {
    if (!formData.name || !formData.discount_value) {
      toast.error("El nombre y el valor de descuento son obligatorios.");
      return;
    }

    if (!storeId) {
      toast.error("No se detectó una tienda vinculada a tu usuario.");
      return;
    }

    try {
      const ruleData = {
        store_id: storeId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        type: formData.type,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        days_of_week: formData.days_of_week.length > 0 ? formData.days_of_week : null,
        target_type: formData.target_type,
        target_id: formData.target_id || null,
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        active: formData.active,
      };

      if (editingRule) {
        const { error } = await supabase
          .from("pricing_rules")
          .update(ruleData)
          .eq("id", editingRule.id);

        if (error) throw error;
        toast.success("Regla actualizada.");
      } else {
        const { error } = await supabase
          .from("pricing_rules")
          .insert([ruleData]);

        if (error) throw error;
        toast.success("Regla creada.");
      }

      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["pricing_rules"] });
    } catch (error: any) {
      console.error("Error saving rule:", error);
      toast.error("Error al guardar regla: " + error.message);
    }
  };

  const handleToggleDay = (dayValue: number) => {
    setFormData((prev) => {
      const currentDays = prev.days_of_week || [];
      if (currentDays.includes(dayValue)) {
        return { ...prev, days_of_week: currentDays.filter((d) => d !== dayValue) };
      } else {
        return { ...prev, days_of_week: [...currentDays, dayValue] };
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Megaphone className="h-8 w-8 text-primary" />
              Precios Dinámicos
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Configura "Happy Hours", descuentos por horas o ajustes automáticos de precios.
            </p>
          </div>
          
          <Button 
            onClick={openCreateDialog} 
            className="gradient-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Regla
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <p className="text-muted-foreground">Cargando reglas...</p>
          ) : rules && rules.length > 0 ? (
            rules.map((rule) => (
              <Card key={rule.id} className={!rule.active ? 'opacity-60 grayscale' : ''}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center text-lg">
                    <span>{rule.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(rule)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    {rule.discount_type === 'percentage' ? 
                      `Descuento de ${rule.discount_value}%` : 
                      `Descuento de $${rule.discount_value}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {rule.description || "Sin descripción adicional."}
                  </p>
                  
                  {rule.type === 'time_based' && (
                     <div className="flex flex-col gap-1 text-xs text-muted-foreground bg-secondary/50 p-2 rounded-md">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> 
                          {rule.start_time?.slice(0,5)} - {rule.end_time?.slice(0,5)}
                        </div>
                        {rule.days_of_week && rule.days_of_week.length > 0 && (
                          <div className="mt-1 flex gap-1 flex-wrap">
                            {rule.days_of_week.map((d: number) => {
                               const dayName = DAYS_OF_WEEK.find(dw => dw.value === d)?.label.substring(0,3);
                               return <span key={d} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">{dayName}</span>;
                            })}
                          </div>
                        )}
                     </div>
                  )}

                  <div className="mt-4 flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${rule.active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                      {rule.active ? 'Activa' : 'Inactiva'}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      Aplica a: {rule.target_type === 'all' ? 'Todo' : rule.target_type === 'category' ? 'Categoría' : 'Producto'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full border-2 border-dashed border-border rounded-lg p-12 text-center">
               <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-muted-foreground" />
               </div>
               <h3 className="text-lg font-medium">Ninguna regla configurada</h3>
               <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                 Crea tu primer "Happy Hour" para ver cómo los precios cambian automáticamente en el sistema POS.
               </p>
               <Button 
                onClick={openCreateDialog} 
                variant="outline" 
                className="mt-6"
               >
                 Tocar para crear la primera
               </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Editar Regla de Precios' : 'Nueva Regla de Precios'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="col-span-full">
              <Label htmlFor="name">Nombre de la regla (Ej: Happy Hour Jueves) *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2"
                placeholder="Nombre para identificar la regla"
              />
            </div>

            <div className="col-span-full">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Tipo de Ajuste</Label>
              <Select
                value={formData.discount_type}
                onValueChange={(value) => setFormData({ ...formData, discount_type: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Tipo de descuento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                  <SelectItem value="fixed">Valor Fijo ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="value">Valor de descuento *</Label>
              <Input
                id="value"
                type="number"
                min="0"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                className="mt-2"
              />
            </div>

            <div className="col-span-full border-t pt-4 mt-2">
              <h4 className="font-medium mb-3 flex items-center gap-2"><Clock className="w-4 h-4"/> Rango de Tiempo</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Hora Inicio</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Hora Fin</Label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="mt-2"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <Label>Días de la semana que aplica</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={formData.days_of_week.includes(day.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToggleDay(day.value)}
                      className="rounded-full"
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-full border-t pt-4">
              <h4 className="font-medium mb-3">Audiencia Objetivo</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Aplica a</Label>
                    <Select
                        value={formData.target_type}
                        onValueChange={(value) => setFormData({ ...formData, target_type: value, target_id: "" })}
                    >
                        <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">Todo el Catálogo</SelectItem>
                        <SelectItem value="category">Categoría Específica</SelectItem>
                        <SelectItem value="product">Producto Específico</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
                  {formData.target_type !== 'all' && (
                    <div>
                        <Label>ID / Nombre Objetivo</Label>
                        <Input
                            placeholder={formData.target_type === 'category' ? "Ej: granizado" : "ID de producto"}
                            value={formData.target_id}
                            onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                            className="mt-2"
                        />
                    </div>
                  )}
              </div>
            </div>

            <div className="col-span-full flex items-center space-x-2 border-t pt-4">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer border-gray-300"
              />
              <Label htmlFor="active" className="cursor-pointer">
                Activar Regla
              </Label>
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveRule} className="gradient-primary">
              {editingRule ? 'Actualizar Regla' : 'Crear Regla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
