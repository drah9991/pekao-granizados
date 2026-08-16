import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Phone, Mail, MapPin, Globe, UserCheck, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSuppliers } from "@/hooks/useSuppliers";

export default function Suppliers() {
  const {
    suppliers,
    loading,
    dialogOpen,
    setDialogOpen,
    selectedSupplier,
    openCreateDialog,
    openEditDialog,
    handleSave,
    handleDelete,
  } = useSuppliers();

  // Form Inputs (matching Screenshot 2)
  const [name, setName] = useState("");
  const [commercialName, setCommercialName] = useState("");
  const [nitDoc, setNitDoc] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [contactName, setContactName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (selectedSupplier) {
      setName(selectedSupplier.name);
      setCommercialName(selectedSupplier.commercial_name || "");
      setNitDoc(selectedSupplier.nit_doc || "");
      setEmail(selectedSupplier.email || "");
      setPhone(selectedSupplier.phone || "");
      setAddress(selectedSupplier.address || "");
      setWebsite(selectedSupplier.website || "");
      setContactName(selectedSupplier.contact_name || "");
      setNotes(selectedSupplier.notes || "");
    } else {
      setName("");
      setCommercialName("");
      setNitDoc("");
      setEmail("");
      setPhone("");
      setAddress("");
      setWebsite("");
      setContactName("");
      setNotes("");
    }
  }, [selectedSupplier, dialogOpen]);

  const handleOpenCreate = () => {
    openCreateDialog();
  };

  const handleOpenEdit = (sup: typeof suppliers[number]) => {
    openEditDialog(sup);
  };

  const handleSaveClick = () => {
    handleSave({
      name,
      commercialName,
      nitDoc,
      email,
      phone,
      address,
      website,
      contactName,
      notes,
    });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-transparent text-slate-800 dark:text-slate-100 p-4 md:p-8 space-y-8 animate-pro-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 dark:border-white/10 pb-6">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black font-space-grotesk italic tracking-tighter uppercase text-slate-900 dark:text-white">
              Proveedores
            </h1>
            <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-muted-foreground/40 font-space-grotesk italic mt-1">
              Catálogo de Proveedores y Cadena de Suministros
            </p>
          </div>
          <Button
            onClick={handleOpenCreate}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider px-6 h-11 rounded-full border-none shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" /> Nuevo Proveedor
          </Button>
        </div>

        {/* Tabla de Proveedores */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="p-16 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
              No hay proveedores registrados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-150 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Proveedor / Comercial</th>
                    <th className="py-4 px-6">Documento (NIT)</th>
                    <th className="py-4 px-6">Contacto</th>
                    <th className="py-4 px-6">Detalles</th>
                    <th className="py-4 px-6 text-right pr-8">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {suppliers.map((sup) => (
                    <tr key={sup.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {sup.name}
                        </div>
                        {sup.commercial_name && (
                          <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                            {sup.commercial_name}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 font-mono font-semibold text-slate-600 dark:text-slate-400">
                        {sup.nit_doc || "—"}
                      </td>
                      <td className="py-4 px-6 space-y-1 text-slate-500 dark:text-slate-400">
                        {sup.contact_name && (
                          <div className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <UserCheck className="w-3.5 h-3.5 opacity-60" /> {sup.contact_name}
                          </div>
                        )}
                        {sup.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 opacity-60" /> {sup.phone}
                          </div>
                        )}
                        {sup.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 opacity-60" /> {sup.email}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 space-y-1 text-slate-500 dark:text-slate-400 max-w-xs">
                        {sup.address && (
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 opacity-60" /> {sup.address}
                          </div>
                        )}
                        {sup.website && (
                          <a
                            href={sup.website.startsWith("http") ? sup.website : `https://${sup.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-rose-600 hover:underline flex items-center gap-1.5 truncate"
                          >
                            <Globe className="w-3.5 h-3.5 opacity-60" /> {sup.website}
                          </a>
                        )}
                        {sup.notes && (
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                            <StickyNote className="w-3.5 h-3.5 opacity-60" /> {sup.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right pr-8">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => handleOpenEdit(sup)}
                            className="border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 h-8 px-3 rounded-full text-[10px] font-bold text-rose-600 gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" /> Editar
                          </Button>
                          <Button
                            onClick={() => handleDelete(sup.id)}
                            className="bg-rose-600 hover:bg-rose-700 text-white h-8 px-3 rounded-full text-[10px] font-bold gap-1 cursor-pointer border-none shadow-sm"
                          >
                            <Trash2 className="w-3 h-3" /> Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal/Dialog de Proveedor (Matching Screenshot 2) */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white rounded-2xl max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader className="border-b border-slate-100 dark:border-white/5 pb-3">
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Proveedor</span>
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* Nombre* */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Nombre*</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-lg h-10 text-xs"
                />
              </div>

              {/* Nombre Comercial */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Nombre Comercial</Label>
                <Input
                  value={commercialName}
                  onChange={(e) => setCommercialName(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-lg h-10 text-xs"
                />
              </div>

              {/* Documento* */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Documento*</Label>
                <Input
                  value={nitDoc}
                  onChange={(e) => setNitDoc(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-lg h-10 text-xs"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-lg h-10 text-xs"
                />
              </div>

              {/* Teléfono */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Teléfono</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-lg h-10 text-xs"
                />
              </div>

              {/* Dirección */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Dirección</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-lg h-10 text-xs"
                />
              </div>

              {/* Página Web */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Página Web</Label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-lg h-10 text-xs"
                />
              </div>

              {/* Contacto */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Contacto</Label>
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-lg h-10 text-xs"
                />
              </div>

              {/* Nota */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Nota</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-lg h-10 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 dark:border-white/5 pt-3 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-slate-200 dark:border-white/10 text-rose-600 hover:bg-slate-50 dark:hover:bg-white/5 h-10 px-6 rounded-lg text-xs font-bold cursor-pointer"
              >
                Cerrar
              </Button>
              <Button
                onClick={handleSaveClick}
                className="bg-rose-600 hover:bg-rose-700 text-white h-10 px-6 rounded-lg text-xs font-bold cursor-pointer border-none shadow-sm"
              >
                Guardar cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
