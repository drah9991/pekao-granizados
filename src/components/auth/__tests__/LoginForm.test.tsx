import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import LoginForm from "../LoginForm";

function renderForm(overrides: Partial<React.ComponentProps<typeof LoginForm>> = {}) {
  const props = {
    isLoading: false,
    onLogin: vi.fn().mockResolvedValue(true),
    rememberMe: false,
    onRememberMeChange: vi.fn(),
    ...overrides,
  };
  render(<LoginForm {...props} />);
  return props;
}

// El grupo del campo de contraseña y el propio <input> comparten nombre accesible.
const passwordInput = () => screen.getByLabelText(/contraseña de acceso/i, { selector: "input" });

describe("LoginForm", () => {
  it("submits the typed email and password", async () => {
    const user = userEvent.setup();
    const { onLogin } = renderForm();

    await user.type(screen.getByLabelText(/correo de operador/i), "caja@pekao.com");
    await user.type(passwordInput(), "secreto123");
    await user.click(screen.getByRole("button", { name: /ingresar al sistema/i }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith("caja@pekao.com", "secreto123"));
  });

  it("shows validation errors and does not submit an empty form", async () => {
    const user = userEvent.setup();
    const { onLogin } = renderForm();

    await user.click(screen.getByRole("button", { name: /ingresar al sistema/i }));

    // Astryx repite el mensaje en una región oculta que anuncian los lectores de pantalla.
    expect((await screen.findAllByText(/el correo de operador es obligatorio/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/al menos 6 caracteres/i).length).toBeGreaterThan(0);
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("reveals and hides the password", async () => {
    const user = userEvent.setup();
    renderForm();
    const password = passwordInput();
    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: /mostrar contraseña/i }));
    expect(password).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: /ocultar contraseña/i }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("reports the remember-me choice", async () => {
    const user = userEvent.setup();
    const { onRememberMeChange } = renderForm();

    await user.click(screen.getByRole("checkbox", { name: /mantener sesión activa/i }));

    expect(onRememberMeChange).toHaveBeenCalledWith(true);
  });

  it("blocks submitting while loading", async () => {
    const user = userEvent.setup();
    const { onLogin } = renderForm({ isLoading: true });

    await user.click(screen.getByRole("button", { name: /ingresar al sistema|verificando/i }));

    expect(onLogin).not.toHaveBeenCalled();
  });
});
