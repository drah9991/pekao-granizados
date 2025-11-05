import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, Plus } from "lucide-react";
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
  onExport,
  onImport,
  onImportFileChange,
  importFile,
  isImporting,
  importDialogIsOpen,
  setImportDialogIsOpen,
  userStoreId,
  loading,
  products,
  openCreateDialog,
}: ProductImportExportButtonsProps) {
  return (
    <div className="flex gap-2">
      <Button 
        variant="outline"
        className="shadow-card w-full md:w-auto"
        onClick={onExport}
        disabled={loading || products.length === 0}
      >
        <Download className="mr-2 w-5 h-5" />
        Exportar CSV
      </Button>
      <Button 
        variant="outline"
        className="shadow-card w-full md:w-auto"
        onClick={() => setImportDialogIsOpen(true)}
        disabled={!userStoreId}
      >
        <Upload className="mr-2 w-5 h-5" />
        Importar CSV
      </Button>
      <Button 
        className="gradient-primary shadow-glow w-full md:w-auto"
        onClick={openCreateDialog}
        disabled={!userStoreId}
      >
        <Plus className="mr-2 w-5 h-5" />
        Nuevo Producto
      </Button>

      {/* Import Products Dialog */}
      <Dialog open={importDialogIsOpen} onOpenChange={setImportDialogIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Productos (CSV)</DialogTitle>
            <DialogDescription>
              Sube un archivo CSV para importar o actualizar productos.
              Asegúrate de que las columnas coincidan con los campos del producto (id, name, sku, price, type, etc.).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="import-file">Archivo CSV</Label>
              <Input
                id="import-file"
                type="file"
                accept=".csv"
                onChange={onImportFileChange}
                className="mt-2"
                disabled={isImporting}
              />
              {importFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  Archivo seleccionado: {importFile.name}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportDialogIsOpen(false)}
              disabled={isImporting}
            >
              Cancelar
            </Button>
            <Button
              onClick={onImport}
              disabled={isImporting || !importFile}
              className="gradient-primary"
            >
              {isImporting ? "Importando..." : "Confirmar Importación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}