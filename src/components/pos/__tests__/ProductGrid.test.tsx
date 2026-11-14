import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PosProduct } from "@/hooks/usePosProducts";
import type { GridCategory } from "../product-grid/productFilter";

const { usePosProducts, toastError } = vi.hoisted(() => ({ usePosProducts: vi.fn(), toastError: vi.fn() }));
vi.mock("@/hooks/usePosProducts", () => ({ usePosProducts }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ storeId: "store-1" }) }));
vi.mock("sonner", () => ({ toast: { error: toastError, success: vi.fn() } }));

import ProductGrid from "../ProductGrid";

const CATEGORIES: GridCategory[] = [
  { code: "c-gra", label: "Granizados", emoji: "🍧", trackMixture: true },
  { code: "c-dul", label: "Dulces", emoji: "🍬", trackMixture: false },
];

const product = (overrides: Partial<PosProduct>): PosProduct =>
  ({ id: "p", name: "Producto", price: 1000, category: null, type: "granizado", images: null, ...overrides }) as PosProduct;

const FRESA = product({ id: "1", name: "Fresa SL", price: 12000, category: "Granizados", category_id: "c-gra", stock: 4, mixtureStock: 6000 });
const CHICLE = product({ id: "2", name: "Chicle", price: 1000, category: "Dulces", category_id: "c-dul", type: "sweet", stock: 25 });
const AGOTADO = product({ id: "3", name: "Bombón Agotado", category: "Dulces", category_id: "c-dul", type: "sweet", stock: 0 });

// useBoneyardLoad mantiene el esqueleto de carga al menos 400 ms: se espera al panel de productos.
async function renderGrid(overrides: Partial<{ isOffline: boolean; activeCategoryIndex: number }> = {}) {
  usePosProducts.mockReturnValue({
    products: [FRESA, CHICLE, AGOTADO],
    categories: CATEGORIES,
    isOffline: overrides.isOffline ?? false,
    isLoading: false,
  });
  const onProductSelect = vi.fn();
  render(<ProductGrid onProductSelect={onProductSelect} activeCategoryIndex={overrides.activeCategoryIndex} />);
  await screen.findByRole("tabpanel", {}, { timeout: 2000 });
  return { onProductSelect };
}

const productButton = (name: RegExp) => screen.getByRole("button", { name });

describe("ProductGrid", () => {
  beforeEach(() => {
    toastError.mockReset();
  });

  it("lists the catalog with prices and stock", async () => {
    await renderGrid();

    expect(productButton(/fresa sl/i)).toBeInTheDocument();
    // La grilla busca la configuración de la categoría por product.type (no por category_id), así
    // que un granizado con type "granizado" muestra unidades, igual que antes de la migración.
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("shows liters when the product type maps to a mixture-tracked category", async () => {
    usePosProducts.mockReturnValue({
      products: [{ ...FRESA, type: "c-gra" as PosProduct["type"] }],
      categories: CATEGORIES,
      isOffline: false,
      isLoading: false,
    });
    render(<ProductGrid onProductSelect={vi.fn()} />);

    expect(await screen.findByText("6.0L", {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it("adds a product to the order when tapped", async () => {
    const user = userEvent.setup();
    const { onProductSelect } = await renderGrid();

    await user.click(productButton(/chicle/i));

    expect(onProductSelect).toHaveBeenCalledWith(CHICLE);
  });

  it("warns instead of adding an out-of-stock product", async () => {
    const user = userEvent.setup();
    const { onProductSelect } = await renderGrid();

    await user.click(productButton(/bombón agotado/i));

    expect(onProductSelect).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/sin existencias de bombón agotado/i), expect.anything());
  });

  it("filters by category", async () => {
    const user = userEvent.setup();
    await renderGrid();

    await user.click(screen.getByRole("tab", { name: /dulces/i }));

    expect(screen.queryByRole("button", { name: /fresa sl/i })).not.toBeInTheDocument();
    expect(productButton(/chicle/i)).toBeInTheDocument();
  });

  it("selects the category given by the keyboard shortcut index", async () => {
    await renderGrid({ activeCategoryIndex: 1 });

    expect(screen.getByRole("tab", { name: /granizados/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("button", { name: /chicle/i })).not.toBeInTheDocument();
  });

  it("searches by name and offers the full catalog when nothing matches", async () => {
    const user = userEvent.setup();
    await renderGrid();
    const search = screen.getByLabelText(/buscar productos/i, { selector: "input" });

    await user.type(search, "fresa");
    await waitFor(() => expect(screen.queryByRole("button", { name: /chicle/i })).not.toBeInTheDocument());
    expect(productButton(/fresa sl/i)).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "xyz");
    expect(await screen.findByText(/no encontramos productos/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /ver todo el catálogo/i }));

    await waitFor(() => expect(productButton(/chicle/i)).toBeInTheDocument());
    expect(search).toHaveValue("");
  });

  it("tells the cashier when the catalog comes from the offline copy", async () => {
    await renderGrid({ isOffline: true });

    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });
});
