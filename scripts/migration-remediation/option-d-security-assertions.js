#!/usr/bin/env node
/**
 * Post-replay security / schema / immutability assertions for Option D.
 *
 * Immutability requires:
 *   1) exact trigger name + table + enabled + UPDATE/DELETE events
 *   2) rollback-isolated behavioral probes proving prohibited mutations fail
 * Loose substring matches (e.g. "immut") are not accepted.
 */
const crypto = require("crypto");

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

/** Exact trigger bindings — no substring matching. */
const REQUIRED_IMMUTABILITY_TRIGGERS = [
  {
    table: "si_historical_snapshots",
    trigger: "prevent_si_snapshot_metadata_mutation",
    events: ["UPDATE", "DELETE"],
  },
  {
    table: "si_snapshot_payloads",
    trigger: "prevent_si_snapshot_payload_mutation_when_parent_locked",
    events: ["UPDATE", "DELETE"],
  },
  {
    table: "company_memory_records",
    trigger: "prevent_company_memory_record_unsafe_mutation",
    events: ["UPDATE", "DELETE"],
  },
];

const REQUIRED_BEHAVIORAL_PROBES = [
  "si_finalized_metadata_update_rejected",
  "si_finalized_metadata_delete_rejected",
  "si_locked_payload_update_rejected",
  "memory_immutable_field_update_rejected",
  "memory_delete_rejected",
];

/**
 * Expectations derived from actual RAISE EXCEPTION text in:
 *   - 20260603_harden_si_snapshot_immutability.sql
 *   - 20260605_harden_company_memory_persistence_immutability.sql
 * Bare RAISE EXCEPTION uses SQLSTATE P0001 (raise_exception).
 */
const PROBE_EXPECTATIONS = {
  si_finalized_metadata_update_rejected: {
    sqlState: "P0001",
    messageIncludes:
      "Finalized SI snapshot metadata only allows transition to superseded with superseded_by_snapshot_id and updated_at",
  },
  si_finalized_metadata_delete_rejected: {
    sqlState: "P0001",
    messageIncludes: "SI snapshot metadata is immutable once finalized or superseded",
  },
  si_locked_payload_update_rejected: {
    sqlState: "P0001",
    messageIncludes:
      "SI snapshot child rows are immutable when parent snapshot is finalized or superseded",
  },
  memory_immutable_field_update_rejected: {
    sqlState: "P0001",
    messageIncludes: "Company memory immutable record fields cannot be changed after insert",
  },
  memory_delete_rejected: {
    sqlState: "P0001",
    messageIncludes:
      "Company memory records cannot be deleted without a future approved compliance workflow",
  },
};

/** SQLSTATEs that prove infra/txn failure — never count as immutability PASS. */
const NON_IMMUTABILITY_SQLSTATES = new Set([
  "25P02", // in_failed_sql_transaction
  "25P01", // no_active_sql_transaction
  "42501", // insufficient_privilege
  "42P01", // undefined_table
  "42703", // undefined_column
  "42601", // syntax_error
  "23503", // foreign_key_violation
  "23505", // unique_violation
  "23502", // not_null_violation
  "08000", // connection_exception
  "08003", // connection_does_not_exist
  "08006", // connection_failure
  "57P01", // admin_shutdown
  "57014", // query_canceled
  "53200", // out_of_memory
]);

const REQUIRED_FUNCTIONS = [
  "persist_journal_entry_execution_reservation",
  "transition_journal_entry_execution",
];

/**
 * Classify a caught DB error as intended immutability rejection or unrelated failure.
 * @param {{ code?: string, message?: string }|null|undefined} err
 * @param {{ sqlState: string, messageIncludes: string }} expectation
 */
