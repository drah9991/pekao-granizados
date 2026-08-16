import React from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, History } from "lucide-react";
import { motion } from "framer-motion";
import { useUnits } from "@/hooks/useUnits";

export default function Units() {
  const {
    units,
    loading,
    dialogOpen,
    setDialogOpen,
    selectedUnit,
    unitName,
    setUnitName,
    handleOpenCreate,
    handleOpenEdit,
    handleSave,
    handleDelete,
  } = useUnits();

  return (
    <Layout>
      <div className="min-h-screen bg-transparent text-foreground p-6 lg:p-10 space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter mb-1 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent italic uppercase font-space-grotesk">
              UNIDADES
            </h1>
            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
              Gestión de Unidades de Medida de Inventario
            </p>
          </div>
          <div className="flex gap-4">
            <Button
              onClick={handleOpenCreate}
              className="bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest px-6 h-12 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" /> Nuevo
            </Button>
            <Button
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-slate-300 font-black text-xs uppercase tracking-widest px-6 h-12 rounded-xl"
            >
              <History className="w-4 h-4 mr-2" /> Ver Historial
            </Button>
          </div>
        </div>

        {/* Table/List */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden shadow-pro">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : units.length === 0 ? (
            <div className="p-16 text-center text-slate-500 font-bold uppercase tracking-wider text-xs">
              No hay unidades configuradas
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5 text-xs font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-4 px-8">Nombre</th>
                  <th className="py-4 px-8 w-60 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => (
                  <tr key={unit.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 px-8 text-xs font-black text-slate-200 uppercase">{unit.name}</td>
                    <td className="py-4 px-8 text-right flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={() => handleOpenEdit(unit)}
                        className="border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white h-9 px-4 rounded-lg text-[10px] font-black uppercase tracking-wider gap-1.5"
                      >
                        <Edit2 className="w-3 h-3" /> Editar
                      </Button>
                      <Button
                        onClick={() => handleDelete(unit.id)}
                        className="bg-rose-600 hover:bg-rose-700 text-white h-9 px-4 rounded-lg text-[10px] font-black uppercase tracking-wider gap-1.5 border-none"
                      >
                        <Trash2 className="w-3 h-3" /> Eliminar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-slate-950 border-white/10 text-white rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-black uppercase tracking-widest text-slate-300">
                {selectedUnit ? "Editar Unidad" : "Nueva Unidad"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre de la Unidad</label>
              <Input
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="Ej: Unidad, Kg, Gr, Litro"
                className="bg-white/5 border-white/10 rounded-xl h-11 text-xs text-white"
              />
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-white/10 text-slate-400 hover:bg-white/5 rounded-xl h-11 text-xs uppercase font-black"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="bg-primary hover:bg-primary/95 text-white rounded-xl h-11 text-xs uppercase font-black"
              >
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
