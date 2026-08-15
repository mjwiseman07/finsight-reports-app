/**
 * URM-3 — Universal reconciliation evidence spine.
 *
 * Reuses `audit_ready_tie_out_variance_evidence` (no new evidence table).
 *
 * Governing relationship:
 *   Measurement Variance
 *     ├── Identified Reconciling Item → Evidence
 *     └── Derived Unidentified Residual → evidence cannot make U identified
 *
 * Math isolation (hard):
 * - Never calls deriveReconBridge
 * - Never mutates totals_variance_cents / identified_items_total_cents /
 *   unidentified_residual_cents / recon_outcome / allows_timing_reconciled
 * - Never writes baseline_sync_id
 *
 * URM-2 transition:
 * - `reconciling_item_id` FK is source of truth for item↔evidence
 * - `evidence_ids uuid[]` is denormalized repairable cache (best-effort sync;
 *   rebuildEvidenceIdsCacheForItem repairs drift). Cache failure never fails
 *   a successful canonical insert/delete.
 *
 * Content hash convention (Advisacor):
 * - Same as upload-artifact / FA / BS: createHash("sha256").digest("hex")
 * - Stored as 64 lowercase hex chars: /^[a-f0-9]{64}$/
 * - Malformed hash → fail closed; storage_path requires a valid hash.
 *
 * Idempotency (logical attachment, not bare document):
 * - item-only: unique (item, hash) WHERE variance_id IS NULL
 * - item+variance: unique (item, variance, hash) WHERE variance_id IS NOT NULL
 * - Same document may support multiple items and multiple variances.
 *
 * GRNI compatibility:
 * - Variance-only rows (source_kind bill|invoice|inventory_adjustment, no item FK)
 *   remain valid; attachEvidenceToVariance mirrors that path.
 */

import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

/** Pre-URM-3 source_kind values (PBC-TIEOUT-3.4 / GRNI). */
export const LEGACY_EVIDENCE_SOURCE_KINDS = [
  "bill",
  "invoice",
  "inventory_adjustment",
] as const;

/** URM-3 additive provider-neutral / third-party kinds. */
export const URM3_EVIDENCE_SOURCE_KINDS = [
  "bank_statement",
  "vendor_statement",
  "customer_statement",
  "confirmation",
  "count_sheet",
  "amort_schedule",
  "reserve_model",
  "fixed_asset_register",
  "debt_statement",
  "tax_document",
  "lease_schedule",
  "system_generated_schedule",
  "provider_txn",
  "pbc_upload",
  "manual_attachment",
] as const;

export const EVIDENCE_SOURCE_KINDS = [
  ...LEGACY_EVIDENCE_SOURCE_KINDS,
  ...URM3_EVIDENCE_SOURCE_KINDS,
] as const;

export type EvidenceSourceKind = (typeof EVIDENCE_SOURCE_KINDS)[number];

export const EVIDENCE_PROVIDERS = [
  "quickbooks",
  "xero",
  "external",
  "system",
  "manual",
] as const;
export type EvidenceProvider = (typeof EVIDENCE_PROVIDERS)[number];

/** Advisacor SHA-256 hex digest (matches upload-artifact / FA / BS writers). */
export const EVIDENCE_CONTENT_HASH_REGEX = /^[a-f0-9]{64}$/;

export type VarianceEvidenceRow = {
  id: string;
  variance_id: string | null;
  reconciling_item_id: string | null;
  run_id: string;
  engagement_id: string;
  source_kind: EvidenceSourceKind;
  source_qbo_id: string | null;
  source_txn_date: string | null;
  source_doc_number: string | null;
  vendor_ref: string | null;
  customer_ref: string | null;
  total_cents: number;
  subtotal_cents: number;
  balance_cents: number;
  linked_po_ids: string[];
  linked_invoice_ids: string[];
  enrichment_error: string | null;
  aging_bucket: string | null;
  age_days_at_run: number | null;
  provider: EvidenceProvider | null;
  external_ref: string | null;
  storage_path: string | null;
  content_hash: string | null;
  file_name: string | null;
  content_type: string | null;
  source_date: string | null;
  fetched_at: string | null;
  created_at: string;
};

