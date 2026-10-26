import { describe, expect, it } from "vitest";

import { classifySyncError } from "./syncErrorPolicy";

describe("classifySyncError", () => {
  it("treats a duplicate idempotency key as already synced", () => {
    const message = 'duplicate key value violates unique constraint "orders_idempotency_key_key"';
    expect(classifySyncError({ code: "23505", status: 409, message })).toBe("synced");
  });

  it("keeps other unique violations as failed, the sale was not recorded", () => {
    const message = 'duplicate key value violates unique constraint "store_stock_product_store_unique"';
    expect(classifySyncError({ code: "23505", status: 409, message })).toBe("failed");
    expect(classifySyncError({ code: "23505", status: 409 })).toBe("failed");
  });

  it("retries when the function itself is not executable with the current token", () => {
    const message = "permission denied for function process_sale";
    expect(classifySyncError({ code: "42501", status: 403, message })).toBe("retry");
  });

  it("keeps sales rejected by the database as failed instead of dropping them", () => {
    expect(classifySyncError({ code: "P0001", status: 400 })).toBe("failed");
    expect(classifySyncError({ code: "23503", status: 409 })).toBe("failed");
    expect(classifySyncError({ code: "23514", status: 400 })).toBe("failed");
    expect(classifySyncError({ code: "22P02", status: 400 })).toBe("failed");
    expect(classifySyncError({ code: "42501", status: 403 })).toBe("failed");
  });

  it("marks plain 400 and 409 responses as failed", () => {
    expect(classifySyncError({ status: 400 })).toBe("failed");
    expect(classifySyncError({ status: 409 })).toBe("failed");
  });

  it("retries network errors, expired sessions and server errors", () => {
    expect(classifySyncError({})).toBe("retry");
    expect(classifySyncError({ status: 0 })).toBe("retry");
    expect(classifySyncError({ code: "PGRST301", status: 401 })).toBe("retry");
    expect(classifySyncError({ status: 403 })).toBe("retry");
    expect(classifySyncError({ status: 429 })).toBe("retry");
    expect(classifySyncError({ status: 503 })).toBe("retry");
  });

  it("retries unknown errors so the queue keeps them", () => {
    expect(classifySyncError({ code: "PGRST202", status: 404 })).toBe("retry");
  });
});
