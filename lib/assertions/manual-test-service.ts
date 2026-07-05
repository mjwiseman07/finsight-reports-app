/**
 * D-Assertions Part 6 — Create + attach manual test evidence.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { publishEvent } from "@/lib/events/publisher";
import { resolveGapReviewItem } from "./gap-review-item-resolver";
import type {
  ManualTestEvidenceRow,
  ManualTestAttachmentRow,
  ManualEvidenceType,
} from "@/lib/pre-close/manual-test-evidence-types";

export interface CreateManualTestInput {
  firmClientId: string;
  engagementId: string;
  closePeriodId: string;
  accountCategory: string;
  assertionId: string;
  evidenceType: ManualEvidenceType;
  sourceType: string;
  sourceKey?: Record<string, unknown>;
  sourceAmount?: number | null;
  sourceDate?: string | null;
  evidenceSummary: string;
  calculationNotes?: string | null;
  resolvesGapItemId?: string | null;
  dataSourceReliabilityBasis?: string | null;
  createdByUserId: string;
  createdByDisplayName?: string | null;
}

export function computeManualTestContentHash(input: CreateManualTestInput): string {
  const canonical = JSON.stringify({
    e: input.engagementId,
    p: input.closePeriodId,
    ac: input.accountCategory,
    as: input.assertionId,
    et: input.evidenceType,
    st: input.sourceType,
    sk: input.sourceKey ?? {},
    sa: input.sourceAmount ?? null,
    sd: input.sourceDate ?? null,
    sum: input.evidenceSummary,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

function rowToManualTestEvidence(row: Record<string, unknown>): ManualTestEvidenceRow {
  return {
    id: row.id as string,
    firmClientId: row.firm_client_id as string,
    engagementId: row.engagement_id as string,
    closePeriodId: row.close_period_id as string,
    accountCategory: row.account_category as ManualTestEvidenceRow["accountCategory"],
    assertionId: row.assertion_id as ManualTestEvidenceRow["assertionId"],
    evidenceType: row.evidence_type as ManualEvidenceType,
    sourceType: row.source_type as string,
    sourceKey: (row.source_key as Record<string, unknown>) ?? {},
    sourceAmount: (row.source_amount as number | null) ?? null,
    sourceDate: (row.source_date as string | null) ?? null,
    evidenceSummary: row.evidence_summary as string,
    calculationNotes: (row.calculation_notes as string | null) ?? null,
    resolvesGapItemId: (row.resolves_gap_item_id as string | null) ?? null,
    dataSourceReliabilityBasis: (row.data_source_reliability_basis as string | null) ?? null,
    contentHash: row.content_hash as string,
    createdByUserId: row.created_by_user_id as string,
    createdByDisplayName: (row.created_by_display_name as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function createManualTestEvidence(
  db: SupabaseClient,
  input: CreateManualTestInput,
): Promise<ManualTestEvidenceRow> {
  const contentHash = computeManualTestContentHash(input);
  const { data, error } = await db
    .from("manual_test_evidence")
    .upsert(
      {
        firm_client_id: input.firmClientId,
        engagement_id: input.engagementId,
        close_period_id: input.closePeriodId,
        account_category: input.accountCategory,
        assertion_id: input.assertionId,
        evidence_type: input.evidenceType,
        source_type: input.sourceType,
        source_key: input.sourceKey ?? {},
        source_amount: input.sourceAmount ?? null,
        source_date: input.sourceDate ?? null,
        evidence_summary: input.evidenceSummary,
        calculation_notes: input.calculationNotes ?? null,
        resolves_gap_item_id: input.resolvesGapItemId ?? null,
        data_source_reliability_basis: input.dataSourceReliabilityBasis ?? null,
        content_hash: contentHash,
        created_by_user_id: input.createdByUserId,
        created_by_display_name: input.createdByDisplayName ?? null,
      },
      {
        onConflict: "firm_client_id,close_period_id,account_category,assertion_id,content_hash",
      },
    )
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`manual_test_evidence upsert failed: ${error?.message ?? "no row returned"}`);
  }

  await publishEvent({
    eventType: "assertion.manual_test.created",
    eventCategory: "assertion",
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    closePeriodId: input.closePeriodId,
    aggregateType: "manual_test_evidence",
    aggregateId: data.id as string,
    actorType: "user",
    actorId: input.createdByUserId,
    payload: {
      manual_test_id: data.id,
      account_category: input.accountCategory,
      assertion_id: input.assertionId,
      evidence_type: input.evidenceType,
      resolves_gap_item_id: input.resolvesGapItemId ?? null,
      content_hash: contentHash,
    },
  });

  if (input.resolvesGapItemId) {
    await resolveGapReviewItem(db, input.resolvesGapItemId, {
      resolutionType: "manual_test",
      resolutionMetadata: {
        manual_test_ref: data.id as string,
        rationale: `Manual test uploaded (${input.evidenceType}): ${input.evidenceSummary.slice(0, 200)}`,
      },
      resolvedByUserId: input.createdByUserId,
    });
  }

  return rowToManualTestEvidence(data);
}

export interface AttachFileInput {
  evidenceId: string;
  firmClientId: string;
  engagementId: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  storagePath: string;
  ingestedFrom: string;
  ingestedBy: string;
}

export async function attachFileToManualTest(
  db: SupabaseClient,
  input: AttachFileInput,
): Promise<ManualTestAttachmentRow> {
  const { data, error } = await db
    .from("manual_test_attachments")
    .upsert(
      {
        evidence_id: input.evidenceId,
        firm_client_id: input.firmClientId,
        storage_bucket: "manual-test-evidence",
        storage_path: input.storagePath,
        original_filename: input.originalFilename,
        mime_type: input.mimeType,
        byte_size: input.byteSize,
        sha256: input.sha256,
        ingested_from: input.ingestedFrom,
        ingested_by: input.ingestedBy,
      },
      { onConflict: "evidence_id,sha256" },
    )
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`manual_test_attachments upsert failed: ${error?.message ?? "no row returned"}`);
  }

  await publishEvent({
    eventType: "assertion.manual_test.attached",
    eventCategory: "assertion",
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "manual_test_evidence",
    aggregateId: input.evidenceId,
    actorType: "user",
    actorId: input.ingestedBy,
    payload: {
      manual_test_id: input.evidenceId,
      attachment_id: data.attachment_id,
      sha256: input.sha256,
      byte_size: input.byteSize,
      mime_type: input.mimeType,
    },
  });

  return {
    attachmentId: data.attachment_id as string,
    evidenceId: data.evidence_id as string,
    firmClientId: data.firm_client_id as string,
    storageBucket: data.storage_bucket as string,
    storagePath: data.storage_path as string,
    originalFilename: data.original_filename as string,
    mimeType: data.mime_type as string,
    byteSize: Number(data.byte_size),
    sha256: data.sha256 as string,
    ingestedFrom: data.ingested_from as string,
    ingestedAt: data.ingested_at as string,
    ingestedBy: data.ingested_by as string,
  };
}

export { rowToManualTestEvidence };
