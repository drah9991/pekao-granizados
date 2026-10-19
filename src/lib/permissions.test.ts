import { describe, expect, it } from "vitest";

import { canAddStock, isStockIncreaseMovement } from "./permissions";

describe("canAddStock", () => {
  it("allows admins and managers", () => {
    expect(canAddStock({ userRole: "admin", isSuperAdmin: false })).toBe(true);
    expect(canAddStock({ userRole: "manager", isSuperAdmin: false })).toBe(true);
  });

  it("allows a superadmin regardless of role", () => {
    expect(canAddStock({ userRole: null, isSuperAdmin: true })).toBe(true);
    expect(canAddStock({ userRole: "cashier", isSuperAdmin: true })).toBe(true);
  });

  it("denies cashiers, drivers, other roles and users without a role", () => {
    expect(canAddStock({ userRole: "cashier", isSuperAdmin: false })).toBe(false);
    expect(canAddStock({ userRole: "driver", isSuperAdmin: false })).toBe(false);
    expect(canAddStock({ userRole: "store_manager", isSuperAdmin: false })).toBe(false);
    expect(canAddStock({ userRole: null, isSuperAdmin: false })).toBe(false);
    expect(canAddStock({ userRole: undefined, isSuperAdmin: false })).toBe(false);
  });
});

describe("isStockIncreaseMovement", () => {
  it("treats entries as stock increases", () => {
    expect(isStockIncreaseMovement("Entrada - Compra")).toBe(true);
    expect(isStockIncreaseMovement("  entrada - Ajuste")).toBe(true);
  });

  it("does not treat exits as stock increases", () => {
    expect(isStockIncreaseMovement("Salida - Merma")).toBe(false);
    expect(isStockIncreaseMovement("")).toBe(false);
  });
});
