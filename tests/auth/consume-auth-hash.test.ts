import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { consumeAuthHashFromUrl } from "@/lib/auth/consume-auth-hash";

describe("consumeAuthHashFromUrl", () => {
  beforeEach(() => {
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
      document: undefined,
    });
    // document.cookie setter used by helper
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        get cookie() {
          return "";
        },
        set cookie(_v: string) {
          // ignore
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets session, persists token, and clears hash", async () => {
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
  });

  it("no-ops when hash has no access_token", async () => {
    window.location.hash = "#foo=bar";
    const setSession = vi.fn(async () => ({ error: null }));
    const result = await consumeAuthHashFromUrl({ auth: { setSession } });
    expect(result.consumed).toBe(false);
    expect(setSession).not.toHaveBeenCalled();
  });
});
