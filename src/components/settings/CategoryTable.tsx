import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Category } from "@/lib/pos-types";

interface CategoryTableProps {
  loading: boolean;
  filteredCategories: Category[];
  paginatedCategories: Category[];
  currentPage: number;
  setCurrentPage: (updater: number | ((prev: number) => number)) => void;
  totalPages: number;
  openEditDialog: (category: Category) => void;
  handleDeleteCategory: (category: Category) => void;
}

/**
 * Tabla de categorías con paginación de CategoryManager.tsx, extraída
 * sin cambios de comportamiento.
 */
export function CategoryTable({
  loading,
  filteredCategories,
  paginatedCategories,
  currentPage,
  setCurrentPage,
  totalPages,
  openEditDialog,
  handleDeleteCategory,
}: CategoryTableProps) {
  return (
    <Card className="bg-transparent border-0 shadow-none overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="border-0">
            <TableHeader className="bg-slate-900/5 dark:bg-white/[0.02] border-b border-white/10">
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="w-20"></TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 h-11">Nombre</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 h-11">Descripción</TableHead>
                <TableHead className="w-24 text-xs font-bold uppercase tracking-wider text-slate-500 h-11 text-center">Estado</TableHead>
                <TableHead className="w-48 h-11"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <TableRow className="hover:bg-transparent border-0">
                  <TableCell colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Cargando Categorías...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredCategories.length === 0 ? (
                <TableRow className="hover:bg-transparent border-0">
                  <TableCell colSpan={5} className="py-20 text-center text-slate-400 font-medium text-sm">
                    No hay categorías registradas que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCategories.map((cat) => (
                  <TableRow key={cat.id} className="border-0 hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors h-14">

                    {/* Imagen Miniatura Circular */}
                    <TableCell className="py-2.5 pl-4">
                      <div className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center overflow-hidden bg-slate-900/50">
                        {cat.image_url ? (
                          <img
                            src={cat.image_url}
                            alt={cat.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm">🍔</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Nombre */}
                    <td className="py-2.5 font-semibold text-xs text-slate-900 dark:text-slate-100">
                      {cat.name}
                    </td>

                    {/* Descripción */}
                    <td className="py-2.5 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {cat.description || "—"}
                    </td>

                    {/* Estado rectangular verde/rojo */}
                    <TableCell className="py-2.5 text-center">
                      <Badge
                        className={cn(
                          "rounded-sm text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-0 text-white",
                          cat.is_active
                            ? "bg-emerald-600"
                            : "bg-rose-600"
                        )}
                      >
                        {cat.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>

                    {/* Acciones */}
                    <TableCell className="py-2.5 text-right pr-4">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => openEditDialog(cat)}
                          className="h-8 px-3 rounded-full border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-bold text-rose-600 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3 h-3" /> Editar
                        </Button>
                        <Button
                          onClick={() => handleDeleteCategory(cat)}
                          className="h-8 px-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer border-none shadow-sm"
                        >
                          <Trash2 className="w-3 h-3" /> Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between py-4 border-t border-slate-100 dark:border-white/5 px-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="h-8 rounded-lg text-xs"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="h-8 rounded-lg text-xs"
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
