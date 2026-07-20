import { describe, expect, it } from "vitest";
import {
  shouldRouteThroughQuotaGuard,
  getQuotaGuardAllowlist,
} from "@/lib/network/selective-dispatcher";

describe("selective-dispatcher hostname allowlist", () => {
  it("routes Intuit QBO hosts through QuotaGuard", () => {
    expect(shouldRouteThroughQuotaGuard("quickbooks.api.intuit.com")).toBe(true);
    expect(shouldRouteThroughQuotaGuard("sandbox-quickbooks.api.intuit.com")).toBe(true);
    expect(shouldRouteThroughQuotaGuard("oauth.platform.intuit.com")).toBe(true);
    expect(shouldRouteThroughQuotaGuard("appcenter.intuit.com")).toBe(true);
  });

  it("does NOT route Supabase, Stripe, Datadog, Vercel, or Advisacor through QuotaGuard", () => {
    expect(shouldRouteThroughQuotaGuard("jzmdgwwiestcmmeuhhkr.supabase.co")).toBe(false);
    expect(shouldRouteThroughQuotaGuard("api.stripe.com")).toBe(false);
    expect(shouldRouteThroughQuotaGuard("api.datadoghq.com")).toBe(false);
    expect(shouldRouteThroughQuotaGuard("http-intake.logs.datadoghq.com")).toBe(false);
    expect(shouldRouteThroughQuotaGuard("api.vercel.com")).toBe(false);
    expect(shouldRouteThroughQuotaGuard("www.advisacor.com")).toBe(false);
    expect(shouldRouteThroughQuotaGuard("app.advisacor.com")).toBe(false);
  });

  it("handles empty and malformed hostnames safely", () => {
    expect(shouldRouteThroughQuotaGuard("")).toBe(false);
    expect(shouldRouteThroughQuotaGuard("localhost")).toBe(false);
    expect(shouldRouteThroughQuotaGuard("127.0.0.1")).toBe(false);
  });

  it("is case-insensitive on hostname matching", () => {
    expect(shouldRouteThroughQuotaGuard("QuickBooks.Api.Intuit.COM")).toBe(true);
  });

  it("exposes the allowlist for admin diagnostics", () => {
    const list = getQuotaGuardAllowlist();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((h) => h.includes("intuit"))).toBe(true);
  });
});
