import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { realClock } from "../../resolver/memory/ttl-clock";
import type { Clock } from "../../resolver/memory/ttl-clock";
import { FileAppendAuditLogWriter } from "../FileAppendAuditLogWriter";
import { hashAuditEntryBase, verifyAuditChain } from "../hash-chain";
import { InMemoryAuditLogWriter } from "../InMemoryAuditLogWriter";
import { redactPayload } from "../redaction";
import { DEFAULT_RETENTION_POLICY, validateRetentionPolicy } from "../retention-policy";
import type { AuditEntry, AuditEntryPartial, ActorRef } from "../types";

const FROZEN_GENERATED_AT = "2026-06-24T00:00:00Z";
const FROZEN_MS = new Date(FROZEN_GENERATED_AT).getTime();

const SYSTEM_ACTOR: ActorRef = {
  kind: "system",
  id: "audit-test",
  via: "direct-api",
};

export interface AuditLogCaseRecord {
  readonly id: string;
  readonly decision: string;
  readonly expected: string;
  readonly outcome: string;
  readonly reason: string;
}

export interface AuditLogEvidence {
  readonly evidenceVersion: "42.7E.1";
  readonly generatedAt: string;
  readonly totalCases: 41;
  readonly passCount: number;
  readonly failCount: number;
  readonly cases: readonly AuditLogCaseRecord[];
}

function pushCase(
  cases: AuditLogCaseRecord[],
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

function samplePartial(kind: AuditEntryPartial["kind"] = "cache.hit"): AuditEntryPartial {
  return {
    kind,
    actor: SYSTEM_ACTOR,
    subject: { orgId: "org-test" },
    payload: { note: "test" },
  };
}

function tempAuditDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "audit-log-test-"));
}

function buildInMemoryEntries(count: number): readonly AuditEntry[] {
  const writer = new InMemoryAuditLogWriter();
  for (let index = 0; index < count; index += 1) {
    writer.append({
      kind: "cache.miss",
      actor: SYSTEM_ACTOR,
      subject: { orgId: `org-${index}` },
      payload: { index },
    });
  }
  return writer.getEntries();
}

