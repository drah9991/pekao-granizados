import { describe, it, expect } from "bun:test";
import { mlToLiters, litersToMl, mlToCups, mlToServings, OZ_TO_ML, STANDARD_SERVING_ML, CUP_YIELD_BASE_ML } from "./volume";

describe("Volume Utilities", () => {

  describe("mlToLiters", () => {
    it("converts 1000 ml to 1 liter", () => {
      expect(mlToLiters(1000)).toBe(1);
    });

    it("converts 500 ml to 0.5 liters", () => {
      expect(mlToLiters(500)).toBe(0.5);
    });

    it("converts 0 ml to 0 liters", () => {
      expect(mlToLiters(0)).toBe(0);
    });

    it("converts fractional ml correctly", () => {
      expect(mlToLiters(2500)).toBe(2.5);
    });

    it("handles large tank volumes (10,000 ml = 10 L)", () => {
      expect(mlToLiters(10000)).toBe(10);
    });
  });

  describe("litersToMl", () => {
    it("converts 1 liter to 1000 ml", () => {
      expect(litersToMl(1)).toBe(1000);
    });

    it("converts 0.5 liters to 500 ml", () => {
      expect(litersToMl(0.5)).toBe(500);
    });

    it("converts 0 liters to 0 ml", () => {
      expect(litersToMl(0)).toBe(0);
    });

    it("is the inverse of mlToLiters", () => {
      expect(litersToMl(mlToLiters(2500))).toBe(2500);
    });

    it("handles decimal liters correctly (1.5 L = 1500 ml)", () => {
      expect(litersToMl(1.5)).toBe(1500);
    });
  });

  describe("mlToCups", () => {
    it("returns 0 cups for 0 ml", () => {
      expect(mlToCups(0)).toBe(0);
    });

    it("returns 1 cup for exactly 300 ml (CUP_YIELD_BASE_ML)", () => {
      expect(mlToCups(CUP_YIELD_BASE_ML)).toBe(1);
    });

    it("floors the result (299 ml = 0 cups)", () => {
      expect(mlToCups(299)).toBe(0);
    });

    it("returns 3 cups for 900 ml", () => {
      expect(mlToCups(900)).toBe(3);
    });

    it("floors partial cups (850 ml = 2 cups, not 3)", () => {
      expect(mlToCups(850)).toBe(2);
    });

    it("handles large volumes (10,000 ml = 33 cups)", () => {
      expect(mlToCups(10000)).toBe(33);
    });
  });

  describe("mlToServings", () => {
    it("returns 0 servings for 0 ml", () => {
      expect(mlToServings(0)).toBe(0);
    });

    it("returns 1 serving for exactly STANDARD_SERVING_ML (~118.28 ml)", () => {
      expect(mlToServings(STANDARD_SERVING_ML)).toBe(1);
    });

    it("floors partial servings", () => {
      // STANDARD_SERVING_ML ≈ 118.28, so 200 ml = 1 serving
      expect(mlToServings(200)).toBe(1);
    });

    it("calculates correctly for 10,000 ml", () => {
      const expected = Math.floor(10000 / STANDARD_SERVING_ML);
      expect(mlToServings(10000)).toBe(expected);
    });
  });

  describe("Constants", () => {
    it("OZ_TO_ML is 29.57 (US fluid ounce conversion)", () => {
      expect(OZ_TO_ML).toBe(29.57);
    });

    it("STANDARD_SERVING_ML = 4 oz × 29.57", () => {
      expect(STANDARD_SERVING_ML).toBe(4 * 29.57);
    });

    it("CUP_YIELD_BASE_ML is 300 (12oz standard cup)", () => {
      expect(CUP_YIELD_BASE_ML).toBe(300);
    });
  });
});
