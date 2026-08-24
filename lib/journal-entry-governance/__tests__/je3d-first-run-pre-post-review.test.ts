/**
 * JE-3D — First-run pre-POST review + kill-switch write barrier tests.
 */
import { describe, expect, it } from "vitest";
import { assertJe3dCreateActivationPolicy } from "../je3d-activation-guards";
import {
  JE_3D_ACTIVATION_POLICY,
} from "../je3d-activation-policy";
import {
  JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY,
  resolveJe3dActivationPolicy,
} from "../je3d-first-controlled-create-activation";
import {
  buildFirstRunPrePostReview,
  derivePublicCreateCanReachProviderPost,
} from "../je3d-first-run-pre-post-review";

function policyWith(args: {
  create?: boolean;
  verify?: boolean;
  killSwitch?: boolean;
}) {
  return {
    ...JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY,
    capabilities: {
      CREATE_SANDBOX_JE: args.create ?? true,
      VERIFY_SANDBOX_JE: args.verify ?? false,
    },
    sandboxDispatchKillSwitch: args.killSwitch ?? true,
  };
}

describe("derivePublicCreateCanReachProviderPost", () => {
  it.each([
    {
      label: "CREATE OFF + kill switch ON",
      create: false,
      killSwitch: true,
      expected: false,
    },
    {
      label: "CREATE OFF + kill switch OFF",
      create: false,
      killSwitch: false,
      expected: false,
    },
    {
      label: "CREATE ON + kill switch ON",
      create: true,
      killSwitch: true,
      expected: false,
    },
    {
      label: "CREATE ON + kill switch OFF",
      create: true,
      killSwitch: false,
      expected: true,
    },
  ])("$label → $expected", ({ create, killSwitch, expected }) => {
    const policy = policyWith({ create, killSwitch });
    expect(derivePublicCreateCanReachProviderPost(policy)).toBe(expected);
  });

  it("VERIFY capability does not affect reachability", () => {
    const createOnKillOff = policyWith({ create: true, killSwitch: false });
    expect(
      derivePublicCreateCanReachProviderPost({
        ...createOnKillOff,
        capabilities: {
          CREATE_SANDBOX_JE: true,
          VERIFY_SANDBOX_JE: true,
        },
      }),
    ).toBe(true);
  });
});

describe("JE-3D first-run pre-POST review", () => {
  it("CREATE ON + kill switch ON → public create guard throws; reachability false", () => {
    const policy = resolveJe3dActivationPolicy();
    expect(policy).toEqual(JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY);
    expect(policy.capabilities.CREATE_SANDBOX_JE).toBe(true);
    expect(policy.capabilities.VERIFY_SANDBOX_JE).toBe(false);
    expect(policy.sandboxDispatchKillSwitch).toBe(true);
    expect(() => assertJe3dCreateActivationPolicy(policy)).toThrow(/kill switch/i);

    const review = buildFirstRunPrePostReview({ policy });
    expect(review.create_capability_enabled).toBe(true);
    expect(review.verify_capability_enabled).toBe(false);
    expect(review.sandbox_dispatch_kill_switch).toBe(true);
    expect(review.public_create_can_reach_provider_post).toBe(false);
    expect(review.kill_switch_blocks_dispatch).toBe(true);
    expect(review.SAFE_TO_REQUEST_POST_APPROVAL).toBe(false);
    expect(review.preflight_blockers.length).toBeGreaterThan(0);
    expect(review.memory_write_allowed).toBe(false);
    expect(review.worker_allowed).toBe(false);
    expect(review.governed_auto_allowed).toBe(false);
  });

  it("CREATE ON + kill switch OFF → reachability true but SAFE remains false (alarm condition)", () => {
    const review = buildFirstRunPrePostReview({
      policy: policyWith({ create: true, killSwitch: false }),
    });
    expect(review.public_create_can_reach_provider_post).toBe(true);
    expect(review.kill_switch_blocks_dispatch).toBe(false);
    expect(review.preflight_blockers).toContain(
      "sandboxDispatchKillSwitch is OFF — must stay ON until ChatGPT authorizes the single POST",
    );
    expect(review.SAFE_TO_REQUEST_POST_APPROVAL).toBe(false);
  });

  it("CREATE OFF + kill switch ON → reachability false", () => {
    const review = buildFirstRunPrePostReview({
      policy: {
        ...JE_3D_ACTIVATION_POLICY,
        capabilities: {
          CREATE_SANDBOX_JE: false,
          VERIFY_SANDBOX_JE: false,
        },
        sandboxDispatchKillSwitch: true,
      },
    });
    expect(review.public_create_can_reach_provider_post).toBe(false);
    expect(review.preflight_blockers).toContain("CREATE_SANDBOX_JE is OFF");
    expect(review.SAFE_TO_REQUEST_POST_APPROVAL).toBe(false);
  });

  it("CREATE OFF + kill switch OFF → reachability false", () => {
    const review = buildFirstRunPrePostReview({
      policy: {
        ...JE_3D_ACTIVATION_POLICY,
        capabilities: {
          CREATE_SANDBOX_JE: false,
          VERIFY_SANDBOX_JE: false,
        },
        sandboxDispatchKillSwitch: false,
      },
    });
    expect(review.public_create_can_reach_provider_post).toBe(false);
    expect(review.preflight_blockers).toContain("CREATE_SANDBOX_JE is OFF");
    expect(review.SAFE_TO_REQUEST_POST_APPROVAL).toBe(false);
  });
});
