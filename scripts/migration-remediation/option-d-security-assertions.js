#!/usr/bin/env node
/**
 * Post-replay security / schema / immutability assertions for Option D.
 * Pure evaluators take query result shapes so they can be unit-tested offline.
 * Listing check names is not execution — harness must call evaluateSecurityBundle.
 */

const REQUIRED_RLS_TABLES = [
  "companies",
  "firms",
  "firm_clients",
  "firm_memberships",
  "subscriptions",
  "entitlements",
  "accounting_connections",
  "journal_entry_executions",
  "si_historical_snapshots",
  "company_memory_records",
];

const REQUIRED_VIEWS_SECURITY_INVOKER = [
  "company_billing_compat",
  "qbo_connections_unified",
];

const REQUIRED_IMMUTABILITY_TRIGGERS = [
  {
    table: "si_historical_snapshots",
    trigger: "prevent_si_snapshot_metadata_mutation",
  },
  {
    table: "si_snapshot_payloads",
    trigger: "prevent_si_snapshot_payload_mutation_when_parent_locked",
  },
  {
    table: "company_memory_records",
    triggerContains: "immut", // name may vary slightly; matched case-insensitively
  },
];

const REQUIRED_FUNCTIONS = [
  "persist_journal_entry_execution_reservation",
  "transition_journal_entry_execution",
];

/**
 * @param {{
 *   tables: Array<{ name: string, exists: boolean, rlsEnabled: boolean }>,
 *   views: Array<{ name: string, exists: boolean, securityInvoker: boolean }>,
 *   triggers: Array<{ table: string, trigger: string }>,
 *   functions: Array<{ name: string, exists: boolean }>,
 * }} evidence
 */
function evaluateFinalSchemaRls(evidence) {
  const failures = [];
  const byName = new Map((evidence.tables || []).map((t) => [t.name, t]));
  for (const name of REQUIRED_RLS_TABLES) {
    const row = byName.get(name);
    if (!row || !row.exists) {
      failures.push({ check: "final_schema_rls", rule: "table_missing", table: name });
      continue;
    }
    if (!row.rlsEnabled) {
      failures.push({ check: "final_schema_rls", rule: "rls_disabled", table: name });
    }
  }
  return { ok: failures.length === 0, failures, requiredCount: REQUIRED_RLS_TABLES.length };
}

function evaluateViewSecurity(evidence) {
  const failures = [];
  const byName = new Map((evidence.views || []).map((v) => [v.name, v]));
  for (const name of REQUIRED_VIEWS_SECURITY_INVOKER) {
    const row = byName.get(name);
    if (!row || !row.exists) {
      failures.push({ check: "view_security", rule: "view_missing", view: name });
      continue;
    }
    if (!row.securityInvoker) {
      failures.push({
        check: "view_security",
        rule: "security_invoker_false",
        view: name,
      });
    }
  }
  return {
    ok: failures.length === 0,
    failures,
    requiredCount: REQUIRED_VIEWS_SECURITY_INVOKER.length,
  };
}

function evaluateImmutability(evidence) {
  const failures = [];
  const triggers = evidence.triggers || [];
  for (const req of REQUIRED_IMMUTABILITY_TRIGGERS) {
    const hit = triggers.some((t) => {
      if (t.table !== req.table) return false;
      if (req.trigger) return t.trigger === req.trigger;
      if (req.triggerContains) {
        return String(t.trigger).toLowerCase().includes(String(req.triggerContains).toLowerCase());
      }
      return false;
    });
    if (!hit) {
      failures.push({
        check: "si_memory_immutability",
        rule: "trigger_missing",
        table: req.table,
        expected: req.trigger || req.triggerContains,
      });
    }
  }
  return {
    ok: failures.length === 0,
    failures,
    requiredCount: REQUIRED_IMMUTABILITY_TRIGGERS.length,
  };
}

