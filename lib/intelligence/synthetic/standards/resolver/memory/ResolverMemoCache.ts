import type { AuditLogWriter } from "../../audit/types";
import { redactCacheKey } from "../../audit/redaction";
import { LRUMap } from "./lru-map";
import type { Clock } from "./ttl-clock";
import type {
  ActorRef,
  CacheEntry,
  CacheKey,
  CacheMetrics,
  ResolverInternalKey,
  ResolverMemoCache,
  ResolverMemoCacheConfig,
  TenantClassifier,
} from "./types";
import { RESOLVER_INTERNAL } from "./types";

export interface ResolverMemoCacheDeps<V> {
  readonly config: ResolverMemoCacheConfig;
  readonly clock: Clock;
  readonly auditLog: AuditLogWriter;
  readonly tenantClassifier: TenantClassifier;
}

const SYSTEM_ACTOR: ActorRef = {
  kind: "system",
  id: "resolver-memo-cache",
  via: "direct-api",
};

export class DefaultResolverMemoCache<V> implements ResolverMemoCache<V> {
  private readonly standardMap: LRUMap<CacheKey, CacheEntry<V>>;
  private readonly phiMap: LRUMap<CacheKey, CacheEntry<V>>;
  private readonly metrics = {
    hits: 0,
    misses: 0,
    writes: 0,
    evictionsLRU: 0,
    evictionsTTL: 0,
    invalidationsOrg: 0,
    purgesPHI: 0,
  };
  private approxBytes = 0;
  private disposed = false;

  constructor(private readonly deps: ResolverMemoCacheDeps<V>) {
    const cfg = deps.config;
    if (cfg.maxSize > cfg.hardCeilingSize) {
      throw new Error("maxSize exceeds hard ceiling");
    }
    if (cfg.standardTTLMs > cfg.hardCeilingTTLMs) {
      throw new Error("standard TTL exceeds hard ceiling");
    }
    if (cfg.phiCoveredTTLMs > cfg.hardCeilingTTLMs) {
      throw new Error("phi TTL exceeds hard ceiling");
    }
    this.standardMap = new LRUMap(cfg.maxSize);
    this.phiMap = new LRUMap(Math.max(100, Math.floor(cfg.maxSize / 4)));
  }

  get(key: CacheKey, _gate: ResolverInternalKey): CacheEntry<V> | null {
    if (_gate !== RESOLVER_INTERNAL) {
      throw new Error("unauthorized cache access");
    }
    const target = this.pickMap(key);
    const entry = target.get(key);
    const now = this.deps.clock.nowMs();
    if (!entry) {
      this.metrics.misses += 1;
      this.deps.auditLog.append(this.miss(key, now));
      return null;
    }
    if (entry.expiresAt <= now) {
      target.delete(key);
      this.metrics.evictionsTTL += 1;
      this.metrics.misses += 1;
      this.deps.auditLog.append(this.ttlEvict(key, entry, now));
      return null;
    }
    this.metrics.hits += 1;
    this.deps.auditLog.append(this.hit(key, entry, now));
    return entry;
  }

  set(key: CacheKey, entry: CacheEntry<V>, _gate: ResolverInternalKey): void {
    if (_gate !== RESOLVER_INTERNAL) {
      throw new Error("unauthorized cache access");
    }
    const target = this.pickMap(key);
    const evicted = target.set(key, entry);
    this.metrics.writes += 1;
    this.approxBytes += JSON.stringify(entry.value).length;
    if (evicted !== null) {
      this.metrics.evictionsLRU += 1;
      this.deps.auditLog.append({
        kind: "cache.evict.lru",
        actor: SYSTEM_ACTOR,
        subject: { cacheKeyRedacted: redactCacheKey(evicted) },
        payload: { cacheKeyRedacted: redactCacheKey(evicted) },
      });
    }
    this.deps.auditLog.append(this.write(key, entry, this.deps.clock.nowMs(), evicted !== null));
  }

