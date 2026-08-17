import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  beginAuthorizedConnectResume,
  buildDashboardForceConnectHref,
  buildDashboardResumeConnectHref,
  buildMfaChallengeHref,
  clearConnectResumeState,
  consumeConnectResumePending,
  hasConnectResumeAttempt,
  isAal2RequiredApiError,
  markConnectResumeAttempt,
  markConnectResumePending,
  readForceConnectProvider,
  readResumeConnectProvider,
  redirectToMfaForAccountingConnect,
} from "@/lib/mfa/connect-step-up";
import { isMfaSensitivePath } from "@/lib/mfa/paths";

describe("connect-step-up AAL2 helpers", () => {
  const storage = new Map<string, string>();
  const assign = vi.fn();

  beforeEach(() => {
    storage.clear();
    assign.mockReset();
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (k: string) => (storage.has(k) ? storage.get(k)! : null),
        setItem: (k: string, v: string) => {
          storage.set(k, String(v));
        },
        removeItem: (k: string) => {
          storage.delete(k);
        },
      },
      location: {
        search: "",
        assign,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects AAL2 required API errors", () => {
    expect(isAal2RequiredApiError({ status: 403 }, { error: "AAL2 required" })).toBe(true);
    expect(isAal2RequiredApiError({ status: 401 }, { error: "AAL2 required" })).toBe(false);
    expect(isAal2RequiredApiError({ status: 403 }, { error: "forbidden" })).toBe(false);
  });

  it("builds MFA challenge and resume URLs", () => {
    expect(buildMfaChallengeHref("/dashboard?resumeConnect=quickbooks")).toBe(
      "/signin/mfa-challenge?returnTo=%2Fdashboard%3FresumeConnect%3Dquickbooks",
    );
    expect(buildDashboardResumeConnectHref("xero")).toBe("/dashboard?resumeConnect=xero");
    expect(buildDashboardForceConnectHref("quickbooks")).toBe(
      "/dashboard?connectAccounting=quickbooks",
    );
    expect(readResumeConnectProvider(new URLSearchParams("resumeConnect=quickbooks"))).toBe(
      "quickbooks",
    );
    expect(readForceConnectProvider(new URLSearchParams("connectAccounting=xero"))).toBe("xero");
  });

  it("rejects invalid providers", () => {
    expect(readResumeConnectProvider(new URLSearchParams("resumeConnect=paypal"))).toBeNull();
    expect(readForceConnectProvider(new URLSearchParams("connectAccounting=evil"))).toBeNull();
  });

  it("blocks open redirects in MFA returnTo", () => {
    expect(buildMfaChallengeHref("https://evil.example/phish")).toBe(
      "/signin/mfa-challenge?returnTo=%2Fdashboard",
    );
    expect(buildMfaChallengeHref("//evil.example")).toBe(
      "/signin/mfa-challenge?returnTo=%2Fdashboard",
    );
  });

  it("first AAL2 arms pending and MFA resume returnTo", () => {
    redirectToMfaForAccountingConnect("quickbooks");
    expect(assign).toHaveBeenCalledWith(
      "/signin/mfa-challenge?returnTo=%2Fdashboard%3FresumeConnect%3Dquickbooks",
    );
    expect(storage.get("advisacor_aal2_connect_resume_pending:quickbooks")).toBe("1");
    expect(hasConnectResumeAttempt("quickbooks")).toBe(false);
  });

  it("MFA-return consumes pending and arms in-flight attempt", () => {
    markConnectResumePending("quickbooks");
    expect(beginAuthorizedConnectResume("quickbooks")).toBe(true);
    expect(consumeConnectResumePending("quickbooks")).toBe(false);
    expect(hasConnectResumeAttempt("quickbooks")).toBe(true);
  });

  it("forged resumeConnect without pending does not resume", () => {
    expect(beginAuthorizedConnectResume("quickbooks")).toBe(false);
    expect(hasConnectResumeAttempt("quickbooks")).toBe(false);
  });

  it("mismatched provider pending does not authorize resume", () => {
    markConnectResumePending("xero");
    expect(beginAuthorizedConnectResume("quickbooks")).toBe(false);
    expect(storage.get("advisacor_aal2_connect_resume_pending:xero")).toBe("1");
    expect(hasConnectResumeAttempt("quickbooks")).toBe(false);
  });

  it("second AAL2 during in-flight attempt does not re-arm auto-resume", () => {
    // Real dashboard sequence after MFA return:
    markConnectResumePending("quickbooks");
    expect(beginAuthorizedConnectResume("quickbooks")).toBe(true);
    window.location.search = ""; // URL resumeConnect already stripped

    redirectToMfaForAccountingConnect("quickbooks");
    expect(assign).toHaveBeenCalledWith("/signin/mfa-challenge?returnTo=%2Fdashboard");
    expect(storage.get("advisacor_aal2_connect_resume_pending:quickbooks")).toBeUndefined();
    expect(hasConnectResumeAttempt("quickbooks")).toBe(false);
  });

  it("second AAL2 while resumeConnect still in URL also clears without re-arm", () => {
    markConnectResumeAttempt("xero");
    window.location.search = "?resumeConnect=xero";
    redirectToMfaForAccountingConnect("xero");
    expect(assign).toHaveBeenCalledWith("/signin/mfa-challenge?returnTo=%2Fdashboard");
    expect(hasConnectResumeAttempt("xero")).toBe(false);
    expect(consumeConnectResumePending("xero")).toBe(false);
  });

  it("resume success clears pending and attempt", () => {
    markConnectResumePending("xero");
    markConnectResumeAttempt("xero");
    clearConnectResumeState("xero");
    expect(consumeConnectResumePending("xero")).toBe(false);
    expect(hasConnectResumeAttempt("xero")).toBe(false);
  });

  it("abandoned MFA leftover pending can re-arm on a fresh first AAL2", () => {
    markConnectResumePending("quickbooks");
    redirectToMfaForAccountingConnect("quickbooks");
    expect(assign).toHaveBeenCalledWith(
      "/signin/mfa-challenge?returnTo=%2Fdashboard%3FresumeConnect%3Dquickbooks",
    );
    expect(storage.get("advisacor_aal2_connect_resume_pending:quickbooks")).toBe("1");
  });
});