function classifyProbeError(err, expectation) {
  const sqlState = err && err.code ? String(err.code) : null;
  const message = err && err.message ? String(err.message) : "";

  if (!sqlState) {
    return {
      intendedImmutabilityRejection: false,
      reason: "missing_sqlstate",
      sqlState: null,
      message: message.slice(0, 300),
    };
  }
  if (NON_IMMUTABILITY_SQLSTATES.has(sqlState)) {
    return {
      intendedImmutabilityRejection: false,
      reason: "non_immutability_sqlstate",
      sqlState,
      message: message.slice(0, 300),
    };
  }
  if (sqlState !== expectation.sqlState) {
    return {
      intendedImmutabilityRejection: false,
      reason: "sqlstate_mismatch",
      sqlState,
      expectedSqlState: expectation.sqlState,
      message: message.slice(0, 300),
    };
  }
  if (!message.includes(expectation.messageIncludes)) {
    return {
      intendedImmutabilityRejection: false,
      reason: "message_mismatch",
      sqlState,
      message: message.slice(0, 300),
      expectedMessageIncludes: expectation.messageIncludes,
    };
  }
  return {
    intendedImmutabilityRejection: true,
    reason: "immutability_rule_matched",
    sqlState,
    message: message.slice(0, 300),
  };
}
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

/**
 * Exact trigger binding check (name + table + enabled + events).
 * @param {{ triggers: Array<{ table: string, trigger: string, enabled?: boolean, events?: string[] }> }} evidence
 */
function evaluateImmutabilityTriggers(evidence) {
  const failures = [];
  const triggers = evidence.triggers || [];
  for (const req of REQUIRED_IMMUTABILITY_TRIGGERS) {
    const hit = triggers.find(
      (t) => t.table === req.table && t.trigger === req.trigger,
    );
    if (!hit) {
      failures.push({
        check: "si_memory_immutability",
        rule: "trigger_binding_missing",
        table: req.table,
        expected: req.trigger,
      });
      continue;
    }
    if (hit.enabled !== true) {
      failures.push({
        check: "si_memory_immutability",
        rule: "trigger_disabled",
        table: req.table,
        trigger: req.trigger,
      });
    }
    const events = new Set((hit.events || []).map((e) => String(e).toUpperCase()));
    for (const ev of req.events) {
      if (!events.has(ev)) {
        failures.push({
          check: "si_memory_immutability",
          rule: "trigger_missing_event",
          table: req.table,
          trigger: req.trigger,
          event: ev,
        });
      }
    }
  }
  return {
    ok: failures.length === 0,
    failures,
    requiredCount: REQUIRED_IMMUTABILITY_TRIGGERS.length,
  };
}

/**
 * Behavioral probe results must prove prohibited mutations were rejected by the
 * intended immutability rule (SQLSTATE + message), not by aborted-txn / unrelated errors.
 */
function evaluateImmutabilityBehavior(evidence) {
  const failures = [];
  const probes = evidence.behavioralProbes;
  if (!Array.isArray(probes)) {
    return {
      ok: false,
      failures: [{ check: "si_memory_immutability", rule: "behavioral_probes_absent" }],
    };
  }
  const byId = new Map(probes.map((p) => [p.id, p]));
  for (const id of REQUIRED_BEHAVIORAL_PROBES) {
    const probe = byId.get(id);
    const expectation = PROBE_EXPECTATIONS[id];
    if (!probe) {
      failures.push({
        check: "si_memory_immutability",
        rule: "behavioral_probe_missing",
        id,
      });
      continue;
    }
    if (probe.preconditionMet !== true) {
      failures.push({
        check: "si_memory_immutability",
        rule: "fixture_precondition_unmet",
        id,
      });
    }
    if (probe.fixtureCleanupConfirmed !== true) {
      failures.push({
        check: "si_memory_immutability",
        rule: "fixture_cleanup_unconfirmed",
        id,
      });
    }
    if (probe.rowUnchangedAfter !== true) {
      failures.push({
        check: "si_memory_immutability",
        rule: "protected_row_changed_or_unverified",
        id,
      });
    }
    if (probe.expectedRejected !== true) {
      failures.push({
        check: "si_memory_immutability",
        rule: "probe_misconfigured",
        id,
      });
      continue;
    }
    if (probe.rejectedByImmutabilityRule !== true) {
      failures.push({
        check: "si_memory_immutability",
        rule: "not_intended_immutability_rejection",
        id,
        sqlState: probe.sqlState || null,
        classifyReason: probe.classifyReason || null,
        detail: probe.errorMessage || null,
      });
      continue;
    }
    if (probe.sqlState !== expectation.sqlState) {
      failures.push({
        check: "si_memory_immutability",
        rule: "sqlstate_mismatch",
        id,
        sqlState: probe.sqlState,
        expected: expectation.sqlState,
      });
    }
    if (
      !probe.errorMessage ||
      !String(probe.errorMessage).includes(expectation.messageIncludes)
    ) {
      failures.push({
        check: "si_memory_immutability",
        rule: "message_mismatch",
        id,
      });
    }
  }
  return { ok: failures.length === 0, failures };
}

