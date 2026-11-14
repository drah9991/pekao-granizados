import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { from, insert } = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import CustomerSelection, { type Customer } from "../CustomerSelection";

const JUAN: Customer = { id: "u1", name: "Juan Pérez", phone: "3001234567", email: null, document_id: "1000123456" };
const CREATED: Customer = { id: "u9", name: "Ana Gómez", phone: "3110000000", email: null, document_id: "52000000" };

function mockSearchResults(results: Customer[]) {
  from.mockImplementation(() => ({
    select: () => ({ or: () => ({ limit: () => Promise.resolve({ data: results, error: null }) }) }),
    insert: (rows: unknown) => {
      insert(rows);
      return { select: () => ({ single: () => Promise.resolve({ data: CREATED, error: null }) }) };
    },
  }));
}

function renderSelection(selectedCustomer: Customer | null = null) {
  const onCustomerSelected = vi.fn();
  render(<CustomerSelection selectedCustomer={selectedCustomer} onCustomerSelected={onCustomerSelected} />);
  return { onCustomerSelected };
}

const searchBox = () => screen.getByLabelText(/buscar cliente/i, { selector: "input" });

describe("CustomerSelection", () => {
  beforeEach(() => {
    from.mockReset();
    insert.mockReset();
    mockSearchResults([JUAN]);
  });

  it("shows the selected customer and lets the cashier remove it", async () => {
    const user = userEvent.setup();
    const { onCustomerSelected } = renderSelection(JUAN);

    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText(/1000123456/)).toBeInTheDocument();
    expect(screen.getByText(/3001234567/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /quitar cliente/i }));
    expect(onCustomerSelected).toHaveBeenCalledWith(null);
  });

  it("searches customers and selects one", async () => {
    const user = userEvent.setup();
    const { onCustomerSelected } = renderSelection();

    await user.type(searchBox(), "ju");
    await user.click(await screen.findByText("Juan Pérez", {}, { timeout: 2000 }));

    expect(onCustomerSelected).toHaveBeenCalledWith(JUAN);
  });

  it("does not query with less than 2 characters", async () => {
    const user = userEvent.setup();
    renderSelection();

    await user.type(searchBox(), "j");
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(from).not.toHaveBeenCalled();
  });

  it("continues with an unregistered customer", async () => {
    const user = userEvent.setup();
    const { onCustomerSelected } = renderSelection();

    await user.click(screen.getByRole("button", { name: /continuar sin registrar cliente/i }));

    expect(onCustomerSelected).toHaveBeenCalledWith(
      expect.objectContaining({ id: "generic", name: "Consumidor Final" }),
    );
  });

  it("creates a customer when the search finds nobody and selects it", async () => {
    mockSearchResults([]);
    const user = userEvent.setup();
    const { onCustomerSelected } = renderSelection();

    await user.type(searchBox(), "ana");
    await user.click(await screen.findByRole("button", { name: /crear nuevo cliente/i }, { timeout: 2000 }));

    await user.type(await screen.findByLabelText(/nombre completo/i, { selector: "input" }), "  Ana Gómez ");
    await user.type(screen.getByLabelText(/número de documento/i, { selector: "input" }), "52000000");
    await user.type(screen.getByLabelText(/teléfono \/ whatsapp/i, { selector: "input" }), "3110000000");
    await user.click(screen.getByRole("button", { name: /guardar y seleccionar/i }));

    await waitFor(() => expect(onCustomerSelected).toHaveBeenCalledWith(CREATED));
    expect(insert).toHaveBeenCalledWith([
      { name: "Ana Gómez", phone: "3110000000", email: null, document_id: "52000000" },
    ]);
  });

  it("does not create a customer without a name", async () => {
    mockSearchResults([]);
    const user = userEvent.setup();
    renderSelection();

    await user.type(searchBox(), "ana");
    await user.click(await screen.findByRole("button", { name: /crear nuevo cliente/i }, { timeout: 2000 }));
    await user.click(await screen.findByRole("button", { name: /guardar y seleccionar/i }));

    expect(insert).not.toHaveBeenCalled();
  });
});
