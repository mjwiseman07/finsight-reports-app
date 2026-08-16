import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("free-review → dashboard lead handoff", () => {
  it("routes free-review capture to dashboard?leadId=", () => {
    const source = readFileSync(join(root, "app/free-review/page.tsx"), "utf8");
    expect(source).toContain("`/dashboard?leadId=${encodeURIComponent(result.lead.id)}`");
    expect(source).not.toContain("`/onboarding?leadId=");
  });

  it("bootstraps lead session inside loadAccess before the access gate", () => {
    const source = readFileSync(join(root, "app/dashboard/page.jsx"), "utf8");
    expect(source).toContain("bootstrapLeadSessionFromSearchParams");
    const bootstrapIdx = source.indexOf("bootstrapLeadSessionFromSearchParams(dashboardSearch)");
    const leadGateIdx = source.indexOf('reason: "lead_free_review"');
    const signinIdx = source.indexOf('router.replace("/signin")');
    expect(bootstrapIdx).toBeGreaterThan(-1);
    expect(leadGateIdx).toBeGreaterThan(bootstrapIdx);
    expect(signinIdx).toBeGreaterThan(bootstrapIdx);
  });

  it("mounts LeadIdActivationHandler outside authenticated product content gate", () => {
    const source = readFileSync(join(root, "app/dashboard/page.jsx"), "utf8");
    const handlerIdx = source.indexOf("<LeadIdActivationHandler");
    const allowedGateIdx = source.indexOf("access?.allowed === true");
    expect(handlerIdx).toBeGreaterThan(-1);
    expect(allowedGateIdx).toBeGreaterThan(-1);
    expect(handlerIdx).toBeLessThan(allowedGateIdx);
  });

  it("does not treat localStorage lead session as /api/check-trial auth", () => {
    const source = readFileSync(join(root, "app/dashboard/page.jsx"), "utf8");
    // Authenticated product path still requires storedToken for check-trial
    expect(source).toMatch(/Authorization:\s*`Bearer \$\{storedToken\}`/);
    expect(source).toContain('reason: "lead_free_review"');
    // Lead path is an explicit alternate branch when !storedToken && leadSessionMode
    expect(source).toContain("if (!storedToken && leadSessionMode)");
  });
});
