/**
 * D3 Historical Scanner — runHistoricalScan(firmClientId, opts?).
 *
 * Pages QBO transaction entities over a window (default 730 days), normalizes
 * each into LearnedLine[], feeds three streaming accumulators, flushes them as
 * upserted patterns, and records a scan_run memory at start and completion.
 */
import { randomUUID } from "node:crypto";
import { resolveQBOTokenForFirmClient } from "@/lib/erp/quickbooks/token-resolver";
import { upsertMemory } from "@/lib/memory/client-memory-service";
import { qboQuery, extractQueryEntities } from "@/lib/qbo-rest";
import { normalizeEntity } from "./qbo-line-normalizer";
import { VendorGLAccumulator } from "./accumulators/vendor-gl-accumulator";
import { RecurringAccumulator } from "./accumulators/recurring-accumulator";
import { AmountRangeAccumulator } from "./accumulators/amount-range-accumulator";
import type { Accumulator, TxnType } from "./types";

const ENTITIES: TxnType[] = ["Purchase", "Bill", "JournalEntry", "Invoice", "Deposit"];
const PAGE_SIZE = 1000;
const PAGE_FLOOR_MS = 100;

export interface ScanOptions {
  runId?: string;
  sinceDate?: string; // ISO YYYY-MM-DD
  throughDate?: string; // ISO YYYY-MM-DD
}

export interface ScanResult {
  run_id: string;
  txn_count: number;
  patterns_created: { vendor_gl: number; recurring: number; amount_range: number };
  errors: Array<{ entity: string; startPosition: number; message: string }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function is429(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b429\b/.test(msg) || /too many requests/i.test(msg);
}

function defaultSince(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 730);
  return d.toISOString().slice(0, 10);
}

async function scanEntity(
  entity: TxnType,
  accessToken: string,
  realmId: string,
  since: string,
  through: string | undefined,
  accumulators: Accumulator[],
  errors: ScanResult["errors"],
): Promise<number> {
  let startPosition = 1;
  let txnCount = 0;

  for (;;) {
    const where = `WHERE TxnDate >= '${since}'${through ? ` AND TxnDate <= '${through}'` : ""}`;
    const sql = `SELECT * FROM ${entity} ${where} STARTPOSITION ${startPosition} MAXRESULTS ${PAGE_SIZE}`;

    let rows: Record<string, unknown>[] | null = null;
    try {
      const payload = await qboQuery(accessToken, realmId, sql);
      rows = extractQueryEntities(payload, entity);
    } catch (err) {
      if (is429(err)) {
        await sleep(5000);
        try {
          const payload = await qboQuery(accessToken, realmId, sql);
          rows = extractQueryEntities(payload, entity);
        } catch (retryErr) {
          errors.push({
            entity,
            startPosition,
            message: retryErr instanceof Error ? retryErr.message : String(retryErr),
          });
          break; // skip this page and stop this entity
        }
      } else {
        errors.push({
          entity,
          startPosition,
          message: err instanceof Error ? err.message : String(err),
        });
        break;
      }
    }

    if (!rows || rows.length === 0) break;

    for (const entityRow of rows) {
      const lines = normalizeEntity(entity, entityRow);
      for (const line of lines) {
        for (const acc of accumulators) acc.add(line);
      }
      txnCount += 1;
    }

    if (rows.length < PAGE_SIZE) break;
    startPosition += PAGE_SIZE;
    await sleep(PAGE_FLOOR_MS);
  }

  return txnCount;
}

export async function runHistoricalScan(
  firmClientId: string,
  opts: ScanOptions = {},
): Promise<ScanResult> {
  if (!firmClientId) throw new Error("firmClientId is required");

  const token = await resolveQBOTokenForFirmClient(firmClientId);
  if (!token) throw new Error(`no QBO connection for firm_client ${firmClientId}`);

  const runId = opts.runId ?? randomUUID();
  const since = opts.sinceDate ?? defaultSince();
  const through = opts.throughDate;
  const startedAt = new Date().toISOString();

  const scanRunMemoryId = `mem_${firmClientId}_scan_run_${runId}`;
  await upsertMemory({
    firmClientId,
    memoryType: "scan_run",
    memoryId: scanRunMemoryId,
    payload: {
      run_id: runId,
      started_at: startedAt,
      completed_at: null,
      txn_count: 0,
      patterns_created: {},
      patterns_reinforced: 0,
      source: "historical",
      errors: [],
    },
  });

  const vendorGl = new VendorGLAccumulator();
  const recurring = new RecurringAccumulator();
  const amountRange = new AmountRangeAccumulator();
  const accumulators: Accumulator[] = [vendorGl, recurring, amountRange];
  const errors: ScanResult["errors"] = [];

  // Entities run in parallel (5 < the 10-concurrency ceiling); each pages
  // sequentially with a 100ms floor between pages.
  const counts = await Promise.all(
    ENTITIES.map((entity) =>
      scanEntity(entity, token.accessToken, token.realmId, since, through, accumulators, errors),
    ),
  );
  const txnCount = counts.reduce((s, n) => s + n, 0);

  const vendorFlush = await vendorGl.flush(firmClientId, "history");
  const recurringFlush = await recurring.flush(firmClientId, "history");
  const amountFlush = await amountRange.flush(firmClientId, "history");

  const patternsCreated = {
    vendor_gl: vendorFlush.patterns_written,
    recurring: recurringFlush.patterns_written,
    amount_range: amountFlush.patterns_written,
  };

  await upsertMemory({
    firmClientId,
    memoryType: "scan_run",
    memoryId: scanRunMemoryId,
    payload: {
      run_id: runId,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      txn_count: txnCount,
      patterns_created: patternsCreated,
      patterns_reinforced: 0,
      source: "historical",
      errors,
    },
  });

  return { run_id: runId, txn_count: txnCount, patterns_created: patternsCreated, errors };
}
