import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RotateCcw } from "lucide-react";
import { useCategoryManager } from "@/hooks/useCategoryManager";
import { CategoryTable } from "@/components/settings/CategoryTable";
import { CategoryFormDialog } from "@/components/settings/CategoryFormDialog";

export default function CategoryManager() {
  const cm = useCategoryManager();

  return (
    <div className="space-y-6 w-full animate-pro-in text-slate-800 dark:text-slate-100">

      {/* Título Centrado */}
      <div className="text-center py-4">
        <h2 className="text-xl sm:text-2xl font-black font-space-grotesk tracking-widest uppercase text-slate-900 dark:text-white">
          Categorías
        </h2>
      </div>

      {/* Controles de Búsqueda y Botones de Creación */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Label htmlFor="search-cat" className="text-xs font-bold uppercase tracking-wider text-slate-500 shrink-0">Buscar:</Label>
          <div className="relative flex-1 sm:w-64">
            <Input
              id="search-cat"
              value={cm.searchQuery}
              onChange={(e) => cm.setSearchQuery(e.target.value)}
              className="h-9 bg-slate-900/10 dark:bg-white/5 border-white/10 rounded-lg text-xs"
              placeholder=""
            />
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <Button
            onClick={cm.openCreateDialog}
            className="h-9 px-5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-full border-none shadow-sm cursor-pointer"
          >
            Nueva
          </Button>
          <Button
            variant="outline"
            className="h-9 px-5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-full border-none shadow-sm cursor-pointer"
            onClick={cm.fetchCategories}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Ver Historial
          </Button>
        </div>
      </div>

      <CategoryTable
        loading={cm.loading}
        filteredCategories={cm.filteredCategories}
        paginatedCategories={cm.paginatedCategories}
        currentPage={cm.currentPage}
        setCurrentPage={cm.setCurrentPage}
        totalPages={cm.totalPages}
        openEditDialog={cm.openEditDialog}
        handleDeleteCategory={cm.handleDeleteCategory}
      />

      <CategoryFormDialog
        dialogIsOpen={cm.dialogIsOpen}
        setDialogIsOpen={cm.setDialogIsOpen}
        editingCategory={cm.editingCategory}
        isProcessing={cm.isProcessing}
        isUploading={cm.isUploading}
        imageUrlValue={cm.imageUrlValue}
        register={cm.register}
        handleSubmit={cm.handleSubmit}
        setValue={cm.setValue}
        watch={cm.watch}
        errors={cm.errors}
        onSubmit={cm.onSubmit}
        handleImageUpload={cm.handleImageUpload}
        removeImage={cm.removeImage}
      />
    </div>
  );
}
