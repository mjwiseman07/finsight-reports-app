import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildDashboardForceConnectHref,
  buildDashboardResumeConnectHref,
  buildMfaChallengeHref,
  clearConnectResumePending,
  consumeConnectResumePending,
  isAal2RequiredApiError,
  markConnectResumePending,
  readResumeConnectProvider,
  redirectToMfaForAccountingConnect,
} from "@/lib/mfa/connect-step-up";

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
  });

  it("redirects to MFA with resume intent on first AAL2", () => {
    redirectToMfaForAccountingConnect("quickbooks");
    expect(assign).toHaveBeenCalledWith(
      "/signin/mfa-challenge?returnTo=%2Fdashboard%3FresumeConnect%3Dquickbooks",
    );
    expect(storage.get("advisacor_aal2_connect_resume_pending:quickbooks")).toBe("1");
  });

  it("loop-protects a second AAL2 while resume is pending", () => {
    markConnectResumePending("quickbooks");
    redirectToMfaForAccountingConnect("quickbooks");
    expect(assign).toHaveBeenCalledWith("/signin/mfa-challenge?returnTo=%2Fdashboard");
    expect(consumeConnectResumePending("quickbooks")).toBe(false);
  });

  it("consumes pending resume exactly once", () => {
    markConnectResumePending("xero");
    expect(consumeConnectResumePending("xero")).toBe(true);
    expect(consumeConnectResumePending("xero")).toBe(false);
    clearConnectResumePending("xero");
  });
});

describe("dashboard connect wiring", () => {
  it("handles AAL2 for QuickBooks and Xero connect", () => {
    const source = readFileSync(join(process.cwd(), "app/dashboard/page.jsx"), "utf8");
    expect(source).toContain("isAal2RequiredApiError");
    expect(source).toContain('redirectToMfaForAccountingConnect("quickbooks")');
    expect(source).toContain('redirectToMfaForAccountingConnect("xero")');
    expect(source).toContain("consumeConnectResumePending");
    expect(source).toContain("readResumeConnectProvider");
  });
});
