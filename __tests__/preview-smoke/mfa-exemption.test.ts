import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PREVIEW_SMOKE_EMAIL } from "@/lib/preview-smoke/guard";

const createClient = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}));

import { enforceMfaForRequest } from "@/lib/mfa/middleware-enforce";

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

/** /admin is an MFA-sensitive prefix, so enforcement runs for this request. */
function sensitiveRequest(email: string): NextRequest {
  return new NextRequest("https://advisacor.com/admin", {
    headers: { cookie: `advisacor_access_token=${jwtFor(email)}` },
  });
}

beforeEach(() => {
  createClient.mockReset();
  createClient.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ eq: () => ({ limit: async () => ({ data: [] }) }) }),
        }),
      }),
    }),
    auth: { admin: { mfa: { listFactors: async () => ({ data: null }) } } },
  });
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
});

afterEach(() => {
  if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = originalVercelEnv;
});

describe("MFA enforcement — preview smoke exemption", () => {
  it("exempts the smoke user in Preview before any role lookup", async () => {
    process.env.VERCEL_ENV = "preview";
    const result = await enforceMfaForRequest(
      sensitiveRequest(PREVIEW_SMOKE_EMAIL),
    );
    expect(result).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("does not exempt the smoke user outside Preview", async () => {
    process.env.VERCEL_ENV = "production";
    await enforceMfaForRequest(sensitiveRequest(PREVIEW_SMOKE_EMAIL));
    expect(createClient).toHaveBeenCalled();
  });

  it("does not exempt a regular user in Preview", async () => {
    process.env.VERCEL_ENV = "preview";
    await enforceMfaForRequest(sensitiveRequest("real.user@example.com"));
    expect(createClient).toHaveBeenCalled();
  });
});
