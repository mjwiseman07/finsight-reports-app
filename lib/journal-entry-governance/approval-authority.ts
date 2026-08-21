/**
 * JE-2 reviewer authority — stronger than ordinary write access.
 * Firm path requires firm_memberships.can_approve when policy asks.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { isAllowedSuperAdminEmail } from "@/lib/super-admin";
import {
  JE_APPROVAL_ERROR,
  type JeApprovalPolicy,
} from "./approval-types";

export class JeApprovalAuthorityError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "JeApprovalAuthorityError";
    this.code = code;
  }
}

export type JeApproverAuthority = {
  userId: string;
  scope: "company" | "firm" | "super_admin";
  role: string;
  canApprove: true;
  firmCanApproveFlag: boolean | null;
};

export async function resolveJeApproverAuthority(args: {
  engagementId: string;
  userId: string;
  policy: JeApprovalPolicy;
}): Promise<JeApproverAuthority> {
  const supabase = getSupabaseAdmin();
  const { data: eng, error } = await supabase
    .from("audit_ready_engagements")
    .select("id, company_id, firm_id")
    .eq("id", args.engagementId)
    .maybeSingle();
  if (error || !eng?.id) {
    throw new JeApprovalAuthorityError(
      JE_APPROVAL_ERROR.ENGAGEMENT_ACCESS_DENIED,
      "Engagement was not found for approval authority.",
    );
  }

  let email: string | null = null;
  try {
    const { data } = await supabase.auth.admin.getUserById(args.userId);
    email = data.user?.email ?? null;
  } catch {
    email = null;
  }

  if (args.policy.allowSuperAdminApproval && isAllowedSuperAdminEmail(email ?? "")) {
    return {
      userId: args.userId,
      scope: "super_admin",
      role: "super_admin",
      canApprove: true,
      firmCanApproveFlag: null,
    };
  }

  if (eng.company_id) {
    const { data: cu } = await supabase
      .from("company_users")
      .select("role, status")
      .eq("company_id", eng.company_id)
      .eq("user_id", args.userId)
      .eq("status", "active")
      .maybeSingle();
    if (cu) {
      const role = String(cu.role || "");
      if (!args.policy.allowedCompanyApproverRoles.map(String).includes(role)) {
        throw new JeApprovalAuthorityError(
          JE_APPROVAL_ERROR.APPROVER_ROLE_DENIED,
          "Company role is not an allowed JE approver role.",
        );
      }
      return {
        userId: args.userId,
        scope: "company",
        role,
        canApprove: true,
        firmCanApproveFlag: null,
      };
    }
  }

  if (eng.firm_id) {
    const { data: fm } = await supabase
      .from("firm_memberships")
      .select("role, status, can_approve")
      .eq("firm_id", eng.firm_id)
      .eq("user_id", args.userId)
      .eq("status", "active")
      .maybeSingle();
    if (fm) {
      const role = String(fm.role || "");
      if (!args.policy.allowedFirmApproverRoles.map(String).includes(role)) {
        throw new JeApprovalAuthorityError(
          JE_APPROVAL_ERROR.APPROVER_ROLE_DENIED,
          "Firm role is not an allowed JE approver role.",
        );
      }
      const canApproveFlag = Boolean(fm.can_approve);
      if (args.policy.requireFirmCanApproveFlag && !canApproveFlag) {
        throw new JeApprovalAuthorityError(
          JE_APPROVAL_ERROR.FIRM_CAN_APPROVE_REQUIRED,
          "Firm membership can_approve=true is required for JE approval.",
        );
      }
      return {
        userId: args.userId,
        scope: "firm",
        role,
        canApprove: true,
        firmCanApproveFlag: canApproveFlag,
      };
    }
  }

  throw new JeApprovalAuthorityError(
    JE_APPROVAL_ERROR.ENGAGEMENT_ACCESS_DENIED,
    "Reviewer has no active engagement membership for approval.",
  );
}
