/**
 * Client Memory Service — first production writer to company_memory_records.
 *
 * Doc D0. Respects the DB immutability trigger and CHECK constraints:
 *   - payload / memory_type / source_system are immutable after insert
 *   - persistence_status may only move pending -> persisted (or blocked)
 *   - memory_status, confidence_score, governance_status are mutable
 *   - confidence_score must stay within [0, 1]
 *
 * Identity: all writes are scoped by company_id, resolved from firm_clients
 * via firm_client_id (the close-system identity introduced in D0).
 */
import { randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

export type MemoryType =
  | "recurring_pattern"
  | "known_seasonality"
  | "entity_alias"
  | "advisor_feedback"
  | "recommendation_outcome"
  | "threshold_override"
  | "operational_note"
  | "industry_override"
  | "company_context"
  | "vendor_cadence"
  | "recurring_je_template"
  | "posted_je";

export type EvidenceStrength = "weak" | "moderate" | "strong";

export type PersistenceStatus =
  | "pending"
  | "persisted"
  | "superseded"
  | "archived"
  | "blocked";

export type ReinforceOutcome = "success" | "failure" | "user_corrected";

export interface RecordMemoryInput {
  firmClientId: string;
  memoryType: MemoryType;
  memoryKey: string;
  domain?: string;
  subdomain?: string;
  topic?: string;
  entityType?: string;
  entityId?: string;
  payload: Record<string, unknown>;
  confidenceScore?: number;
  evidenceStrength?: EvidenceStrength;
  sourceSystem?: string;
}

export interface RecordMemoryResult {
  memory_id: string;
  persistence_status: PersistenceStatus;
}

export interface QueryMemoryInput {
  firmClientId: string;
  memoryType?: string;
  entityType?: string;
  entityId?: string;
  industry?: string;
  minConfidence?: number;
}

export interface RecordOverrideInput {
  firmClientId: string;
  memoryKey: string;
  /** Human overrides use threshold_override or advisor_feedback. */
  memoryType?: "threshold_override" | "advisor_feedback";
  payload: Record<string, unknown>;
  domain?: string;
  subdomain?: string;
  topic?: string;
  entityType?: string;
  entityId?: string;
  sourceSystem?: string;
}

export interface MemoryRecord {
  memory_id: string;
  memory_group_id: string;
  memory_key: string;
  company_id: string;
  memory_type: string;
  memory_status: string;
  persistence_status: PersistenceStatus;
  governance_status: string | null;
  domain: string | null;
  subdomain: string | null;
  topic: string | null;
  industry: string | null;
  entity_type: string | null;
  entity_id: string | null;
  source_system: string | null;
  confidence_score: number | null;
  evidence_strength: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const DEFAULT_CONFIDENCE = 0.5;

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function newSuffix(): string {
  return randomBytes(9).toString("base64url");
}

async function resolveCompanyId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  firmClientId: string,
): Promise<{ companyId: string; industry: string | null }> {
  const { data, error } = await supabase
    .from("firm_clients")
    .select("company_id, industry_vertical")
    .eq("id", firmClientId)
    .maybeSingle();
  if (error) throw new Error(`firm_clients lookup failed: ${error.message}`);
  if (!data) throw new Error(`firm_client not found: ${firmClientId}`);
  if (!data.company_id) {
    throw new Error(`firm_client ${firmClientId} has no company_id (run D0 migration)`);
  }
  return { companyId: data.company_id as string, industry: (data.industry_vertical as string) ?? null };
}

interface InsertMemoryArgs {
  firmClientId: string;
  memoryType: string;
  memoryKey: string;
  payload: Record<string, unknown>;
  confidenceScore: number;
  evidenceStrength?: EvidenceStrength;
  sourceSystem?: string;
  domain?: string;
  subdomain?: string;
  topic?: string;
  industry?: string | null;
  entityType?: string;
  entityId?: string;
  governanceStatus?: string;
}

/** Insert a fresh memory record in pending state. Each write is its own group/version. */
async function insertPending(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  companyId: string,
  args: InsertMemoryArgs,
): Promise<string> {
  const suffix = newSuffix();
  const memoryId = `mem_${args.firmClientId}_${args.memoryType}_${suffix}`;
  const memoryGroupId = `grp_${args.firmClientId}_${args.memoryType}_${suffix}`;

  const row: Record<string, unknown> = {
    memory_id: memoryId,
    memory_group_id: memoryGroupId,
    memory_key: args.memoryKey,
    record_version: 1,
    company_id: companyId,
    memory_type: args.memoryType,
    memory_status: "active",
    persistence_status: "pending",
    governance_status: args.governanceStatus ?? null,
    intelligence_scope: "customer",
    domain: args.domain ?? null,
    subdomain: args.subdomain ?? null,
    topic: args.topic ?? null,
    industry: args.industry ?? null,
    entity_type: args.entityType ?? null,
    entity_id: args.entityId ?? null,
    source_system: args.sourceSystem ?? "advisacor",
    confidence_score: clamp01(args.confidenceScore),
    evidence_strength: args.evidenceStrength ?? null,
    payload: args.payload ?? {},
  };

  const { error } = await supabase.from("company_memory_records").insert(row);
  if (error) throw new Error(`memory insert failed: ${error.message}`);
  return memoryId;
}

/** Promote pending -> persisted once basic validation passes. */
async function promote(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  memoryId: string,
  payload: Record<string, unknown>,
): Promise<PersistenceStatus> {
  const valid = payload != null && typeof payload === "object" && Object.keys(payload).length > 0;
  const nextStatus: PersistenceStatus = valid ? "persisted" : "blocked";
  const { error } = await supabase
    .from("company_memory_records")
    .update({
      persistence_status: nextStatus,
      persisted_at: valid ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("memory_id", memoryId);
  if (error) throw new Error(`memory promote failed: ${error.message}`);
  return nextStatus;
}

/**
 * Record a new memory. Inserts pending, then promotes to persisted if the
 * payload validates. Returns the memory_id and final persistence_status.
 */
export async function recordMemory(input: RecordMemoryInput): Promise<RecordMemoryResult> {
  if (!input?.firmClientId) throw new Error("firmClientId is required");
  if (!input?.memoryType) throw new Error("memoryType is required");
  if (!input?.memoryKey) throw new Error("memoryKey is required");

  const supabase = getSupabaseAdmin();
  const { companyId, industry } = await resolveCompanyId(supabase, input.firmClientId);

  const memoryId = await insertPending(supabase, companyId, {
    firmClientId: input.firmClientId,
    memoryType: input.memoryType,
    memoryKey: input.memoryKey,
    payload: input.payload ?? {},
    confidenceScore: input.confidenceScore ?? DEFAULT_CONFIDENCE,
    evidenceStrength: input.evidenceStrength,
    sourceSystem: input.sourceSystem,
    domain: input.domain,
    subdomain: input.subdomain,
    topic: input.topic,
    industry,
    entityType: input.entityType,
    entityId: input.entityId,
  });

  const persistence_status = await promote(supabase, memoryId, input.payload ?? {});
  return { memory_id: memoryId, persistence_status };
}

export interface UpsertMemoryInput {
  firmClientId: string;
  memoryType: string;
  /** Deterministic memory_id (primary key). Re-upserts mutate in place. */
  memoryId: string;
  payload: Record<string, unknown>;
  memoryKey?: string;
  confidenceScore?: number;
  evidenceStrength?: EvidenceStrength;
  domain?: string;
  subdomain?: string;
  topic?: string;
  entityType?: string;
  entityId?: string;
  sourceSystem?: string;
}

/**
 * Upsert a derived-statistics memory on a deterministic memory_id (D3 learning
 * engine). On conflict it mutates payload/confidence in place — permitted for
 * the learning memory_types by the D3 trigger relaxation. Immutable identity
 * fields (memory_group_id, company_id, memory_type, source_system) are written
 * deterministically so re-upserts leave them unchanged.
 *
 * Separate from recordMemory (which stays append-only pending->persisted).
 */
export async function upsertMemory(
  input: UpsertMemoryInput,
): Promise<{ memory_id: string; created: boolean }> {
  if (!input?.firmClientId) throw new Error("firmClientId is required");
  if (!input?.memoryType) throw new Error("memoryType is required");
  if (!input?.memoryId) throw new Error("memoryId is required");

  const supabase = getSupabaseAdmin();
  const { companyId, industry } = await resolveCompanyId(supabase, input.firmClientId);

  const memoryId = input.memoryId;
  const memoryGroupId = memoryId.startsWith("mem_")
    ? `grp_${memoryId.slice(4)}`
    : `grp_${memoryId}`;
  const nowIso = new Date().toISOString();

  const { data: existing } = await supabase
    .from("company_memory_records")
    .select("memory_id")
    .eq("memory_id", memoryId)
    .maybeSingle();

  const row: Record<string, unknown> = {
    memory_id: memoryId,
    memory_group_id: memoryGroupId,
    memory_key: input.memoryKey ?? memoryId,
    record_version: 1,
    company_id: companyId,
    memory_type: input.memoryType,
    memory_status: "active",
    persistence_status: "persisted",
    intelligence_scope: "customer",
    domain: input.domain ?? null,
    subdomain: input.subdomain ?? null,
    topic: input.topic ?? null,
    industry: industry ?? null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    source_system: input.sourceSystem ?? "learning_engine",
    confidence_score:
      typeof input.confidenceScore === "number" ? clamp01(input.confidenceScore) : null,
    evidence_strength: input.evidenceStrength ?? null,
    payload: input.payload ?? {},
    persisted_at: nowIso,
    updated_at: nowIso,
  };

  const { error } = await supabase
    .from("company_memory_records")
    .upsert(row, { onConflict: "memory_id" });
  if (error) throw new Error(`memory upsert failed: ${error.message}`);

  return { memory_id: memoryId, created: !existing };
}

/**
 * Query active, persisted memories for a firm_client (resolved to company_id).
 */
export async function queryMemory(input: QueryMemoryInput): Promise<MemoryRecord[]> {
  if (!input?.firmClientId) throw new Error("firmClientId is required");
  const supabase = getSupabaseAdmin();
  const { companyId } = await resolveCompanyId(supabase, input.firmClientId);

  let q = supabase
    .from("company_memory_records")
    .select(
      "memory_id, memory_group_id, memory_key, company_id, memory_type, memory_status, persistence_status, governance_status, domain, subdomain, topic, industry, entity_type, entity_id, source_system, confidence_score, evidence_strength, payload, created_at, updated_at",
    )
    .eq("company_id", companyId)
    .eq("memory_status", "active")
    .eq("persistence_status", "persisted");

  if (input.memoryType) q = q.eq("memory_type", input.memoryType);
  if (input.entityType) q = q.eq("entity_type", input.entityType);
  if (input.entityId) q = q.eq("entity_id", input.entityId);
  if (input.industry) q = q.eq("industry", input.industry);
  if (typeof input.minConfidence === "number") q = q.gte("confidence_score", input.minConfidence);

  q = q.order("confidence_score", { ascending: false, nullsFirst: false }).order("created_at", {
    ascending: false,
  });

  const { data, error } = await q;
  if (error) throw new Error(`memory query failed: ${error.message}`);
  return (data ?? []) as MemoryRecord[];
}

/**
 * Record a human override of an AI decision. Authoritative: confidence 1.0,
 * governance_status='human_approved'.
 */
export async function recordOverride(input: RecordOverrideInput): Promise<{ memory_id: string }> {
  if (!input?.firmClientId) throw new Error("firmClientId is required");
  if (!input?.memoryKey) throw new Error("memoryKey is required");

  const supabase = getSupabaseAdmin();
  const { companyId, industry } = await resolveCompanyId(supabase, input.firmClientId);
  const memoryType = input.memoryType ?? "advisor_feedback";

  const memoryId = await insertPending(supabase, companyId, {
    firmClientId: input.firmClientId,
    memoryType,
    memoryKey: input.memoryKey,
    payload: input.payload ?? {},
    confidenceScore: 1.0,
    evidenceStrength: "strong",
    sourceSystem: input.sourceSystem ?? "advisor_override",
    domain: input.domain,
    subdomain: input.subdomain,
    topic: input.topic,
    industry,
    entityType: input.entityType,
    entityId: input.entityId,
    governanceStatus: "human_approved",
  });

  await promote(supabase, memoryId, input.payload ?? {});
  return { memory_id: memoryId };
}

/**
 * Reinforce or weaken a memory based on real-world outcome.
 *   success       -> +0.05 (cap 1.0)
 *   failure       -> -0.15
 *   user_corrected-> -0.25
 * If confidence drops below 0.2, the memory is marked invalid.
 */
export async function reinforceMemory(
  memoryId: string,
  outcome: ReinforceOutcome,
): Promise<void> {
  if (!memoryId) throw new Error("memoryId is required");
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("company_memory_records")
    .select("confidence_score, memory_status")
    .eq("memory_id", memoryId)
    .maybeSingle();
  if (error) throw new Error(`memory lookup failed: ${error.message}`);
  if (!data) throw new Error(`memory not found: ${memoryId}`);

  const current = typeof data.confidence_score === "number" ? data.confidence_score : DEFAULT_CONFIDENCE;
  const delta = outcome === "success" ? 0.05 : outcome === "failure" ? -0.15 : -0.25;
  const next = clamp01(current + delta);

  const update: Record<string, unknown> = {
    confidence_score: next,
    updated_at: new Date().toISOString(),
  };
  if (next < 0.2) update.memory_status = "invalid";

  const { error: upErr } = await supabase
    .from("company_memory_records")
    .update(update)
    .eq("memory_id", memoryId);
  if (upErr) throw new Error(`memory reinforce failed: ${upErr.message}`);
}
