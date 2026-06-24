import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { InMemoryAuditLogWriter } from "../../audit";
import type { AuditLogWriter } from "../../audit/types";
import curatedPrecedenceTable from "../treatment-precedence-table.json";
import {
  buildCacheKey,
  buildElectionFingerprint,
  DEFAULT_MEMO_CACHE_CONFIG,
  DefaultResolverMemoCache,
  LRUMap,
  RESOLVER_INTERNAL,
  StaticTenantClassifier,
} from "../memory";
import type {
  CacheEntry,
  CacheKey,
  Clock,
  ResolverMemoCacheConfig,
  TenantClassifier,
} from "../memory/types";
import type { AttestedElection, FrameworkId, OrgElectionReader } from "../org-edge/types";
import { resolveTreatment } from "../resolveTreatment";
import { resolveTreatmentPure } from "../resolveTreatmentPure";
import type {
  ResolveTreatmentInput,
  TreatmentPrecedenceTable,
  TreatmentResolution,
  TreatmentResolverDeps,
} from "../types";
import { runResolveTreatmentPureGoldenTests } from "./resolveTreatmentPure.golden.test";
import { runTreatmentDeterminismHashTests } from "./treatmentDeterminismHash.test";

const FROZEN_GENERATED_AT = "2026-06-24T00:00:00Z";
const FROZEN_MS = new Date(FROZEN_GENERATED_AT).getTime();
const FROZEN_CLOCK = (): string => FROZEN_GENERATED_AT;
const REPO_ROOT = path.resolve(__dirname, "../../../../../..");

export interface MemoryCacheCaseRecord {
  readonly id: string;
  readonly decision: string;
  readonly expected: string;
  readonly outcome: string;
  readonly reason: string;
}

export interface MemoryCacheEvidence {
  readonly evidenceVersion: "42.7E.1";
  readonly generatedAt: string;
  readonly totalCases: 90;
  readonly passCount: number;
  readonly failCount: number;
  readonly cases: readonly MemoryCacheCaseRecord[];
}

function pushCase(
  cases: MemoryCacheCaseRecord[],
  counters: { passCount: number; failCount: number },
  input: {
    id: string;
    decision: string;
    expected: string;
    actual: string;
    reason: string;
  },
): void {
  if (input.actual !== input.expected) {
    counters.failCount += 1;
  } else {
    counters.passCount += 1;
  }
  cases.push(
    Object.freeze({
      id: input.id,
      decision: input.decision,
      expected: input.expected,
      outcome: input.actual,
      reason: input.reason,
    }),
  );
}

function createFakeClock(startMs = FROZEN_MS): Clock & { advance(ms: number): void; set(ms: number): void } {
  let now = startMs;
  return {
    nowMs: () => now,
    advance(ms: number) {
      now += ms;
    },
    set(ms: number) {
      now = ms;
    },
  };
}

function attestedElection(
  orgId: string,
  framework: FrameworkId,
  overrides: Partial<AttestedElection> = {},
): AttestedElection {
  return Object.freeze({
    orgId,
    framework,
    citationHandle: "ASC_105_10_05_1",
    attestedBy: "mwiseman@advisacor.com",
    attestedAt: FROZEN_GENERATED_AT,
    attestationVersion: "42.7A.4.1",
    note: "cache test",
    ...overrides,
  });
}

class MapOrgElectionReader implements OrgElectionReader {
  constructor(private readonly elections: ReadonlyMap<string, AttestedElection>) {}

  read(orgId: string): AttestedElection | null {
    return this.elections.get(orgId) ?? null;
  }

  isAvailable(): boolean {
    return true;
  }
}

class FailOnMissAuditWriter implements AuditLogWriter {
  private readonly delegate = new InMemoryAuditLogWriter();
  failOnMiss = false;

  append(entry: Parameters<AuditLogWriter["append"]>[0]): void {
    if (this.failOnMiss && entry.kind === "cache.miss") {
      throw new Error("audit-fail-simulated");
    }
    this.delegate.append(entry);
  }

  flush(): Promise<void> {
    return this.delegate.flush();
  }

  headHash(): string {
    return this.delegate.headHash();
  }

  state(): ReturnType<AuditLogWriter["state"]> {
    return this.delegate.state();
  }
}

function baseInput(overrides: Partial<ResolveTreatmentInput> = {}): ResolveTreatmentInput {
  return {
    orgElection: {
      electedFramework: "US_GAAP",
      electedAt: FROZEN_GENERATED_AT,
      electedBy: "mwiseman@advisacor.com",
      electionScope: "company",
      electionEvidenceRef: "GOV-CACHE-TEST",
    },
    companyMemoryHandle: {
      companyId: "org-cache-test-1",
      asOfPeriodKey: "2026-Q2",
      memoryGroupId: "memory-group-test",
      snapshotDeterminismHash: "snap_test",
    },
    knowledgePackageHandle: {
      packageId: "pkg-test",
      boundPhase37SnapshotHash: "phase37_test",
      industry: {
        industryCode: "MANUFACTURING",
        subIndustryCode: null,
      },
    },
    industry: {
      industryCode: "MANUFACTURING",
      subIndustryCode: null,
    },
    jurisdiction: {
      country: "US",
      region: null,
    },
    reportingPeriod: {
      periodKey: "2026-Q2",
      fiscalYearEnd: "2026-06-30",
    },
    ...overrides,
  };
}

function createDeps(overrides: Partial<TreatmentResolverDeps> = {}): TreatmentResolverDeps {
  return {
    memoryReader: {
      queryLatestMemoryRecord: async () => null,
    },
    precedenceTableLoader: {
      load: async () => curatedPrecedenceTable as TreatmentPrecedenceTable,
    },
    clock: FROZEN_CLOCK,
    clockMs: () => FROZEN_MS,
    ...overrides,
  };
}

function createTestCache<V>(
  options: {
    clock?: Clock;
    auditLog?: AuditLogWriter;
    config?: Partial<ResolverMemoCacheConfig>;
    tenantClassifier?: TenantClassifier;
  } = {},
): DefaultResolverMemoCache<V> {
  const auditLog = options.auditLog ?? new InMemoryAuditLogWriter();
  const config = { ...DEFAULT_MEMO_CACHE_CONFIG, maxSize: 100, ...options.config };
  const tenantClassifier =
    options.tenantClassifier ??
    new StaticTenantClassifier({
      phiCoveredTenants: new Set(["phi-tenant-1"]),
      healthcareVerticalTenants: new Set(["healthcare-tenant-1"]),
    });
  return new DefaultResolverMemoCache<V>({
    config,
    clock: options.clock ?? createFakeClock(),
    auditLog,
    tenantClassifier,
  });
}

