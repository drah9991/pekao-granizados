import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserCheck, X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export interface Customer {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    document_id: string | null;
}

interface CustomerSelectionProps {
    onCustomerSelected: (customer: Customer | null) => void;
    selectedCustomer: Customer | null;
}

export default function CustomerSelection({ onCustomerSelected, selectedCustomer }: CustomerSelectionProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Customer[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // New Customer Form
    const [newName, setNewName] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newDocumentId, setNewDocumentId] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        const searchCustomers = async () => {
            if (searchQuery.trim().length < 2) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const { data, error } = await supabase
                    .from("customers")
                    .select("id, name, phone, email, document_id")
                    .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,document_id.ilike.%${searchQuery}%`)
                    .limit(5);

                if (error) throw error;
                setSearchResults(data || []);
            } catch (error) {
                console.error("Error searching customers:", error);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(() => {
            searchCustomers();
        }, 300); // Debounce search

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleCreateCustomer = async () => {
        if (!newName.trim()) {
            toast.error("El nombre es obligatorio");
            return;
        }

        setIsCreating(true);
        try {
            const { data, error } = await supabase
                .from("customers")
                .insert([{
                    name: newName.trim(),
                    phone: newPhone.trim() || null,
                    email: newEmail.trim() || null,
                    document_id: newDocumentId.trim() || null
                }])
                .select("id, name, phone, email, document_id")
                .single();

            if (error) throw error;

            toast.success("Cliente creado exitosamente");
            onCustomerSelected(data);
            setIsCreateModalOpen(false);
            setNewName("");
            setNewPhone("");
            setNewEmail("");
            setNewDocumentId("");
            setSearchQuery("");
        } catch (error: unknown) {
            console.error("Error creating customer:", error);
            toast.error("Error al crear cliente: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsCreating(false);
        }
    };

    const clearSelection = () => {
        onCustomerSelected(null);
        setSearchQuery("");
    };

    if (selectedCustomer) {
        return (
            <div className="bg-primary/10 border-2 border-primary/20 rounded-lg p-3 flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-primary p-2 rounded-full text-primary-foreground">
                        <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-semibold text-sm leading-none">{selectedCustomer.name}</p>
                        <div className="flex flex-col gap-0.5 mt-1">
                            {selectedCustomer.document_id && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <span className="font-medium">CC:</span> {selectedCustomer.document_id}
                                </p>
                            )}
                            {selectedCustomer.phone && (
                                <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
                            )}
                        </div>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={clearSelection} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                    <X className="w-4 h-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="mb-4 relative z-10">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar cliente por nombre o teléfono..."
                    className="pl-9 pr-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Buscar cliente por nombre o teléfono"
                />
                {searchQuery && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setSearchQuery("")}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* Floating Dropdown Results */}
            {searchQuery.trim().length >= 2 && (
                <div className="absolute top-full left-0 w-full mt-1 bg-popover border-2 border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                    {isSearching ? (
                        <div className="p-3 text-center text-sm text-muted-foreground">Buscando...</div>
                    ) : searchResults.length > 0 ? (
                        <ul className="max-h-48 overflow-y-auto">
                            {searchResults.map((customer) => (
                                <li key={customer.id}>
                                    <button
                                        className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors flex flex-col"
                                        onClick={() => {
                                            onCustomerSelected(customer);
                                            setSearchQuery("");
                                        }}
                                    >
                                        <span className="font-medium text-sm">{customer.name}</span>
                                        <div className="flex text-xs opacity-70 gap-2">
                                            {customer.document_id && <span>CC: {customer.document_id}</span>}
                                            {customer.phone && <span>Tel: {customer.phone}</span>}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-3 text-center">
                            <p className="text-sm text-muted-foreground mb-2">No se encontraron clientes.</p>
                            <Button size="sm" variant="outline" className="w-full" onClick={() => setIsCreateModalOpen(true)}>
                                <UserPlus className="w-4 h-4 mr-2" />
                                Crear Nuevo Cliente
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Default/Generic Customer Option */}
            {!searchQuery && (
                <div className="mt-2 flex justify-end">
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground" onClick={() => onCustomerSelected({ id: 'generic', name: 'Consumidor Final', phone: null, email: null, document_id: null })}>
                        Continuar sin registrar cliente
                    </Button>
                </div>
            )}

            {/* Create Customer Dialog */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nuevo Cliente Rápido</DialogTitle>
                        <DialogDescription>Registra un cliente nuevo directamente desde la caja.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                        <div className="space-y-2">
                            <Label htmlFor="c_name">Nombre Completo *</Label>
                            <Input id="c_name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: Juan Pérez" autoFocus />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="c_doc">Número de Documento (C.C.)</Label>
                            <Input id="c_doc" value={newDocumentId} onChange={(e) => setNewDocumentId(e.target.value)} placeholder="Ej: 1000123456" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="c_phone">Teléfono / WhatsApp</Label>
                            <Input id="c_phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Ej: 3001234567" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="c_email">Correo Electrónico</Label>
                            <Input id="c_email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Ej: cliente@ejemplo.com" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isCreating}>Cancelar</Button>
                        <Button className="gradient-primary" onClick={handleCreateCustomer} disabled={isCreating}>
                            {isCreating ? "Guardando..." : "Guardar y Seleccionar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
