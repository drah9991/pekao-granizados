import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, Save, FileText, Scan, Hash, Loader2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useConfigStore } from "@/store/useConfigStore";

export default function CopyCenterSettings() {
  const { storeId } = useAuth();
  const updateStoreConfig = useConfigStore((state) => state.updateStoreConfig);
  const storeConfig = useConfigStore((state) => state.storeConfig) as Record<string, any>;

  const [isLoading, setIsLoading] = useState(false);

  // Impresiones (Prints)
  const [printBwLetter, setPrintBwLetter] = useState("500");
  const [printBwLegal, setPrintBwLegal] = useState("500");
  const [printColorLetter, setPrintColorLetter] = useState("1000");
  const [printColorLegal, setPrintColorLegal] = useState("1200");

  // Copias (Copies)
  const [copyBwLetter, setCopyBwLetter] = useState("300");
  const [copyBwLegal, setCopyBwLegal] = useState("500");
  const [copyColorLetter, setCopyColorLetter] = useState("1000");
  const [copyColorLegal, setCopyColorLegal] = useState("1200");
  const [copyCedula, setCopyCedula] = useState("1000");

  const [scanner, setScanner] = useState("500");

  useEffect(() => {
    if (storeConfig && storeConfig.copyCenter?.pricing) {
      const pricing = storeConfig.copyCenter.pricing;
      
      const pPrint = pricing.print || {};
      setPrintBwLetter(pPrint.bw_letter?.toString() || "500");
      setPrintBwLegal(pPrint.bw_legal?.toString() || "500");
      setPrintColorLetter(pPrint.color_letter?.toString() || "1000");
      setPrintColorLegal(pPrint.color_legal?.toString() || "1200");

      const pCopy = pricing.copy || {};
      setCopyBwLetter(pCopy.bw_letter?.toString() || "300");
      setCopyBwLegal(pCopy.bw_legal?.toString() || "500");
      setCopyColorLetter(pCopy.color_letter?.toString() || "1000");
      setCopyColorLegal(pCopy.color_legal?.toString() || "1200");
      setCopyCedula(pCopy.cedula?.toString() || "1000");

      setScanner(pricing.scanner?.toString() || "500");
    }
  }, [storeConfig]);

  const handleSave = async () => {
    if (!storeId) {
      toast.error("No se detectó la sucursal activa.");
      return;
    }
    
    setIsLoading(true);
    try {
      const { data: store } = await supabase
         .from("stores")
         .select("config")
         .eq("id", storeId)
         .single();

      const currentConfig = (store?.config as Record<string, any>) || {};

      const updatedConfig = {
        ...currentConfig,
        copyCenter: {
          ...(currentConfig.copyCenter || {}),
          pricing: {
            print: {
              bw_letter: parseFloat(printBwLetter) || 0,
              bw_legal: parseFloat(printBwLegal) || 0,
              color_letter: parseFloat(printColorLetter) || 0,
              color_legal: parseFloat(printColorLegal) || 0,
            },
            copy: {
              bw_letter: parseFloat(copyBwLetter) || 0,
              bw_legal: parseFloat(copyBwLegal) || 0,
              color_letter: parseFloat(copyColorLetter) || 0,
              color_legal: parseFloat(copyColorLegal) || 0,
              cedula: parseFloat(copyCedula) || 0,
            },
            scanner: parseFloat(scanner) || 0
          }
        }
      };

      await updateStoreConfig(storeId, updatedConfig);
      toast.success("Tarifas del Centro de Copiado actualizadas");
    } catch (error: any) {
      console.error("Error saving copy center settings:", error);
      toast.error("Fallo al guardar la configuración.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-black italic uppercase font-space-grotesk tracking-tight text-white leading-none">Print Center Rules</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500 mt-1 italic">Tarifas de Impresión & Escaneo</p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 px-4 h-9 rounded-full border border-white/10 font-black text-[9px] text-white/40 italic uppercase tracking-widest leading-none">
            <Printer className="w-4 h-4 text-cyan-400" /> Print_SYS
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* PANEL: IMPRESIONES */}
        <Card className="bg-[#1C1F26] border border-white/5 rounded-[2rem] shadow-pro glass-pro p-8 relative overflow-hidden group">
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-fuchsia-500/5 rounded-full blur-3xl group-hover:bg-fuchsia-500/10 transition-colors duration-1000" />
          <CardHeader className="p-0 pb-6 border-b border-white/5 mb-6 bg-transparent relative z-10">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-2xl flex items-center justify-center text-fuchsia-400 shadow-[0_0_15px_rgba(232,121,249,0.2)]">
                    <Printer className="w-6 h-6" />
                </div>
                <div>
                   <CardTitle className="text-xl font-black italic uppercase font-space-grotesk tracking-widest text-white">Impresiones</CardTitle>
                   <CardDescription className="text-[9px] font-bold text-white/20 uppercase tracking-widest italic leading-none">Archivos desde WhatsApp / USB</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-6 relative z-10">
            
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Blanco & Negro</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] uppercase tracking-widest text-white/40 italic">Carta ($)</Label>
                  <Input type="number" value={printBwLetter} onChange={(e) => setPrintBwLetter(e.target.value)} className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] uppercase tracking-widest text-white/40 italic">Oficio ($)</Label>
                  <Input type="number" value={printBwLegal} onChange={(e) => setPrintBwLegal(e.target.value)} className="bg-white/5 border-white/10" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <h4 className="text-[10px] font-bold uppercase text-fuchsia-400 tracking-wider">Full Color</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] uppercase tracking-widest text-white/40 italic">Carta ($)</Label>
                  <Input type="number" value={printColorLetter} onChange={(e) => setPrintColorLetter(e.target.value)} className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] uppercase tracking-widest text-white/40 italic">Oficio ($)</Label>
                  <Input type="number" value={printColorLegal} onChange={(e) => setPrintColorLegal(e.target.value)} className="bg-white/5 border-white/10" />
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* PANEL: COPIAS */}
        <Card className="bg-[#1C1F26] border border-white/5 rounded-[2rem] shadow-pro glass-pro p-8 relative overflow-hidden group">
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-colors duration-1000" />
          <CardHeader className="p-0 pb-6 border-b border-white/5 mb-6 bg-transparent relative z-10">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    <Copy className="w-6 h-6" />
                </div>
                <div>
                   <CardTitle className="text-xl font-black italic uppercase font-space-grotesk tracking-widest text-white">Copias</CardTitle>
                   <CardDescription className="text-[9px] font-bold text-white/20 uppercase tracking-widest italic leading-none">Reproducción física directa</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-6 relative z-10">
            
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Blanco & Negro</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] uppercase tracking-widest text-white/40 italic">Carta ($)</Label>
                  <Input type="number" value={copyBwLetter} onChange={(e) => setCopyBwLetter(e.target.value)} className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] uppercase tracking-widest text-white/40 italic">Oficio ($)</Label>
                  <Input type="number" value={copyBwLegal} onChange={(e) => setCopyBwLegal(e.target.value)} className="bg-white/5 border-white/10" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <h4 className="text-[10px] font-bold uppercase text-cyan-400 tracking-wider">Full Color</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] uppercase tracking-widest text-white/40 italic">Carta ($)</Label>
                  <Input type="number" value={copyColorLetter} onChange={(e) => setCopyColorLetter(e.target.value)} className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] uppercase tracking-widest text-white/40 italic">Oficio ($)</Label>
                  <Input type="number" value={copyColorLegal} onChange={(e) => setCopyColorLegal(e.target.value)} className="bg-white/5 border-white/10" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <h4 className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">Servicios Especiales</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] uppercase tracking-widest text-white/40 italic">Cédula ($)</Label>
                  <Input type="number" value={copyCedula} onChange={(e) => setCopyCedula(e.target.value)} className="bg-white/5 border-white/10" />
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Scanner */}
        <Card className="xl:col-span-2 bg-[#1C1F26] border border-white/5 rounded-[2rem] shadow-pro glass-pro p-8 relative overflow-hidden group">
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors duration-1000" />
          <CardHeader className="p-0 pb-6 border-b border-white/5 mb-6 bg-transparent relative z-10">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.2)]">
                    <Scan className="w-6 h-6" />
                </div>
                <div>
                   <CardTitle className="text-xl font-black italic uppercase font-space-grotesk tracking-widest text-white">Servicios de Escáner</CardTitle>
                   <CardDescription className="text-[9px] font-bold text-white/20 uppercase tracking-widest italic leading-none">Costo de digitalización</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-6 relative z-10">
            <div className="space-y-3 md:w-1/2">
              <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2 flex items-center gap-2">
                <Hash className="w-3 h-3" /> TARIFA POR PÁGINA DIGITALIZADA ($)
              </Label>
              <Input
                type="number"
                value={scanner}
                onChange={(e) => setScanner(e.target.value)}
                className="h-16 bg-white/5 border-white/10 rounded-2xl text-xl font-black italic font-space-grotesk focus:ring-emerald-500/20 shadow-pro"
              />
            </div>
          </CardContent>
        </Card>

      </div>

      <div className="flex justify-end pt-6 border-t border-white/5">
        <Button 
          onClick={handleSave} 
          disabled={isLoading}
          className="h-16 px-12 rounded-2xl bg-cyan-500 text-white font-black italic uppercase tracking-widest text-[10px] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all gap-4 border-none shadow-pro group font-space-grotesk"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" /> }
          {isLoading ? 'SINCRO...' : 'GUARDAR TARIFARIO ✓'}
        </Button>
      </div>
    </motion.div>
  );
}
