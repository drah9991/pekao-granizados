import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { motion } from "framer-motion";

interface DocumentSettingsTabProps {
  docType: string; setDocType: (v: string) => void;
  docPrefix: string; setDocPrefix: (v: string) => void;
  docStartNumber: string; setDocStartNumber: (v: string) => void;
  docTipPercentage: string; setDocTipPercentage: (v: string) => void;
  docNameInDoc: string; setDocNameInDoc: (v: string) => void;
  docNote1: string; setDocNote1: (v: string) => void;
  docNote2: string; setDocNote2: (v: string) => void;
  docNote3: string; setDocNote3: (v: string) => void;
  docTemplate: string; setDocTemplate: (v: string) => void;
  docFontSize: string; setDocFontSize: (v: string) => void;
  showPrintWindow: boolean; setShowPrintWindow: (v: boolean) => void;
  showDocLogo: boolean; setShowDocLogo: (v: boolean) => void;
  showTotalInLetters: boolean; setShowTotalInLetters: (v: boolean) => void;
  useTurns: boolean; setUseTurns: (v: boolean) => void;
  printAnotherPage: boolean; setPrintAnotherPage: (v: boolean) => void;
  showPriceBeforeTax: boolean; setShowPriceBeforeTax: (v: boolean) => void;
}

/**
 * Subtab "Documento" de BusinessSettings.tsx, extraída sin cambios de
 * comportamiento.
 */
export function DocumentSettingsTab({
  docType, setDocType,
  docPrefix, setDocPrefix,
  docStartNumber, setDocStartNumber,
  docTipPercentage, setDocTipPercentage,
  docNameInDoc, setDocNameInDoc,
  docNote1, setDocNote1,
  docNote2, setDocNote2,
  docNote3, setDocNote3,
  docTemplate, setDocTemplate,
  docFontSize, setDocFontSize,
  showPrintWindow, setShowPrintWindow,
  showDocLogo, setShowDocLogo,
  showTotalInLetters, setShowTotalInLetters,
  useTurns, setUseTurns,
  printAnotherPage, setPrintAnotherPage,
  showPriceBeforeTax, setShowPriceBeforeTax,
}: DocumentSettingsTabProps) {
  return (
    <motion.div
      key="document"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="space-y-6"
    >
      <Card className="bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
        <CardHeader className="p-0 pb-4 mb-6 border-b border-white/5">
          <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground">Parámetros de Documento de Venta</CardTitle>
          <CardDescription className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest italic leading-none font-space-grotesk mt-1">Configura prefijos, notas y la visualización de la factura/tiquete</CardDescription>
        </CardHeader>
        <CardContent className="p-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Tipo de documento</Label>
              <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-foreground">
                <option value="Factura">Factura</option>
                <option value="Tiquete POS">Tiquete POS</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Prefijo</Label>
              <Input value={docPrefix} onChange={(e) => setDocPrefix(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300"># de inicio</Label>
              <Input type="number" value={docStartNumber} onChange={(e) => setDocStartNumber(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">% de propina sugerida</Label>
              <Input type="number" value={docTipPercentage} onChange={(e) => setDocTipPercentage(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Nombre de documento en documento</Label>
              <Input value={docNameInDoc} onChange={(e) => setDocNameInDoc(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Nota 1</Label>
              <Input value={docNote1} onChange={(e) => setDocNote1(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" placeholder="Nota de pie de página" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Nota 2</Label>
              <Input value={docNote2} onChange={(e) => setDocNote2(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Nota 3</Label>
              <Input value={docNote3} onChange={(e) => setDocNote3(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Plantilla</Label>
              <select value={docTemplate} onChange={(e) => setDocTemplate(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-foreground">
                <option value="Tiquete">Tiquete (80mm)</option>
                <option value="Carta">Carta (A4)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Tamaño texto items</Label>
              <select value={docFontSize} onChange={(e) => setDocFontSize(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-foreground">
                <option value="10px">10px</option>
                <option value="12px">12px</option>
                <option value="14px">14px</option>
              </select>
            </div>
          </div>

          {/* Checkboxes Documento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-white/5">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="show-print" checked={showPrintWindow} onChange={(e) => setShowPrintWindow(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary cursor-pointer" />
              <Label htmlFor="show-print" className="text-xs text-slate-300 cursor-pointer font-bold">Mostrar ventana de impresión</Label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="show-logo" checked={showDocLogo} onChange={(e) => setShowDocLogo(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary cursor-pointer" />
              <Label htmlFor="show-logo" className="text-xs text-slate-300 cursor-pointer font-bold">Mostrar Logo</Label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="total-letters" checked={showTotalInLetters} onChange={(e) => setShowTotalInLetters(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary cursor-pointer" />
              <Label htmlFor="total-letters" className="text-xs text-slate-300 cursor-pointer font-bold">Mostrar total en letras</Label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="use-turns-check" checked={useTurns} onChange={(e) => setUseTurns(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary cursor-pointer" />
              <Label htmlFor="use-turns-check" className="text-xs text-slate-300 cursor-pointer font-bold">Utilizar turnos</Label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="print-other" checked={printAnotherPage} onChange={(e) => setPrintAnotherPage(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary cursor-pointer" />
              <Label htmlFor="print-other" className="text-xs text-slate-300 cursor-pointer font-bold">Imprimir en otra página</Label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="before-tax" checked={showPriceBeforeTax} onChange={(e) => setShowPriceBeforeTax(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary cursor-pointer" />
              <Label htmlFor="before-tax" className="text-xs text-slate-300 cursor-pointer font-bold">Mostrar valor de productos antes de impuestos</Label>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Button variant="outline" className="border-white/10 bg-white/5 font-space-grotesk text-xs uppercase tracking-widest px-6 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Vista Previa
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
