/**
 * JE-3D — First-run pre-POST review + kill-switch write barrier tests.
 */
import { describe, expect, it } from "vitest";
import { assertJe3dCreateActivationPolicy } from "../je3d-activation-guards";
import {
  JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY,
  resolveJe3dActivationPolicy,
} from "../je3d-first-controlled-create-activation";
import { buildFirstRunPrePostReview } from "../je3d-first-run-pre-post-review";

describe("JE-3D first-run pre-POST review", () => {
  it("CREATE ON + kill switch ON → public create guard throws; SAFE_TO_REQUEST_POST_APPROVAL false", () => {
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

  it("kill switch OFF while CREATE ON is itself a blocker for SAFE approval", () => {
    const review = buildFirstRunPrePostReview({
      policy: {
        ...JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY,
        sandboxDispatchKillSwitch: false,
      },
    });
    expect(review.preflight_blockers).toContain(
      "sandboxDispatchKillSwitch is OFF — must stay ON until ChatGPT authorizes the single POST",
    );
    expect(review.SAFE_TO_REQUEST_POST_APPROVAL).toBe(false);
  });
});
