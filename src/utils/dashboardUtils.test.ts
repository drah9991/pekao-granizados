import { describe, it, expect } from "bun:test";
import { getDashboardRanges } from "../utils/dashboardUtils";

describe("getDashboardRanges", () => {

  describe("'today' period", () => {
    it("returns ISO strings for current and previous day", () => {
      const ranges = getDashboardRanges("today");
      expect(typeof ranges.current.start).toBe("string");
      expect(typeof ranges.current.end).toBe("string");
      expect(typeof ranges.comparison.start).toBe("string");
      expect(typeof ranges.comparison.end).toBe("string");
    });

    it("current range starts at beginning of today (00:00:00)", () => {
      const ranges = getDashboardRanges("today");
      const start = new Date(ranges.current.start);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
    });

    it("current range ends at end of today (23:59:59)", () => {
      const ranges = getDashboardRanges("today");
      const end = new Date(ranges.current.end);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
    });

    it("comparison is exactly 1 day before current", () => {
      const ranges = getDashboardRanges("today");
      const currentStart = new Date(ranges.current.start);
      const compStart = new Date(ranges.comparison.start);
      const diffMs = currentStart.getTime() - compStart.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(Math.round(diffDays)).toBe(1);
    });
  });

  describe("'week' period", () => {
    it("returns valid ISO strings", () => {
      const ranges = getDashboardRanges("week");
      expect(() => new Date(ranges.current.start)).not.toThrow();
      expect(() => new Date(ranges.current.end)).not.toThrow();
    });

    it("current week starts on Monday (weekStartsOn: 1)", () => {
      const ranges = getDashboardRanges("week");
      const start = new Date(ranges.current.start);
      // Day 1 = Monday in ISO (getDay() returns 1 for Monday)
      expect(start.getDay()).toBe(1);
    });

    it("comparison is the previous week", () => {
      const ranges = getDashboardRanges("week");
      const currentStart = new Date(ranges.current.start);
      const compStart = new Date(ranges.comparison.start);
      const diffDays = (currentStart.getTime() - compStart.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(diffDays)).toBe(7);
    });
  });

  describe("'month' period", () => {
    it("current start is the first day of the current month", () => {
      const ranges = getDashboardRanges("month");
      const start = new Date(ranges.current.start);
      expect(start.getDate()).toBe(1);
    });

    it("comparison starts on the 1st of the previous month", () => {
      const ranges = getDashboardRanges("month");
      const compStart = new Date(ranges.comparison.start);
      expect(compStart.getDate()).toBe(1);
      const currentStart = new Date(ranges.current.start);
      // Comparison month should be 1 less than current month (or 11 if current is January)
      const expectedMonth = (currentStart.getMonth() + 11) % 12;
      expect(compStart.getMonth()).toBe(expectedMonth);
    });
  });

  describe("'year' period", () => {
    it("current start is January 1st of the current year", () => {
      const ranges = getDashboardRanges("year");
      const start = new Date(ranges.current.start);
      expect(start.getMonth()).toBe(0); // January
      expect(start.getDate()).toBe(1);
    });

    it("comparison starts on January 1st of the previous year", () => {
      const ranges = getDashboardRanges("year");
      const currentStart = new Date(ranges.current.start);
      const compStart = new Date(ranges.comparison.start);
      expect(compStart.getFullYear()).toBe(currentStart.getFullYear() - 1);
      expect(compStart.getMonth()).toBe(0);
      expect(compStart.getDate()).toBe(1);
    });
  });

  describe("return shape", () => {
    it("always returns {current, comparison} with {start, end} each", () => {
      const periods = ["today", "week", "month", "year"] as const;
      periods.forEach(period => {
        const result = getDashboardRanges(period);
        expect(result).toHaveProperty("current");
        expect(result).toHaveProperty("comparison");
        expect(result.current).toHaveProperty("start");
        expect(result.current).toHaveProperty("end");
        expect(result.comparison).toHaveProperty("start");
        expect(result.comparison).toHaveProperty("end");
      });
    });
  });
});
