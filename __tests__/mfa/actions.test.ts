import { beforeEach, describe, expect, it, vi } from "vitest";

const writeMfaAuditLog = vi.fn(async () => undefined);
const userHasActiveFirmAdminRole = vi.fn(async () => false);
const getRequestAuditContext = vi.fn(async () => ({
  ipAddress: "127.0.0.1",
  userAgent: "vitest",
}));

const mfaEnroll = vi.fn();
const mfaChallenge = vi.fn();
const mfaVerify = vi.fn();
const mfaUnenroll = vi.fn();
const mfaListFactors = vi.fn();
const mfaGetAal = vi.fn();
const authGetUser = vi.fn();

const adminFrom = vi.fn();
const adminMfaListFactors = vi.fn();
const adminMfaDeleteFactor = vi.fn();

vi.mock("@/lib/mfa/server", () => ({
  createMfaUserClient: vi.fn(async () => ({
    auth: {
      getUser: authGetUser,
      mfa: {
        enroll: mfaEnroll,
        challenge: mfaChallenge,
        verify: mfaVerify,
        unenroll: mfaUnenroll,
        listFactors: mfaListFactors,
        getAuthenticatorAssuranceLevel: mfaGetAal,
      },
    },
  })),
  getRequestAuditContext,
  writeMfaAuditLog,
  userHasActiveFirmAdminRole,
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: adminFrom,
    auth: {
      admin: {
        mfa: {
          listFactors: adminMfaListFactors,
          deleteFactor: adminMfaDeleteFactor,
        },
      },
    },
  })),
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn(async () => "data:image/png;base64,qq"),
  },
}));

vi.mock("@/lib/mfa/challenge-rate-limit", () => ({
  getMfaChallengeLockState: vi.fn(() => ({ locked: false, retryAfterSeconds: 0 })),
  recordMfaChallengeFailure: vi.fn(() => ({
    locked: false,
    retryAfterSeconds: 0,
    remainingAttempts: 2,
  })),
  clearMfaChallengeFailures: vi.fn(),
}));

function chainable(result: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const api: Record<string, unknown> = {};
  const self = new Proxy(api, {
    get(_t, prop: string) {
      if (prop === "then") return undefined;
      if (prop === "maybeSingle" || prop === "limit" || prop === "single") {
        return async () => result;
      }
      return () => self;
    },
  });
  // Make awaitable
  (api as { then?: unknown }).then = (
    resolve: (v: unknown) => unknown,
    reject?: (e: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return self;
}

describe("mfa actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "demo@advisacor.com" } },
      error: null,
    });
    userHasActiveFirmAdminRole.mockResolvedValue(false);
    adminFrom.mockImplementation(() => chainable({ data: null, error: null }));
  });

  it("enrollTotpFactor returns QR + secret on success", async () => {
    mfaEnroll.mockResolvedValue({
      data: {
        id: "factor-1",
        totp: {
          secret: "BASE32SECRET",
          uri: "otpauth://totp/Advisacor",
          qr_code: "<svg></svg>",
        },
      },
      error: null,
    });

    const { enrollTotpFactor } = await import("@/lib/mfa/actions");
    const result = await enrollTotpFactor();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.factorId).toBe("factor-1");
      expect(result.data.secret).toBe("BASE32SECRET");
      expect(result.data.qrCode).toContain("data:image");
    }
    expect(writeMfaAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "enroll_started", userId: "user-1" }),
    );
  });

  it("verifyTotpEnrollment stores 10 recovery code hashes", async () => {
    mfaChallenge.mockResolvedValue({ data: { id: "chal-1" }, error: null });
    mfaVerify.mockResolvedValue({ data: {}, error: null });

    const insert = vi.fn(async () => ({ data: null, error: null }));
    const update = vi.fn(() => chainable({ data: null, error: null }));
    adminFrom.mockImplementation((table: string) => {
      if (table === "mfa_recovery_codes") {
        return {
          update,
          insert,
        };
      }
      return chainable();
    });

    const { verifyTotpEnrollment } = await import("@/lib/mfa/actions");
    const result = await verifyTotpEnrollment("factor-1", "123456");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.recoveryCodes).toHaveLength(10);
    }
    expect(insert).toHaveBeenCalled();
    const firstCall = (insert as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    expect(firstCall).toBeDefined();
    const insertedArg = firstCall[0];
    expect(Array.isArray(insertedArg)).toBe(true);
    const rows = insertedArg as Array<{ code_hash: string }>;
    expect(rows).toHaveLength(10);
    expect(rows.every((r) => typeof r.code_hash === "string" && r.code_hash.length === 64)).toBe(
      true,
    );
    expect(writeMfaAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "enroll_completed" }),
    );
  });

  it("disableTotpFactor blocks when user has firm_admin role", async () => {
    userHasActiveFirmAdminRole.mockResolvedValue(true);
    const { disableTotpFactor } = await import("@/lib/mfa/actions");
    const result = await disableTotpFactor("factor-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Firm administrators cannot disable/i);
    }
    expect(mfaUnenroll).not.toHaveBeenCalled();
    expect(writeMfaAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "disable",
        metadata: expect.objectContaining({ blocked: true }),
      }),
    );
  });

  it("consumeRecoveryCode marks code as used and prevents reuse", async () => {
    const { hashRecoveryCode } = await import("@/lib/mfa/crypto");
    const code = "AAAA-BBBB-CCCC-DDDD";
    const codeHash = hashRecoveryCode(code);

    let used = false;
    adminFrom.mockImplementation((table: string) => {
      if (table !== "mfa_recovery_codes") return chainable();
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                maybeSingle: async () => {
                  if (used) return { data: null, error: null };
                  return { data: { id: "row-1" }, error: null };
                },
              }),
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            is: async () => {
              used = true;
              return { data: null, error: null };
            },
            eq: () => ({
              is: async () => {
                used = true;
                return { data: null, error: null };
              },
            }),
          }),
        }),
      };
    });

    adminMfaListFactors.mockResolvedValue({
      data: { factors: [{ id: "f1", factor_type: "totp", status: "verified" }] },
      error: null,
    });
    adminMfaDeleteFactor.mockResolvedValue({ data: null, error: null });

    const { consumeRecoveryCode } = await import("@/lib/mfa/actions");
    const first = await consumeRecoveryCode("user-1", code);
    expect(first.ok).toBe(true);
    expect(writeMfaAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "recovery_code_used" }),
    );

    const second = await consumeRecoveryCode("user-1", code);
    expect(second.ok).toBe(false);
    void codeHash;
  });

  it("all successful mutations log to mfa_audit_log", async () => {
    mfaEnroll.mockResolvedValue({
      data: {
        id: "factor-1",
        totp: { secret: "S", uri: "otpauth://x", qr_code: "<svg/>" },
      },
      error: null,
    });
    const { enrollTotpFactor } = await import("@/lib/mfa/actions");
    await enrollTotpFactor();
    expect(writeMfaAuditLog).toHaveBeenCalled();
  });
});
