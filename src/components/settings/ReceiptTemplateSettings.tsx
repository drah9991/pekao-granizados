import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Receipt, Save, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TemplateData {
  header: {
    show_logo: boolean;
    show_store_name: boolean;
    show_address: boolean;
    show_phone: boolean;
  };
  body: {
    show_date: boolean;
    show_order_number: boolean;
    show_cashier: boolean;
    show_items: boolean;
    show_totals: boolean;
  };
  footer: {
    message: string;
    show_social_media: boolean;
    show_qr_survey: boolean;
    qr_survey_url: string;
  };
}

export default function ReceiptTemplateSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [storeId, setStoreId] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");
  const [templateData, setTemplateData] = useState<TemplateData>({
    header: {
      show_logo: true,
      show_store_name: true,
      show_address: true,
      show_phone: true,
    },
    body: {
      show_date: true,
      show_order_number: true,
      show_cashier: true,
      show_items: true,
      show_totals: true,
    },
    footer: {
      message: "¡Gracias por tu compra!",
      show_social_media: false,
      show_qr_survey: false,
      qr_survey_url: "",
    },
  });

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();

      if (!profile?.store_id) return;
      setStoreId(profile.store_id);

      const { data: template } = await supabase
        .from('receipt_templates')
        .select('*')
        .eq('store_id', profile.store_id)
        .eq('is_default', true)
        .single();

      if (template) {
        setTemplateId(template.id);
        setTemplateData(template.template_data as unknown as TemplateData);
      }
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (templateId) {
        // Update existing template
        const { error } = await supabase
          .from('receipt_templates')
          .update({ template_data: templateData as any })
          .eq('id', templateId);

        if (error) throw error;
      } else {
        // Create new template
        const { error } = await supabase
          .from('receipt_templates')
          .insert([{
            store_id: storeId,
            name: 'Plantilla Principal',
            template_data: templateData as any,
            is_default: true,
          }]);

        if (error) throw error;
      }

      toast.success('Plantilla de recibo actualizada');
      loadTemplate();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTemplateSection = (section: 'header' | 'body' | 'footer', field: string, value: any) => {
    setTemplateData({
      ...templateData,
      [section]: {
        ...templateData[section],
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Editor de Plantilla de Recibo</h2>
        <p className="text-muted-foreground">
          Personaliza qué elementos aparecen en tus recibos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <div className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Encabezado del Recibo</CardTitle>
              <CardDescription>Elementos superiores del recibo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-logo">Mostrar Logo</Label>
                <Switch
                  id="show-logo"
                  checked={templateData.header.show_logo}
                  onCheckedChange={(checked) => updateTemplateSection('header', 'show_logo', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-store-name">Mostrar Nombre de Tienda</Label>
                <Switch
                  id="show-store-name"
                  checked={templateData.header.show_store_name}
                  onCheckedChange={(checked) => updateTemplateSection('header', 'show_store_name', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-address">Mostrar Dirección</Label>
                <Switch
                  id="show-address"
                  checked={templateData.header.show_address}
                  onCheckedChange={(checked) => updateTemplateSection('header', 'show_address', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-phone">Mostrar Teléfono</Label>
                <Switch
                  id="show-phone"
                  checked={templateData.header.show_phone}
                  onCheckedChange={(checked) => updateTemplateSection('header', 'show_phone', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle>Cuerpo del Recibo</CardTitle>
              <CardDescription>Información principal de la venta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-date">Mostrar Fecha y Hora</Label>
                <Switch
                  id="show-date"
                  checked={templateData.body.show_date}
                  onCheckedChange={(checked) => updateTemplateSection('body', 'show_date', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-order">Mostrar # de Pedido</Label>
                <Switch
                  id="show-order"
                  checked={templateData.body.show_order_number}
                  onCheckedChange={(checked) => updateTemplateSection('body', 'show_order_number', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-cashier">Mostrar Cajero</Label>
                <Switch
                  id="show-cashier"
                  checked={templateData.body.show_cashier}
                  onCheckedChange={(checked) => updateTemplateSection('body', 'show_cashier', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle>Pie de Página</CardTitle>
              <CardDescription>Mensaje final y elementos adicionales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="footer-message">Mensaje de Agradecimiento</Label>
                <Textarea
                  id="footer-message"
                  value={templateData.footer.message}
                  onChange={(e) => updateTemplateSection('footer', 'message', e.target.value)}
                  placeholder="¡Gracias por tu compra!"
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-social">Mostrar Redes Sociales</Label>
                <Switch
                  id="show-social"
                  checked={templateData.footer.show_social_media}
                  onCheckedChange={(checked) => updateTemplateSection('footer', 'show_social_media', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-qr">Mostrar QR de Encuesta</Label>
                <Switch
                  id="show-qr"
                  checked={templateData.footer.show_qr_survey}
                  onCheckedChange={(checked) => updateTemplateSection('footer', 'show_qr_survey', checked)}
                />
              </div>
              {templateData.footer.show_qr_survey && (
                <div className="space-y-2">
                  <Label htmlFor="qr-url">URL de Encuesta</Label>
                  <Input
                    id="qr-url"
                    value={templateData.footer.qr_survey_url}
                    onChange={(e) => updateTemplateSection('footer', 'qr_survey_url', e.target.value)}
                    placeholder="https://forms.gle/..."
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Vista Previa del Recibo
              </CardTitle>
              <CardDescription>
                Así se verá tu recibo impreso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-xl p-6 bg-white text-black font-mono text-xs space-y-4">
                {/* Header */}
                {templateData.header.show_logo && (
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto bg-muted rounded-lg flex items-center justify-center">
                      <Receipt className="w-12 h-12 text-muted-foreground" />
                    </div>
                  </div>
                )}
                {templateData.header.show_store_name && (
                  <div className="text-center font-bold text-sm">
                    PEKAO GRANIZADOS
                  </div>
                )}
                {templateData.header.show_address && (
                  <div className="text-center text-xs">
                    Calle 123 #45-67, Barrio Centro
                  </div>
                )}
                {templateData.header.show_phone && (
                  <div className="text-center text-xs">
                    Tel: +57 300 123 4567
                  </div>
                )}
                
                <div className="border-t border-dashed border-gray-400 my-4"></div>
                
                {/* Body */}
                {templateData.body.show_date && (
                  <div>Fecha: 15/12/2024 14:30</div>
                )}
                {templateData.body.show_order_number && (
                  <div>Pedido: #1001</div>
                )}
                {templateData.body.show_cashier && (
                  <div>Cajero: Juan Pérez</div>
                )}
                
                <div className="border-t border-dashed border-gray-400 my-4"></div>
                
                {templateData.body.show_items && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>1x Granizado Fresa (M)</span>
                      <span>$8,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>  + Leche Condensada</span>
                      <span>$1,000</span>
                    </div>
                  </div>
                )}
                
                <div className="border-t border-dashed border-gray-400 my-4"></div>
                
                {templateData.body.show_totals && (
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>$9,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IVA (19%):</span>
                      <span>$1,710</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm">
                      <span>TOTAL:</span>
                      <span>$10,710</span>
                    </div>
                  </div>
                )}
                
                <div className="border-t border-dashed border-gray-400 my-4"></div>
                
                {/* Footer */}
                <div className="text-center text-xs space-y-2">
                  <div>{templateData.footer.message}</div>
                  {templateData.footer.show_social_media && (
                    <div>
                      <div>Síguenos en @pekaogranizados</div>
                    </div>
                  )}
                  {templateData.footer.show_qr_survey && (
                    <div className="flex justify-center mt-4">
                      <div className="w-20 h-20 bg-muted rounded flex items-center justify-center">
                        <span className="text-xs">QR</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={isLoading}
          className="gradient-primary text-white px-8"
        >
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? 'Guardando...' : 'Guardar Plantilla'}
        </Button>
      </div>
    </div>
  );
}
