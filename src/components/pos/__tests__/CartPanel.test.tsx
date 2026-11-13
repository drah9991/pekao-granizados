import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { formatCOP } from "@/lib/currency";
import { CartHeader } from "../cart/CartHeader";
import { CartTotals } from "../cart/CartTotals";
import { CartCustomerSelector } from "../cart/CartCustomerSelector";

// formatCOP separa "$" con un espacio duro; Testing Library normaliza el texto del DOM a espacios
// normales pero no el texto esperado, así que se normaliza aquí.
const money = (amount: number) => formatCOP(amount).replace(/\s+/g, " ");

// CustomerSelection consulta clientes en Supabase; aquí solo interesa el botón "Público".
vi.mock("@/components/pos/CustomerSelection", () => ({
  default: () => <div data-testid="customer-selection" />,
}));

describe("CartHeader", () => {
  it("shows how many items the order has", () => {
    render(<CartHeader itemCount={3} onClearCart={vi.fn()} />);

    expect(screen.getByText(/3 items/i)).toBeInTheDocument();
  });

  it("clears the cart", async () => {
    const user = userEvent.setup();
    const onClearCart = vi.fn();
    render(<CartHeader itemCount={1} onClearCart={onClearCart} />);

    await user.click(screen.getByRole("button", { name: /vaciar/i }));

    expect(onClearCart).toHaveBeenCalledTimes(1);
  });
});

function renderTotals(overrides: Partial<React.ComponentProps<typeof CartTotals>> = {}) {
  const props: React.ComponentProps<typeof CartTotals> = {
    subtotal: 20000,
    discount: 0,
    setDiscount: vi.fn(),
    discountType: "percent",
    setDiscountType: vi.fn(),
    discountAmount: 0,
    total: 20000,
    onQuickPayment: vi.fn(),
    onCheckout: vi.fn(),
    onSplitPayment: vi.fn(),
    ...overrides,
  };
  render(<CartTotals {...props} />);
  return props;
}

describe("CartTotals", () => {
  it("shows subtotal and total, and the discount line only when there is a discount", () => {
    renderTotals();
    expect(screen.getAllByText(money(20000)).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(`-${money(2000)}`)).not.toBeInTheDocument();
  });

  it("shows the discount amount and the discounted total", () => {
    renderTotals({ discount: 10, discountAmount: 2000, total: 18000 });

    expect(screen.getByText(`-${money(2000)}`)).toBeInTheDocument();
    expect(screen.getByText(money(18000))).toBeInTheDocument();
  });

  it.each([
    [/efectivo/i, "cash"],
    [/tarjeta/i, "card"],
    [/transfer/i, "transfer"],
  ])("quick payment %s sends method %s", async (name, method) => {
    const user = userEvent.setup();
    const { onQuickPayment } = renderTotals();

    await user.click(screen.getByRole("button", { name }));

    expect(onQuickPayment).toHaveBeenCalledWith(method);
  });

  it("opens the split payment", async () => {
    const user = userEvent.setup();
    const { onSplitPayment } = renderTotals();

    await user.click(screen.getByRole("button", { name: /dividir/i }));

    expect(onSplitPayment).toHaveBeenCalledTimes(1);
  });

  it("completes the order without passing the click event as a payment method", async () => {
    const user = userEvent.setup();
    const { onCheckout } = renderTotals();

    await user.click(screen.getByRole("button", { name: /completar pedido/i }));

    expect(onCheckout).toHaveBeenCalledWith();
  });

  it("updates the discount while typing", async () => {
    const user = userEvent.setup();
    const { setDiscount } = renderTotals();

    await user.type(screen.getByLabelText(/descuento/i, { selector: "input" }), "15");

    expect(setDiscount).toHaveBeenLastCalledWith(15);
  });

  it("accepts a decimal discount typed with a comma", async () => {
    const user = userEvent.setup();
    const { setDiscount } = renderTotals();

    await user.type(screen.getByLabelText(/descuento/i, { selector: "input" }), "7,5");

    expect(setDiscount).toHaveBeenLastCalledWith(7.5);
  });

  it("toggles between percent and fixed discount", async () => {
    const user = userEvent.setup();
    const { setDiscountType } = renderTotals({ discountType: "percent" });

    await user.click(screen.getByRole("button", { name: /cambiar tipo de descuento/i }));

    expect(setDiscountType).toHaveBeenCalledWith("fixed");
  });
});

describe("CartCustomerSelector", () => {
  it("selects the general public customer", async () => {
    const user = userEvent.setup();
    const setSelectedCustomer = vi.fn();
    render(<CartCustomerSelector selectedCustomer={null} setSelectedCustomer={setSelectedCustomer} />);

    await user.click(screen.getByRole("button", { name: /público/i }));

    expect(setSelectedCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "generic", name: "Público General", document_id: "222222222222" }),
    );
  });

  it("clears the general public customer when pressed again", async () => {
    const user = userEvent.setup();
    const setSelectedCustomer = vi.fn();
    render(
      <CartCustomerSelector
        selectedCustomer={{ id: "generic", name: "Público General", document_id: "222222222222", phone: null, email: null }}
        setSelectedCustomer={setSelectedCustomer}
      />,
    );

    await user.click(screen.getByRole("button", { name: /público/i }));

    expect(setSelectedCustomer).toHaveBeenCalledWith(null);
  });
});