export type AttachEvidenceBase = {
  sourceKind: EvidenceSourceKind;
  /** QBO id — required for legacy kinds unless external_ref/storage_path set. */
  sourceQboId?: string | null;
  sourceTxnDate?: string | null;
  sourceDocNumber?: string | null;
  vendorRef?: string | null;
  customerRef?: string | null;
  totalCents?: number;
  subtotalCents?: number;
  balanceCents?: number;
  linkedPoIds?: string[];
  linkedInvoiceIds?: string[];
  enrichmentError?: string | null;
  agingBucket?: string | null;
  ageDaysAtRun?: number | null;
  provider?: EvidenceProvider | null;
  externalRef?: string | null;
  storagePath?: string | null;
  /**
   * SHA-256 of document bytes as 64 lowercase hex (or normalizable form).
   * Required when storagePath is set. Never affects recon math.
   */
  contentHash?: string | null;
  fileName?: string | null;
  contentType?: string | null;
  /** Document/source as-of date (YYYY-MM-DD). */
  sourceDate?: string | null;
  /** When bytes/metadata were fetched or uploaded (ISO timestamptz). */
  fetchedAt?: string | null;
};

export type AttachEvidenceToItemInput = AttachEvidenceBase & {
  reconcilingItemId: string;
  /** Optional measurement link — must same-run as item (DB-enforced). */
  varianceId?: string | null;
};

export type AttachEvidenceToVarianceInput = AttachEvidenceBase & {
  varianceId: string;
  /** Optional item link for dual attachment. */
  reconcilingItemId?: string | null;
};

const EVIDENCE_SELECT =
  "id, variance_id, reconciling_item_id, run_id, engagement_id, source_kind, " +
  "source_qbo_id, source_txn_date, source_doc_number, vendor_ref, customer_ref, " +
  "total_cents, subtotal_cents, balance_cents, linked_po_ids, linked_invoice_ids, " +
  "enrichment_error, aging_bucket, age_days_at_run, provider, external_ref, " +
  "storage_path, content_hash, file_name, content_type, source_date, fetched_at, created_at";

function requireAdmin() {
  return getSupabaseAdmin();
}

function isSourceKind(value: string): value is EvidenceSourceKind {
  return (EVIDENCE_SOURCE_KINDS as readonly string[]).includes(value);
}

/**
 * Compute SHA-256 hex for evidence bytes — same convention as
 * `uploadRunArtifact` / FA / BS artifact writers.
 */