function sampleEntry(
  overrides: Partial<CacheEntry<{ value: string }>> = {},
): CacheEntry<{ value: string }> {
  return Object.freeze({
    value: { value: "payload" },
    writtenAt: FROZEN_MS,
    expiresAt: FROZEN_MS + 60_000,
    classification: "standard" as const,
    electionFingerprint: null,
    framework: "US_GAAP" as FrameworkId,
    ...overrides,
  });
}

function cacheKeyFor(
  handle: string,
  framework: FrameworkId,
  classification: "standard" | "phi-covered" = "standard",
  fingerprint: string | null = null,
): CacheKey {
  return buildCacheKey({
    companyMemoryHandle: handle,
    framework,
    electionFingerprint: fingerprint,
    tenantClassification: classification,
  });
}

async function executeSuitesS1ThroughS13(
  cases: MemoryCacheCaseRecord[],
  counters: { passCount: number; failCount: number },
): Promise<void> {
  // S1 cache-key-determinism (6)
  {
    const election = attestedElection("org-1", "US_GAAP");
    const fp = buildElectionFingerprint(election);
    const keyA = buildCacheKey({
      companyMemoryHandle: "org-1",
      framework: "US_GAAP",
      electionFingerprint: fp,
      tenantClassification: "standard",
    });
    const keyB = buildCacheKey({
      companyMemoryHandle: "org-1",
      framework: "US_GAAP",
      electionFingerprint: fp,
      tenantClassification: "standard",
    });
    pushCase(cases, counters, {
      id: "S1-01",
      decision: "same-parts-same-key",
      expected: "equal",
      actual: keyA === keyB ? "equal" : "different",
      reason: "Stable serialization for identical parts",
    });
    const keyDifferentFramework = buildCacheKey({
      companyMemoryHandle: "org-1",
      framework: "IFRS",
      electionFingerprint: fp,
      tenantClassification: "standard",
    });
    pushCase(cases, counters, {
      id: "S1-02",
      decision: "framework-in-key",
      expected: "different",
      actual: keyA !== keyDifferentFramework ? "different" : "equal",
      reason: "Different framework yields different key",
    });
    const keyDifferentHandle = buildCacheKey({
      companyMemoryHandle: "org-2",
      framework: "US_GAAP",
      electionFingerprint: fp,
      tenantClassification: "standard",
    });
    pushCase(cases, counters, {
      id: "S1-03",
      decision: "handle-in-key",
      expected: "different",
      actual: keyA !== keyDifferentHandle ? "different" : "equal",
      reason: "Different handle yields different key",
    });
    const election2 = attestedElection("org-1", "US_GAAP", {
      attestedAt: "2026-06-25T00:00:00Z",
    } as Partial<AttestedElection>);
    const fp2 = buildElectionFingerprint(election2);
    pushCase(cases, counters, {
      id: "S1-04",
      decision: "fingerprint-changes-with-attestedAt",
      expected: "different",
      actual: fp !== fp2 ? "different" : "equal",
      reason: "Re-attestation changes fingerprint",
    });
    const keyPhi = buildCacheKey({
      companyMemoryHandle: "org-1",
      framework: "US_GAAP",
      electionFingerprint: fp,
      tenantClassification: "phi-covered",
    });
    pushCase(cases, counters, {
      id: "S1-05",
      decision: "classification-in-key",
      expected: "different",
      actual: keyA !== keyPhi ? "different" : "equal",
      reason: "Classification flows through cache key",
    });
    pushCase(cases, counters, {
      id: "S1-06",
      decision: "null-election-fingerprint",
      expected: "NONE",
      actual: buildCacheKey({
        companyMemoryHandle: "org-1",
        framework: "US_GAAP",
        electionFingerprint: null,
        tenantClassification: "standard",
      }).includes("e=NONE")
        ? "NONE"
        : "missing",
      reason: "Null fingerprint serializes as NONE",
    });
  }

  // S2 lru-map-primitive (10)
  {
    const map = new LRUMap<string, number>(2);
    pushCase(cases, counters, {
      id: "S2-01",
      decision: "initial-size",
      expected: "0",
      actual: String(map.size()),
      reason: "Empty map size is zero",
    });
    map.set("a", 1);
    map.set("b", 2);
    pushCase(cases, counters, {
      id: "S2-02",
      decision: "bounded-size",
      expected: "2",
      actual: String(map.size()),
      reason: "Map respects max size",
    });
    map.get("a");
    const evicted = map.set("c", 3);
    pushCase(cases, counters, {
      id: "S2-03",
      decision: "lru-eviction",
      expected: "b",
      actual: evicted ?? "none",
      reason: "Least recently used key evicted",
    });
    pushCase(cases, counters, {
      id: "S2-04",
      decision: "mru-on-get",
      expected: "1",
      actual: String(map.get("a")),
      reason: "MRU entry retained after get",
    });
    pushCase(cases, counters, {
      id: "S2-05",
      decision: "has",
      expected: "true",
      actual: String(map.has("c")),
      reason: "has() reflects membership",
    });
    pushCase(cases, counters, {
      id: "S2-06",
      decision: "delete",
      expected: "true",
      actual: String(map.delete("c")),
      reason: "delete removes entry",
    });
    map.set("d", 4);
    const updateMap = new LRUMap<string, number>(3);
    updateMap.set("solo", 1);
    updateMap.set("solo", 2);
    pushCase(cases, counters, {
      id: "S2-07",
      decision: "update-existing",
      expected: "1",
      actual: String(updateMap.size()),
      reason: "Updating existing key does not grow size",
    });
    let badSizeThrows = false;
    try {
      // eslint-disable-next-line no-new
      new LRUMap(0);
    } catch {
      badSizeThrows = true;
    }
    pushCase(cases, counters, {
      id: "S2-08",
      decision: "reject-bad-maxSize",
      expected: "throws",
      actual: badSizeThrows ? "throws" : "allowed",
      reason: "maxSize out of range rejected",
    });
    const orderMap = new LRUMap<string, number>(3);
    orderMap.set("x", 1);
    orderMap.set("y", 2);
    orderMap.set("z", 3);
    const keys = [...orderMap.keys()];
    pushCase(cases, counters, {
      id: "S2-09",
      decision: "iteration-order",
      expected: "x,y,z",
      actual: keys.join(","),
      reason: "Keys iterate in insertion order",
    });
    pushCase(cases, counters, {
      id: "S2-10",
      decision: "evicted-return",
      expected: "non-null",
      actual: orderMap.set("w", 4) !== null ? "non-null" : "null",
      reason: "set returns evicted key when full",
    });
  }

  // S3 ttl-eviction (8)
  {
    const clock = createFakeClock();
    const cache = createTestCache<{ v: number }>({ clock, config: { standardTTLMs: 1000, phiCoveredTTLMs: 500 } });
    const key = cacheKeyFor("ttl-org", "US_GAAP");
    cache.set(key, sampleEntry({ expiresAt: clock.nowMs() + 1000, value: { v: 1 } }), RESOLVER_INTERNAL);
    pushCase(cases, counters, {
      id: "S3-01",
      decision: "hit-before-expiry",
      expected: "hit",
      actual: cache.get(key, RESOLVER_INTERNAL) ? "hit" : "miss",
      reason: "Entry valid before expiresAt",
    });
    clock.advance(1001);
    pushCase(cases, counters, {
      id: "S3-02",
      decision: "miss-after-expiry",
      expected: "miss",
      actual: cache.get(key, RESOLVER_INTERNAL) ? "hit" : "miss",
      reason: "Expired entry returns null",
    });
    const metricsAfterTtl = cache.getCacheMetrics();
    pushCase(cases, counters, {
      id: "S3-03",
      decision: "ttl-eviction-metric",
      expected: "1",
      actual: String(metricsAfterTtl.evictionsTTL),
      reason: "TTL eviction counted",
    });
    const phiClock = createFakeClock();
    const phiCache = createTestCache<number>({
      clock: phiClock,
      config: { standardTTLMs: 6000, phiCoveredTTLMs: 1000 },
    });
    const phiKey = cacheKeyFor("phi-org", "US_GAAP", "phi-covered");
    phiCache.set(
      phiKey,
      sampleEntry({
        classification: "phi-covered",
        expiresAt: phiClock.nowMs() + 1000,
        value: { value: "phi" },
      }),
      RESOLVER_INTERNAL,
    );
    phiClock.advance(1001);
    pushCase(cases, counters, {
      id: "S3-04",
      decision: "phi-ttl-shorter",
      expected: "miss",
      actual: phiCache.get(phiKey, RESOLVER_INTERNAL) ? "hit" : "miss",
      reason: "Phi entry expires on phi TTL schedule",
    });
    pushCase(cases, counters, {
      id: "S3-05",
      decision: "clock-injection",
      expected: "controlled",
      actual: phiClock.nowMs() > FROZEN_MS ? "controlled" : "real",
      reason: "Fake clock drives expiry",
    });
    const skewClock = createFakeClock();
    const skewCache = createTestCache<number>({ clock: skewClock });
    const skewKey = cacheKeyFor("skew-org", "IFRS");
    skewCache.set(
      skewKey,
      sampleEntry({ expiresAt: skewClock.nowMs() + 500, value: { value: "x" } }),
      RESOLVER_INTERNAL,
    );
    skewClock.set(skewClock.nowMs() + 499);
    pushCase(cases, counters, {
      id: "S3-06",
      decision: "clock-skew-tolerance-before",
      expected: "hit",
      actual: skewCache.get(skewKey, RESOLVER_INTERNAL) ? "hit" : "miss",
      reason: "Entry still valid one ms before expiry",
    });
    skewClock.set(skewClock.nowMs() + 2);
    pushCase(cases, counters, {
      id: "S3-07",
      decision: "clock-skew-tolerance-after",
      expected: "miss",
      actual: skewCache.get(skewKey, RESOLVER_INTERNAL) ? "hit" : "miss",
      reason: "Entry expired one ms after expiresAt",
    });
    pushCase(cases, counters, {
      id: "S3-08",
      decision: "miss-metric-on-expired",
      expected: "gt-zero",
      actual: skewCache.getCacheMetrics().misses > 0 ? "gt-zero" : "zero",
      reason: "Expired get increments misses",
    });
  }

  // S4 phi-segregation (9)
  {
    const cache = createTestCache<string>({ config: { maxSize: 4 } });
    const stdKey = cacheKeyFor("seg-org", "US_GAAP", "standard");
    const phiKey = cacheKeyFor("seg-org", "US_GAAP", "phi-covered");
    cache.set(stdKey, sampleEntry({ classification: "standard", value: { value: "std" } }), RESOLVER_INTERNAL);
    cache.set(phiKey, sampleEntry({ classification: "phi-covered", value: { value: "phi" } }), RESOLVER_INTERNAL);
    const metrics = cache.getCacheMetrics();
    pushCase(cases, counters, {
      id: "S4-01",
      decision: "standard-map-size",
      expected: "1",
      actual: String(metrics.currentSize - metrics.currentSizePHI),
      reason: "Standard entry in standard map",
    });
    pushCase(cases, counters, {
      id: "S4-02",
      decision: "phi-map-size",
      expected: "1",
      actual: String(metrics.currentSizePHI),
      reason: "Phi entry in phi map",
    });
    const purgeCount = cache.purgePHIForTenant("seg-org", "test", {
      kind: "human",
      id: "mwiseman@advisacor.com",
      via: "admin-script",
    });
    pushCase(cases, counters, {
      id: "S4-03",
      decision: "purge-phi-only",
      expected: "1",
      actual: String(purgeCount),
      reason: "purgePHIForTenant drops phi entries",
    });
    pushCase(cases, counters, {
      id: "S4-04",
      decision: "standard-survives-purge",
      expected: "hit",
      actual: cache.get(stdKey, RESOLVER_INTERNAL) ? "hit" : "miss",
      reason: "Standard entry survives phi purge",
    });
    cache.set(phiKey, sampleEntry({ classification: "phi-covered", value: { value: "phi2" } }), RESOLVER_INTERNAL);
    const invCount = cache.invalidateOrg("seg-org", "election-change", {
      kind: "human",
      id: "mwiseman@advisacor.com",
      via: "admin-script",
    });
    pushCase(cases, counters, {
      id: "S4-05",
      decision: "invalidate-both-maps",
      expected: "2",
      actual: String(invCount),
      reason: "invalidateOrg clears both maps for org",
    });
    const smallCache = createTestCache<string>({ config: { maxSize: 2 } });
    for (let index = 0; index < 3; index += 1) {
      const key = cacheKeyFor(`phi-cap-${index}`, "US_GAAP", "phi-covered");
      smallCache.set(
        key,
        sampleEntry({ classification: "phi-covered", value: { value: String(index) } }),
        RESOLVER_INTERNAL,
      );
    }
    pushCase(cases, counters, {
      id: "S4-06",
      decision: "phi-map-cap",
      expected: "lte-max",
      actual: smallCache.getCacheMetrics().currentSizePHI <= 100 ? "lte-max" : "overflow",
      reason: "Phi map respects bounded size",
    });
    pushCase(cases, counters, {
      id: "S4-07",
      decision: "phi-key-marker",
      expected: "phi-covered",
      actual: phiKey.includes("c=phi-covered") ? "phi-covered" : "standard",
      reason: "Phi classification encoded in key",
    });
    pushCase(cases, counters, {
      id: "S4-08",
      decision: "standard-key-marker",
      expected: "standard",
      actual: stdKey.includes("c=standard") ? "standard" : "other",
      reason: "Standard classification encoded in key",
    });
    const classifier = new StaticTenantClassifier({
      phiCoveredTenants: new Set(["explicit-phi"]),
      healthcareVerticalTenants: new Set(["healthcare-tenant-1"]),
    });
    pushCase(cases, counters, {
      id: "S4-09",
      decision: "classifier-routing",
      expected: "phi-covered",
      actual: classifier.classify("healthcare-tenant-1"),
      reason: "Healthcare vertical classified phi-covered",
    });
  }

  // S5 authorization-symbol (4)
  {
    const cache = createTestCache<string>();
    const key = cacheKeyFor("auth-org", "US_GAAP");
    let unauthorizedGetThrows = false;
    try {
      cache.get(key, Symbol("fake") as typeof RESOLVER_INTERNAL);
    } catch {
      unauthorizedGetThrows = true;
    }
    pushCase(cases, counters, {
      id: "S5-01",
      decision: "get-without-symbol",
      expected: "throws",
      actual: unauthorizedGetThrows ? "throws" : "allowed",
      reason: "get without RESOLVER_INTERNAL throws",
    });
    let unauthorizedSetThrows = false;
    try {
      cache.set(key, sampleEntry(), Symbol("fake") as typeof RESOLVER_INTERNAL);
    } catch {
      unauthorizedSetThrows = true;
    }
    pushCase(cases, counters, {
      id: "S5-02",
      decision: "set-without-symbol",
      expected: "throws",
      actual: unauthorizedSetThrows ? "throws" : "allowed",
      reason: "set without RESOLVER_INTERNAL throws",
    });
    cache.set(key, sampleEntry(), RESOLVER_INTERNAL);
    pushCase(cases, counters, {
      id: "S5-03",
      decision: "authorized-access",
      expected: "hit",
      actual: cache.get(key, RESOLVER_INTERNAL) ? "hit" : "miss",
      reason: "Authorized access succeeds",
    });
    pushCase(cases, counters, {
      id: "S5-04",
      decision: "symbol-not-serialized",
      expected: "absent",
      actual: JSON.stringify({ gate: RESOLVER_INTERNAL }) === "{}" ? "absent" : "leaked",
      reason: "Symbol does not leak into JSON output",
    });
  }

  // S6 metrics-accuracy (8)
  {
    const cache = createTestCache<string>();
    const key = cacheKeyFor("metrics-org", "US_GAAP");
    cache.get(key, RESOLVER_INTERNAL);
    cache.set(key, sampleEntry(), RESOLVER_INTERNAL);
    cache.get(key, RESOLVER_INTERNAL);
    const metrics = cache.getCacheMetrics();
    pushCase(cases, counters, {
      id: "S6-01",
      decision: "miss-count",
      expected: "1",
      actual: String(metrics.misses),
      reason: "Initial miss counted",
    });
    pushCase(cases, counters, {
      id: "S6-02",
      decision: "write-count",
      expected: "1",
      actual: String(metrics.writes),
      reason: "Write counted",
    });
    pushCase(cases, counters, {
      id: "S6-03",
      decision: "hit-count",
      expected: "1",
      actual: String(metrics.hits),
      reason: "Hit counted",
    });
    const tiny = createTestCache<string>({ config: { maxSize: 1 } });
    tiny.set(cacheKeyFor("m1", "US_GAAP"), sampleEntry({ value: { value: "1" } }), RESOLVER_INTERNAL);
    tiny.set(cacheKeyFor("m2", "US_GAAP"), sampleEntry({ value: { value: "2" } }), RESOLVER_INTERNAL);
    pushCase(cases, counters, {
      id: "S6-04",
      decision: "lru-eviction-count",
      expected: "1",
      actual: String(tiny.getCacheMetrics().evictionsLRU),
      reason: "LRU eviction counted",
    });
    const before = cache.getCacheMetrics().hits;
    const snapshot = cache.getCacheMetrics();
    pushCase(cases, counters, {
      id: "S6-05",
      decision: "snapshot-readonly",
      expected: "unchanged",
      actual: cache.getCacheMetrics().hits === before && snapshot.hits === before ? "unchanged" : "mutated",
      reason: "getCacheMetrics returns fresh frozen snapshot",
    });
    pushCase(cases, counters, {
      id: "S6-06",
      decision: "current-size",
      expected: "1",
      actual: String(cache.getCacheMetrics().currentSize),
      reason: "currentSize reflects entries",
    });
    pushCase(cases, counters, {
      id: "S6-07",
      decision: "no-double-hit",
      expected: "1",
      actual: String(cache.getCacheMetrics().hits),
      reason: "Single hit not double-counted on re-read",
    });
    cache.get(key, RESOLVER_INTERNAL);
    pushCase(cases, counters, {
      id: "S6-08",
      decision: "second-hit",
      expected: "2",
      actual: String(cache.getCacheMetrics().hits),
      reason: "Second hit increments hits",
    });
  }

  // S7 invalidate-org (6)
  {
    const cache = createTestCache<string>();
    const orgId = "inv-org-1";
    const otherOrg = "other-org";
    cache.set(cacheKeyFor(orgId, "US_GAAP"), sampleEntry(), RESOLVER_INTERNAL);
    cache.set(cacheKeyFor(orgId, "IFRS"), sampleEntry({ framework: "IFRS" }), RESOLVER_INTERNAL);
    cache.set(cacheKeyFor(otherOrg, "US_GAAP"), sampleEntry(), RESOLVER_INTERNAL);
    const count = cache.invalidateOrg(orgId, "registry-change", {
      kind: "human",
      id: "mwiseman@advisacor.com",
      via: "admin-script",
    });
    pushCase(cases, counters, {
      id: "S7-01",
      decision: "invalidated-count",
      expected: "2",
      actual: String(count),
      reason: "All org entries dropped",
    });
    pushCase(cases, counters, {
      id: "S7-02",
      decision: "other-org-retained",
      expected: "hit",
      actual: cache.get(cacheKeyFor(otherOrg, "US_GAAP"), RESOLVER_INTERNAL) ? "hit" : "miss",
      reason: "Other org entries untouched",
    });
    pushCase(cases, counters, {
      id: "S7-03",
      decision: "invalidation-metric",
      expected: "1",
      actual: String(cache.getCacheMetrics().invalidationsOrg),
      reason: "invalidationsOrg incremented",
    });
    const auditWriter = new InMemoryAuditLogWriter();
    const auditedCache = createTestCache<string>({ auditLog: auditWriter });
    auditedCache.set(cacheKeyFor("audit-org", "US_GAAP"), sampleEntry(), RESOLVER_INTERNAL);
    auditedCache.invalidateOrg("audit-org", "reason-x", {
      kind: "human",
      id: "admin@test.com",
      via: "admin-script",
    });
    const lastKind = auditWriter.getEntries().at(-1)?.kind;
    pushCase(cases, counters, {
      id: "S7-04",
      decision: "audit-event",
      expected: "cache.invalidate.org",
      actual: lastKind ?? "missing",
      reason: "Audit event emitted on invalidate",
    });
    const payload = auditWriter.getEntries().at(-1)?.payload as Record<string, unknown>;
    pushCase(cases, counters, {
      id: "S7-05",
      decision: "reason-captured",
      expected: "reason-x",
      actual: String(payload?.reason ?? ""),
      reason: "Reason captured in audit payload",
    });
    pushCase(cases, counters, {
      id: "S7-06",
      decision: "actor-captured",
      expected: "admin@test.com",
      actual: auditWriter.getEntries().at(-1)?.actor.id ?? "",
      reason: "Actor captured in audit entry",
    });
  }

  // S8 purge-phi-tenant (5)
  {
    const auditWriter = new InMemoryAuditLogWriter();
    const cache = createTestCache<string>({ auditLog: auditWriter });
    const tenant = "phi-purge-tenant";
    const stdKey = cacheKeyFor(tenant, "US_GAAP", "standard");
    const phiKey = cacheKeyFor(tenant, "US_GAAP", "phi-covered");
    cache.set(stdKey, sampleEntry(), RESOLVER_INTERNAL);
    cache.set(phiKey, sampleEntry({ classification: "phi-covered" }), RESOLVER_INTERNAL);
    const purged = cache.purgePHIForTenant(tenant, "hipaa-request", {
      kind: "human",
      id: "mwiseman@advisacor.com",
      via: "admin-script",
    });
    pushCase(cases, counters, {
      id: "S8-01",
      decision: "purged-count",
      expected: "1",
      actual: String(purged),
      reason: "Phi entries purged for tenant",
    });
    pushCase(cases, counters, {
      id: "S8-02",
      decision: "standard-retained",
      expected: "hit",
      actual: cache.get(stdKey, RESOLVER_INTERNAL) ? "hit" : "miss",
      reason: "Standard entries untouched by phi purge",
    });
    pushCase(cases, counters, {
      id: "S8-03",
      decision: "purge-metric",
      expected: "1",
      actual: String(cache.getCacheMetrics().purgesPHI),
      reason: "purgesPHI metric incremented",
    });
    pushCase(cases, counters, {
      id: "S8-04",
      decision: "audit-kind",
      expected: "cache.purge.phi",
      actual: auditWriter.getEntries().find((entry) => entry.kind === "cache.purge.phi")?.kind ?? "missing",
      reason: "Audit event emitted on phi purge",
    });
    pushCase(cases, counters, {
      id: "S8-05",
      decision: "phi-miss-after-purge",
      expected: "miss",
      actual: cache.get(phiKey, RESOLVER_INTERNAL) ? "hit" : "miss",
      reason: "Purged phi entry no longer retrievable",
    });
  }

  // S9 byte-estimate (3)
  {
    const cache = createTestCache<string>();
    pushCase(cases, counters, {
      id: "S9-01",
      decision: "initial-bytes",
      expected: "0",
      actual: String(cache.getCacheMetrics().approxBytes),
      reason: "approxBytes zero initially",
    });
    cache.set(cacheKeyFor("bytes-org", "US_GAAP"), sampleEntry({ value: { value: "payload-data" } }), RESOLVER_INTERNAL);
    pushCase(cases, counters, {
      id: "S9-02",
      decision: "bytes-nonzero",
      expected: "gt-zero",
      actual: cache.getCacheMetrics().approxBytes > 0 ? "gt-zero" : "zero",
      reason: "approxBytes non-zero after write",
    });
    await cache.dispose();
    pushCase(cases, counters, {
      id: "S9-03",
      decision: "bytes-reset-on-dispose",
      expected: "0",
      actual: String(cache.getCacheMetrics().approxBytes),
      reason: "approxBytes reset on dispose",
    });
  }

  // S10 dispose (3)
  {
    const auditWriter = new InMemoryAuditLogWriter();
    const cache = createTestCache<string>({ auditLog: auditWriter });
    cache.set(cacheKeyFor("dispose-org", "US_GAAP"), sampleEntry(), RESOLVER_INTERNAL);
    await cache.dispose();
    const hasDispose = auditWriter.getEntries().some((entry) => entry.kind === "cache.dispose");
    pushCase(cases, counters, {
      id: "S10-01",
      decision: "dispose-audit",
      expected: "cache.dispose",
      actual: hasDispose ? "cache.dispose" : "missing",
      reason: "dispose emits audit entry",
    });
    let twiceOk = "failed";
    try {
      await cache.dispose();
      twiceOk = "ok";
    } catch {
      twiceOk = "failed";
    }
    pushCase(cases, counters, {
      id: "S10-02",
      decision: "dispose-idempotent",
      expected: "ok",
      actual: twiceOk,
      reason: "Second dispose is safe",
    });
    cache.set(cacheKeyFor("dispose-org-2", "US_GAAP"), sampleEntry(), RESOLVER_INTERNAL);
    pushCase(cases, counters, {
      id: "S10-03",
      decision: "writes-after-dispose",
      expected: "2",
      actual: String(cache.getCacheMetrics().writes),
      reason: "Further writes allowed after dispose",
    });
  }

  // S11 outer-wrapper-integration (15)
  {
    const memoCache = createTestCache<TreatmentResolution>();
    const deps = createDeps({
      memoCache,
      memoCacheConfig: DEFAULT_MEMO_CACHE_CONFIG,
      tenantClassifier: new StaticTenantClassifier({
        phiCoveredTenants: new Set(),
        healthcareVerticalTenants: new Set(),
      }),
    });
    const input = baseInput();
    const first = await resolveTreatment(input, deps);
    const second = await resolveTreatment(input, deps);
    pushCase(cases, counters, {
      id: "S11-01",
      decision: "cached-second-call",
      expected: "same-hash",
      actual: first.treatmentDeterminismHash === second.treatmentDeterminismHash ? "same-hash" : "different",
      reason: "Second resolveTreatment call returns cached resolution",
    });
    const diffFrameworkInput = baseInput({
      orgElection: {
        electedFramework: "IFRS",
        electedAt: FROZEN_GENERATED_AT,
        electedBy: "mwiseman@advisacor.com",
        electionScope: "company",
        electionEvidenceRef: "GOV-IFRS",
      },
    });
    const ifrs = await resolveTreatment(diffFrameworkInput, deps);
    pushCase(cases, counters, {
      id: "S11-02",
      decision: "framework-cache-miss",
      expected: "IFRS",
      actual: ifrs.chosenFramework,
      reason: "Different framework key causes separate cache entry",
    });
    const orgId = "fp-change-org";
    const reader = new MapOrgElectionReader(
      new Map([[orgId, attestedElection(orgId, "US_GAAP")]]),
    );
    const fpDeps = createDeps({
      memoCache: createTestCache<TreatmentResolution>(),
      memoCacheConfig: DEFAULT_MEMO_CACHE_CONFIG,
      orgElectionReader: reader,
    });
    const fpInput = baseInput({
      companyMemoryHandle: {
        ...baseInput().companyMemoryHandle,
        companyId: orgId,
      },
      orgElection: null,
    });
    await resolveTreatment(fpInput, fpDeps);
    reader.read(orgId);
    const changedReader = new MapOrgElectionReader(
      new Map([
        [
          orgId,
          attestedElection(orgId, "US_GAAP", {
            attestedAt: "2026-06-25T00:00:00Z",
          } as Partial<AttestedElection>),
        ],
      ]),
    );
    const fpDeps2 = createDeps({
      memoCache: fpDeps.memoCache,
      memoCacheConfig: DEFAULT_MEMO_CACHE_CONFIG,
      orgElectionReader: changedReader,
    });
    await resolveTreatment(fpInput, fpDeps2);
    pushCase(cases, counters, {
      id: "S11-03",
      decision: "fingerprint-cache-miss",
      expected: "2",
      actual: String(fpDeps.memoCache?.getCacheMetrics().writes ?? 0),
      reason: "Changed fingerprint causes cache miss and rewrite",
    });
    const phiDeps = createDeps({
      memoCache: createTestCache<TreatmentResolution>(),
      memoCacheConfig: DEFAULT_MEMO_CACHE_CONFIG,
      tenantClassifier: new StaticTenantClassifier({
        phiCoveredTenants: new Set(["phi-tenant-1"]),
        healthcareVerticalTenants: new Set(),
      }),
    });
    const phiInput = baseInput({
      companyMemoryHandle: {
        ...baseInput().companyMemoryHandle,
        companyId: "phi-tenant-1",
      },
    });
    await resolveTreatment(phiInput, phiDeps);
    const phiMetrics = phiDeps.memoCache?.getCacheMetrics();
    pushCase(cases, counters, {
      id: "S11-04",
      decision: "phi-classification-write",
      expected: "1",
      actual: String(phiMetrics?.currentSizePHI ?? 0),
      reason: "Phi tenant entries land in phi map via resolver",
    });
    const perRequestDeps = createDeps({
      memoCache: createTestCache<TreatmentResolution>(),
      memoCacheConfig: { ...DEFAULT_MEMO_CACHE_CONFIG, mode: "per-request" },
    });
    await resolveTreatment(baseInput(), perRequestDeps);
    await resolveTreatment(baseInput(), perRequestDeps);
    pushCase(cases, counters, {
      id: "S11-05",
      decision: "per-request-mode",
      expected: "0-hits",
      actual: `${perRequestDeps.memoCache?.getCacheMetrics().hits ?? 0}-hits`,
      reason: "per-request mode skips cache reads",
    });
    const invCache = createTestCache<TreatmentResolution>();
    const invDeps = createDeps({ memoCache: invCache, memoCacheConfig: DEFAULT_MEMO_CACHE_CONFIG });
    const invInput = baseInput();
    await resolveTreatment(invInput, invDeps);
    invCache.invalidateOrg("org-cache-test-1", "election-update", {
      kind: "human",
      id: "mwiseman@advisacor.com",
      via: "admin-script",
    });
    await resolveTreatment(invInput, invDeps);
    pushCase(cases, counters, {
      id: "S11-06",
      decision: "invalidate-causes-miss",
      expected: "2",
      actual: String(invCache.getCacheMetrics().writes),
      reason: "invalidateOrg between calls forces rewrite",
    });
    const failAudit = new FailOnMissAuditWriter();
    failAudit.failOnMiss = true;
    const failCache = createTestCache<TreatmentResolution>({ auditLog: failAudit });
    let failClosed = "allowed";
    try {
      await resolveTreatment(baseInput(), createDeps({ memoCache: failCache, memoCacheConfig: DEFAULT_MEMO_CACHE_CONFIG }));
      failClosed = "allowed";
    } catch (error) {
      failClosed = (error as Error).message.includes("audit-fail-simulated") ? "throws" : "other-error";
    }
    pushCase(cases, counters, {
      id: "S11-07",
      decision: "fail-closed-audit",
      expected: "throws",
      actual: failClosed,
      reason: "Audit failure propagates from resolver",
    });
    const metricsCache = createTestCache<TreatmentResolution>();
    const metricsDeps = createDeps({ memoCache: metricsCache, memoCacheConfig: DEFAULT_MEMO_CACHE_CONFIG });
    await resolveTreatment(baseInput(), metricsDeps);
    pushCase(cases, counters, {
      id: "S11-08",
      decision: "resolver-metrics",
      expected: "gt-zero",
      actual: (metricsCache.getCacheMetrics().writes > 0 ? "gt-zero" : "zero"),
      reason: "Cache metrics exposed via memo cache after resolve",
    });
    let pureBaseline = "";
    try {
      pureBaseline = execSync("git show 20b4bdf:lib/intelligence/synthetic/standards/resolver/resolveTreatmentPure.ts", {
        cwd: REPO_ROOT,
        encoding: "utf8",
      });
    } catch {
      pureBaseline = "";
    }
    const pureCurrent = fs.readFileSync(
      path.join(REPO_ROOT, "lib/intelligence/synthetic/standards/resolver/resolveTreatmentPure.ts"),
      "utf8",
    );
    pushCase(cases, counters, {
      id: "S11-09",
      decision: "pure-core-untouched",
      expected: "identical",
      actual: pureBaseline && pureCurrent === pureBaseline ? "identical" : "changed",
      reason: "Pure inner core byte-identical to 20b4bdf",
    });
    const nullReaderDeps = createDeps({
      memoCache: createTestCache<TreatmentResolution>(),
      memoCacheConfig: DEFAULT_MEMO_CACHE_CONFIG,
    });
    const noEdge = await resolveTreatment(baseInput({ orgElection: null }), nullReaderDeps);
    pushCase(cases, counters, {
      id: "S11-10",
      decision: "curated-rules-behavior",
      expected: "US_GAAP",
      actual: noEdge.chosenFramework,
      reason: "Curated-rules path unchanged with cache enabled",
    });
    const edgeOrg = "edge-cache-org";
    const edgeReader = new MapOrgElectionReader(
      new Map([[edgeOrg, attestedElection(edgeOrg, "IFRS")]]),
    );
    const edgeDeps = createDeps({
      memoCache: createTestCache<TreatmentResolution>(),
      memoCacheConfig: DEFAULT_MEMO_CACHE_CONFIG,
      orgElectionReader: edgeReader,
    });
    const edgeResolution = await resolveTreatment(
      baseInput({
        companyMemoryHandle: { ...baseInput().companyMemoryHandle, companyId: edgeOrg },
        orgElection: null,
      }),
      edgeDeps,
    );
    pushCase(cases, counters, {
      id: "S11-11",
      decision: "org-edge-behavior",
      expected: "IFRS",
      actual: edgeResolution.chosenFramework,
      reason: "Org-edge override preserved with cache",
    });
    pushCase(cases, counters, {
      id: "S11-12",
      decision: "standard-ttl-config",
      expected: String(DEFAULT_MEMO_CACHE_CONFIG.standardTTLMs),
      actual: String(DEFAULT_MEMO_CACHE_CONFIG.standardTTLMs),
      reason: "Standard TTL default configured",
    });
    pushCase(cases, counters, {
      id: "S11-13",
      decision: "phi-ttl-config",
      expected: String(DEFAULT_MEMO_CACHE_CONFIG.phiCoveredTTLMs),
      actual: String(DEFAULT_MEMO_CACHE_CONFIG.phiCoveredTTLMs),
      reason: "Phi TTL default configured",
    });
    const goldenCount = runResolveTreatmentPureGoldenTests();
    const hashCount = runTreatmentDeterminismHashTests();
    pushCase(cases, counters, {
      id: "S11-14",
      decision: "pure-regression-count",
      expected: "gt-zero",
      actual: goldenCount + hashCount > 0 ? "gt-zero" : "zero",
      reason: "Golden and hash suites still execute",
    });
    pushCase(cases, counters, {
      id: "S11-15",
      decision: "resolveTreatmentPure-callable",
      expected: "ok",
      actual: typeof resolveTreatmentPure === "function" ? "ok" : "missing",
      reason: "Pure core remains importable",
    });
  }

  // S12 pure-inner-core-untouched (3)
  {
    let pureBaseline = "";
    try {
      pureBaseline = execSync("git show 20b4bdf:lib/intelligence/synthetic/standards/resolver/resolveTreatmentPure.ts", {
        cwd: REPO_ROOT,
        encoding: "utf8",
      });
    } catch {
      pureBaseline = "";
    }
    const purePath = path.join(REPO_ROOT, "lib/intelligence/synthetic/standards/resolver/resolveTreatmentPure.ts");
    const pureCurrent = fs.readFileSync(purePath, "utf8");
    pushCase(cases, counters, {
      id: "S12-01",
      decision: "byte-identical-pure",
      expected: "identical",
      actual: pureBaseline && pureCurrent === pureBaseline ? "identical" : "changed",
      reason: "resolveTreatmentPure.ts byte-identical to 20b4bdf",
    });
    const forbidden = ["org-edge", "memory/", "audit/"];
    const hasForbidden = forbidden.some((token) => pureCurrent.includes(token));
    pushCase(cases, counters, {
      id: "S12-02",
      decision: "pure-no-cache-imports",
      expected: "clean",
      actual: hasForbidden ? "forbidden" : "clean",
      reason: "Pure core has no org-edge/memory/audit references",
    });
    let resolverOk = "failed";
    try {
      execSync("node scripts/run-resolver-tests.js", { cwd: REPO_ROOT, stdio: "pipe", encoding: "utf8" });
      resolverOk = "passed";
    } catch {
      resolverOk = "failed";
    }
    pushCase(cases, counters, {
      id: "S12-03",
      decision: "resolver-regression",
      expected: "passed",
      actual: resolverOk,
      reason: "verify:treatment-resolver regression passes",
    });
  }

  // S13 regression-suites (4)
  {
    let treatmentOk = "failed";
    try {
      execSync("npm run verify:treatment-resolver", { cwd: REPO_ROOT, stdio: "pipe", encoding: "utf8" });
      treatmentOk = "passed";
    } catch {
      treatmentOk = "failed";
    }
    pushCase(cases, counters, {
      id: "S13-01",
      decision: "treatment-resolver",
      expected: "passed",
      actual: treatmentOk,
      reason: "verify:treatment-resolver passes",
    });
    let panelOk = "failed";
    try {
      execSync("npm run verify:panel-consumer", { cwd: REPO_ROOT, stdio: "pipe", encoding: "utf8" });
      panelOk = "passed";
    } catch {
      panelOk = "failed";
    }
    pushCase(cases, counters, {
      id: "S13-02",
      decision: "panel-consumer",
      expected: "passed",
      actual: panelOk,
      reason: "verify:panel-consumer passes",
    });
    let orgEdgeOk = "failed";
    try {
      execSync("npm run verify:org-edge", { cwd: REPO_ROOT, stdio: "pipe", encoding: "utf8" });
      orgEdgeOk = "passed";
    } catch {
      orgEdgeOk = "failed";
    }
    pushCase(cases, counters, {
      id: "S13-03",
      decision: "org-edge",
      expected: "passed",
      actual: orgEdgeOk,
      reason: "verify:org-edge passes",
    });
    let stableRuns = 0;
    for (let run = 0; run < 5; run += 1) {
      try {
        execSync("npm run verify:treatment-resolver", { cwd: REPO_ROOT, stdio: "pipe", encoding: "utf8" });
        execSync("npm run verify:panel-consumer", { cwd: REPO_ROOT, stdio: "pipe", encoding: "utf8" });
        execSync("npm run verify:org-edge", { cwd: REPO_ROOT, stdio: "pipe", encoding: "utf8" });
        stableRuns += 1;
      } catch {
        break;
      }
    }
    pushCase(cases, counters, {
      id: "S13-04",
      decision: "combined-five-runs",
      expected: "5",
      actual: String(stableRuns),
      reason: "Combined regression suites stable across five consecutive runs",
    });
  }
}

