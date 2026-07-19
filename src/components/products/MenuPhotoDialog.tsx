import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, UploadCloud, FolderOpen, Wand2, ArrowRight, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuPhotoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string | null;
  onSuccess?: () => void;
}

interface ExtractedProduct {
  name: string;
  price: number;
  category: string;
}

export default function MenuPhotoDialog({
  isOpen,
  onClose,
  storeId,
  onSuccess
}: MenuPhotoDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedProducts, setExtractedProducts] = useState<ExtractedProduct[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleStartAnalysis = () => {
    if (!selectedFile) {
      toast.error("Por favor seleccione un archivo para analizar");
      return;
    }

    setIsAnalyzing(true);
    // Simulate AI reading the menu photo (Gemini extraction simulation)
    setTimeout(() => {
      setExtractedProducts([
        { name: "GRANIZADO COCO LOCO", price: 8500, category: "Granizados" },
        { name: "GRANIZADO MANGO BENTON", price: 9000, category: "Granizados" },
        { name: "TOPPING M&M GLOW", price: 1500, category: "Toppings" },
        { name: "SACHET DE CEREZA", price: 1200, category: "Sachets" }
      ]);
      setStep(2);
      setIsAnalyzing(false);
      toast.success("Análisis completado: 4 productos detectados");
    }, 3000);
  };

  const handleProductChange = (index: number, key: keyof ExtractedProduct, value: any) => {
    setExtractedProducts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };

  const handleRemoveProduct = (index: number) => {
    setExtractedProducts(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateProducts = async () => {
    if (!storeId) {
      toast.error("No se ha seleccionado ninguna sucursal");
      return;
    }

    setIsCreating(true);
    try {
      // Fetch default active categories to match names or create new ones
      const { data: dbCats } = await supabase.from("categories").select("id, name");

      const insertPromises = extractedProducts.map(async (prod) => {
        // Try to match category name
        let categoryId = null;
        const matched = (dbCats || []).find(c => c.name.toLowerCase() === prod.category.toLowerCase());
        if (matched) {
          categoryId = matched.id;
        } else {
          // Auto create missing category if needed, or fallback
        }

        return supabase.from("products").insert({
          name: prod.name,
          price: prod.price,
          category: prod.category,
          category_id: categoryId,
          store_id: storeId,
          type: prod.category.toLowerCase().includes("granizado") ? "granizado" : "topping",
          active: true,
          images: []
        });
      });

      const results = await Promise.all(insertPromises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error("Ocurrió un error al guardar algunos productos");
      }

      toast.success("Productos creados exitosamente en catálogo");
      if (onSuccess) onSuccess();
      handleReset();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Error al crear los productos");
    } finally {
      setIsCreating(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedFile(null);
    setExtractedProducts([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[92dvh] overflow-y-auto bg-[#070913] border border-[#FF007F]/40 shadow-[0_0_25px_rgba(255,0,127,0.25)] p-0 rounded-3xl text-slate-300 font-space-grotesk italic dialog-cyberpunk">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-[#FF007F]/20 bg-[#FF007F]/[0.02] dialog-cyberpunk-header">
          <DialogTitle className="text-lg font-black tracking-widest text-white uppercase dialog-cyberpunk-title flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#FF007F]" />
            Importar productos desde foto o PDF
          </DialogTitle>
        </div>

        {/* Wizard Steps indicator bar */}
        <div className="px-8 py-4 bg-white/[0.01] border-b border-white/5 flex items-center justify-between gap-4">
          {[
            { num: 1, label: "Cargar archivo" },
            { num: 2, label: "Revisar productos" },
            { num: 3, label: "Crear productos" }
          ].map((s) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div key={s.num} className="flex items-center gap-2.5">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all",
                  isActive
                    ? "bg-[#FF007F] text-white shadow-[0_0_8px_rgba(255,0,127,0.4)]"
                    : isCompleted
                    ? "bg-[#00F0FF] text-black"
                    : "bg-white/5 border border-white/10 text-slate-500"
                )}>
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  isActive ? "text-white" : "text-slate-500"
                )}>
                  {s.label}
                </span>
                {s.num < 3 && <div className="w-8 sm:w-16 h-[1px] bg-white/5" />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="p-8 space-y-6">
            <div className="border border-dashed border-[#00F0FF]/30 hover:border-[#00F0FF]/60 bg-white/[0.01] rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-4 transition-all duration-300 relative group">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 relative">
                <UploadCloud className="w-8 h-8 text-[#00F0FF] drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase text-white tracking-wider">
                  {selectedFile ? selectedFile.name : "Seleccione un archivo"}
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase">
                  {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : "Foto del menú o documento PDF"}
                </p>
              </div>
              
              <Button
                type="button"
                className="pointer-events-none bg-[#FF007F] text-white text-[10px] font-black uppercase tracking-widest px-6 h-10 rounded-xl shadow-[0_0_12px_rgba(255,0,127,0.4)]"
              >
                <FolderOpen className="w-3.5 h-3.5 mr-2" />
                Seleccionar archivo
              </Button>
              <span className="text-[9px] text-slate-600 block">JPG, PNG, WEBP • PDF • Máx. 10MB</span>
            </div>
          </div>
        )}

        {/* Step 2: Edit Extracted list */}
        {step === 2 && (
          <div className="p-8 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Productos detectados (Puedes editarlos antes de crear)
              </Label>
              <Button
                onClick={() => setStep(3)}
                className="h-8 bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 border border-[#00F0FF]/20 text-[#00F0FF] text-[9px] font-black uppercase tracking-widest rounded-lg"
              >
                Continuar <ArrowRight className="w-3 h-3 ml-1.5" />
              </Button>
            </div>

            <div className="space-y-2.5 max-h-[40dvh] overflow-y-auto pr-1">
              {extractedProducts.map((prod, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.01] items-end">
                  <div className="sm:col-span-6 space-y-1.5">
                    <Label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Nombre del producto</Label>
                    <Input
                      value={prod.name}
                      onChange={(e) => handleProductChange(index, "name", e.target.value)}
                      className="h-9 bg-white/5 border-white/10 text-xs font-black uppercase text-white"
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-1.5">
                    <Label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Precio ($)</Label>
                    <Input
                      type="number"
                      value={prod.price}
                      onChange={(e) => handleProductChange(index, "price", parseFloat(e.target.value) || 0)}
                      className="h-9 bg-white/5 border-white/10 text-xs text-white"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Categoría</Label>
                    <Input
                      value={prod.category}
                      onChange={(e) => handleProductChange(index, "category", e.target.value)}
                      className="h-9 bg-white/5 border-white/10 text-xs font-bold uppercase text-white"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-center">
                    <button
                      onClick={() => handleRemoveProduct(index)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Final confirmation review */}
        {step === 3 && (
          <div className="p-8 space-y-4">
            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-3">
              <Check className="w-6 h-6 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              <div>
                <span className="font-black uppercase tracking-wider block mb-1">Todo listo para guardar</span>
                Se crearán {extractedProducts.length} productos detectados en tu catálogo técnico de sucursal.
              </div>
            </div>

            <div className="rounded-xl border border-white/5 divide-y divide-white/5 max-h-[30dvh] overflow-y-auto">
              {extractedProducts.map((p, i) => (
                <div key={i} className="flex justify-between items-center px-5 py-3 text-xs font-black uppercase tracking-wider">
                  <span className="text-white">{p.name}</span>
                  <span className="text-cyber-pink">${p.price.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="p-8 pt-0 flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={step === 1 ? onClose : () => setStep((prev) => (prev - 1) as any)}
            disabled={isAnalyzing || isCreating}
            className="flex-1 h-11 text-xs font-black uppercase tracking-widest rounded-xl dialog-cyberpunk-close-btn border-red-500/20 text-red-500 hover:text-white hover:bg-red-500/10 cursor-pointer"
          >
            {step === 1 ? "Cancelar" : "Atrás"}
          </Button>

          {step === 1 && (
            <Button
              type="button"
              onClick={handleStartAnalysis}
              disabled={isAnalyzing || !selectedFile}
              className="flex-1 h-11 text-white text-xs font-black uppercase tracking-widest rounded-xl active:scale-[0.98] transition-all border-none dialog-cyberpunk-save-btn cursor-pointer"
            >
              {isAnalyzing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ANALIZANDO MENÚ...
                </div>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Analizar menú
                </>
              )}
            </Button>
          )}

          {step === 2 && (
            <Button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 h-11 text-white text-xs font-black uppercase tracking-widest rounded-xl active:scale-[0.98] transition-all border-none dialog-cyberpunk-save-btn cursor-pointer"
            >
              Continuar <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          {step === 3 && (
            <Button
              type="button"
              onClick={handleCreateProducts}
              disabled={isCreating}
              className="flex-1 h-11 text-white text-xs font-black uppercase tracking-widest rounded-xl active:scale-[0.98] transition-all border-none dialog-cyberpunk-save-btn cursor-pointer"
            >
              {isCreating ? "Creando..." : "Crear productos // Commit"}
            </Button>
          )}
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
