import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StoreSelectorDialog } from "../StoreSelectorDialog";

const STORES = [
  { id: "s1", name: "Sede Centro", address: "Calle 10 # 5-20", city: "Bogotá" },
  { id: "s2", name: "Sede Norte", address: null, city: "Chía" },
  { id: "s3", name: "Sede Sur" },
];

function renderDialog(overrides: Partial<React.ComponentProps<typeof StoreSelectorDialog>> = {}) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    stores: STORES,
    currentStoreId: "s2",
    onSelectStore: vi.fn().mockResolvedValue(undefined),
    isProcessing: false,
    ...overrides,
  };
  render(<StoreSelectorDialog {...props} />);
  return props;
}

const storeButton = (name: RegExp) => screen.getByRole("button", { name });

describe("StoreSelectorDialog", () => {
  it("lists every store with its location and the store count", () => {
    renderDialog();

    expect(screen.getByText(/seleccionar punto de venta/i)).toBeInTheDocument();
    expect(screen.getByText("Sede Centro")).toBeInTheDocument();
    expect(screen.getByText("Calle 10 # 5-20 • Bogotá")).toBeInTheDocument();
    expect(screen.getByText("Chía")).toBeInTheDocument();
    expect(screen.getByText("Sede Sur")).toBeInTheDocument();
    expect(screen.getByText(/3 sucursales disponibles/i)).toBeInTheDocument();
  });

  it("marks the current store as active", () => {
    renderDialog();

    expect(screen.getAllByText(/^activo$/i)).toHaveLength(1);
  });

  it("selects a store and shows it is connecting", async () => {
    const user = userEvent.setup();
    const { onSelectStore } = renderDialog();

    await user.click(storeButton(/sede centro/i));

    await waitFor(() => expect(onSelectStore).toHaveBeenCalledWith("s1"));
    expect(screen.getByText(/conectando/i)).toBeInTheDocument();
  });

  it("ignores clicks while a selection is processing", async () => {
    const user = userEvent.setup();
    const { onSelectStore } = renderDialog({ isProcessing: true });

    await user.click(storeButton(/sede sur/i));

    expect(onSelectStore).not.toHaveBeenCalled();
  });

  it("shows nothing when closed", () => {
    renderDialog({ isOpen: false });

    // Astryx deja el contenido montado dentro de un <dialog> cerrado; lo que importa es que no se vea.
    const store = screen.queryByText("Sede Centro");
    if (store) expect(store).not.toBeVisible();
  });
});
