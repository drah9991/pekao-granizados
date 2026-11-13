import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SignupForm from "../SignupForm";

function renderForm(overrides: Partial<React.ComponentProps<typeof SignupForm>> = {}) {
  const props = {
    isLoading: false,
    onSignup: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
  render(<SignupForm {...props} />);
  return props;
}

const nameInput = () => screen.getByLabelText(/nombre operativo/i, { selector: "input" });
const emailInput = () => screen.getByLabelText(/correo electrónico/i, { selector: "input" });
const passwordInput = () => screen.getByLabelText(/contraseña de seguridad/i, { selector: "input" });
const submitButton = () => screen.getByRole("button", { name: /registrar en el sistema|creando perfil/i });

describe("SignupForm", () => {
  it("submits email, password and full name", async () => {
    const user = userEvent.setup();
    const { onSignup } = renderForm();

    await user.type(nameInput(), "Juan Pérez");
    await user.type(emailInput(), "juan@pekao.com");
    await user.type(passwordInput(), "secreto123");
    await user.click(submitButton());

    await waitFor(() => expect(onSignup).toHaveBeenCalledWith("juan@pekao.com", "secreto123", "Juan Pérez"));
  });

  it("does not submit an empty form and explains what is missing", async () => {
    const user = userEvent.setup();
    const { onSignup } = renderForm();

    await user.click(submitButton());

    expect((await screen.findAllByText(/el nombre del operador es obligatorio/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/el correo electrónico es obligatorio/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/al menos 6 caracteres/i).length).toBeGreaterThan(0);
    expect(onSignup).not.toHaveBeenCalled();
  });

  it("rejects a malformed email", async () => {
    const user = userEvent.setup();
    const { onSignup } = renderForm();

    await user.type(nameInput(), "Juan");
    await user.type(emailInput(), "no-es-correo");
    await user.type(passwordInput(), "secreto123");
    await user.click(submitButton());

    expect((await screen.findAllByText(/correo electrónico válido/i)).length).toBeGreaterThan(0);
    expect(onSignup).not.toHaveBeenCalled();
  });

  it("reveals and hides the password", async () => {
    const user = userEvent.setup();
    renderForm();
    expect(passwordInput()).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: /mostrar contraseña/i }));
    expect(passwordInput()).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: /ocultar contraseña/i }));
    expect(passwordInput()).toHaveAttribute("type", "password");
  });

  it("blocks submitting while loading", async () => {
    const user = userEvent.setup();
    const { onSignup } = renderForm({ isLoading: true });

    await user.click(submitButton());

    expect(onSignup).not.toHaveBeenCalled();
  });
});
