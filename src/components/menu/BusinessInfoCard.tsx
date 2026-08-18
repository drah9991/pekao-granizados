import { ExternalLink, Sliders } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DigitalMenuConfigForm } from "@/hooks/useDigitalMenuConfigForm";

interface BusinessInfoCardProps {
  form: DigitalMenuConfigForm;
  businessUrl: string;
}

/**
 * Card "Información del Negocio" del tab de configuración del Menú Digital
 * (nombre/tema/funcionalidad/tipo de cocina/dirección/teléfonos/mesa por
 * defecto y el constructor de tema personalizado), extraída de
 * src/pages/DigitalMenu.tsx sin cambios de comportamiento.
 */
export function BusinessInfoCard({ form, businessUrl }: BusinessInfoCardProps) {
  const {
    formTheme, setFormTheme,
    functionality, setFunctionality,
    kitchenType, setKitchenType,
    commercialName, setCommercialName,
    address, setAddress,
    phones, setPhones,
    defaultTable, setDefaultTable,
    customBgColor, setCustomBgColor,
    customPrimaryColor, setCustomPrimaryColor,
    customTextColor, setCustomTextColor,
    customBgStyle, setCustomBgStyle,
    customFont, setCustomFont,
  } = form;

  return (
    <Card className="lg:col-span-8 bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
      <CardHeader className="p-0 pb-4 mb-4 border-b border-white/5">
        <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground">
          Información del Negocio
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-1">
          <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Enlace de tu menú digital:</span>
          <a
            href={businessUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 break-all"
          >
            {businessUrl} <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest">Elige un tema para tu Menú Digital</Label>
            <select
              value={formTheme}
              onChange={(e) => setFormTheme(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
            >
              <option value="tema-1">Tema 1 (Pekao Cyber)</option>
              <option value="tema-2">Tema 2 (Azul gamer)</option>
              <option value="tema-3">Tema 3 (Sunset Mango)</option>
              <option value="tema-4">Tema 4 (Nature Fresh)</option>
              <option value="tema-5">Tema 5 (Ice Spark)</option>
              <option value="personalizado">Personalizado / Crear Tema</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest">Funcionalidad del Menú Digital</Label>
            <select
              value={functionality}
              onChange={(e) => setFunctionality(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
            >
              <option value="visualizacion">Sólo visualización de carta</option>
              <option value="pedidos">Para toma de pedidos</option>
            </select>
          </div>
        </div>

        {/* Panel Especial: Personalizador de Tema Cromático */}
        {formTheme === "personalizado" && (
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4 animate-pro-in">
            <div className="flex items-center gap-2 border-b border-primary/10 pb-2 mb-2">
              <Sliders className="w-4 h-4 text-primary" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary italic">Constructor de Temas Personalizados</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-300">Color de Fondo</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={customBgColor}
                    onChange={(e) => setCustomBgColor(e.target.value)}
                    className="w-8 h-8 p-0 rounded-md border-0 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono font-bold uppercase">{customBgColor}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-300">Color Primario / Acento</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={customPrimaryColor}
                    onChange={(e) => setCustomPrimaryColor(e.target.value)}
                    className="w-8 h-8 p-0 rounded-md border-0 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono font-bold uppercase">{customPrimaryColor}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-300">Color de Texto</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={customTextColor}
                    onChange={(e) => setCustomTextColor(e.target.value)}
                    className="w-8 h-8 p-0 rounded-md border-0 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono font-bold uppercase">{customTextColor}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-300">Estilo de Fondo</Label>
                <select
                  value={customBgStyle}
                  onChange={(e) => setCustomBgStyle(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs text-foreground"
                >
                  <option value="liso">Fondo Liso / Plano</option>
                  <option value="classic">Chalkboard (Papel arrugado)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] font-bold uppercase tracking-wider text-slate-300">Tipografía</Label>
                <select
                  value={customFont}
                  onChange={(e) => setCustomFont(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs text-foreground"
                >
                  <option value="sans">Sans (Moderna / Limpia)</option>
                  <option value="space-grotesk">Space Grotesk (Gamer / Digital)</option>
                  <option value="caveat">Caveat (Manuscrito / Cálido)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest">Tipo de Cocina</Label>
            <select
              value={kitchenType}
              onChange={(e) => setKitchenType(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
            >
              <option value="Jugos y licuados">Jugos y licuados</option>
              <option value="Comida Rápida">Comida Rápida</option>
              <option value="Cafetería">Cafetería</option>
              <option value="Bebidas / Granizados">Bebidas / Granizados</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest">Nombre Comercial</Label>
            <Input
              value={commercialName}
              onChange={(e) => setCommercialName(e.target.value)}
              className="bg-slate-900 border-white/10 rounded-lg text-xs"
              placeholder="Nombre comercial de la tienda"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest">Dirección del Negocio</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="bg-slate-900 border-white/10 rounded-lg text-xs"
              placeholder="Dirección física"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest">Teléfono(s)</Label>
            <Input
              value={phones}
              onChange={(e) => setPhones(e.target.value)}
              className="bg-slate-900 border-white/10 rounded-lg text-xs"
              placeholder="Teléfonos de contacto"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest">Mesa Por Defecto</Label>
            <select
              value={defaultTable}
              onChange={(e) => setDefaultTable(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
            >
              <option value="Mesa 1">Mesa 1</option>
              <option value="Mesa 2">Mesa 2</option>
              <option value="Mesa 3">Mesa 3</option>
              <option value="Mesa 4">Mesa 4</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