  invalidateOrg(orgId: string, reason: string, actor: ActorRef): number {
    let count = 0;
    for (const map of [this.standardMap, this.phiMap]) {
      for (const k of [...map.keys()]) {
        if (k.includes(`h=${orgId}`)) {
          map.delete(k);
          count += 1;
        }
      }
    }
    this.metrics.invalidationsOrg += 1;
    this.deps.auditLog.append(this.invalidate(orgId, count, reason, actor, this.deps.clock.nowMs()));
    return count;
  }

  purgePHIForTenant(tenantId: string, reason: string, actor: ActorRef): number {
    let count = 0;
    for (const k of [...this.phiMap.keys()]) {
      if (k.includes(`h=${tenantId}`)) {
        this.phiMap.delete(k);
        count += 1;
      }
    }
    this.metrics.purgesPHI += 1;
    this.deps.auditLog.append(this.purge(tenantId, count, reason, actor, this.deps.clock.nowMs()));
    return count;
  }

  getCacheMetrics(): CacheMetrics {
    return Object.freeze({
      ...this.metrics,
      currentSize: this.standardMap.size() + this.phiMap.size(),
      currentSizePHI: this.phiMap.size(),
      approxBytes: this.approxBytes,
    });
  }

  async dispose(): Promise<void> {
    if (!this.disposed) {
      this.deps.auditLog.append({
        kind: "cache.dispose",
        actor: SYSTEM_ACTOR,
        subject: {},
        payload: { metrics: { ...this.metrics } },
      });
      this.disposed = true;
      this.approxBytes = 0;
    }
    await this.deps.auditLog.flush();
  }

  private pickMap(key: CacheKey): LRUMap<CacheKey, CacheEntry<V>> {
    return key.includes("c=phi-covered") ? this.phiMap : this.standardMap;
  }

  private hit(k: CacheKey, e: CacheEntry<V>, now: number) {
    return {
      kind: "cache.hit" as const,
      actor: SYSTEM_ACTOR,
      subject: {
        framework: e.framework,
        electionFingerprint: e.electionFingerprint,
        cacheKeyRedacted: redactCacheKey(k),
      },
      payload: { writtenAt: e.writtenAt, expiresAt: e.expiresAt, now },
    };
  }

  private miss(k: CacheKey, now: number) {
    return {
      kind: "cache.miss" as const,
      actor: SYSTEM_ACTOR,
      subject: { cacheKeyRedacted: redactCacheKey(k) },
      payload: { now },
    };
  }

  private ttlEvict(k: CacheKey, e: CacheEntry<V>, now: number) {
    return {
      kind: "cache.evict.ttl" as const,
      actor: SYSTEM_ACTOR,
      subject: {
        framework: e.framework,
        cacheKeyRedacted: redactCacheKey(k),
      },
      payload: { writtenAt: e.writtenAt, expiresAt: e.expiresAt, now },
    };
  }

  private write(k: CacheKey, e: CacheEntry<V>, now: number, evicted: boolean) {
    return {
      kind: "cache.write" as const,
      actor: SYSTEM_ACTOR,
      subject: {
        framework: e.framework,
        electionFingerprint: e.electionFingerprint,
        cacheKeyRedacted: redactCacheKey(k),
      },
      payload: { writtenAt: e.writtenAt, expiresAt: e.expiresAt, now, evicted },
    };
  }

  private invalidate(orgId: string, count: number, reason: string, actor: ActorRef, now: number) {
    return {
      kind: "cache.invalidate.org" as const,
      actor,
      subject: { orgId },
      payload: { count, reason, now },
    };
  }

  private purge(tenantId: string, count: number, reason: string, actor: ActorRef, now: number) {
    return {
      kind: "cache.purge.phi" as const,
      actor,
      subject: { tenantId },
      payload: { count, reason, now },
    };
  }
}