function evaluateImmutability(evidence) {
  const triggers = evaluateImmutabilityTriggers(evidence);
  const behavior = evaluateImmutabilityBehavior(evidence);
  const failures = [...triggers.failures, ...behavior.failures];
  return {
    ok: failures.length === 0,
    failures,
    triggers,
    behavior,
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

function evaluateSecurityBundle(evidence) {
  if (!evidence || typeof evidence !== "object") {
    return {
      ok: false,
      status: "FAIL",
      reason: "security_evidence_absent",
      failures: [{ rule: "evidence_missing" }],
    };
  }
  for (const key of ["tables", "views", "triggers", "functions", "behavioralProbes"]) {
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

async function collectTriggerBindings(client) {
  const res = await client.query(
    `SELECT
       c.relname AS table_name,
       t.tgname AS trigger_name,
       t.tgenabled AS enabled_code,
       pg_get_triggerdef(t.oid) AS definition
     FROM pg_trigger t
     JOIN pg_class c ON c.oid = t.tgrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND NOT t.tgisinternal
    ORDER BY 1, 2`,
  );
  return res.rows.map((r) => {
    const def = String(r.definition || "").toUpperCase();
    const events = [];
    if (/\bUPDATE\b/.test(def)) events.push("UPDATE");
    if (/\bDELETE\b/.test(def)) events.push("DELETE");
    if (/\bINSERT\b/.test(def)) events.push("INSERT");
    // O=origin, A=always, R=replica, D=disabled
    const enabled = r.enabled_code === "O" || r.enabled_code === "A";
    return {
      table: r.table_name,
      trigger: r.trigger_name,
      enabled,
      events,
    };
  });
}

/**
 * Rollback-isolated synthetic fixtures with SAVEPOINT per expected-failure probe.
 * Catching a JS exception does not clear an aborted Postgres transaction —
 * each probe uses SAVEPOINT / ROLLBACK TO SAVEPOINT / RELEASE.
 * Rejection counts only when SQLSTATE + message match the intended trigger rule.
 *
 * @param {import('pg').Client} client
 */
async function runImmutabilityBehavioralProbes(client) {
  const probes = [];
  const companyId = "aaaaaaaa-0d01-4d01-8d01-0000000000d1";
  const snapshotId = `option_d_probe_${crypto.randomBytes(6).toString("hex")}`;
  const memoryId = `option_d_mem_${crypto.randomBytes(6).toString("hex")}`;

  async function withSavepoint(probeId, fn) {
    const sp = `sp_${probeId.replace(/[^a-z0-9_]/gi, "_").slice(0, 40)}`;
    await client.query(`SAVEPOINT ${sp}`);
    try {
      return await fn();
    } finally {
      try {
        await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
        await client.query(`RELEASE SAVEPOINT ${sp}`);
      } catch (recoveryErr) {
        // Outer ROLLBACK will still run; surface recovery failure on probe record later.
        return {
          recoveryFailed: true,
          recoveryError: String(recoveryErr.message || recoveryErr).slice(0, 200),
        };
      }
    }
  }

  async function runExpectedFailureProbe({ id, mutateSql, mutateParams, assertUnchanged }) {
    const expectation = PROBE_EXPECTATIONS[id];
    const result = {
      id,
      expectedRejected: true,
      rejected: false,
      rejectedByImmutabilityRule: false,
      preconditionMet: false,
      rowUnchangedAfter: false,
      fixtureCleanupConfirmed: false,
      sqlState: null,
      classifyReason: null,
      errorMessage: null,
    };

    const savepointOutcome = await withSavepoint(id, async () => {
      try {
        await client.query(mutateSql, mutateParams);
        return { threw: false };
      } catch (err) {
        const classified = classifyProbeError(err, expectation);
        return {
          threw: true,
          sqlState: classified.sqlState,
          classifyReason: classified.reason,
          intended: classified.intendedImmutabilityRejection,
          errorMessage: classified.message,
        };
      }
    });

    if (savepointOutcome && savepointOutcome.recoveryFailed) {
      result.classifyReason = "savepoint_recovery_failed";
      result.errorMessage = savepointOutcome.recoveryError;
      probes.push(result);
      return result;
    }

    if (!savepointOutcome || !savepointOutcome.threw) {
      result.rejected = false;
      result.rejectedByImmutabilityRule = false;
      result.classifyReason = "mutation_succeeded";
    } else {
      result.rejected = true;
      result.sqlState = savepointOutcome.sqlState;
      result.classifyReason = savepointOutcome.classifyReason;
      result.errorMessage = savepointOutcome.errorMessage;
      result.rejectedByImmutabilityRule = savepointOutcome.intended === true;
    }

    try {
      result.rowUnchangedAfter = await assertUnchanged();
    } catch {
      result.rowUnchangedAfter = false;
    }

    probes.push(result);
    return result;
  }

  await client.query("BEGIN");
  try {
    await client.query(
      `INSERT INTO public.companies (id, name)
       VALUES ($1::uuid, 'option-d-immutability-probe')
       ON CONFLICT (id) DO NOTHING`,
      [companyId],
    );

    await client.query(
      `INSERT INTO public.si_historical_snapshots (
         snapshot_id, company_id, source_system, tenant_name, sync_id,
         report_period_start, report_period_end, period_key, snapshot_version,
         snapshot_write_source, snapshot_status, source_sync_status,
         snapshot_lineage, finalized_at
       ) VALUES (
         $1, $2::uuid, 'option_d_probe', 'probe', 'sync-probe',
         '2026-01-01', '2026-01-31', '2026-01', 1,
         'manual_import', 'finalized', 'success',
         '{}'::jsonb, now()
       )`,
      [snapshotId, companyId],
    );

    await client.query(
      `INSERT INTO public.si_snapshot_payloads (
         snapshot_id, company_id, payload_hash
       ) VALUES ($1, $2::uuid, 'probe-hash')`,
      [snapshotId, companyId],
    );

    const siPre = await client.query(
      `SELECT snapshot_status, tenant_name
         FROM public.si_historical_snapshots WHERE snapshot_id = $1`,
      [snapshotId],
    );
    const payloadPre = await client.query(
      `SELECT payload_hash FROM public.si_snapshot_payloads WHERE snapshot_id = $1`,
      [snapshotId],
    );
    const siReady =
      siPre.rows[0]?.snapshot_status === "finalized" &&
      siPre.rows[0]?.tenant_name === "probe" &&
      payloadPre.rows[0]?.payload_hash === "probe-hash";

    const assertSiUnchanged = async () => {
      const r = await client.query(
        `SELECT snapshot_status, tenant_name
           FROM public.si_historical_snapshots WHERE snapshot_id = $1`,
        [snapshotId],
      );
      return (
        r.rows.length === 1 &&
        r.rows[0].snapshot_status === "finalized" &&
        r.rows[0].tenant_name === "probe"
      );
    };
    const assertPayloadUnchanged = async () => {
      const r = await client.query(
        `SELECT payload_hash FROM public.si_snapshot_payloads WHERE snapshot_id = $1`,
        [snapshotId],
      );
      return r.rows.length === 1 && r.rows[0].payload_hash === "probe-hash";
    };

    {
      const p = await runExpectedFailureProbe({
        id: "si_finalized_metadata_update_rejected",
        mutateSql: `UPDATE public.si_historical_snapshots SET tenant_name = 'mutated' WHERE snapshot_id = $1`,
        mutateParams: [snapshotId],
        assertUnchanged: assertSiUnchanged,
      });
      p.preconditionMet = siReady;
    }
    {
      const p = await runExpectedFailureProbe({
        id: "si_finalized_metadata_delete_rejected",
        mutateSql: `DELETE FROM public.si_historical_snapshots WHERE snapshot_id = $1`,
        mutateParams: [snapshotId],
        assertUnchanged: assertSiUnchanged,
      });
      p.preconditionMet = siReady;
    }
    {
      const p = await runExpectedFailureProbe({
        id: "si_locked_payload_update_rejected",
        mutateSql: `UPDATE public.si_snapshot_payloads SET payload_hash = 'mutated' WHERE snapshot_id = $1`,
        mutateParams: [snapshotId],
        assertUnchanged: assertPayloadUnchanged,
      });
      p.preconditionMet = siReady;
    }

    // Memory fixture inserted after SI probes — transaction must still be usable.
    await client.query(
      `INSERT INTO public.company_memory_records (
         memory_id, memory_group_id, memory_key, record_version,
         company_id, memory_type, memory_status, persistence_status, payload
       ) VALUES (
         $1, 'option_d_probe_group', 'option_d_probe_key', 1,
         $2::uuid, 'probe', 'active', 'persisted', '{}'::jsonb
       )`,
      [memoryId, companyId],
    );

    const memPre = await client.query(
      `SELECT persistence_status, payload::text AS payload
         FROM public.company_memory_records WHERE memory_id = $1`,
      [memoryId],
    );
    const memReady =
      memPre.rows[0]?.persistence_status === "persisted" &&
      memPre.rows[0]?.payload === "{}";

    const assertMemUnchanged = async () => {
      const r = await client.query(
        `SELECT persistence_status, payload::text AS payload
           FROM public.company_memory_records WHERE memory_id = $1`,
        [memoryId],
      );
      return (
        r.rows.length === 1 &&
        r.rows[0].persistence_status === "persisted" &&
        r.rows[0].payload === "{}"
      );
    };

    {
      const p = await runExpectedFailureProbe({
        id: "memory_immutable_field_update_rejected",
        mutateSql: `UPDATE public.company_memory_records SET payload = '{"mutated":true}'::jsonb WHERE memory_id = $1`,
        mutateParams: [memoryId],
        assertUnchanged: assertMemUnchanged,
      });
      p.preconditionMet = memReady;
    }
    {
      const p = await runExpectedFailureProbe({
        id: "memory_delete_rejected",
        mutateSql: `DELETE FROM public.company_memory_records WHERE memory_id = $1`,
        mutateParams: [memoryId],
        assertUnchanged: assertMemUnchanged,
      });
      p.preconditionMet = memReady;
    }
  } finally {
    await client.query("ROLLBACK");
  }

  // Explicit cleanup verification for company, snapshot, payload, and Memory rows
  const left = await client.query(
    `SELECT
       (SELECT count(*)::int FROM public.companies WHERE id = $1::uuid) AS company_left,
       (SELECT count(*)::int FROM public.si_historical_snapshots WHERE snapshot_id = $2) AS si_left,
       (SELECT count(*)::int FROM public.si_snapshot_payloads WHERE snapshot_id = $2) AS payload_left,
       (SELECT count(*)::int FROM public.company_memory_records WHERE memory_id = $3) AS mem_left`,
    [companyId, snapshotId, memoryId],
  );
  const cleanupOk =
    (left.rows[0]?.company_left || 0) === 0 &&
    (left.rows[0]?.si_left || 0) === 0 &&
    (left.rows[0]?.payload_left || 0) === 0 &&
    (left.rows[0]?.mem_left || 0) === 0;

  for (const p of probes) {
    p.fixtureCleanupConfirmed = cleanupOk;
  }

  return probes;
}

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

  const triggers = await collectTriggerBindings(client);

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

  const behavioralProbes = await runImmutabilityBehavioralProbes(client);

  return { tables, views, triggers, functions, behavioralProbes };
}

module.exports = {
  REQUIRED_RLS_TABLES,
  REQUIRED_VIEWS_SECURITY_INVOKER,
  REQUIRED_IMMUTABILITY_TRIGGERS,
  REQUIRED_BEHAVIORAL_PROBES,
  REQUIRED_FUNCTIONS,
  PROBE_EXPECTATIONS,
  NON_IMMUTABILITY_SQLSTATES,
  classifyProbeError,
  evaluateFinalSchemaRls,
  evaluateViewSecurity,
  evaluateImmutabilityTriggers,
  evaluateImmutabilityBehavior,
  evaluateImmutability,
  evaluateRequiredFunctions,
  evaluateSecurityBundle,
  collectSecurityEvidence,
  collectTriggerBindings,
  runImmutabilityBehavioralProbes,
};