describe("MFA sensitive connect paths", () => {
  it("requires AAL2 for QuickBooks and Xero connect APIs", () => {
    expect(isMfaSensitivePath("/api/integrations/quickbooks/connect")).toBe(true);
    expect(isMfaSensitivePath("/api/quickbooks/connect")).toBe(true);
    expect(isMfaSensitivePath("/api/integrations/xero/connect")).toBe(true);
  });
});

describe("dashboard connect wiring", () => {
  it("handles AAL2 for QuickBooks and Xero connect with attempt arming", () => {
    const source = readFileSync(join(process.cwd(), "app/dashboard/page.jsx"), "utf8");
    expect(source).toContain("isAal2RequiredApiError");
    expect(source).toContain('redirectToMfaForAccountingConnect("quickbooks")');
    expect(source).toContain('redirectToMfaForAccountingConnect("xero")');
    expect(source).toContain("beginAuthorizedConnectResume");
    expect(source).toContain("clearConnectResumeState");
    expect(source).toContain("readResumeConnectProvider");
    expect(source).toContain("lead_free_review");
    // #280 magic-link hash handoff coexists on the same page; must not remove AAL2 wiring.
    expect(source).toContain("consumeAuthHashFromUrl");
    const hashCallIdx = source.indexOf("await consumeAuthHashFromUrl(supabase)");
    const getAuthCallIdx = source.indexOf("const storedToken = await getAuthToken()");
    const resumeEffectIdx = source.indexOf("beginAuthorizedConnectResume(resumeProvider)");
    expect(hashCallIdx).toBeGreaterThan(-1);
    expect(getAuthCallIdx).toBeGreaterThan(hashCallIdx);
    expect(resumeEffectIdx).toBeGreaterThan(-1);
  });

  it("blocks lead_free_review auto-resume in dashboard effect", () => {
    const source = readFileSync(join(process.cwd(), "app/dashboard/page.jsx"), "utf8");
    expect(source).toMatch(
      /if \(access\.reason === ["']lead_free_review["']\) return;/,
    );
  });
});
