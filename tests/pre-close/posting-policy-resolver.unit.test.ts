import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  policyPermitsAutoPost,
  resolvePostingPolicy,
  type PostingPolicy,
} from "@/lib/pre-close/posting-policy-resolver";

const fromMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: fromMock }),
}));

function policy(over: Partial<PostingPolicy> = {}): PostingPolicy {
  return {
    engagementId: "eng1",
    policyCode: "advisacor_balanced",
    advisacorPreset: "advisacor_balanced",
    autoPostOnApproved: true,
    autoPostOnEditAndApproved: false,
    isDefaulted: false,
    materialityLowMaxCents: null,
    materialityMediumMaxCents: null,
    materialityHighRequiresMfa: null,
    autonomousPostingEnabled: false,
    autonomousMaxBucket: null,
    ...over,
  };
}

describe("posting-policy-resolver policyPermitsAutoPost", () => {
  const matrix: Array<{
    preset: PostingPolicy["advisacorPreset"];
    approved: boolean;
    editApproved: boolean;
    decision: "approved" | "edit_and_approved" | "rejected" | "deferred";
    expected: boolean;
  }> = [
    { preset: "advisacor_conservative", approved: false, editApproved: false, decision: "approved", expected: false },
    { preset: "advisacor_conservative", approved: false, editApproved: false, decision: "edit_and_approved", expected: false },
    { preset: "advisacor_conservative", approved: false, editApproved: false, decision: "rejected", expected: false },
    { preset: "advisacor_conservative", approved: false, editApproved: false, decision: "deferred", expected: false },
    { preset: "advisacor_balanced", approved: true, editApproved: false, decision: "approved", expected: true },
    { preset: "advisacor_balanced", approved: true, editApproved: false, decision: "edit_and_approved", expected: false },
    { preset: "advisacor_balanced", approved: true, editApproved: false, decision: "rejected", expected: false },
    { preset: "advisacor_balanced", approved: true, editApproved: false, decision: "deferred", expected: false },
    { preset: "advisacor_aggressive", approved: true, editApproved: true, decision: "approved", expected: true },
    { preset: "advisacor_aggressive", approved: true, editApproved: true, decision: "edit_and_approved", expected: true },
    { preset: "advisacor_aggressive", approved: true, editApproved: true, decision: "rejected", expected: false },
    { preset: "advisacor_aggressive", approved: true, editApproved: true, decision: "deferred", expected: false },
  ];

  it.each(matrix)(
    "$preset + $decision -> $expected",
    ({ approved, editApproved, decision, expected }) => {
      expect(
        policyPermitsAutoPost(
          policy({ autoPostOnApproved: approved, autoPostOnEditAndApproved: editApproved }),
          decision,
        ),
      ).toBe(expected);
    },
  );
});

describe("posting-policy-resolver resolvePostingPolicy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockReset();
  });

  it("returns default when no row exists", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    });
    const r = await resolvePostingPolicy("eng-missing");
    expect(r.isDefaulted).toBe(true);
    expect(r.policyCode).toBe("advisacor_balanced");
    expect(r.autoPostOnApproved).toBe(true);
    expect(r.autoPostOnEditAndApproved).toBe(false);
  });

  it("returns pinned preset row correctly", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              engagement_id: "eng1",
              policy_code: "advisacor_aggressive",
              advisacor_preset: "advisacor_aggressive",
              auto_post_on_approved: true,
              auto_post_on_edit_and_approved: true,
            },
            error: null,
          }),
        }),
      }),
    });
    const r = await resolvePostingPolicy("eng1");
    expect(r.isDefaulted).toBe(false);
    expect(r.advisacorPreset).toBe("advisacor_aggressive");
    expect(r.autoPostOnEditAndApproved).toBe(true);
  });

  it("returns fully-custom row (advisacorPreset null)", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              engagement_id: "eng2",
              policy_code: "custom_manual",
              advisacor_preset: null,
              auto_post_on_approved: false,
              auto_post_on_edit_and_approved: true,
            },
            error: null,
          }),
        }),
      }),
    });
    const r = await resolvePostingPolicy("eng2");
    expect(r.advisacorPreset).toBeNull();
    expect(r.policyCode).toBe("custom_manual");
    expect(r.autoPostOnApproved).toBe(false);
    expect(r.autoPostOnEditAndApproved).toBe(true);
  });

  it("on Supabase error returns default and logs", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: { message: "boom" } }),
        }),
      }),
    });
    const r = await resolvePostingPolicy("eng-err");
    expect(r.isDefaulted).toBe(true);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