async function executeSuitesA1ThroughA9(
  cases: AuditLogCaseRecord[],
  counters: { passCount: number; failCount: number },
): Promise<void> {
  // A1 hash-chain-integrity (6)
  {
    const entries = buildInMemoryEntries(3);
    pushCase(cases, counters, {
      id: "A1-01",
      decision: "chain-valid",
      expected: "valid",
      actual: verifyAuditChain(entries) ? "valid" : "invalid",
      reason: "Three-entry chain verifies",
    });
    pushCase(cases, counters, {
      id: "A1-02",
      decision: "genesis-first",
      expected: "GENESIS",
      actual: entries[0]?.prevHash ?? "missing",
      reason: "First entry prevHash is GENESIS",
    });
    const tampered = [...entries];
    tampered[1] = Object.freeze({
      ...tampered[1]!,
      payload: Object.freeze({ tampered: true }),
    });
    pushCase(cases, counters, {
      id: "A1-03",
      decision: "tampered-entry",
      expected: "invalid",
      actual: verifyAuditChain(tampered) ? "valid" : "invalid",
      reason: "Tampered payload fails verifier",
    });
    const missing = entries.slice(0, 2);
    pushCase(cases, counters, {
      id: "A1-04",
      decision: "missing-entry",
      expected: "valid",
      actual: verifyAuditChain(missing) ? "valid" : "invalid",
      reason: "Prefix chain still valid",
    });
    const reordered = [entries[1]!, entries[0]!, entries[2]!];
    pushCase(cases, counters, {
      id: "A1-05",
      decision: "reordered",
      expected: "invalid",
      actual: verifyAuditChain(reordered) ? "valid" : "invalid",
      reason: "Reordered entries fail verifier",
    });
    const truncated = entries.slice(0, 1);
    const brokenLink = Object.freeze({
      ...entries[1]!,
      prevHash: "WRONG",
    });
    pushCase(cases, counters, {
      id: "A1-06",
      decision: "broken-prev-hash",
      expected: "invalid",
      actual: verifyAuditChain([...truncated, brokenLink]) ? "valid" : "invalid",
      reason: "Broken prevHash fails verifier",
    });
  }

  // A2 file-append-write (8)
  {
    const dir = tempAuditDir();
    const clock = createFakeClock();
    const writer = new FileAppendAuditLogWriter({
      baseDir: dir,
      clock,
      retentionPolicy: DEFAULT_RETENTION_POLICY,
      hostname: "test-host",
    });
    writer.append(samplePartial("cache.write"));
    writer.append(samplePartial("cache.miss"));
    const filePath = path.join(dir, "audit-2026-06-24-test-host.jsonl");
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.trim().split("\n");
    pushCase(cases, counters, {
      id: "A2-01",
      decision: "line-count",
      expected: "2",
      actual: String(lines.length),
      reason: "One JSONL line per append",
    });
    pushCase(cases, counters, {
      id: "A2-02",
      decision: "newline-terminated",
      expected: "yes",
      actual: content.endsWith("\n") ? "yes" : "no",
      reason: "File ends with newline",
    });
    pushCase(cases, counters, {
      id: "A2-03",
      decision: "valid-json-lines",
      expected: "all-valid",
      actual: lines.every((line) => {
        try {
          JSON.parse(line);
          return true;
        } catch {
          return false;
        }
      })
        ? "all-valid"
        : "invalid",
      reason: "Each line parses as JSON",
    });
    writer.append(samplePartial("cache.hit"));
    const afterThird = fs.readFileSync(filePath, "utf8").trim().split("\n");
    pushCase(cases, counters, {
      id: "A2-04",
      decision: "append-atomicity",
      expected: "3",
      actual: String(afterThird.length),
      reason: "Sequential appends produce discrete lines (no interleave)",
    });
    let flushOk = "failed";
    try {
      await writer.flush();
      flushOk = "ok";
    } catch {
      flushOk = "failed";
    }
    pushCase(cases, counters, {
      id: "A2-05",
      decision: "flush",
      expected: "ok",
      actual: flushOk,
      reason: "flush completes without error",
    });
    const restartWriter = new FileAppendAuditLogWriter({
      baseDir: dir,
      clock,
      retentionPolicy: DEFAULT_RETENTION_POLICY,
      hostname: "test-host",
    });
    pushCase(cases, counters, {
      id: "A2-06",
      decision: "restart-readable",
      expected: "3",
      actual: String(restartWriter.state().totalEntries),
      reason: "Recovered entry count after restart",
    });
    pushCase(cases, counters, {
      id: "A2-07",
      decision: "head-hash-recovered",
      expected: "non-genesis",
      actual: restartWriter.headHash() === "GENESIS" ? "genesis" : "non-genesis",
      reason: "headHash recovered from existing file",
    });
    pushCase(cases, counters, {
      id: "A2-08",
      decision: "chain-after-restart",
      expected: "valid",
      actual: verifyAuditChain(
        fs
          .readFileSync(filePath, "utf8")
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line) as AuditEntry),
      )
        ? "valid"
        : "invalid",
      reason: "On-disk chain verifies after restart",
    });
  }

  // A3 daily-rotation (5)
  {
    const dir = tempAuditDir();
    const clock = createFakeClock(FROZEN_MS);
    const writer = new FileAppendAuditLogWriter({
      baseDir: dir,
      clock,
      retentionPolicy: DEFAULT_RETENTION_POLICY,
      hostname: "rotate-host",
    });
    writer.append(samplePartial("cache.write"));
    clock.advance(24 * 60 * 60 * 1000);
    writer.append(samplePartial("cache.hit"));
    const day1 = path.join(dir, "audit-2026-06-24-rotate-host.jsonl");
    const day2 = path.join(dir, "audit-2026-06-25-rotate-host.jsonl");
    pushCase(cases, counters, {
      id: "A3-01",
      decision: "two-files",
      expected: "both-exist",
      actual: fs.existsSync(day1) && fs.existsSync(day2) ? "both-exist" : "missing",
      reason: "UTC date change creates new file",
    });
    const day1Lines = fs.readFileSync(day1, "utf8").trim().split("\n");
    const lastDay1 = JSON.parse(day1Lines[day1Lines.length - 1]!) as AuditEntry;
    pushCase(cases, counters, {
      id: "A3-02",
      decision: "continuity-end",
      expected: "cache.dispose",
      actual: lastDay1.kind,
      reason: "Old file ends with rotation marker",
    });
    const day2Lines = fs.readFileSync(day2, "utf8").trim().split("\n");
    const firstDay2 = JSON.parse(day2Lines[0]!) as AuditEntry;
    pushCase(cases, counters, {
      id: "A3-03",
      decision: "continuity-start",
      expected: "cache.dispose",
      actual: firstDay2.kind,
      reason: "New file starts with rotation marker",
    });
    pushCase(cases, counters, {
      id: "A3-04",
      decision: "chain-spans-rotation",
      expected: "valid",
      actual: verifyAuditChain([
        ...day1Lines.map((line) => JSON.parse(line) as AuditEntry),
        ...day2Lines.map((line) => JSON.parse(line) as AuditEntry),
      ])
        ? "valid"
        : "invalid",
      reason: "Hash chain continuous across rotation entries",
    });
    pushCase(cases, counters, {
      id: "A3-05",
      decision: "filename-format",
      expected: "audit-YYYY-MM-DD-hostname.jsonl",
      actual: path.basename(day2).match(/^audit-\d{4}-\d{2}-\d{2}-rotate-host\.jsonl$/)
        ? "audit-YYYY-MM-DD-hostname.jsonl"
        : "bad-format",
      reason: "Rotated filename matches pattern",
    });
  }

  // A4 redaction (8)
  {
    const payload = {
      email: "user@example.com",
      ssn: "123-45-6789",
      note: "x".repeat(300),
      nested: { phone: "555-123-4567", ok: 1 },
      innocuous: "123-45-6789",
      empty: undefined,
    };
    const original = JSON.stringify(payload);
    const redacted = redactPayload(payload) as Record<string, unknown>;
    pushCase(cases, counters, {
      id: "A4-01",
      decision: "email-hashed",
      expected: "hashed",
      actual: typeof redacted.email === "string" && redacted.email !== "user@example.com" ? "hashed" : "plain",
      reason: "email field redacted",
    });
    pushCase(cases, counters, {
      id: "A4-02",
      decision: "ssn-hashed",
      expected: "hashed",
      actual: typeof redacted.ssn === "string" && redacted.ssn !== "123-45-6789" ? "hashed" : "plain",
      reason: "ssn field redacted",
    });
    pushCase(cases, counters, {
      id: "A4-03",
      decision: "long-truncated",
      expected: "truncated",
      actual: typeof redacted.note === "string" && redacted.note.includes("…") ? "truncated" : "full",
      reason: "Long strings truncated",
    });
    pushCase(cases, counters, {
      id: "A4-04",
      decision: "nested-walked",
      expected: "hashed",
      actual:
        typeof (redacted.nested as Record<string, unknown>).phone === "string" &&
        (redacted.nested as Record<string, unknown>).phone !== "555-123-4567"
          ? "hashed"
          : "plain",
      reason: "Nested sensitive fields redacted",
    });
    const deep: Record<string, unknown> = { level: 0 };
    let cursor = deep;
    for (let depth = 0; depth < 12; depth += 1) {
      const next: Record<string, unknown> = { level: depth + 1 };
      cursor.child = next;
      cursor = next;
    }
    const deepRedacted = redactPayload(deep) as Record<string, unknown>;
    let node: Record<string, unknown> = deepRedacted;
    let hitLimit = false;
    for (let depth = 0; depth < 12; depth += 1) {
      if (node.child && typeof node.child === "object" && "@truncated" in (node.child as object)) {
        hitLimit = true;
        break;
      }
      node = node.child as Record<string, unknown>;
    }
    pushCase(cases, counters, {
      id: "A4-05",
      decision: "depth-limit",
      expected: "truncated",
      actual: hitLimit ? "truncated" : "no-limit",
      reason: "Depth limit honored",
    });
    pushCase(cases, counters, {
      id: "A4-06",
      decision: "ssn-regex-in-innocuous-field",
      expected: "hashed",
      actual: typeof redacted.innocuous === "string" && redacted.innocuous !== "123-45-6789" ? "hashed" : "plain",
      reason: "SSN pattern caught in innocuous field name",
    });
    pushCase(cases, counters, {
      id: "A4-07",
      decision: "undefined-to-null",
      expected: "null",
      actual: redacted.empty === null ? "null" : String(redacted.empty),
      reason: "undefined becomes null",
    });
    pushCase(cases, counters, {
      id: "A4-08",
      decision: "original-unmutated",
      expected: "unchanged",
      actual: JSON.stringify(payload) === original ? "unchanged" : "mutated",
      reason: "Original payload not mutated",
    });
  }

  // A5 in-memory-writer-prod-guard (2)
  {
    const mutableEnv = process.env as Record<string, string | undefined>;
    const savedEnv = mutableEnv.NODE_ENV;
    mutableEnv.NODE_ENV = "production";
    let prodThrows = false;
    try {
      // eslint-disable-next-line no-new
      new InMemoryAuditLogWriter();
    } catch {
      prodThrows = true;
    }
    if (savedEnv === undefined) {
      delete mutableEnv.NODE_ENV;
    } else {
      mutableEnv.NODE_ENV = savedEnv;
    }
    pushCase(cases, counters, {
      id: "A5-01",
      decision: "prod-guard",
      expected: "throws",
      actual: prodThrows ? "throws" : "allowed",
      reason: "InMemoryAuditLogWriter forbidden in production",
    });
    let devOk = false;
    try {
      const writer = new InMemoryAuditLogWriter();
      writer.append(samplePartial());
      devOk = writer.state().totalEntries === 1;
    } catch {
      devOk = false;
    }
    pushCase(cases, counters, {
      id: "A5-02",
      decision: "dev-safe",
      expected: "ok",
      actual: devOk ? "ok" : "failed",
      reason: "InMemoryAuditLogWriter works in test/dev",
    });
  }

  // A6 retention-policy (4)
  {
    pushCase(cases, counters, {
      id: "A6-01",
      decision: "min-days-floor",
      expected: "365",
      actual: String(DEFAULT_RETENTION_POLICY.minDays),
      reason: "minDays floor is 365",
    });
    let validOk = "failed";
    try {
      validateRetentionPolicy(DEFAULT_RETENTION_POLICY);
      validOk = "ok";
    } catch {
      validOk = "failed";
    }
    pushCase(cases, counters, {
      id: "A6-02",
      decision: "default-valid",
      expected: "ok",
      actual: validOk,
      reason: "Default retention policy validates",
    });
    let belowFloorThrows = false;
    try {
      validateRetentionPolicy({
        ...DEFAULT_RETENTION_POLICY,
        soc1Days: 100,
      });
    } catch {
      belowFloorThrows = true;
    }
    pushCase(cases, counters, {
      id: "A6-03",
      decision: "below-floor-rejected",
      expected: "throws",
      actual: belowFloorThrows ? "throws" : "allowed",
      reason: "soc1Days below minDays rejected",
    });
    pushCase(cases, counters, {
      id: "A6-04",
      decision: "purge-default",
      expected: "false",
      actual: String(DEFAULT_RETENTION_POLICY.purgeAllowed),
      reason: "purgeAllowed defaults false",
    });
  }

  // A7 actor-required (4)
  {
    const writer = new InMemoryAuditLogWriter();
    let missingActorThrows = false;
    try {
      writer.append({
        kind: "cache.miss",
        actor: { kind: "system", id: "", via: "direct-api" },
        subject: {},
        payload: {},
      });
    } catch {
      missingActorThrows = true;
    }
    pushCase(cases, counters, {
      id: "A7-01",
      decision: "actor-id-required",
      expected: "throws",
      actual: missingActorThrows ? "throws" : "allowed",
      reason: "Empty actor.id rejected",
    });
    let badKindThrows = false;
    try {
      writer.append({
        kind: "cache.miss",
        actor: { kind: "bot" as ActorRef["kind"], id: "x", via: "direct-api" },
        subject: {},
        payload: {},
      });
    } catch {
      badKindThrows = true;
    }
    pushCase(cases, counters, {
      id: "A7-02",
      decision: "actor-kind-validated",
      expected: "throws",
      actual: badKindThrows ? "throws" : "allowed",
      reason: "Invalid actor.kind rejected",
    });
    let badViaThrows = false;
    try {
      writer.append({
        kind: "cache.miss",
        actor: { kind: "system", id: "x", via: "unknown" as ActorRef["via"] },
        subject: {},
        payload: {},
      });
    } catch {
      badViaThrows = true;
    }
    pushCase(cases, counters, {
      id: "A7-03",
      decision: "actor-via-validated",
      expected: "throws",
      actual: badViaThrows ? "throws" : "allowed",
      reason: "Invalid actor.via rejected",
    });
    let validOk = false;
    try {
      writer.append(samplePartial());
      validOk = true;
    } catch {
      validOk = false;
    }
    pushCase(cases, counters, {
      id: "A7-04",
      decision: "valid-actor",
      expected: "ok",
      actual: validOk ? "ok" : "failed",
      reason: "Valid actor accepted",
    });
  }

  // A9 recovery (3)
  {
    const dir = tempAuditDir();
    const filePath = path.join(dir, "audit-2026-06-24-recover-host.jsonl");
    fs.mkdirSync(dir, { recursive: true });
    const goodLine = JSON.stringify({
      sequenceNumber: 1,
      timestampMs: FROZEN_MS,
      timestampISO: FROZEN_GENERATED_AT,
      kind: "cache.write",
      actor: SYSTEM_ACTOR,
      subject: {},
      payload: {},
      prevHash: "GENESIS",
      entryHash: "abc123",
      schemaVersion: "42.7E.1",
      complianceClass: "SOC1+SOC2-T2+HIPAA",
    });
    fs.writeFileSync(filePath, `${goodLine}\n{partial`, "utf8");
    const partialWriter = new FileAppendAuditLogWriter({
      baseDir: dir,
      clock: createFakeClock(),
      retentionPolicy: DEFAULT_RETENTION_POLICY,
      hostname: "recover-host",
    });
    pushCase(cases, counters, {
      id: "A9-01",
      decision: "partial-last-line",
      expected: "GENESIS",
      actual: partialWriter.headHash(),
      reason: "Corrupted trailing line → GENESIS recovery",
    });

    const emptyDir = tempAuditDir();
    const emptyWriter = new FileAppendAuditLogWriter({
      baseDir: emptyDir,
      clock: createFakeClock(),
      retentionPolicy: DEFAULT_RETENTION_POLICY,
      hostname: "empty-host",
    });
    pushCase(cases, counters, {
      id: "A9-02",
      decision: "empty-file",
      expected: "GENESIS",
      actual: emptyWriter.headHash(),
      reason: "Empty/missing file starts at GENESIS",
    });

    const missingDir = path.join(os.tmpdir(), `audit-missing-${process.pid}-${Date.now()}`);
    const missingWriter = new FileAppendAuditLogWriter({
      baseDir: missingDir,
      clock: createFakeClock(),
      retentionPolicy: DEFAULT_RETENTION_POLICY,
      hostname: "mkdir-host",
    });
    pushCase(cases, counters, {
      id: "A9-03",
      decision: "missing-directory",
      expected: "created",
      actual: fs.existsSync(missingDir) ? "created" : "missing",
      reason: "Constructor creates baseDir",
    });
    missingWriter.append(samplePartial());
  }
}