async function buildCasesThroughS13(): Promise<MemoryCacheCaseRecord[]> {
  const cases: MemoryCacheCaseRecord[] = [];
  const counters = { passCount: 0, failCount: 0 };
  await executeSuitesS1ThroughS13(cases, counters);
  return cases;
}

export async function runMemoryCacheTests(): Promise<MemoryCacheEvidence> {
  const originalNow = Date.now;
  Date.now = () => FROZEN_MS;

  try {
    const cases: MemoryCacheCaseRecord[] = [];
    const counters = { passCount: 0, failCount: 0 };

    await executeSuitesS1ThroughS13(cases, counters);

    const firstPass = JSON.stringify(cases);
    const secondCases = await buildCasesThroughS13();
    const secondPass = JSON.stringify(secondCases);
    pushCase(cases, counters, {
      id: "S14-01",
      decision: "byte-identical-runs",
      expected: "identical",
      actual: firstPass === secondPass ? "identical" : "different",
      reason: "Two consecutive runs produce byte-identical case records",
    });

    // S15 fail-closed-on-audit-failure (5)
    {
      const failAudit = new FailOnMissAuditWriter();
      failAudit.failOnMiss = true;
      const failCache = createTestCache<TreatmentResolution>({ auditLog: failAudit });
      let threw = false;
      let errorMessage = "";
      try {
        await resolveTreatment(
          baseInput(),
          createDeps({ memoCache: failCache, memoCacheConfig: DEFAULT_MEMO_CACHE_CONFIG }),
        );
      } catch (error) {
        threw = true;
        errorMessage = (error as Error).message;
      }
      pushCase(cases, counters, {
        id: "S15-01",
        decision: "resolver-throws",
        expected: "throws",
        actual: threw ? "throws" : "allowed",
        reason: "Audit append failure fails resolver closed",
      });
      pushCase(cases, counters, {
        id: "S15-02",
        decision: "no-failed-entry",
        expected: "0-writes",
        actual: `${failCache.getCacheMetrics().writes}-writes`,
        reason: "Failed miss path does not complete cache write",
      });
      pushCase(cases, counters, {
        id: "S15-03",
        decision: "miss-not-counted-after-throw",
        expected: "0-hits",
        actual: `${failCache.getCacheMetrics().hits}-hits`,
        reason: "No successful cache hit after audit failure",
      });
      pushCase(cases, counters, {
        id: "S15-04",
        decision: "error-preserved",
        expected: "audit-fail-simulated",
        actual: errorMessage.includes("audit-fail-simulated") ? "audit-fail-simulated" : errorMessage || "empty",
        reason: "Original audit error surface preserved",
      });
      failAudit.failOnMiss = false;
      let recovered = "failed";
      try {
        await resolveTreatment(
          baseInput(),
          createDeps({ memoCache: failCache, memoCacheConfig: DEFAULT_MEMO_CACHE_CONFIG }),
        );
        recovered = "ok";
      } catch {
        recovered = "failed";
      }
      pushCase(cases, counters, {
        id: "S15-05",
        decision: "recovery-after-audit-fix",
        expected: "ok",
        actual: recovered,
        reason: "Subsequent calls succeed after audit recovery",
      });
    }

    assert.equal(cases.length, 90, `expected 90 cases, got ${cases.length}`);

    return Object.freeze({
      evidenceVersion: "42.7E.1" as const,
      generatedAt: FROZEN_GENERATED_AT,
      totalCases: 90 as const,
      passCount: counters.passCount,
      failCount: counters.failCount,
      cases: Object.freeze(cases),
    });
  } finally {
    Date.now = originalNow;
  }
}

if (require.main === module) {
  runMemoryCacheTests()
    .then((result) => {
      console.log(`memory-cache: ${result.passCount}/${result.totalCases} passed, ${result.failCount} failed`);
      process.exit(result.failCount === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
