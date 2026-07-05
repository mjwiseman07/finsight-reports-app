/**
 * D6.4d — Types shared between reviewer API routes and reviewer UI.
 */
import type { ReviewItemRow, JEDraft } from "@/lib/pre-close/types";
import type { PostBlockReason } from "@/lib/pre-close/post-block-reasons";

export type ReviewerSeverity = "info" | "warn" | "error";

export interface ReviewerQueueItem {
  id: string;
  firmClientId: string;
  firmClientName: string;
  engagementId: string;
  engagementName: string;
  closePeriodId: string | null;
  ruleId: string;
  ruleVersion: string;
  severity: ReviewerSeverity;
  ruleReasonCode: string;
  ruleReasonDetail: string | null;
  createdAt: string;
  decision: ReviewItemRow["decision"];
  decisionAt: string | null;
  reviewerUserId: string | null;
  postedJeAttemptId: string | null;
  postBlockReason: PostBlockReason | null;
  qboJeId: string | null;
}

export interface GapQueueItem {
  id: string;
  origin: "gap";
  firmClientName: string | null;
  engagementName: string | null;
  accountCategory: string;
  assertionId: string;
  severity: ReviewerSeverity;
  status: "pending" | "decided";
  gapRootCauseCode: string;
  gapRecommendation: string | null;
  createdAt: string;
}

export interface ReviewerQueueResponse {
  items: ReviewerQueueItem[];
  gapItems?: GapQueueItem[];
  cursor: string | null;
  total: number;
}

export interface LedgerEventSummary {
  eventId: string;
  eventType: string;
  eventCategory: string;
  createdAt: string;
  payload: unknown;
}

export interface RemediationLogEntry {
  timestamp: string;
  actionType: string;
  category: "posting_remediation" | "posting_attempt" | "posting_blocked";
  inputSummary: string;
  outputSummary: string;
}

export interface ReviewItemDetail extends ReviewerQueueItem {
  assertionTags: string[];
  evidenceRefs: unknown;
  basisGuardReasonCode: string | null;
  basisGuardReasonText: string | null;
  jeDraft: JEDraft;
  editedJeDraft: JEDraft | null;
  decisionReasonCode: string | null;
  decisionReasonText: string | null;
  postingLedgerEvents: LedgerEventSummary[];
  remediationLog: RemediationLogEntry[];
}

export interface DecideRequestBody {
  decision: "approved" | "edit_and_approved" | "rejected" | "deferred";
  decisionReasonCode: string;
  decisionReasonText?: string;
  editedJeDraft?: JEDraft;
}

export interface PostNowRequestBody {
  overridePolicy: boolean;
}

export interface VisibilityUpdateBody {
  clientCanViewQueue: boolean;
  clientCanViewEvidence: boolean;
  clientCanViewJeDraft: boolean;
}

export interface PostingPolicyUpdateBody {
  advisacorPreset?:
    | "advisacor_conservative"
    | "advisacor_balanced"
    | "advisacor_aggressive"
    | null;
  autoPostOnApproved?: boolean;
  autoPostOnEditAndApproved?: boolean;
}

export interface FilterParams {
  engagementId?: string;
  closePeriodId?: string;
  severity?: ReviewerSeverity;
  status?: "pending" | "decided" | "posted" | "blocked" | "all";
  ruleId?: string;
  limit?: number;
  cursor?: string;
}

export interface ClientReviewItemDetail extends Omit<ReviewItemDetail, "jeDraft" | "editedJeDraft" | "evidenceRefs"> {
  jeDraft: JEDraft | null;
  editedJeDraft: JEDraft | null;
  evidenceRefs: unknown;
  _redacted?: {
    jeDraft?: boolean;
    editedJeDraft?: boolean;
    evidenceRefs?: boolean;
  };
}
