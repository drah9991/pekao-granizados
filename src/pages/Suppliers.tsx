import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Phone, Mail, MapPin } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string | null;
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Form Inputs
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
      toast.error("Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOpenCreate = () => {
    setSelectedSupplier(null);
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setDialogOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setSelectedSupplier(sup);
    setName(sup.name);
    setPhone(sup.phone || "");
    setEmail(sup.email || "");
    setAddress(sup.address || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("El nombre del proveedor es obligatorio");
      return;
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
    };

    try {
      if (selectedSupplier) {
        // Edit
        const { error } = await supabase
          .from("suppliers")
          .update(payload)
          .eq("id", selectedSupplier.id);
        if (error) throw error;
        toast.success("Proveedor actualizado");
      } else {
        // Create
        const { error } = await supabase
          .from("suppliers")
          .insert([payload]);
        if (error) throw error;
        toast.success("Proveedor registrado");
      }
      setDialogOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      console.error("Error saving supplier:", err);
      toast.error(err.message || "Error al guardar el proveedor");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este proveedor?")) return;

    try {
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Proveedor eliminado");
      fetchSuppliers();
    } catch (err: any) {
      console.error("Error deleting supplier:", err);
      toast.error("Error al eliminar el proveedor (puede estar relacionado con productos)");
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-transparent text-foreground p-6 lg:p-10 space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter mb-1 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent italic uppercase font-space-grotesk">
              PROVEEDORES
            </h1>
            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
              Gestión de Aliados y Suministro de Stock
            </p>
          </div>
          <Button
            onClick={handleOpenCreate}
            className="bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest px-6 h-12 rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" /> Nuevo Proveedor
          </Button>
        </div>

        {/* Content */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden shadow-pro">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="p-16 text-center text-slate-500 font-bold uppercase tracking-wider text-xs">
              No hay proveedores registrados
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5 text-xs font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-4 px-8">Nombre</th>
                  <th className="py-4 px-8">Contacto</th>
                  <th className="py-4 px-8">Dirección</th>
                  <th className="py-4 px-8 w-60 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((sup) => (
                  <tr key={sup.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 px-8 text-xs font-black text-slate-200 uppercase">{sup.name}</td>
                    <td className="py-4 px-8 space-y-1 text-slate-400">
                      {sup.phone && <div className="text-xs flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-500" /> {sup.phone}</div>}
                      {sup.email && <div className="text-xs flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-500" /> {sup.email}</div>}
                    </td>
                    <td className="py-4 px-8 text-xs text-slate-400">
                      {sup.address ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" /> {sup.address}
                        </div>
                      ) : "-"}
                    </td>
                    <td className="py-4 px-8 text-right flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={() => handleOpenEdit(sup)}
                        className="border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white h-9 px-4 rounded-lg text-[10px] font-black uppercase tracking-wider gap-1.5"
                      >
                        <Edit2 className="w-3 h-3" /> Editar
                      </Button>
                      <Button
                        onClick={() => handleDelete(sup.id)}
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

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-slate-950 border-white/10 text-white rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-black uppercase tracking-widest text-slate-300">
                {selectedSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre del Proveedor*</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Distribuidora Pekao"
                  className="bg-white/5 border-white/10 rounded-xl h-11 text-xs text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teléfono</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: 3001234567"
                  className="bg-white/5 border-white/10 rounded-xl h-11 text-xs text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej: contacto@distribuidora.com"
                  className="bg-white/5 border-white/10 rounded-xl h-11 text-xs text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dirección</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej: Calle 45 # 12-34"
                  className="bg-white/5 border-white/10 rounded-xl h-11 text-xs text-white"
                />
              </div>
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