async function buildCasesThroughA7A9(): Promise<AuditLogCaseRecord[]> {
  const cases: AuditLogCaseRecord[] = [];
  const counters = { passCount: 0, failCount: 0 };
  await executeSuitesA1ThroughA9(cases, counters);
  return cases;
}

export async function runAuditLogTests(): Promise<AuditLogEvidence> {
  const originalNow = Date.now;
  Date.now = () => FROZEN_MS;

  try {
    const cases: AuditLogCaseRecord[] = [];
    const counters = { passCount: 0, failCount: 0 };

    await executeSuitesA1ThroughA9(cases, counters);

    const firstPass = JSON.stringify(cases);
    const secondCases = await buildCasesThroughA7A9();
    const secondPass = JSON.stringify(secondCases);
    pushCase(cases, counters, {
      id: "A8-01",
      decision: "byte-identical-runs",
      expected: "identical",
      actual: firstPass === secondPass ? "identical" : "different",
      reason: "Two consecutive runs produce byte-identical case records",
    });

    assert.equal(cases.length, 41, `expected 41 cases, got ${cases.length}`);

    return Object.freeze({
      evidenceVersion: "42.7E.1" as const,
      generatedAt: FROZEN_GENERATED_AT,
      totalCases: 41 as const,
      passCount: counters.passCount,
      failCount: counters.failCount,
      cases: Object.freeze(cases),
    });
  } finally {
    Date.now = originalNow;
  }
}

if (require.main === module) {
  runAuditLogTests()
    .then((result) => {
      console.log(`audit-log: ${result.passCount}/${result.totalCases} passed, ${result.failCount} failed`);
      process.exit(result.failCount === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
