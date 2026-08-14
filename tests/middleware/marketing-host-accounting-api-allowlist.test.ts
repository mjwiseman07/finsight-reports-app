import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

function requestFor(host: string, pathname: string, method = "POST") {
  const url = new URL(pathname, `https://${host}`);
  return new NextRequest(url, {
    method,
    headers: {
      host,
      "x-forwarded-host": host,
      "content-type": "application/json",
    },
  });
}

async function middlewareStatus(host: string, pathname: string, method = "POST") {
  const response = await middleware(requestFor(host, pathname, method));
  return {
    status: response.status,
    body: await response.clone().text(),
    // Exact NextResponse.next() signal — do not treat arbitrary 200s as continue.
    continued: response.headers.get("x-middleware-next") === "1",
  };
}

describe("marketing-host API allowlist — /api/accounting/", () => {
  const marketingHosts = ["advisacor.com", "www.advisacor.com"] as const;
  const nonMarketingHosts = [
    "smoke.advisacor.com",
    "advisacor-advisacor.vercel.app",
  ] as const;

  for (const host of marketingHosts) {
    describe(host, () => {
      it("allows /api/accounting/active-context (no middleware 404)", async () => {
        const result = await middlewareStatus(host, "/api/accounting/active-context");
        expect(result.status).not.toBe(404);
        expect(result.body).not.toContain('"Not found"');
        expect(result.continued).toBe(true);
      });

      it("allows another /api/accounting/* route", async () => {
        const result = await middlewareStatus(host, "/api/accounting/connections");
        expect(result.status).not.toBe(404);
        expect(result.body).not.toContain('"Not found"');
        expect(result.continued).toBe(true);
      });

      it("still allows /api/quickbooks/*", async () => {
        const result = await middlewareStatus(host, "/api/quickbooks/status", "GET");
        expect(result.status).not.toBe(404);
        expect(result.body).not.toContain('"Not found"');
        expect(result.continued).toBe(true);
      });

      it("still allows /api/integrations/*", async () => {
        const result = await middlewareStatus(host, "/api/integrations/xero/callback", "GET");
        expect(result.status).not.toBe(404);
        expect(result.body).not.toContain('"Not found"');
        expect(result.continued).toBe(true);
      });

      it("allows /api/check-trial (dashboard access gate)", async () => {
        const result = await middlewareStatus(host, "/api/check-trial");
        expect(result.status).not.toBe(404);
        expect(result.body).not.toContain('"Not found"');
        expect(result.continued).toBe(true);
      });

      it("allows dashboard companion APIs used on marketing host", async () => {
        for (const pathname of [
          "/api/account",
          "/api/user/role",
          "/api/owner/delivery-settings",
          "/api/advisory-intelligence/signals",
          "/api/create-checkout",
          "/api/create-billing-portal",
        ]) {
          const result = await middlewareStatus(host, pathname);
          expect(result.status, pathname).not.toBe(404);
          expect(result.body, pathname).not.toContain('"Not found"');
          expect(result.continued, pathname).toBe(true);
        }
      });

      it("still 404s unrelated non-allowlisted private API", async () => {
        const result = await middlewareStatus(host, "/api/cron/schema-drift-detector", "GET");
        expect(result.status).toBe(404);
        expect(result.body).toContain("Not found");
      });

      it("leaves marketing homepage reachable (no middleware 404)", async () => {
        const result = await middlewareStatus(host, "/", "GET");
        expect(result.status).not.toBe(404);
        expect(result.body).not.toContain('"Not found"');
        expect(result.continued).toBe(true);
      });
    });
  }

  for (const host of nonMarketingHosts) {
    describe(host, () => {
      it("passes /api/accounting/active-context through (unchanged)", async () => {
        const result = await middlewareStatus(host, "/api/accounting/active-context");
        expect(result.status).not.toBe(404);
        expect(result.body).not.toContain('"Not found"');
        expect(result.continued).toBe(true);
      });

      it("does not invent marketing-host 404 for private cron API", async () => {
        // Non-marketing hosts are outside the marketing concealment allowlist.
        const result = await middlewareStatus(host, "/api/cron/schema-drift-detector", "GET");
        expect(result.status).not.toBe(404);
        expect(result.body).not.toContain('"Not found"');
        expect(result.continued).toBe(true);
      });
    });
  }
});
