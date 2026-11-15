import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/pos-types";
import { getStockLevel, stockLabel } from "../productStock";
import { filterProducts, type GridCategory } from "../productFilter";

const product = (overrides: Partial<Product> & { is_starred?: boolean }): Product =>
  ({ id: "p", name: "Producto", price: 1000, category: null, type: "granizado", ...overrides }) as Product;

describe("getStockLevel (unit products)", () => {
  it.each([
    [0, undefined, "out"],
    [5, undefined, "low"],
    [15, undefined, "medium"],
    [25, undefined, "high"],
    [0, 5, "low"],
    [0, 15, "medium"],
    [0, 30, "high"],
    // Unidades y mezcla cuentan a la vez: gana el nivel más bajo.
    [15, 5, "low"],
    [25, 15, "medium"],
  ] as const)("stock %s and mixture %s is %s", (stock, mixtureStock, level) => {
    expect(getStockLevel(product({ stock, mixtureStock }), false)).toBe(level);
  });
});

describe("getStockLevel (mixture-tracked products, in ml)", () => {
  it.each([
    [undefined, "out"],
    [0, "out"],
    [1500, "low"],
    [3000, "medium"],
    [6000, "high"],
  ] as const)("mixture %s ml is %s", (mixtureStock, level) => {
    expect(getStockLevel(product({ stock: 100, mixtureStock }), true)).toBe(level);
  });
});

describe("stockLabel", () => {
  it("shows liters for mixture-tracked products", () => {
    expect(stockLabel(product({ mixtureStock: 1500 }), true)).toBe("1.5L");
  });

  it("shows units, falling back to the mixture stock", () => {
    expect(stockLabel(product({ stock: 7 }), false)).toBe("7");
    expect(stockLabel(product({ stock: 0, mixtureStock: 12 }), false)).toBe("12");
    expect(stockLabel(product({ stock: 0 }), false)).toBe("0");
  });
});

const CATEGORIES: GridCategory[] = [
  { code: "c-gra", label: "Granizados", emoji: "🍧", trackMixture: true },
  { code: "c-dul", label: "Dulces", emoji: "🍬", trackMixture: false },
];

const FRESA = product({ id: "1", name: "Fresa SL", category: "Granizados", category_id: "c-gra" });
const CHICLE = product({ id: "2", name: "Chicle", category: "Dulces", category_id: "c-dul", type: "sweet" });
const MANGO = product({ id: "3", name: "Mango Biche", category: "Granizados", category_id: "c-gra", is_starred: true });

describe("filterProducts", () => {
  const all = [FRESA, CHICLE, MANGO];

  it("returns everything for the 'all' category with an empty search, starred first", () => {
    expect(filterProducts(all, "", "all", CATEGORIES).map((p) => p.id)).toEqual(["3", "1", "2"]);
  });

  it("searches by name or category, ignoring case", () => {
    expect(filterProducts(all, "fresa", "all", CATEGORIES).map((p) => p.id)).toEqual(["1"]);
    expect(filterProducts(all, "DULCES", "all", CATEGORIES).map((p) => p.id)).toEqual(["2"]);
  });

  it("filters by category id", () => {
    expect(filterProducts(all, "", "c-dul", CATEGORIES).map((p) => p.id)).toEqual(["2"]);
  });

  it("matches a category by its name when the product has no category id", () => {
    const legacy = product({ id: "4", name: "Bombón", category: "Dulces" });
    expect(filterProducts([legacy], "", "c-dul", CATEGORIES).map((p) => p.id)).toEqual(["4"]);
  });
});
