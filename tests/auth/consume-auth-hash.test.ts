import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { consumeAuthHashFromUrl } from "@/lib/auth/consume-auth-hash";
import { ADVISACOR_ACCESS_TOKEN_COOKIE } from "@/lib/reviewer/constants";
import fs from "fs";
import path from "path";

describe("consumeAuthHashFromUrl", () => {
  let cookieWrites: string[];

  beforeEach(() => {
    cookieWrites = [];
    vi.stubGlobal("window", {
      location: {
        hash: "#access_token=aaa.bbb.ccc&refresh_token=refresh-1&expires_in=3600",
        pathname: "/dashboard",
        search: "",
      },
      history: { replaceState: vi.fn() },
      localStorage: {
        setItem: vi.fn(),
      },
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        get cookie() {
          return "";
        },
        set cookie(v: string) {
          cookieWrites.push(String(v));
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets session, persists token + cookie, and clears hash", async () => {
    const setSession = vi.fn(async () => ({ error: null }));
    const result = await consumeAuthHashFromUrl({ auth: { setSession } });
    expect(result.consumed).toBe(true);
    expect(setSession).toHaveBeenCalledWith({
      access_token: "aaa.bbb.ccc",
      refresh_token: "refresh-1",
    });
    expect(window.history.replaceState).toHaveBeenCalledWith({}, "", "/dashboard");
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "supabase_access_token",
      "aaa.bbb.ccc",
    );
    expect(cookieWrites.some((c) => c.startsWith(`${ADVISACOR_ACCESS_TOKEN_COOKIE}=`))).toBe(true);
  });

  it("preserves query string (e.g. resumeConnect) when stripping hash", async () => {
    window.location.search = "?resumeConnect=quickbooks";
    window.location.hash = "#access_token=aaa.bbb.ccc&refresh_token=refresh-1";
    const setSession = vi.fn(async () => ({ error: null }));
    await consumeAuthHashFromUrl({ auth: { setSession } });
    expect(window.history.replaceState).toHaveBeenCalledWith(
      {},
      "",
      "/dashboard?resumeConnect=quickbooks",
    );
  });

  it("no-ops when hash has no access_token", async () => {
    window.location.hash = "#foo=bar";
    const setSession = vi.fn(async () => ({ error: null }));
    const result = await consumeAuthHashFromUrl({ auth: { setSession } });
    expect(result.consumed).toBe(false);
    expect(setSession).not.toHaveBeenCalled();
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });

  it("strips hash before setSession and returns error when refresh_token missing", async () => {
    window.location.hash = "#access_token=aaa.bbb.ccc&expires_in=3600";
    const setSession = vi.fn(async () => ({ error: null }));
    const result = await consumeAuthHashFromUrl({ auth: { setSession } });
    expect(window.history.replaceState).toHaveBeenCalledWith({}, "", "/dashboard");
    expect(setSession).not.toHaveBeenCalled();
    expect(result.consumed).toBe(false);
    expect(result.error).toMatch(/missing tokens/i);
  });

  it("strips hash even when setSession fails (secret leakage protection)", async () => {
    const setSession = vi.fn(async () => ({ error: { message: "invalid_grant" } }));
    const result = await consumeAuthHashFromUrl({ auth: { setSession } });
    expect(window.history.replaceState).toHaveBeenCalledWith({}, "", "/dashboard");
    expect(result.consumed).toBe(false);
    expect(result.error).toMatch(/invalid_grant|Unable to establish/i);
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    expect(cookieWrites).toHaveLength(0);
  });
});

describe("dashboard auth hash wiring (current main)", () => {
  it("consumes auth hash before access bootstrap API work and keeps #275/#281 hooks", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "app/dashboard/page.jsx"),
      "utf8",
    );
    expect(src).toContain('import { consumeAuthHashFromUrl } from "../../lib/auth/consume-auth-hash"');
    expect(src).toContain("await consumeAuthHashFromUrl(supabase)");
    expect(src).toContain("resolveActivationConnectAuthority");
    expect(src).toContain("beginAuthorizedConnectResume");
    expect(src).toContain("redirectToMfaForAccountingConnect");

    const consumeIdx = src.indexOf("await consumeAuthHashFromUrl(supabase)");
    const getAuthIdx = src.indexOf("const storedToken = await getAuthToken()");
    const checkTrialIdx = src.indexOf("/api/check-trial");
    expect(consumeIdx).toBeGreaterThan(-1);
    expect(getAuthIdx).toBeGreaterThan(consumeIdx);
    expect(checkTrialIdx).toBeGreaterThan(consumeIdx);
  });
});
