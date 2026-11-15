import { supabase } from "@/integrations/supabase/client";

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  document_id: string | null;
}

export interface NewCustomerInput {
  name: string;
  documentId: string;
  phone: string;
  email: string;
}

const CUSTOMER_COLUMNS = "id, name, phone, email, document_id";
export const MIN_SEARCH_LENGTH = 2;
const MAX_RESULTS = 5;

/** Cliente sin registrar ("Continuar sin registrar cliente"). */
export const UNREGISTERED_CUSTOMER: Customer = {
  id: "generic",
  name: "Consumidor Final",
  phone: null,
  email: null,
  document_id: null,
};

/**
 * Busca por nombre, teléfono o documento (máx. 5). Mismo filtro que antes de la migración.
 * Pendiente: el texto entra sin escapar en `.or()`, así que una coma o un paréntesis lo altera.
 */
export async function searchCustomers(query: string): Promise<Customer[]> {
  const term = query.trim();
  if (term.length < MIN_SEARCH_LENGTH) return [];

  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_COLUMNS)
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%,document_id.ilike.%${query}%`)
    .limit(MAX_RESULTS);

  if (error) throw error;
  return data || [];
}

/** Crea el cliente con los campos recortados; los opcionales vacíos se guardan como null. */
export async function createCustomer(input: NewCustomerInput): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .insert([
      {
        name: input.name.trim(),
        phone: input.phone.trim() || null,
        email: input.email.trim() || null,
        document_id: input.documentId.trim() || null,
      },
    ])
    .select(CUSTOMER_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}
