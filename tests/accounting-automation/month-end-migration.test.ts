import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20260917180140_ra_pro_month_end_review_packages.sql"), "utf8");

describe("month-end package migration", () => {
  it("is review-only, RLS-scoped, and service-write-only", () => {
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("GRANT SELECT ON TABLE public.ra_pro_month_end_review_packages TO authenticated");
    expect(sql).toContain("GRANT SELECT, INSERT ON TABLE public.ra_pro_month_end_review_packages TO service_role");
    expect(sql).not.toContain("GRANT INSERT ON TABLE public.ra_pro_month_end_review_packages TO authenticated");
    expect(sql).toContain("SECURITY INVOKER");
    expect(sql).toContain("provider_writes");
  });
});
