import { Sliders } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface CustomThemeBuilderProps {
  customBgColor: string;
  setCustomBgColor: (value: string) => void;
  customPrimaryColor: string;
  setCustomPrimaryColor: (value: string) => void;
  customTextColor: string;
  setCustomTextColor: (value: string) => void;
  customBgStyle: string;
  setCustomBgStyle: (value: string) => void;
  customFont: string;
  setCustomFont: (value: string) => void;
}

export function CustomThemeBuilder({
  customBgColor,
  setCustomBgColor,
  customPrimaryColor,
  setCustomPrimaryColor,
  customTextColor,
  setCustomTextColor,
  customBgStyle,
  setCustomBgStyle,
  customFont,
  setCustomFont
}: CustomThemeBuilderProps) {
  return (
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
  );
}
