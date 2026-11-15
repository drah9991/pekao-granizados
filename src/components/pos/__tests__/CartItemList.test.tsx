import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { formatCOP } from "@/lib/currency";
import type { CartItem, Product } from "@/lib/pos-types";
import { CartItemList } from "../cart/CartItemList";

const money = (amount: number) => formatCOP(amount).replace(/\s+/g, " ");

const topping = (id: string, name: string, price: number) => ({ id, name, price }) as Product;
const CHICLE = topping("t1", "Chicle", 1000);
const GOMITAS = topping("t2", "Gomitas", 1500);

const SIZES = [
  { id: "s1", name: "Pequeño", multiplier: 1 },
  { id: "s2", name: "Mediano", multiplier: 1.2 },
];

const granizado: CartItem = {
  id: "c1",
  name: "Fresa SL",
  productId: "p1",
  price: 12000,
  productPrice: 10000,
  quantity: 2,
  productType: "granizado",
  size: "Mediano",
  toppings: [CHICLE],
};

const sachet: CartItem = {
  id: "c2",
  name: "Sachet Mango",
  productId: "p2",
  price: 3000,
  quantity: 1,
  productType: "sachet",
  size: "Único",
};

function renderList(cart: CartItem[], overrides: Partial<React.ComponentProps<typeof CartItemList>> = {}) {
  const props = {
    cart,
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    availableSizes: SIZES,
    availableToppings: [CHICLE, GOMITAS],
    updateItemCustomization: vi.fn(),
    ...overrides,
  };
  render(<CartItemList {...props} />);
  return props;
}

describe("CartItemList", () => {
  it("invites to pick products when the cart is empty", () => {
    renderList([]);

    expect(screen.getByText(/selecciona productos/i)).toBeInTheDocument();
  });

  it("shows each item with its line total and unit price", () => {
    renderList([granizado]);

    expect(screen.getByText("Fresa SL")).toBeInTheDocument();
    expect(screen.getByText(money(24000))).toBeInTheDocument();
    expect(screen.getByText(money(12000))).toBeInTheDocument();
  });

  it("changes the quantity of an item", async () => {
    const user = userEvent.setup();
    const { updateQuantity } = renderList([granizado]);

    await user.click(screen.getByRole("button", { name: /agregar uno de fresa sl/i }));
    await user.click(screen.getByRole("button", { name: /quitar uno de fresa sl/i }));

    expect(updateQuantity).toHaveBeenNthCalledWith(1, "c1", 1);
    expect(updateQuantity).toHaveBeenNthCalledWith(2, "c1", -1);
  });

  it("removes an item", async () => {
    const user = userEvent.setup();
    const { removeItem } = renderList([granizado]);

    await user.click(screen.getByRole("button", { name: /eliminar fresa sl/i }));

    expect(removeItem).toHaveBeenCalledWith("c1");
  });

  it("removes a topping keeping the current size", async () => {
    const user = userEvent.setup();
    const { updateItemCustomization } = renderList([granizado]);

    await user.click(screen.getByRole("button", { name: /chicle/i }));

    expect(updateItemCustomization).toHaveBeenCalledWith("c1", "s2", []);
  });

  it("adds a topping from the topping picker", async () => {
    const user = userEvent.setup();
    const { updateItemCustomization } = renderList([granizado]);

    await user.click(screen.getByRole("button", { name: /agregar topping a fresa sl/i }));
    await user.click(await screen.findByRole("button", { name: /gomitas/i }));

    await waitFor(() => expect(updateItemCustomization).toHaveBeenCalledWith("c1", "s2", ["t1", "t2"]));
  });

  it("changes the size keeping the toppings", async () => {
    const user = userEvent.setup();
    const { updateItemCustomization } = renderList([granizado]);

    await user.click(screen.getByRole("radio", { name: /pequeño/i }));

    expect(updateItemCustomization).toHaveBeenCalledWith("c1", "s1", ["t1"]);
  });

  it("shows a fixed size label instead of size options for sachets", () => {
    renderList([sachet]);

    expect(screen.getByText("Único")).toBeInTheDocument();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("hides sizes that the product's custom prices disable", () => {
    renderList([{ ...granizado, variants: [{ size_id: "s1", price: 9000 }] }]);

    expect(screen.getByRole("radio", { name: /pequeño/i })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /mediano/i })).not.toBeInTheDocument();
  });
});
