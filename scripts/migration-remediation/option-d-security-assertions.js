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

const REQUIRED_FUNCTIONS = [
  "persist_journal_entry_execution_reservation",
  "transition_journal_entry_execution",
];

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
 * Behavioral probe results must prove prohibited mutations were rejected.
 * Absent probes cannot PASS.
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
    if (!probe) {
      failures.push({
        check: "si_memory_immutability",
        rule: "behavioral_probe_missing",
        id,
      });
      continue;
    }
    if (probe.fixtureCleanupConfirmed !== true) {
      failures.push({
        check: "si_memory_immutability",
        rule: "fixture_cleanup_unconfirmed",
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
    if (probe.rejected !== true) {
      failures.push({
        check: "si_memory_immutability",
        rule: "mutation_not_rejected",
        id,
        detail: probe.errorMessage || null,
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
 * Rollback-isolated synthetic fixtures. No live Memory product writes —
 * inserts are local test rows rolled back at end.
 * @param {import('pg').Client} client
 */
async function runImmutabilityBehavioralProbes(client) {
  const probes = [];
  const companyId = "aaaaaaaa-0d01-4d01-8d01-0000000000d1";
  const snapshotId = `option_d_probe_${crypto.randomBytes(6).toString("hex")}`;
  const memoryId = `option_d_mem_${crypto.randomBytes(6).toString("hex")}`;

  await client.query("BEGIN");
  let cleanupConfirmed = false;
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

    // SI finalized metadata UPDATE must fail
    {
      const id = "si_finalized_metadata_update_rejected";
      try {
        await client.query(
          `UPDATE public.si_historical_snapshots
              SET tenant_name = 'mutated'
            WHERE snapshot_id = $1`,
          [snapshotId],
        );
        probes.push({
          id,
          expectedRejected: true,
          rejected: false,
          errorMessage: null,
          fixtureCleanupConfirmed: false,
        });
      } catch (err) {
        probes.push({
          id,
          expectedRejected: true,
          rejected: true,
          errorMessage: String(err.message || err).slice(0, 200),
          fixtureCleanupConfirmed: false,
        });
      }
    }

    // SI finalized metadata DELETE must fail
    {
      const id = "si_finalized_metadata_delete_rejected";
      try {
        await client.query(
          `DELETE FROM public.si_historical_snapshots WHERE snapshot_id = $1`,
          [snapshotId],
        );
        probes.push({
          id,
          expectedRejected: true,
          rejected: false,
          errorMessage: null,
          fixtureCleanupConfirmed: false,
        });
      } catch (err) {
        probes.push({
          id,
          expectedRejected: true,
          rejected: true,
          errorMessage: String(err.message || err).slice(0, 200),
          fixtureCleanupConfirmed: false,
        });
      }
    }

    // SI locked payload UPDATE must fail
    {
      const id = "si_locked_payload_update_rejected";
      try {
        await client.query(
          `UPDATE public.si_snapshot_payloads
              SET payload_hash = 'mutated'
            WHERE snapshot_id = $1`,
          [snapshotId],
        );
        probes.push({
          id,
          expectedRejected: true,
          rejected: false,
          errorMessage: null,
          fixtureCleanupConfirmed: false,
        });
      } catch (err) {
        probes.push({
          id,
          expectedRejected: true,
          rejected: true,
          errorMessage: String(err.message || err).slice(0, 200),
          fixtureCleanupConfirmed: false,
        });
      }
    }

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

    // Memory immutable field UPDATE must fail
    {
      const id = "memory_immutable_field_update_rejected";
      try {
        await client.query(
          `UPDATE public.company_memory_records
              SET payload = '{"mutated":true}'::jsonb
            WHERE memory_id = $1`,
          [memoryId],
        );
        probes.push({
          id,
          expectedRejected: true,
          rejected: false,
          errorMessage: null,
          fixtureCleanupConfirmed: false,
        });
      } catch (err) {
        probes.push({
          id,
          expectedRejected: true,
          rejected: true,
          errorMessage: String(err.message || err).slice(0, 200),
          fixtureCleanupConfirmed: false,
        });
      }
    }

    // Memory DELETE must fail
    {
      const id = "memory_delete_rejected";
      try {
        await client.query(
          `DELETE FROM public.company_memory_records WHERE memory_id = $1`,
          [memoryId],
        );
        probes.push({
          id,
          expectedRejected: true,
          rejected: false,
          errorMessage: null,
          fixtureCleanupConfirmed: false,
        });
      } catch (err) {
        probes.push({
          id,
          expectedRejected: true,
          rejected: true,
          errorMessage: String(err.message || err).slice(0, 200),
          fixtureCleanupConfirmed: false,
        });
      }
    }
  } finally {
    await client.query("ROLLBACK");
    cleanupConfirmed = true;
    for (const p of probes) {
      p.fixtureCleanupConfirmed = cleanupConfirmed;
    }
  }

  // Confirm fixtures are gone after rollback
  const left = await client.query(
    `SELECT
       (SELECT count(*)::int FROM public.si_historical_snapshots WHERE snapshot_id = $1) AS si_left,
       (SELECT count(*)::int FROM public.company_memory_records WHERE memory_id = $2) AS mem_left`,
    [snapshotId, memoryId],
  );
  const leftovers =
    (left.rows[0]?.si_left || 0) + (left.rows[0]?.mem_left || 0);
  if (leftovers > 0) {
    for (const p of probes) {
      p.fixtureCleanupConfirmed = false;
    }
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
