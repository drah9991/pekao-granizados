import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Plus } from "lucide-react";
import React from "react";
import { Tables } from "@/integrations/supabase/types";

type Product = Tables<'products'>;

interface ProductImportExportButtonsProps {
  onExport: () => void;
  onImport: () => void;
  onImportFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  importFile: File | null;
  isImporting: boolean;
  importDialogIsOpen: boolean;
  setImportDialogIsOpen: (isOpen: boolean) => void;
  userStoreId: string | null;
  loading: boolean;
  products: Product[];
  openCreateDialog: () => void;
}

export default function ProductImportExportButtons({
  onImport,
  onImportFileChange,
  importFile,
  isImporting,
  importDialogIsOpen,
  setImportDialogIsOpen,
}: ProductImportExportButtonsProps) {
  return (
    <>
      {/* Import Products Dialog */}
      <Dialog open={importDialogIsOpen} onOpenChange={setImportDialogIsOpen}>
        <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto custom-scrollbar bg-background border-white/20 shadow-pro overflow-hidden p-0 rounded-[2.5rem]">
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-8 border-b border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Upload className="w-32 h-32 -rotate-12 translate-x-6 -translate-y-6 text-primary" />
            </div>
            <div className="relative flex items-center gap-4 mb-3">
              <div className="p-3 bg-primary/20 rounded-2xl text-primary border border-primary/20 shadow-glow-pro">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black font-space-grotesk tracking-tighter italic uppercase text-white">
                  IMPORTACIÓN <span className="text-primary text-glow">MASIVA</span>
                </DialogTitle>
                <DialogDescription className="text-primary font-black uppercase text-[10px] tracking-widest mt-1">
                  Sincronización de base de datos vía CSV
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <Label htmlFor="import-file" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 font-space-grotesk">
                Seleccionar Archivo Fuente (.csv)
              </Label>
              <div className="relative group">
                <Input
                  id="import-file"
                  type="file"
                  accept=".csv"
                  onChange={onImportFileChange}
                  className="h-14 bg-white/5 border-white/10 rounded-2xl font-black text-xs focus:border-primary/50 text-white font-space-grotesk italic file:bg-primary/20 file:border-none file:rounded-lg file:text-primary file:text-[9px] file:font-black file:uppercase file:tracking-widest file:mr-4 file:px-3 file:py-1 cursor-pointer hover:bg-white/10 transition-all"
                  disabled={isImporting}
                />
              </div>
              {importFile && (
                <div className="flex items-center gap-3 p-4 glass-pro rounded-2xl border border-primary/20 animate-pro-in">
                    <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                        <Plus className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black italic uppercase text-white tracking-widest">{importFile.name}</p>
                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">LISTO PARA PROCESAR</p>
                    </div>
                </div>
              )}
            </div>
            
            <p className="text-[9px] text-muted-foreground font-dm-sans italic leading-relaxed px-1">
                Asegúrate de que las columnas coincidan con el esquema técnico del sistema (id, name, sku, price, type, etc.) para evitar conflictos de integridad.
            </p>
          </div>

          <DialogFooter className="p-8 pt-0 flex gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setImportDialogIsOpen(false)}
              disabled={isImporting}
              className="flex-1 rounded-[1.5rem] appetite-accent-muted border-none font-black uppercase tracking-widest text-[10px] h-14 font-space-grotesk italic cursor-pointer"
            >
              CANCELAR
            </Button>
            <Button
              onClick={onImport}
              disabled={isImporting || !importFile}
              className="flex-1 rounded-[1.5rem] bg-white text-black hover:bg-primary hover:text-white font-black uppercase tracking-widest text-[10px] shadow-glow-pro active:scale-95 transition-all h-14 font-space-grotesk italic border-none cursor-pointer"
            >
              {isImporting ? (
                  <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      PROCESANDO...
                  </div>
              ) : "INICIAR SYNC"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}