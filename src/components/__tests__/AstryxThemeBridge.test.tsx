import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const useThemeMock = vi.fn();
vi.mock("next-themes", () => ({ useTheme: () => useThemeMock() }));

import { AstryxThemeBridge } from "../AstryxThemeBridge";
import { toAstryxMode } from "@/lib/astryxMode";

describe("toAstryxMode", () => {
  it("maps the resolved next-themes theme to an Astryx mode", () => {
    expect(toAstryxMode("dark")).toBe("dark");
    expect(toAstryxMode("light")).toBe("light");
  });

  it("falls back to system before next-themes resolves", () => {
    expect(toAstryxMode(undefined)).toBe("system");
    expect(toAstryxMode("unexpected")).toBe("system");
  });
});

describe("AstryxThemeBridge", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders its children and syncs the dark mode to <html>", () => {
    useThemeMock.mockReturnValue({ resolvedTheme: "dark" });

    render(
      <AstryxThemeBridge>
        <p>contenido</p>
      </AstryxThemeBridge>,
    );

    expect(screen.getByText("contenido")).toBeInTheDocument();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("syncs the light mode to <html>", () => {
    useThemeMock.mockReturnValue({ resolvedTheme: "light" });

    render(
      <AstryxThemeBridge>
        <p>contenido</p>
      </AstryxThemeBridge>,
    );

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
