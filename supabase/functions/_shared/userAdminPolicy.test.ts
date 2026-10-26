import { describe, expect, it } from "vitest";

import { canManageUser, type ManagedUser } from "./userAdminPolicy";

const STORE_A = "store-a";
const STORE_B = "store-b";

const user = (overrides: Partial<ManagedUser>): ManagedUser => ({
  id: "u-" + Math.random().toString(36).slice(2),
  storeId: STORE_A,
  isSuperadmin: false,
  roles: [],
  ...overrides,
});

describe("canManageUser", () => {
  it("lets a manager update a cashier of the same store", () => {
    const result = canManageUser(user({ roles: ["manager"] }), user({ roles: ["cashier"] }), "update");
    expect(result.allowed).toBe(true);
  });

  it("refuses a target from another store", () => {
    const result = canManageUser(user({ roles: ["admin"] }), user({ storeId: STORE_B, roles: ["cashier"] }), "delete");
    expect(result).toEqual({ allowed: false, reason: "other_store" });
  });

  it("refuses when the caller has no store", () => {
    const result = canManageUser(user({ storeId: null, roles: ["manager"] }), user({ storeId: null, roles: ["cashier"] }), "update");
    expect(result).toEqual({ allowed: false, reason: "other_store" });
  });

  it("refuses callers without a management role", () => {
    const result = canManageUser(user({ roles: ["cashier"] }), user({ roles: ["cashier"] }), "update");
    expect(result).toEqual({ allowed: false, reason: "no_role" });
  });

  it("does not let a manager touch an admin of the same store", () => {
    const result = canManageUser(user({ roles: ["store_manager"] }), user({ roles: ["admin"] }), "update");
    expect(result).toEqual({ allowed: false, reason: "privileged_target" });
  });

  it("lets an admin manage another admin of the same store", () => {
    const result = canManageUser(user({ roles: ["admin"] }), user({ roles: ["admin"] }), "update");
    expect(result.allowed).toBe(true);
  });

  it("never lets a non-superadmin touch a superadmin", () => {
    const byFlag = canManageUser(user({ roles: ["admin"] }), user({ isSuperadmin: true }), "delete");
    const byRole = canManageUser(user({ roles: ["admin"] }), user({ roles: ["super_admin"] }), "update");
    expect(byFlag).toEqual({ allowed: false, reason: "privileged_target" });
    expect(byRole).toEqual({ allowed: false, reason: "privileged_target" });
  });

  it("lets a superadmin manage users of any store", () => {
    const result = canManageUser(user({ storeId: null, isSuperadmin: true }), user({ storeId: STORE_B, roles: ["admin"] }), "delete");
    expect(result.allowed).toBe(true);
  });

  it("refuses deleting your own account, even as superadmin", () => {
    const me = user({ isSuperadmin: true });
    expect(canManageUser(me, me, "delete")).toEqual({ allowed: false, reason: "self_delete" });
  });

  it("allows updating your own account", () => {
    const me = user({ roles: ["manager"] });
    expect(canManageUser(me, me, "update").allowed).toBe(true);
  });
});
