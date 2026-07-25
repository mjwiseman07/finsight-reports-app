import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  PREVIEW_SMOKE_EMAIL,
  PREVIEW_SMOKE_REJECTION,
  enforcePreviewSmokeCredential,
  isPreviewSmokeRequest,
} from "@/lib/preview-smoke/guard";

const originalVercelEnv = process.env.VERCEL_ENV;

function jwtFor(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: "user-1", aal: "aal1", email }),
    "utf8",
  )
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `header.${payload}.signature`;
}

function requestWithCookie(name: string, value: string): NextRequest {
  return new NextRequest("https://advisacor.com/dashboard", {
    headers: { cookie: `${name}=${value}` },
  });
}

function ssrSessionCookies(email: string): Array<[string, string]> {
  const session = JSON.stringify({
    access_token: jwtFor(email),
    user: { email },
  });
  const encoded = `base64-${Buffer.from(session, "utf8").toString("base64")}`;
  const half = Math.ceil(encoded.length / 2);
  return [
    ["sb-jzmdgwwiestcmmeuhhkr-auth-token.0", encoded.slice(0, half)],
    ["sb-jzmdgwwiestcmmeuhhkr-auth-token.1", encoded.slice(half)],
  ];
}

beforeEach(() => {
  delete process.env.PREVIEW_SMOKE_EMAIL;
});

afterEach(() => {
  if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = originalVercelEnv;
});

describe("preview smoke credential guard", () => {
  it("allows the smoke session in Preview", () => {
    process.env.VERCEL_ENV = "preview";
    const request = requestWithCookie(
      "advisacor_access_token",
      jwtFor(PREVIEW_SMOKE_EMAIL),
    );
    expect(enforcePreviewSmokeCredential(request)).toBeNull();
  });

  it("rejects the smoke session in Production with 403", async () => {
    process.env.VERCEL_ENV = "production";
    const request = requestWithCookie(
      "advisacor_access_token",
      jwtFor(PREVIEW_SMOKE_EMAIL),
    );
    const response = enforcePreviewSmokeCredential(request);
    expect(response?.status).toBe(403);
    expect(await response!.json()).toEqual({ error: PREVIEW_SMOKE_REJECTION });
  });

  it("rejects the smoke session when VERCEL_ENV is unset (local/dev)", () => {
    delete process.env.VERCEL_ENV;
    const request = requestWithCookie(
      "advisacor_access_token",
      jwtFor(PREVIEW_SMOKE_EMAIL),
    );
    expect(enforcePreviewSmokeCredential(request)?.status).toBe(403);
  });

  it("ignores a regular user session in every environment", () => {
    const request = requestWithCookie(
      "advisacor_access_token",
      jwtFor("real.user@example.com"),
    );
    for (const env of ["production", "preview", "development"]) {
      process.env.VERCEL_ENV = env;
      expect(enforcePreviewSmokeCredential(request)).toBeNull();
    }
  });

  it("detects the smoke session in chunked @supabase/ssr cookies", () => {
    process.env.VERCEL_ENV = "production";
    const cookie = ssrSessionCookies(PREVIEW_SMOKE_EMAIL)
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
    const request = new NextRequest("https://advisacor.com/audit-ready", {
      headers: { cookie },
    });
    expect(isPreviewSmokeRequest(request)).toBe(true);
    expect(enforcePreviewSmokeCredential(request)?.status).toBe(403);
  });

  it("detects the smoke session in an Authorization bearer header", () => {
    process.env.VERCEL_ENV = "production";
    const request = new NextRequest(
      "https://advisacor.com/api/audit-ready/kickouts",
      {
        headers: { authorization: `Bearer ${jwtFor(PREVIEW_SMOKE_EMAIL)}` },
      },
    );
    expect(enforcePreviewSmokeCredential(request)?.status).toBe(403);
  });

  it("honours an env-configured smoke email in addition to the constant", () => {
    process.env.VERCEL_ENV = "production";
    process.env.PREVIEW_SMOKE_EMAIL = "other-smoke@advisacor.com";
    const request = requestWithCookie(
      "advisacor_access_token",
      jwtFor("other-smoke@advisacor.com"),
    );
    expect(enforcePreviewSmokeCredential(request)?.status).toBe(403);
  });

  it("does not throw on malformed session cookies", () => {
    process.env.VERCEL_ENV = "production";
    const request = requestWithCookie(
      "sb-jzmdgwwiestcmmeuhhkr-auth-token",
      "base64-not-valid-base64!!",
    );
    expect(enforcePreviewSmokeCredential(request)).toBeNull();
  });
});
