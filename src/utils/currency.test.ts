import { describe, it, expect } from "bun:test";
import { formatCOP, formatCOPCompact, parseCOP } from "../lib/currency";

describe("Currency Utilities (COP)", () => {

  describe("formatCOP", () => {
    it("formats zero as $0", () => {
      expect(formatCOP(0)).toMatch(/\$\s*0/);
    });

    it("formats a positive integer", () => {
      // COP format: $19.412 (dot as thousands separator in es-CO)
      const result = formatCOP(19412);
      expect(result).toContain("19");
      expect(result).toContain("412");
    });

    it("rounds decimal amounts (no fractional pesos)", () => {
      // Should not contain a comma or dot followed by digits for decimals
      const result = formatCOP(1000.9);
      expect(result).not.toMatch(/[,.]\d{2}$/);
      // Rounds to 1001
      expect(result).toContain("1");
    });

    it("formats large amounts correctly", () => {
      const result = formatCOP(1_000_000);
      expect(result).toContain("1");
      expect(result).toContain("000");
    });

    it("handles negative amounts", () => {
      const result = formatCOP(-5000);
      expect(result).toContain("5");
      expect(result).toContain("000");
    });
  });

  describe("formatCOPCompact", () => {
    it("formats amounts < 1000 using formatCOP", () => {
      const result = formatCOPCompact(500);
      expect(result).toContain("500");
    });

    it("formats amounts >= 1000 as 'k' notation", () => {
      expect(formatCOPCompact(87000)).toBe("$87k");
    });

    it("formats exactly 1000 as '$1k'", () => {
      expect(formatCOPCompact(1000)).toBe("$1k");
    });

    it("formats amounts >= 1,000,000 as 'M' notation", () => {
      expect(formatCOPCompact(1_300_000)).toBe("$1.3M");
    });

    it("formats 2.5 million correctly", () => {
      expect(formatCOPCompact(2_500_000)).toBe("$2.5M");
    });

    it("formats 500k correctly (rounds to nearest thousand)", () => {
      expect(formatCOPCompact(500_000)).toBe("$500k");
    });
  });

  describe("parseCOP", () => {
    it("parses a formatted COP string back to number", () => {
      // '$19.412' → 19412
      expect(parseCOP("$19.412")).toBe(19412);
    });

    it("parses a plain number string", () => {
      expect(parseCOP("5000")).toBe(5000);
    });

    it("returns 0 for empty string", () => {
      expect(parseCOP("")).toBe(0);
    });

    it("returns 0 for non-numeric string", () => {
      expect(parseCOP("abc")).toBe(0);
    });

    it("handles negative values", () => {
      expect(parseCOP("-5000")).toBe(-5000);
    });

    it("strips currency symbol and dots correctly", () => {
      // When formatting $1,000,000 then parsing back
      const formatted = formatCOP(1_000_000);
      const parsed = parseCOP(formatted);
      expect(parsed).toBe(1_000_000);
    });
  });
});
