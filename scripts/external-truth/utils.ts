/**
 * Phase G7 — external-truth utilities.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const FILINGS_ROOT = join(ROOT, "tests/external-truth/filings");
export const GAP_REGISTER_PATH = join(ROOT, "reports/g7-gap-register.json");
export const MISSING_CORPUS_PATH = join(ROOT, "reports/g7-missing-corpus.json");

export const SEC_USER_AGENT =
  process.env.SEC_EDGAR_USER_AGENT ?? "Advisacor G7 advisacor-external-truth@wisemanft.com";

export function sha256Hex(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export function writeJson(path: string, value: unknown): void {
  ensureDir(dirname(path));
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function filingDir(
  vertical: string,
  framework: string,
  filingId: string,
): string {
  return join(FILINGS_ROOT, vertical, framework, filingId);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RateLimiter {
  private lastAt = 0;

  constructor(private readonly minIntervalMs: number) {}

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastAt;
    if (elapsed < this.minIntervalMs) {
      await sleep(this.minIntervalMs - elapsed);
    }
    this.lastAt = Date.now();
  }
}

export async function fetchWithRetry(
  url: string,
  limiter: RateLimiter,
  init: RequestInit = {},
  maxAttempts = 5,
): Promise<Response> {
  let delayMs = 250;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await limiter.wait();
    const response = await fetch(url, {
      ...init,
      headers: {
        "User-Agent": SEC_USER_AGENT,
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
    });
    if (response.ok) {
      return response;
    }
    if (attempt === maxAttempts) {
      return response;
    }
    await sleep(delayMs);
    delayMs = Math.min(delayMs * 2, 8000);
  }
  throw new Error(`fetchWithRetry exhausted: ${url}`);
}

export function padCik(cik: string | number): string {
  return String(cik).replace(/\D/g, "").padStart(10, "0");
}

export function listFilingDirs(): string[] {
  const out: string[] = [];
  if (!existsSync(FILINGS_ROOT)) {
    return out;
  }
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (existsSync(join(full, "source.json"))) {
          out.push(full);
        } else {
          walk(full);
        }
      }
    }
  };
  walk(FILINGS_ROOT);
  return out.sort();
}

export function nextGapId(register: { gaps: Array<{ id: string }> }): string {
  const nums = register.gaps
    .map((gap) => Number.parseInt(gap.id.replace(/^GAP-/, ""), 10))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `GAP-${String(next).padStart(4, "0")}`;
}
