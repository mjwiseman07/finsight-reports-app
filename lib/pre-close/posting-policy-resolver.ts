/**
 * D6.4c-3 — Resolve the posting policy for an engagement.
 */
import { createServiceClient } from "@/lib/supabase/service";

export type ReviewerDecision =
  | "approved"
  | "edit_and_approved"
  | "rejected"
  | "deferred";

export interface PostingPolicy {
  engagementId: string;
  policyCode: string;
  advisacorPreset:
    | "advisacor_conservative"
    | "advisacor_balanced"
    | "advisacor_aggressive"
    | null;
  autoPostOnApproved: boolean;
  autoPostOnEditAndApproved: boolean;
  isDefaulted: boolean;
  /** Gap 3 */
  materialityLowMaxCents: number | null;
  materialityMediumMaxCents: number | null;
  materialityHighRequiresMfa: boolean | null;
  autonomousPostingEnabled: boolean;
  autonomousMaxBucket: "low" | "medium" | null;
}

const DEFAULT_POLICY: Omit<PostingPolicy, "engagementId"> = {
  policyCode: "advisacor_balanced",
  advisacorPreset: "advisacor_balanced",
  autoPostOnApproved: true,
  autoPostOnEditAndApproved: false,
  isDefaulted: true,
  materialityLowMaxCents: null,
  materialityMediumMaxCents: null,
  materialityHighRequiresMfa: null,
  autonomousPostingEnabled: false,
  autonomousMaxBucket: null,
};

export async function resolvePostingPolicy(
  engagementId: string,
): Promise<PostingPolicy> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("engagement_posting_policy")
    .select(
      "engagement_id, policy_code, advisacor_preset, auto_post_on_approved, auto_post_on_edit_and_approved, materiality_low_max_cents, materiality_medium_max_cents, materiality_high_requires_mfa, autonomous_posting_enabled, autonomous_max_bucket",
    )
    .eq("engagement_id", engagementId)
    .maybeSingle();
  if (error) {
    console.error("[posting-policy] resolve failed", { engagementId, error });
    return { ...DEFAULT_POLICY, engagementId };
  }
  if (!data) {
    return { ...DEFAULT_POLICY, engagementId };
  }
  const maxBucket = data.autonomous_max_bucket as string | null;
  return {
    engagementId: data.engagement_id as string,
    policyCode: data.policy_code as string,
    advisacorPreset: data.advisacor_preset as PostingPolicy["advisacorPreset"],
    autoPostOnApproved: Boolean(data.auto_post_on_approved),
    autoPostOnEditAndApproved: Boolean(data.auto_post_on_edit_and_approved),
    isDefaulted: false,
    materialityLowMaxCents:
      data.materiality_low_max_cents != null ? Number(data.materiality_low_max_cents) : null,
    materialityMediumMaxCents:
      data.materiality_medium_max_cents != null
        ? Number(data.materiality_medium_max_cents)
        : null,
    materialityHighRequiresMfa:
      data.materiality_high_requires_mfa == null
        ? null
        : Boolean(data.materiality_high_requires_mfa),
    autonomousPostingEnabled: Boolean(data.autonomous_posting_enabled),
    autonomousMaxBucket:
      maxBucket === "low" || maxBucket === "medium" ? maxBucket : null,
  };
}

export function policyPermitsAutoPost(
  policy: PostingPolicy,
  decision: ReviewerDecision,
): boolean {
  if (decision === "approved") return policy.autoPostOnApproved;
  if (decision === "edit_and_approved") return policy.autoPostOnEditAndApproved;
  return false;
}
