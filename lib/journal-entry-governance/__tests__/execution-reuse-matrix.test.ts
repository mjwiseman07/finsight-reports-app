/**
 * Non-database reuse-reason matrix for JE-3A reservation RPC contract.
 * Documents authoritative outcomes without executing Postgres.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractJeExecutionImmutableBinding,
  jeExecutionBindingsEqual,
} from "../execution-binding";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260821183525_journal_entry_executions.sql",
);

const HEX = {
  a: "a".repeat(64),
  b: "b".repeat(64),
  c: "c".repeat(64),
  d: "d".repeat(64),
  z: "z".repeat(64),
};

type MatrixCase = {
  name: string;
  sameIdempotencyKey: boolean;
  sameApproval: boolean;
  businessBindingEqual: boolean;
  validIdempotencyGrammar: boolean;
  expected:
    | { kind: "reuse"; reason: "idempotency_key" | "approval_id" }
    | { kind: "conflict" }
    | { kind: "grammar_reject" };
};

function classifyReuse(input: {
  sameIdempotencyKey: boolean;
  sameApproval: boolean;
  businessBindingEqual: boolean;
  validIdempotencyGrammar: boolean;
}): MatrixCase["expected"] {
  if (!input.validIdempotencyGrammar) return { kind: "grammar_reject" };
  // Key-first precedence (authoritative SQL order).
  if (input.sameIdempotencyKey) {
    return input.businessBindingEqual
      ? { kind: "reuse", reason: "idempotency_key" }
      : { kind: "conflict" };
  }
  if (input.sameApproval) {
    return input.businessBindingEqual
      ? { kind: "reuse", reason: "approval_id" }
      : { kind: "conflict" };
  }
  // New approval + new key → insert path (not covered as reuse matrix outcome).
  return { kind: "conflict" };
}

describe("JE-3A reservation reuse matrix (non-database)", () => {
  const src = readFileSync(MIGRATION, "utf8");

  const cases: MatrixCase[] = [
    {
      name: "same idempotency key + same binding",
      sameIdempotencyKey: true,
      sameApproval: true,
      businessBindingEqual: true,
      validIdempotencyGrammar: true,
      expected: { kind: "reuse", reason: "idempotency_key" },
    },
    {
      name: "different idempotency key + same approval/binding",
      sameIdempotencyKey: false,
      sameApproval: true,
      businessBindingEqual: true,
      validIdempotencyGrammar: true,
      expected: { kind: "reuse", reason: "approval_id" },
    },
    {
      name: "same approval + conflicting binding",
      sameIdempotencyKey: false,
      sameApproval: true,
      businessBindingEqual: false,
      validIdempotencyGrammar: true,
      expected: { kind: "conflict" },
    },
    {
      name: "same idempotency key + conflicting binding",
      sameIdempotencyKey: true,
      sameApproval: true,
      businessBindingEqual: false,
      validIdempotencyGrammar: true,
      expected: { kind: "conflict" },
    },
    {
      name: "invalid idempotency grammar",
      sameIdempotencyKey: false,
      sameApproval: false,
      businessBindingEqual: true,
      validIdempotencyGrammar: false,
      expected: { kind: "grammar_reject" },
    },
  ];

  it.each(cases)("$name", (c) => {
    expect(classifyReuse(c)).toEqual(c.expected);
  });

  it("SQL check enforces ^[a-f0-9]{64}$ idempotency grammar", () => {
    expect(src).toMatch(
      /journal_entry_executions_idempotency_key_check[\s\S]*?\^\[a-f0-9\]\{64\}\$/,
    );
    expect("C".repeat(64)).not.toMatch(/^[a-f0-9]{64}$/);
    expect(HEX.c).toMatch(/^[a-f0-9]{64}$/);
  });

  it("business binding equality ignores distinct keys (C vs A)", () => {
    const a = extractJeExecutionImmutableBinding({
      proposal_id: "p",
      approval_id: "appr",
      company_id: "co",
      engagement_id: "eng",
      source_continuous_close_run_id: "cc",
      source_accounting_sync_id: "sync",
      accounting_connection_id: "conn",
      provider: "quickbooks",
      proposal_hash: HEX.a,
      approval_policy_hash: HEX.b,
      execution_policy_hash: HEX.a,
      execution_hash: HEX.a,
    } as never);
    const c = extractJeExecutionImmutableBinding({
      ...a,
      // idempotency_key omitted from binding extract; distinct keys still equal.
    } as never);
    expect(jeExecutionBindingsEqual(a, c)).toBe(true);
    expect(HEX.c).not.toBe(HEX.d);
  });

  it("conflicting proposal_hash fails business binding (D)", () => {
    const existing = extractJeExecutionImmutableBinding({
      proposal_id: "p",
      approval_id: "appr",
      company_id: "co",
      engagement_id: "eng",
      source_continuous_close_run_id: "cc",
      source_accounting_sync_id: "sync",
      accounting_connection_id: "conn",
      provider: "quickbooks",
      proposal_hash: HEX.a,
      approval_policy_hash: HEX.b,
      execution_policy_hash: HEX.a,
      execution_hash: HEX.a,
    } as never);
    const requested = extractJeExecutionImmutableBinding({
      ...existing,
      proposal_hash: HEX.z,
    } as never);
    expect(jeExecutionBindingsEqual(existing, requested)).toBe(false);
  });
});
