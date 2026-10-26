import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import SyncDrawer from "../SyncDrawer";
import type { FailedSyncOrder } from "@/store/useSyncStore";

const FAILED: FailedSyncOrder = {
  id: "abcdef12-0000-0000-0000-000000000000",
  payload: { total: 8500, items: [] },
  timestamp: "2026-10-25T23:30:00.000Z",
  error: { code: "23503", message: "producto inexistente" },
  failedAt: "2026-10-25T23:31:00.000Z",
};

const renderDrawer = (onRetryFailed = vi.fn()) =>
  render(
    <SyncDrawer
      isOpen
      onClose={vi.fn()}
      pendingOrders={[]}
      failedOrders={[FAILED]}
      onRetryFailed={onRetryFailed}
      isOnline
      isProcessing={false}
      onSync={vi.fn(async () => undefined)}
      checkPendingOrders={vi.fn(async () => undefined)}
    />
  );

describe("SyncDrawer failed sales", () => {
  it("shows rejected sales with the server reason", () => {
    renderDrawer();

    expect(screen.getByText(/Ventas rechazadas por el servidor \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/#ABCDEF12/)).toBeInTheDocument();
    expect(screen.getByText("producto inexistente")).toBeInTheDocument();
    expect(screen.getByText("[23503]")).toBeInTheDocument();
  });

  it("sends a rejected sale back to the queue when retried", () => {
    const onRetryFailed = vi.fn();
    renderDrawer(onRetryFailed);

    fireEvent.click(screen.getByRole("button", { name: /Reintentar/ }));

    expect(onRetryFailed).toHaveBeenCalledWith(FAILED.id);
  });
});
