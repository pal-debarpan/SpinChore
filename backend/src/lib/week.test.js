import { describe, expect, it } from "vitest";
import { endOfWeekSunday, normalizeWeekStart, startOfWeekMonday } from "./week.js";

describe("week helpers", () => {
  it("maps any UTC date onto the Monday of that week", () => {
    expect(startOfWeekMonday(new Date("2026-10-21T15:00:00.000Z"))).toBe("2026-10-19");
    expect(startOfWeekMonday(new Date("2026-10-19T00:00:00.000Z"))).toBe("2026-10-19");
    expect(startOfWeekMonday(new Date("2026-10-25T23:00:00.000Z"))).toBe("2026-10-19");
  });

  it("ends on Sunday", () => {
    expect(endOfWeekSunday("2026-10-19")).toBe("2026-10-25");
  });

  it("normalizes a mid-week date to Monday", () => {
    expect(normalizeWeekStart("2026-10-22")).toBe("2026-10-19");
    expect(normalizeWeekStart("not-a-date")).toBeNull();
  });
});
