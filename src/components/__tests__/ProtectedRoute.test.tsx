import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const authState = {
  user: { id: "u1" } as Record<string, unknown> | null,
  isLoading: false,
  userRole: null as string | null,
  isSuperAdmin: false,
};

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("../SubscriptionLock", () => ({
  SubscriptionLock: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import ProtectedRoute from "../ProtectedRoute";

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={["/pos"]}>
      <Routes>
        <Route
          path="/pos"
          element={
            <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
              <p>Pantalla POS</p>
            </ProtectedRoute>
          }
        />
        <Route path="/dashboard" element={<p>Dashboard</p>} />
        <Route path="/auth" element={<p>Login</p>} />
      </Routes>
    </MemoryRouter>
  );

describe("ProtectedRoute", () => {
  beforeEach(() => {
    authState.user = { id: "u1" };
    authState.userRole = null;
    authState.isSuperAdmin = false;
  });

  it("sends a user without a role away from a role-gated page", () => {
    renderAt();
    expect(screen.queryByText("Pantalla POS")).not.toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("lets a user with an allowed role in", () => {
    authState.userRole = "cashier";
    renderAt();
    expect(screen.getByText("Pantalla POS")).toBeInTheDocument();
  });

  it("sends a user with another role away", () => {
    authState.userRole = "driver";
    renderAt();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("lets a superadmin in even without a role row", () => {
    authState.isSuperAdmin = true;
    renderAt();
    expect(screen.getByText("Pantalla POS")).toBeInTheDocument();
  });

  it("sends an anonymous visitor to the login", () => {
    authState.user = null;
    renderAt();
    expect(screen.getByText("Login")).toBeInTheDocument();
  });
});
