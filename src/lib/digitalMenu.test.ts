import { describe, expect, it } from "vitest";

import { parsePublicMenu, sortByCategoryOrder, type MenuCategory } from "./digitalMenu";

const validItem = {
  id: "p1",
  name: "Granizado de Mora",
  description: "Mora natural",
  price: 9000,
  images: ["https://example.test/mora.jpg"],
  is_starred: true,
  available_qty: 7,
  min_qty: 10,
  stock_status: "low_stock",
};

const category = (code: string): MenuCategory => ({ code, label: code, emoji_icon: null, items: [] });

describe("parsePublicMenu", () => {
  it("converts a valid RPC response into categories with typed items", () => {
    // Arrange
    const data = [{ code: "granizado", label: "Granizados", emoji_icon: "🍧", items: [validItem] }];

    // Act
    const menu = parsePublicMenu(data);

    // Assert
    expect(menu).toEqual([
      {
        code: "granizado",
        label: "Granizados",
        emoji_icon: "🍧",
        items: [{ ...validItem, stock_status: "low_stock" }],
      },
    ]);
  });

  it("accepts numeric values serialized as strings", () => {
    const data = [{ code: "g", label: "G", items: [{ ...validItem, price: "9000", available_qty: "0" }] }];

    const [first] = parsePublicMenu(data);

    expect(first.items[0].price).toBe(9000);
    expect(first.items[0].available_qty).toBe(0);
  });

  it("drops items with an unknown stock status or missing price", () => {
    const data = [
      {
        code: "g",
        label: "G",
        items: [validItem, { ...validItem, id: "p2", stock_status: "maybe" }, { ...validItem, id: "p3", price: null }],
      },
    ];

    const [first] = parsePublicMenu(data);

    expect(first.items.map((item) => item.id)).toEqual(["p1"]);
  });

  it("omits categories that end up without items", () => {
    const data = [{ code: "g", label: "G", items: [{ ...validItem, stock_status: "nope" }] }];

    expect(parsePublicMenu(data)).toEqual([]);
  });

  it("returns an empty menu when the response is not an array", () => {
    expect(parsePublicMenu(null)).toEqual([]);
    expect(parsePublicMenu({ error: "x" })).toEqual([]);
  });

  it("defaults optional fields when they are missing", () => {
    const data = [{ code: "g", label: "G", items: [{ id: "p1", name: "X", price: 1, available_qty: 1, stock_status: "available" }] }];

    const item = parsePublicMenu(data)[0].items[0];

    expect(item).toEqual({
      id: "p1",
      name: "X",
      description: null,
      price: 1,
      images: null,
      is_starred: false,
      available_qty: 1,
      stock_status: "available",
    });
  });
});

describe("sortByCategoryOrder", () => {
  const categories = [category("sweet"), category("granizado"), category("combo")];

  it("orders categories by the saved codes and leaves unknown ones at the end", () => {
    const sorted = sortByCategoryOrder(categories, JSON.stringify(["granizado", "sweet"]));

    expect(sorted.map((c) => c.code)).toEqual(["granizado", "sweet", "combo"]);
  });

  it("keeps the original order when nothing is saved or the JSON is invalid", () => {
    expect(sortByCategoryOrder(categories, null)).toBe(categories);
    expect(sortByCategoryOrder(categories, "{no es json").map((c) => c.code)).toEqual(["sweet", "granizado", "combo"]);
    expect(sortByCategoryOrder(categories, JSON.stringify({ a: 1 }))).toBe(categories);
  });

  it("does not mutate the input array", () => {
    const original = [...categories];

    sortByCategoryOrder(categories, JSON.stringify(["combo"]));

    expect(categories).toEqual(original);
  });
});
