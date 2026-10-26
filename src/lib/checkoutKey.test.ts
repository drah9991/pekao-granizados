import { describe, expect, it } from "vitest";

import { buildCheckoutKey } from "./checkoutKey";

const NONCE = "8f0c1a2b-0000-4000-8000-000000000001";
const SALE = {
  items: [
    { id: "a", quantity: 2, price: 4000 },
    { id: "b", quantity: 1, price: 3500 },
  ],
  total: 11500,
  customerId: null,
};

describe("buildCheckoutKey", () => {
  it("returns the same key when the same cart is charged again", () => {
    expect(buildCheckoutKey(NONCE, SALE)).toBe(buildCheckoutKey(NONCE, { ...SALE, items: [...SALE.items] }));
  });

  it("changes the key when the cart contents change", () => {
    const moreQty = { ...SALE, items: [{ ...SALE.items[0], quantity: 3 }, SALE.items[1]] };
    expect(buildCheckoutKey(NONCE, moreQty)).not.toBe(buildCheckoutKey(NONCE, SALE));
    expect(buildCheckoutKey(NONCE, { ...SALE, total: 11000 })).not.toBe(buildCheckoutKey(NONCE, SALE));
    expect(buildCheckoutKey(NONCE, { ...SALE, customerId: "c1" })).not.toBe(buildCheckoutKey(NONCE, SALE));
  });

  it("changes the key after the cart is reset (new nonce)", () => {
    const otherNonce = "8f0c1a2b-0000-4000-8000-000000000002";
    expect(buildCheckoutKey(otherNonce, SALE)).not.toBe(buildCheckoutKey(NONCE, SALE));
  });

  it("starts with the nonce so keys stay unique across checkouts", () => {
    expect(buildCheckoutKey(NONCE, SALE).startsWith(NONCE + "-")).toBe(true);
  });
});
