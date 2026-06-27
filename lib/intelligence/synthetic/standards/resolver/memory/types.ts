import { createHash } from "node:crypto";
import type { AttestedElection } from "../org-edge/types";
import type { FrameworkId } from "../org-edge/types";

export type TenantClassification = "standard" | "phi-covered";

export interface TenantClassifier {
  classify(tenantId: string): TenantClassification;
}

export interface CacheKeyParts {
  readonly companyMemoryHandle: string;
  readonly framework: FrameworkId;
  readonly electionFingerprint: string | null;
  readonly tenantClassification: TenantClassification;
}

export type CacheKey = string;

export interface CacheEntry<V> {
  readonly value: V;
  readonly writtenAt: number;
  readonly expiresAt: number;
  readonly classification: TenantClassification;
  readonly electionFingerprint: string | null;
  readonly framework: FrameworkId;
}

export interface ResolverMemoCacheConfig {
  readonly maxSize: number;
  readonly standardTTLMs: number;
  readonly phiCoveredTTLMs: number;
  readonly mode: "per-process" | "per-request";
  readonly hardCeilingSize: 100_000;
  readonly hardCeilingTTLMs: number;
}

export interface CacheMetrics {
  readonly hits: number;
  readonly misses: number;
  readonly writes: number;
  readonly evictionsLRU: number;
  readonly evictionsTTL: number;
  readonly invalidationsOrg: number;
  readonly purgesPHI: number;
  readonly currentSize: number;
  readonly currentSizePHI: number;
  readonly approxBytes: number;
}

const RESOLVER_INTERNAL: unique symbol = Symbol("resolver-internal");
export type ResolverInternalKey = typeof RESOLVER_INTERNAL;
export { RESOLVER_INTERNAL };

export interface ActorRef {
  readonly kind: "human" | "ai-worker" | "system" | "cron";
  readonly id: string;
  readonly via: "panel-consumer" | "role-adapter" | "direct-api" | "admin-script" | "org-edge";
}

export interface ResolverMemoCache<V> {
  get(key: CacheKey, _gate: ResolverInternalKey): CacheEntry<V> | null;
  set(key: CacheKey, entry: CacheEntry<V>, _gate: ResolverInternalKey): void;
  invalidateOrg(orgId: string, reason: string, actor: ActorRef): number;
  purgePHIForTenant(tenantId: string, reason: string, actor: ActorRef): number;
  getCacheMetrics(): CacheMetrics;
  dispose(): Promise<void>;
}

export function buildCacheKey(parts: CacheKeyParts): CacheKey {
  const fp = parts.electionFingerprint ?? "NONE";
  return [
    `h=${parts.companyMemoryHandle}`,
    `f=${parts.framework}`,
    `e=${fp}`,
    `c=${parts.tenantClassification}`,
  ].join("|");
}

export function buildElectionFingerprint(election: AttestedElection | null): string | null {
  if (!election) {
    return null;
  }
  const payload = [
    election.orgId,
    election.framework,
    election.attestedBy,
    election.attestedAt,
    election.attestationVersion,
  ].join("|");
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

export const DEFAULT_MEMO_CACHE_CONFIG: ResolverMemoCacheConfig = {
  maxSize: 10_000,
  standardTTLMs: 6 * 60 * 60 * 1000,
  phiCoveredTTLMs: 1 * 60 * 60 * 1000,
  mode: "per-process",
  hardCeilingSize: 100_000,
  hardCeilingTTLMs: 24 * 60 * 60 * 1000,
};