export function hashEvidenceBytes(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Normalize + validate content hash. Fail-closed on malformed input.
 * Accepts optional `sha256:` prefix and mixed case; stores lowercase hex.
 */
export function normalizeEvidenceContentHash(raw: string): string {
  const normalized = raw.trim().toLowerCase().replace(/^sha256:/, "");
  if (!EVIDENCE_CONTENT_HASH_REGEX.test(normalized)) {
    throw new Error("urm3_invalid_content_hash");
  }
  return normalized;
}

/**
 * Source identity + hash integrity gates (mirrors DB constraints).
 */
export function assertEvidenceSourceIdentity(input: AttachEvidenceBase): void {
  if (!isSourceKind(input.sourceKind)) {
    throw new Error("urm3_invalid_source_kind");
  }
  const qbo = input.sourceQboId?.trim() || null;
  const ext = input.externalRef?.trim() || null;
  const path = input.storagePath?.trim() || null;
  if (!qbo && !ext && !path) {
    throw new Error("urm3_source_identity_required");
  }
  if (
    input.provider != null &&
    !(EVIDENCE_PROVIDERS as readonly string[]).includes(input.provider)
  ) {
    throw new Error("urm3_invalid_provider");
  }

  const rawHash = input.contentHash?.trim() || null;
  if (path) {
    if (!rawHash) {
      throw new Error("urm3_content_hash_required_for_storage");
    }
    normalizeEvidenceContentHash(rawHash);
  } else if (rawHash) {
    normalizeEvidenceContentHash(rawHash);
  }
}

function toInsertRow(
  input: AttachEvidenceBase & {
    varianceId?: string | null;
    reconcilingItemId?: string | null;
  },
): Record<string, unknown> {
  assertEvidenceSourceIdentity(input);
  if (!input.varianceId && !input.reconcilingItemId) {
    throw new Error("urm3_variance_or_item_required");
  }

  const total = input.totalCents ?? 0;
  const subtotal = input.subtotalCents ?? total;
  const balance = input.balanceCents ?? total;
  const rawHash = input.contentHash?.trim() || null;
  const contentHash = rawHash ? normalizeEvidenceContentHash(rawHash) : null;

  return {
    // run_id / engagement_id stamped by DB trigger from variance/item
    variance_id: input.varianceId ?? null,
    reconciling_item_id: input.reconcilingItemId ?? null,
    source_kind: input.sourceKind,
    source_qbo_id: input.sourceQboId?.trim() || null,
    source_txn_date: input.sourceTxnDate ?? null,
    source_doc_number: input.sourceDocNumber ?? null,
    vendor_ref: input.vendorRef ?? null,
    customer_ref: input.customerRef ?? null,
    total_cents: total,
    subtotal_cents: subtotal,
    balance_cents: balance,
    linked_po_ids: input.linkedPoIds ?? [],
    linked_invoice_ids: input.linkedInvoiceIds ?? [],
    enrichment_error: input.enrichmentError ?? null,
    aging_bucket: input.agingBucket ?? null,
    age_days_at_run: input.ageDaysAtRun ?? null,
    provider: input.provider ?? null,
    external_ref: input.externalRef?.trim() || null,
    storage_path: input.storagePath?.trim() || null,
    content_hash: contentHash,
    file_name: input.fileName?.trim() || null,
    content_type: input.contentType?.trim() || null,
    source_date: input.sourceDate ?? null,
    fetched_at: input.fetchedAt ?? null,
  };
}

/**
 * Best-effort URM-2 cache sync. Never throws — FK table is authoritative;
 * rebuildEvidenceIdsCacheForItem repairs drift.
 */
async function syncEvidenceIdsCacheBestEffort(
  reconcilingItemId: string,
  evidenceId: string,
  mode: "add" | "remove",
): Promise<{ synced: boolean }> {
  try {
    const supabase = requireAdmin();
    const { data: item, error } = await supabase
      .from("audit_ready_reconciling_items")
      .select("id, evidence_ids")
      .eq("id", reconcilingItemId)
      .maybeSingle();
    if (error || !item) return { synced: false };

    const current = Array.isArray(item.evidence_ids)
      ? (item.evidence_ids as string[])
      : [];
    const next =
      mode === "add"
        ? current.includes(evidenceId)
          ? current
          : [...current, evidenceId]
        : current.filter((id) => id !== evidenceId);

    const { error: updErr } = await supabase
      .from("audit_ready_reconciling_items")
      .update({ evidence_ids: next })
      .eq("id", reconcilingItemId);
    if (updErr) return { synced: false };
    return { synced: true };
  } catch {
    return { synced: false };
  }
}

/**
 * Lookup by exact logical attachment identity.
 * Item-only (variance null) is never treated as equivalent to item+variance.
 */
async function findExistingLogicalAttachment(args: {
  reconcilingItemId: string;
  varianceId: string | null;
  contentHash: string;
}): Promise<VarianceEvidenceRow | null> {
  const supabase = requireAdmin();
  let query = supabase
    .from("audit_ready_tie_out_variance_evidence")
    .select(EVIDENCE_SELECT)
    .eq("reconciling_item_id", args.reconcilingItemId)
    .eq("content_hash", args.contentHash);

  query =
    args.varianceId == null
      ? query.is("variance_id", null)
      : query.eq("variance_id", args.varianceId);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return (data as VarianceEvidenceRow | null) ?? null;
}

/**
 * Attach evidence to an identified reconciling item.
 * Canonical insert is authoritative; evidence_ids[] sync is best-effort.
 * Idempotent on logical attachment:
 *   item-only → (item, hash) where variance IS NULL
 *   item+variance → (item, variance, hash)
 */
export async function attachEvidenceToReconcilingItem(
  input: AttachEvidenceToItemInput,
): Promise<VarianceEvidenceRow> {
  const supabase = requireAdmin();
  const varianceId = input.varianceId ?? null;
  const row = toInsertRow({
    ...input,
    varianceId,
    reconcilingItemId: input.reconcilingItemId,
  });

  const hash = row.content_hash as string | null;
  if (hash) {
    const existing = await findExistingLogicalAttachment({
      reconcilingItemId: input.reconcilingItemId,
      varianceId,
      contentHash: hash,
    });
    if (existing) {
      await syncEvidenceIdsCacheBestEffort(
        input.reconcilingItemId,
        existing.id,
        "add",
      );
      return existing;
    }
  }

  const { data, error } = await supabase
    .from("audit_ready_tie_out_variance_evidence")
    .insert(row)
    .select(EVIDENCE_SELECT)
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("urm3_evidence_insert_failed");

  const evidence = data as VarianceEvidenceRow;
  await syncEvidenceIdsCacheBestEffort(
    input.reconcilingItemId,
    evidence.id,
    "add",
  );
  return evidence;
}

/**
 * Attach evidence to a measurement variance (GRNI / AR / AP path).
 * Optionally also links a reconciling item (best-effort cache when set).
 * When item+hash present, idempotency uses exact (item, variance, hash).
 */
export async function attachEvidenceToVariance(
  input: AttachEvidenceToVarianceInput,
): Promise<VarianceEvidenceRow> {
  const supabase = requireAdmin();
  const row = toInsertRow({
    ...input,
    varianceId: input.varianceId,
    reconcilingItemId: input.reconcilingItemId ?? null,
  });

  if (input.reconcilingItemId && row.content_hash) {
    const existing = await findExistingLogicalAttachment({
      reconcilingItemId: input.reconcilingItemId,
      varianceId: input.varianceId,
      contentHash: row.content_hash as string,
    });
    if (existing) {
      await syncEvidenceIdsCacheBestEffort(
        input.reconcilingItemId,
        existing.id,
        "add",
      );
      return existing;
    }
  }

  const { data, error } = await supabase
    .from("audit_ready_tie_out_variance_evidence")
    .insert(row)
    .select(EVIDENCE_SELECT)
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("urm3_evidence_insert_failed");

  const evidence = data as VarianceEvidenceRow;
  if (input.reconcilingItemId) {
    await syncEvidenceIdsCacheBestEffort(
      input.reconcilingItemId,
      evidence.id,
      "add",
    );
  }
  return evidence;
}

export async function listEvidenceForRun(
  runId: string,
): Promise<VarianceEvidenceRow[]> {
  const supabase = requireAdmin();
  const { data, error } = await supabase
    .from("audit_ready_tie_out_variance_evidence")
    .select(EVIDENCE_SELECT)
    .eq("run_id", runId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as VarianceEvidenceRow[];
}

export async function listEvidenceForReconcilingItem(
  reconcilingItemId: string,
): Promise<VarianceEvidenceRow[]> {
  const supabase = requireAdmin();
  const { data, error } = await supabase
    .from("audit_ready_tie_out_variance_evidence")
    .select(EVIDENCE_SELECT)
    .eq("reconciling_item_id", reconcilingItemId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as VarianceEvidenceRow[];
}

export async function listEvidenceForVariance(
  varianceId: string,
): Promise<VarianceEvidenceRow[]> {
  const supabase = requireAdmin();
  const { data, error } = await supabase
    .from("audit_ready_tie_out_variance_evidence")
    .select(EVIDENCE_SELECT)
    .eq("variance_id", varianceId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as VarianceEvidenceRow[];
}

/**
 * Detach (delete) canonical evidence. Cache update is best-effort.
 * Canonical delete success → operation success even if cache sync fails.
 */
export async function detachEvidence(evidenceId: string): Promise<void> {
  const supabase = requireAdmin();
  const { data: existing, error: loadErr } = await supabase
    .from("audit_ready_tie_out_variance_evidence")
    .select("id, reconciling_item_id")
    .eq("id", evidenceId)
    .maybeSingle();
  if (loadErr) throw new Error(loadErr.message);
  if (!existing) throw new Error("urm3_evidence_not_found");

  const itemId = existing.reconciling_item_id as string | null;

  const { error: delErr } = await supabase
    .from("audit_ready_tie_out_variance_evidence")
    .delete()
    .eq("id", evidenceId);
  if (delErr) throw new Error(delErr.message);

  if (itemId) {
    await syncEvidenceIdsCacheBestEffort(itemId, evidenceId, "remove");
  }
}

/**
 * Rebuild URM-2 evidence_ids[] from FK source of truth for one item.
 * Transition / repair helper — does not affect recon math.
 */
export async function rebuildEvidenceIdsCacheForItem(
  reconcilingItemId: string,
): Promise<string[]> {
  const supabase = requireAdmin();
  const rows = await listEvidenceForReconcilingItem(reconcilingItemId);
  const ids = rows.map((r) => r.id);
  const { error } = await supabase
    .from("audit_ready_reconciling_items")
    .update({ evidence_ids: ids })
    .eq("id", reconcilingItemId);
  if (error) throw new Error(error.message);
  return ids;
}

/**
 * Pure proof helper: attaching evidence never changes bridge math inputs.
 * Used by focused tests — residual = gross − Σ identified (URM-1 only).
 */
export function evidenceDoesNotAffectBridgeMath(args: {
  grossVarianceCents: number;
  identifiedAmountsCents: ReadonlyArray<number>;
  evidenceTotalCents: number;
}): { identifiedTotal: number; residual: number } {
  void args.evidenceTotalCents; // intentionally unused — evidence is not in formula
  const identifiedTotal = args.identifiedAmountsCents.reduce(
    (sum, n) => sum + n,
    0,
  );
  return {
    identifiedTotal,
    residual: args.grossVarianceCents - identifiedTotal,
  };
}
