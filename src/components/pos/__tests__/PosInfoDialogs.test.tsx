import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { formatCOP } from "@/lib/currency";
import type { CartItem, Product } from "@/lib/pos-types";
import ReceiptDialog from "../ReceiptDialog";
import ShortcutsHelpDialog from "../ShortcutsHelpDialog";

const money = (amount: number) => formatCOP(amount).replace(/\s+/g, " ");

describe("ShortcutsHelpDialog", () => {
  it("lists every POS shortcut", () => {
    render(<ShortcutsHelpDialog isOpen onClose={vi.fn()} />);

    expect(screen.getByText(/atajos de teclado pos/i)).toBeInTheDocument();
    expect(screen.getByText(/focalizar el buscador de productos/i)).toBeInTheDocument();
    expect(screen.getByText(/procesamiento de pago/i)).toBeInTheDocument();
    expect(screen.getByText(/cerrar diálogos emergentes/i)).toBeInTheDocument();
    expect(screen.getByText(/guía visual de atajos/i)).toBeInTheDocument();
    for (const key of ["F1", "F2", "Esc", "?", "H"]) {
      expect(screen.getAllByText(key).length).toBeGreaterThan(0);
    }
  });

  it("closes", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ShortcutsHelpDialog isOpen onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /cerrar|close/i }));

    expect(onClose).toHaveBeenCalled();
  });
});

const item = (id: string, name: string, price: number, quantity: number, extra: Partial<CartItem> = {}): CartItem => ({
  id,
  name,
  productId: `p-${id}`,
  price,
  quantity,
  ...extra,
});

type LastOrder = NonNullable<React.ComponentProps<typeof ReceiptDialog>["lastOrder"]>;

const baseOrder: LastOrder = {
  id: "abcdef12-3456-7890",
  total: 27000,
  subtotal: 30000,
  discountAmount: 3000,
  created_at: "2026-11-15T23:30:00Z",
  change: 3000,
  paymentMethod: "cash",
  items: [
    item("c1", "Fresa SL", 12000, 2, { size: "Mediano", toppings: [{ id: "t1", name: "Chicle", price: 1000 } as Product] }),
    // Mismo producto con otra personalización: debe salir como una línea aparte.
    item("c2", "Fresa SL", 6000, 1),
  ],
  customer: { id: "u1", name: "Juan Pérez", phone: "3001234567", email: null, document_id: "1000123456" },
};

function renderReceipt(order: Partial<LastOrder> = {}) {
  const onClose = vi.fn();
  render(<ReceiptDialog isOpen onClose={onClose} lastOrder={{ ...baseOrder, ...order }} />);
  return { onClose };
}

describe("ReceiptDialog", () => {
  it("shows the paid total, the payment method and the change", () => {
    renderReceipt();

    expect(screen.getByRole("heading", { name: /venta exitosa/i })).toBeInTheDocument();
    expect(screen.getByText(money(27000))).toBeInTheDocument();
    expect(screen.getByText(/efectivo/i)).toBeInTheDocument();
    expect(screen.getByText(/cambio devuelto/i)).toBeInTheDocument();
    expect(screen.getAllByText(money(3000)).length).toBeGreaterThan(0);
  });

  it("shows subtotal and discount when there was a discount", () => {
    renderReceipt();

    expect(screen.getByText(money(30000))).toBeInTheDocument();
    expect(screen.getByText(`-${money(3000)}`)).toBeInTheDocument();
  });

  it("lists every line, even two lines of the same product", () => {
    renderReceipt();

    expect(screen.getByText(/2x fresa sl/i)).toBeInTheDocument();
    expect(screen.getByText(/1x fresa sl/i)).toBeInTheDocument();
    expect(screen.getByText(/mediano/i)).toBeInTheDocument();
    expect(screen.getByText(/\+ chicle/i)).toBeInTheDocument();
    expect(screen.getByText(money(24000))).toBeInTheDocument();
    expect(screen.getByText(money(6000))).toBeInTheDocument();
  });

  it("shows the customer, or 'Consumidor Final' for a generic one", () => {
    renderReceipt();
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText(/1000123456/)).toBeInTheDocument();
  });

  it("shows 'Consumidor Final' without a registered customer", () => {
    renderReceipt({ customer: null });
    expect(screen.getByText(/consumidor final/i)).toBeInTheDocument();
  });

  it("shows the split between cash and transfer", () => {
    renderReceipt({ paymentMethod: "split", splitDetails: { cash: 10000, transfer: 17000 }, change: 0 });

    expect(screen.getByText(/mixto/i)).toBeInTheDocument();
    expect(screen.getByText(money(10000))).toBeInTheDocument();
    expect(screen.getByText(money(17000))).toBeInTheDocument();
  });

  it("shows delivery details", () => {
    renderReceipt({ deliveryData: { type: "delivery", fee: 4000, address: "Calle 10 # 5-20", phone: "3110000000" } });

    expect(screen.getByText(/entrega a domicilio/i)).toBeInTheDocument();
    expect(screen.getByText("Calle 10 # 5-20")).toBeInTheDocument();
    expect(screen.getByText(/3110000000/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(money(4000).replace("$", "\\$")))).toBeInTheDocument();
  });

  it("shows the short order number and starts a new sale", async () => {
    const user = userEvent.setup();
    const { onClose } = renderReceipt();

    expect(screen.getByText(/orden #abcdef12/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /nueva venta/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
