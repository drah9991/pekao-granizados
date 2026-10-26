import { describe, expect, it } from "vitest";

import { bogotaDateKey, bogotaDayStart, bogotaNextDayStart, bogotaDaysAgo } from "./bogotaDate";

describe("bogotaDateKey", () => {
  it("keeps a 20:30 Bogotá sale on its own day, not on the UTC day after", () => {
    // 2026-10-21 20:30 en Bogotá = 2026-10-22 01:30 UTC
    expect(bogotaDateKey(new Date("2026-10-22T01:30:00Z"))).toBe("2026-10-21");
  });

  it("uses the same day before 19:00 Bogotá", () => {
    expect(bogotaDateKey(new Date("2026-10-21T15:00:00Z"))).toBe("2026-10-21");
  });
});

describe("bogotaDaysAgo", () => {
  it("counts days back from the Bogotá date", () => {
    expect(bogotaDaysAgo(7, new Date("2026-10-22T01:30:00Z"))).toBe("2026-10-14");
  });

  it("crosses month boundaries", () => {
    expect(bogotaDaysAgo(1, new Date("2026-11-01T12:00:00Z"))).toBe("2026-10-31");
  });
});

describe("bogotaDayStart / bogotaNextDayStart", () => {
  it("returns the start of the day with the -05:00 offset", () => {
    expect(bogotaDayStart("2026-10-21")).toBe("2026-10-21T00:00:00-05:00");
  });

  it("returns the start of the next day, also across months and years", () => {
    expect(bogotaNextDayStart("2026-10-21")).toBe("2026-10-22T00:00:00-05:00");
    expect(bogotaNextDayStart("2026-10-31")).toBe("2026-11-01T00:00:00-05:00");
    expect(bogotaNextDayStart("2026-12-31")).toBe("2027-01-01T00:00:00-05:00");
  });
});
