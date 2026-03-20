import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Edit, Trash2, Users, MapPin, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { Tables } from "@/integrations/supabase/types";

type Customer = Tables<'customers'> & { document_id?: string; consent_habeas_data?: boolean };

export default function Customers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    // Dialog states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        document_id: "",
        consent_habeas_data: false,
    });
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from("customers")
                .select("*")
                .order("name", { ascending: true, nullsFirst: false });

            if (error) throw error;
            setCustomers(data || []);
        } catch (error: any) {
            console.error("Error fetching customers:", error);
            toast.error("Error al cargar clientes: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const openCreateDialog = () => {
        setEditingCustomer(null);
        setFormData({ name: "", email: "", phone: "", document_id: "", consent_habeas_data: false });
        setDialogOpen(true);
    };

    const openEditDialog = (customer: Customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name || "",
            email: customer.email || "",
            phone: customer.phone || "",
            document_id: customer.document_id || "",
            consent_habeas_data: customer.consent_habeas_data || false,
        });
        setDialogOpen(true);
    };

    const handleSaveCustomer = async () => {
        if (!formData.name || !formData.document_id) {
            toast.error("El nombre y documento del cliente son obligatorios.");
            return;
        }
        if (!formData.consent_habeas_data) {
            toast.error("Debe autorizar el tratamiento de datos (Ley 1581) para continuar.");
            return;
        }

        setIsProcessing(true);
        try {
            const customerData = {
                name: formData.name.trim(),
                email: formData.email.trim() || null,
                phone: formData.phone.trim() || null,
                document_id: formData.document_id.trim() || null,
                consent_habeas_data: formData.consent_habeas_data,
            };

            if (editingCustomer) {
                const { error } = await supabase
                    .from("customers")
                    .update(customerData)
                    .eq("id", editingCustomer.id);

                if (error) throw error;
                toast.success("Cliente actualizado correctamente.");
            } else {
                const { error } = await supabase
                    .from("customers")
                    .insert([customerData]);

                if (error) throw error;
                toast.success("Cliente creado correctamente.");
            }

            setDialogOpen(false);
            fetchCustomers();
        } catch (error: any) {
            console.error("Error saving customer:", error);
            toast.error("Error al guardar cliente: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteCustomer = async (customer: Customer) => {
        if (!confirm('¿Estás seguro de eliminar al cliente "' + customer.name + '"?')) return;

        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from("customers")
                .delete()
                .eq("id", customer.id);

            // Si falla por Foreign Key Constraint, le informamos al usuario
            if (error) {
                if (error.code === '23503') {
                    throw new Error("No se puede eliminar el cliente porque tiene órdenes asociadas.");
                }
                throw error;
            }
            toast.success("Cliente eliminado.");
            fetchCustomers();
        } catch (error: any) {
            console.error("Error deleting customer:", error);
            toast.error("No se pudo eliminar: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredCustomers = customers.filter(customer =>
        (customer.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.phone || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.document_id || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Layout>
            <div className="p-6 md:p-8 space-y-6 md:space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
                            Maestro de Clientes
                        </h1>
                        <p className="text-muted-foreground text-sm md:text-base">
                            Directorio de clientes recurrentes e historial básico
                        </p>
                    </div>
                    <Button onClick={openCreateDialog} className="gradient-primary shadow-glow w-full md:w-auto">
                        <Plus className="w-5 h-5 mr-2" /> Nuevo Cliente
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <Card className="glass-card shadow-card">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Total Clientes</p>
                                <p className="text-2xl font-bold text-primary">{customers.length}</p>
                            </div>
                            <Users className="w-8 h-8 text-primary opacity-80" />
                        </CardContent>
                    </Card>
                </div>

                {/* Search */}
                <Card className="glass-card shadow-card">
                    <CardContent className="pt-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                placeholder="Buscar por nombre, email o teléfono..."
                                className="pl-10 max-w-md"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* List */}
                <Card className="glass-card shadow-card">
                    <CardHeader>
                        <CardTitle>Directorio</CardTitle>
                        <CardDescription>{filteredCustomers.length} clientes registrados</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                                <p className="text-muted-foreground">Cargando clientes...</p>
                            </div>
                        ) : filteredCustomers.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                                <h3 className="text-lg font-semibold mb-2">No se encontraron clientes</h3>
                                <p className="text-muted-foreground mb-4">Aún no hay clientes registrados o la búsqueda no arrojó resultados.</p>
                                {!searchQuery && (
                                    <Button onClick={openCreateDialog} variant="outline">
                                        Añadir el primer cliente
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Contacto</TableHead>
                                            <TableHead>Total Comprado</TableHead>
                                            <TableHead>Última Compra</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredCustomers.map((customer) => (
                                            <TableRow key={customer.id}>
                                                <TableCell className="font-medium text-base">
                                                    {customer.name || 'Sin Nombre'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1 text-sm text-muted-foreground">
                                                        {customer.document_id && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-xs">CC:</span> {customer.document_id}
                                                            </div>
                                                        )}
                                                        {customer.phone && (
                                                            <div className="flex items-center gap-2">
                                                                <Phone className="w-3 h-3" /> {customer.phone}
                                                            </div>
                                                        )}
                                                        {customer.email && (
                                                            <div className="flex items-center gap-2">
                                                                <Mail className="w-3 h-3" /> {customer.email}
                                                            </div>
                                                        )}
                                                        {!customer.phone && !customer.email && !customer.document_id && "Sin contacto"}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-bold text-accent">
                                                    {formatCurrency(customer.total_spent || 0)}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {customer.last_order_at ? new Date(customer.last_order_at).toLocaleDateString('es-CO') : 'Nunca'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 hover:text-accent hover:bg-accent/10"
                                                            onClick={() => openEditDialog(customer)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleDeleteCustomer(customer)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Create/Edit Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
                            <DialogDescription>
                                {editingCustomer
                                    ? "Modifica la información de contacto del cliente."
                                    : "Ingresa los datos para registrar un nuevo cliente en el directorio."}
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={(e) => { e.preventDefault(); handleSaveCustomer(); }} className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="name">Nombre Completo *</Label>
                                <Input
                                    id="name"
                                    placeholder="Ej: María Gómez"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-2"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="document_id">Documento de Identidad (NIT / C.C.) *</Label>
                                <Input
                                    id="document_id"
                                    placeholder="Ej: 1000123456"
                                    value={formData.document_id}
                                    onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
                                    className="mt-2"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Ej: maria@ejemplo.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="mt-2"
                                />
                            </div>
                            <div>
                                <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                                <Input
                                    id="phone"
                                    placeholder="Ej: 300 123 4567"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="mt-2"
                                />
                            </div>

                            <div className="flex items-start space-x-3 pt-2">
                                <input
                                    type="checkbox"
                                    id="consent"
                                    className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                    checked={formData.consent_habeas_data}
                                    onChange={(e) => setFormData({ ...formData, consent_habeas_data: e.target.checked })}
                                    required
                                />
                                <Label htmlFor="consent" className="text-sm font-normal text-muted-foreground leading-snug cursor-pointer">
                                    Autorizo el tratamiento de mis datos personales conforme a la <strong>Ley 1581 de 2012 (Hábeas Data)</strong> para fines de facturación y contacto. *
                                </Label>
                            </div>

                            <DialogFooter className="gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setDialogOpen(false)}
                                    disabled={isProcessing}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isProcessing || !formData.name || !formData.document_id || !formData.consent_habeas_data}
                                    className="gradient-primary"
                                >
                                    {isProcessing ? "Guardando..." : editingCustomer ? "Actualizar" : "Crear"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
