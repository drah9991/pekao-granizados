import { describe, expect, it } from "vitest";

import { canAddStock, canChooseAnyStore, isStockIncreaseMovement, storesForLogin } from "./permissions";

const STORES = [
  { id: "a", name: "Sede A" },
  { id: "b", name: "Sede B" },
];

describe("canChooseAnyStore", () => {
  it("allows admins and superadmins", () => {
    expect(canChooseAnyStore({ userRole: "admin", isSuperAdmin: false })).toBe(true);
    expect(canChooseAnyStore({ userRole: null, isSuperAdmin: true })).toBe(true);
  });

  it("denies managers, cashiers and users without a role", () => {
    expect(canChooseAnyStore({ userRole: "manager", isSuperAdmin: false })).toBe(false);
    expect(canChooseAnyStore({ userRole: "cashier", isSuperAdmin: false })).toBe(false);
    expect(canChooseAnyStore({ userRole: null, isSuperAdmin: false })).toBe(false);
  });
});

describe("storesForLogin", () => {
  it("offers every store to an admin", () => {
    const result = storesForLogin(STORES, { userRole: "admin", isSuperAdmin: false, profileStoreId: "a" });
    expect(result).toEqual(STORES);
  });

  it("offers only the profile store to other staff", () => {
    const result = storesForLogin(STORES, { userRole: "cashier", isSuperAdmin: false, profileStoreId: "b" });
    expect(result).toEqual([{ id: "b", name: "Sede B" }]);
  });

  it("offers nothing to staff without an assigned store", () => {
    expect(storesForLogin(STORES, { userRole: "manager", isSuperAdmin: false, profileStoreId: null })).toEqual([]);
  });

  it("offers nothing to a customer without a role", () => {
    expect(storesForLogin(STORES, { userRole: null, isSuperAdmin: false, profileStoreId: undefined })).toEqual([]);
  });
});

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
