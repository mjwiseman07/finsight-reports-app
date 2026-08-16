import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  bootstrapLeadSessionFromSearchParams,
  isUsableCompanyName,
  rememberValidatedLeadSession,
  activationDismissStorageKey,
} from "@/lib/activation/lead-session";

const root = process.cwd();

function memoryStorage(seed: Record<string, string> = {}) {
  const store = { ...seed };
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
  };
}

describe("lead-session server authority", () => {
  it("exposes GET /api/free-review/session with cookie + DB validation", () => {
    const source = readFileSync(join(root, "app/api/free-review/session/route.ts"), "utf8");
    expect(source).toContain('cookies.get("free_review_lead_id")');
    expect(source).toContain('.from("free_review_leads")');
    expect(source).toContain('reason: "lead_free_review"');
    expect(source).toContain("status: 401");
  });

  it("dashboard loadAccess uses server session endpoint before allowing lead access", () => {
    const source = readFileSync(join(root, "app/dashboard/page.jsx"), "utf8");
    expect(source).toContain('fetch("/api/free-review/session"');
    expect(source).toContain("credentials: \"include\"");
    expect(source).toContain("rememberValidatedLeadSession");
    // Must not set lead_free_review from localStorage alone
    expect(source).not.toMatch(/if \(!storedToken && leadSessionMode\)/);
  });

  it("URL/localStorage bootstrap remains UX-only and marks serverValidated false", () => {
    const storage = memoryStorage();
    bootstrapLeadSessionFromSearchParams(new URLSearchParams({ leadId: "spoofed" }), storage);
    const raw = JSON.parse(storage.getItem("advisacor_lead_dashboard_session") || "{}");
    expect(raw.leadId).toBe("spoofed");
    expect(raw.serverValidated).toBe(false);
  });

  it("rememberValidatedLeadSession marks serverValidated true", () => {
    const storage = memoryStorage();
    rememberValidatedLeadSession({ lead_id: "real-lead", business_name: "Acme" }, storage);
    const raw = JSON.parse(storage.getItem("advisacor_lead_dashboard_session") || "{}");
    expect(raw.serverValidated).toBe(true);
    expect(raw.companyName).toBe("Acme");
  });

  it("free-review lead PATCH requires matching HttpOnly cookie", () => {
    const source = readFileSync(join(root, "app/api/free-review/leads/route.js"), "utf8");
    expect(source).toContain('cookies.get("free_review_lead_id")');
    expect(source).toContain("cookieLeadId !== leadId");
  });
});

describe("ActivationCard identity + industry model", () => {
  it("treats placeholder company names as unusable", () => {
    expect(isUsableCompanyName("Not provided")).toBe(false);
    expect(isUsableCompanyName("Free Review Company")).toBe(false);
    expect(isUsableCompanyName("Sandbox Company CA b483")).toBe(true);
  });

  it("scopes dismissal per company/lead", () => {
    expect(activationDismissStorageKey({ companyId: "a" })).not.toBe(
      activationDismissStorageKey({ companyId: "b" }),
    );
  });

  it("ActivationCard renders identity confirm controls", () => {
    const source = readFileSync(join(root, "components/dashboard/ActivationCard.tsx"), "utf8");
    expect(source).toContain("needsIdentityConfirm");
    expect(source).toContain("Confirm company name");
    expect(source).toContain("onConfirmCompanyIdentity");
    expect(source).toContain("activation-company-name");
  });
});

describe("free-review handoff regressions", () => {
  it("routes free-review capture to dashboard?leadId=", () => {
    const source = readFileSync(join(root, "app/free-review/page.tsx"), "utf8");
    expect(source).toContain("`/dashboard?leadId=${encodeURIComponent(result.lead.id)}`");
  });

  it("keeps LeadIdActivationHandler outside authenticated product gate", () => {
    const source = readFileSync(join(root, "app/dashboard/page.jsx"), "utf8");
    const handlerIdx = source.indexOf("<LeadIdActivationHandler");
    const allowedGateIdx = source.indexOf("access?.allowed === true");
    expect(handlerIdx).toBeGreaterThan(-1);
    expect(handlerIdx).toBeLessThan(allowedGateIdx);
  });
});
