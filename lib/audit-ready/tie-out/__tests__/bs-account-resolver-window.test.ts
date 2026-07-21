import { describe, it, expect } from "vitest";
import { activityWindowForFiscalYear } from "../bs-account-resolver";

describe("activityWindowForFiscalYear", () => {
  it("Jan-start FY, mid-year as-of", () => {
    expect(activityWindowForFiscalYear("2026-06-30", 1)).toEqual({
      start: "2026-01-01",
      end: "2026-06-30",
    });
  });
  it("Jan-start FY, year-end as-of", () => {
    expect(activityWindowForFiscalYear("2026-12-31", 1)).toEqual({
      start: "2026-01-01",
      end: "2026-12-31",
    });
  });
  it("Jul-start FY, as-of after FY start", () => {
    expect(activityWindowForFiscalYear("2026-09-30", 7)).toEqual({
      start: "2026-07-01",
      end: "2026-09-30",
    });
  });
  it("Jul-start FY, as-of before FY start (prior FY still open)", () => {
    expect(activityWindowForFiscalYear("2026-03-31", 7)).toEqual({
      start: "2025-07-01",
      end: "2026-03-31",
    });
  });
  it("Oct-start FY, edge on FY start month", () => {
    expect(activityWindowForFiscalYear("2026-10-15", 10)).toEqual({
      start: "2026-10-01",
      end: "2026-10-15",
    });
  });
});
