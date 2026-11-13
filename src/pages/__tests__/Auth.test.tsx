import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/context/BrandingContext", () => ({
  useBranding: () => ({ logoUrl: null, brandName: "Pekao Test", isLoadingBranding: false }),
}));

vi.mock("@/hooks/useAuthPage", () => ({
  useAuthPage: () => ({
    isLoading: false,
    rememberMe: false,
    setRememberMe: vi.fn(),
    storeModalIsOpen: false,
    setStoreModalIsOpen: vi.fn(),
    availableStores: [],
    handleSelectStoreAndProceed: vi.fn(),
    handleLogin: vi.fn(),
    handleSignup: vi.fn(),
  }),
}));

import Auth from "../Auth";

const renderAuth = () =>
  render(
    <MemoryRouter initialEntries={["/auth"]}>
      <Auth />
    </MemoryRouter>,
  );

const visibleButton = (name: RegExp) =>
  screen.getAllByRole("button", { name }).find((el) => !el.closest("[hidden]"));

describe("Auth page", () => {
  it("opens on the login form", () => {
    renderAuth();

    expect(visibleButton(/ingresar al sistema/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /registrar en el sistema/i })).not.toBeInTheDocument();
  });

  it("switches to the signup form and back", async () => {
    const user = userEvent.setup();
    renderAuth();

    await user.click(screen.getByRole("radio", { name: /registro/i }));
    expect(visibleButton(/registrar en el sistema/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /ingresar al sistema/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /acceso/i }));
    expect(visibleButton(/ingresar al sistema/i)).toBeVisible();
  });

  it("shows the store brand name", () => {
    renderAuth();

    expect(screen.getAllByText(/pekao test/i).length).toBeGreaterThan(0);
  });
});