function evaluateRequiredFunctions(evidence) {
  const failures = [];
  const byName = new Map((evidence.functions || []).map((f) => [f.name, f]));
  for (const name of REQUIRED_FUNCTIONS) {
    const row = byName.get(name);
    if (!row || !row.exists) {
      failures.push({ check: "required_rpc", rule: "function_missing", function: name });
    }
  }
  return { ok: failures.length === 0, failures };
}

/**
 * Bundle result. Absent evidence sections cannot PASS.
 */
function evaluateSecurityBundle(evidence) {
  if (!evidence || typeof evidence !== "object") {
    return {
      ok: false,
      status: "FAIL",
      reason: "security_evidence_absent",
      failures: [{ rule: "evidence_missing" }],
    };
  }
  for (const key of ["tables", "views", "triggers", "functions"]) {
    if (!Array.isArray(evidence[key])) {
      return {
        ok: false,
        status: "FAIL",
        reason: `security_evidence_missing_${key}`,
        failures: [{ rule: "evidence_section_missing", section: key }],
      };
    }
  }

  const schemaRls = evaluateFinalSchemaRls(evidence);
  const views = evaluateViewSecurity(evidence);
  const immutability = evaluateImmutability(evidence);
  const functions = evaluateRequiredFunctions(evidence);
  const failures = [
    ...schemaRls.failures,
    ...views.failures,
    ...immutability.failures,
    ...functions.failures,
  ];
  const ok = failures.length === 0;
  return {
    ok,
    status: ok ? "PASS" : "FAIL",
    schemaRls,
    views,
    immutability,
    functions,
    failures,
  };
}

/**
 * Collect live evidence (read-only).
 * @param {import('pg').Client} client
 */
async function collectSecurityEvidence(client) {
  const tables = [];
  for (const name of REQUIRED_RLS_TABLES) {
    const res = await client.query(
      `SELECT
         to_regclass('public.' || $1) IS NOT NULL AS exists,
         COALESCE(
           (SELECT c.relrowsecurity
              FROM pg_class c
              JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname = $1),
           false
         ) AS rls_enabled`,
      [name],
    );
    tables.push({
      name,
      exists: !!res.rows[0]?.exists,
      rlsEnabled: !!res.rows[0]?.rls_enabled,
    });
  }

  const views = [];
  for (const name of REQUIRED_VIEWS_SECURITY_INVOKER) {
    const res = await client.query(
      `SELECT
         to_regclass('public.' || $1) IS NOT NULL AS exists,
         COALESCE(
           (
             SELECT ('security_invoker=true' = ANY(c.reloptions))
               FROM pg_class c
               JOIN pg_namespace n ON n.oid = c.relnamespace
              WHERE n.nspname = 'public' AND c.relname = $1 AND c.relkind = 'v'
           ),
           false
         ) AS security_invoker`,
      [name],
    );
    views.push({
      name,
      exists: !!res.rows[0]?.exists,
      securityInvoker: !!res.rows[0]?.security_invoker,
    });
  }

  const trigRes = await client.query(
    `SELECT event_object_table AS table_name, trigger_name
       FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY 1, 2`,
  );
  const triggers = trigRes.rows.map((r) => ({
    table: r.table_name,
    trigger: r.trigger_name,
  }));

  const functions = [];
  for (const name of REQUIRED_FUNCTIONS) {
    const res = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = $1
       ) AS exists`,
      [name],
    );
    functions.push({ name, exists: !!res.rows[0]?.exists });
  }

  return { tables, views, triggers, functions };
}

module.exports = {
  REQUIRED_RLS_TABLES,
  REQUIRED_VIEWS_SECURITY_INVOKER,
  REQUIRED_IMMUTABILITY_TRIGGERS,
  REQUIRED_FUNCTIONS,
  evaluateFinalSchemaRls,
  evaluateViewSecurity,
  evaluateImmutability,
  evaluateRequiredFunctions,
  evaluateSecurityBundle,
  collectSecurityEvidence,
};
