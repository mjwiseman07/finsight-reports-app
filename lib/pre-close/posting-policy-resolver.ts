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
}

const DEFAULT_POLICY: Omit<PostingPolicy, "engagementId"> = {
  policyCode: "advisacor_balanced",
  advisacorPreset: "advisacor_balanced",
  autoPostOnApproved: true,
  autoPostOnEditAndApproved: false,
  isDefaulted: true,
};

export async function resolvePostingPolicy(
  engagementId: string,
): Promise<PostingPolicy> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("engagement_posting_policy")
    .select(
      "engagement_id, policy_code, advisacor_preset, auto_post_on_approved, auto_post_on_edit_and_approved",
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
  return {
    engagementId: data.engagement_id as string,
    policyCode: data.policy_code as string,
    advisacorPreset: data.advisacor_preset as PostingPolicy["advisacorPreset"],
    autoPostOnApproved: Boolean(data.auto_post_on_approved),
    autoPostOnEditAndApproved: Boolean(data.auto_post_on_edit_and_approved),
    isDefaulted: false,
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
