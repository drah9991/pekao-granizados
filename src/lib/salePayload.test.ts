import { describe, expect, it } from "vitest";

import { isJsonSerializable, toPaymentMethod } from "./salePayload";

describe("toPaymentMethod", () => {
  it("keeps the payment methods the POS knows", () => {
    for (const method of ["cash", "card", "transfer", "qr", "split"]) {
      expect(toPaymentMethod(method)).toBe(method);
    }
  });

  it("falls back to cash when a click event arrives as the method", () => {
    const fakeClickEvent = { type: "click", target: {}, nativeEvent: {} };
    expect(toPaymentMethod(fakeClickEvent)).toBe("cash");
  });

  it("falls back to cash for unknown or missing values", () => {
    expect(toPaymentMethod(undefined)).toBe("cash");
    expect(toPaymentMethod("bitcoin")).toBe("cash");
  });
});

describe("isJsonSerializable", () => {
  it("accepts a plain sale payload", () => {
    expect(isJsonSerializable({ total: 3000, payment: { method: "cash" }, items: [{ qty: 1 }] })).toBe(true);
  });

  it("rejects a payload with a circular reference (a DOM node or React event inside)", () => {
    const node: Record<string, unknown> = { name: "span" };
    node.self = node;
    expect(isJsonSerializable({ total: 3000, payment: { method: node } })).toBe(false);
  });
});
