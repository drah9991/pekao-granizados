import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
}));

import { useAlerts } from "../useAlerts";

describe("useAlerts", () => {
  // usePOS pone notifyInfo/notifyCritical en las dependencias de handleSync, y un efecto
  // depende de handleSync: si cambian en cada render, la sincronización se relanza sin fin.
  it("returns the same functions across renders", () => {
    const { result, rerender } = renderHook(() => useAlerts());
    const first = result.current;

    rerender();

    expect(result.current.notifyInfo).toBe(first.notifyInfo);
    expect(result.current.notifyWarning).toBe(first.notifyWarning);
    expect(result.current.notifyCritical).toBe(first.notifyCritical);
    expect(result.current.showCriticalBanner).toBe(first.showCriticalBanner);
    expect(result.current.showBlockingModal).toBe(first.showBlockingModal);
  });
});
