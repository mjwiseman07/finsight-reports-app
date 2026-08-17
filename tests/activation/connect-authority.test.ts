import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveActivationConnectAuthority } from "@/lib/activation/connect-authority";

describe("resolveActivationConnectAuthority", () => {
  it("authenticated subscriber can connect", () => {
    const r = resolveActivationConnectAuthority({
      access: { allowed: true, reason: "subscriber" },
      hasAuthToken: true,
      hasValidatedLeadSession: false,
    });
    expect(r).toEqual({
      isAuthenticated: true,
      isLeadSession: false,
      canConnect: true,
    });
  });

  it("authenticated trial can connect", () => {
    const r = resolveActivationConnectAuthority({
      access: { allowed: true, reason: "trial" },
      hasAuthToken: true,
      hasValidatedLeadSession: false,
    });
    expect(r.isAuthenticated).toBe(true);
    expect(r.canConnect).toBe(true);
  });

  it("lead_free_review can connect without auth token", () => {
    const r = resolveActivationConnectAuthority({
      access: { allowed: true, reason: "lead_free_review" },
      hasAuthToken: false,
      hasValidatedLeadSession: true,
    });
    expect(r).toEqual({
      isAuthenticated: false,
      isLeadSession: true,
      canConnect: true,
    });
  });

  it("anonymous cannot connect", () => {
    const r = resolveActivationConnectAuthority({
      access: null,
      hasAuthToken: false,
      hasValidatedLeadSession: false,
    });
    expect(r).toEqual({
      isAuthenticated: false,
      isLeadSession: false,
      canConnect: false,
    });
  });

  it("auth wins over stale local lead hint", () => {
    const r = resolveActivationConnectAuthority({
      access: { allowed: true, reason: "subscriber" },
      hasAuthToken: true,
      hasValidatedLeadSession: true, // stale local lead still present
    });
    expect(r.isAuthenticated).toBe(true);
    expect(r.isLeadSession).toBe(false);
    expect(r.canConnect).toBe(true);
  });

  it("token without allowed access cannot connect", () => {
    const r = resolveActivationConnectAuthority({
      access: { allowed: false, reason: "trial_expired" },
      hasAuthToken: true,
      hasValidatedLeadSession: false,
    });
    expect(r.canConnect).toBe(false);
  });

  it("does not depend on access.user_id", () => {
    const r = resolveActivationConnectAuthority({
      access: { allowed: true, reason: "subscriber" } as any,
      hasAuthToken: true,
      hasValidatedLeadSession: false,
    });
    expect(r.isAuthenticated).toBe(true);
  });
});

describe("dashboard Activation wiring", () => {
  it("uses resolveActivationConnectAuthority and shared connect handlers", () => {
    const source = readFileSync(join(process.cwd(), "app/dashboard/page.jsx"), "utf8");
    expect(source).toContain("resolveActivationConnectAuthority");
    expect(source).not.toMatch(/isAuthenticated:\s*Boolean\(access\?\.user_id\)/);
    expect(source).toContain("onConnectQuickBooks={handleConnectQuickBooks}");
    expect(source).toContain("onConnectXero={handleConnectXero}");
    expect(source).toContain("onConnectQBO={handleConnectQuickBooks}");
    expect(source).toContain("onConnectXero={handleConnectXero}");
  });

  it("ActivationCard still gates buttons on canConnect", () => {
    const source = readFileSync(
      join(process.cwd(), "components/dashboard/ActivationCard.tsx"),
      "utf8",
    );
    expect(source).toContain("const canConnect = facts.isAuthenticated || facts.isLeadSession");
    expect(source).toContain("disabled={connecting || !canConnect}");
    expect(source).toContain("Sign in to connect");
  });

  it("Activation QuickBooks button is locally pill-shaped without changing global CTA", () => {
    const activation = readFileSync(
      join(process.cwd(), "components/dashboard/ActivationCard.tsx"),
      "utf8",
    );
    expect(activation).toMatch(/primaryCtaClass\} rounded-full px-5 py-2\.5/);
    expect(activation).toContain(
      'rounded-full border border-[#C9A961]/30 bg-transparent px-5 py-2.5 text-sm font-semibold text-[#ECEBE7]',
    );
    const siteUi = readFileSync(join(process.cwd(), "components/site-ui.ts"), "utf8");
    expect(siteUi).not.toMatch(/primaryCtaClass[\s\S]*rounded-full/);
  });
});
