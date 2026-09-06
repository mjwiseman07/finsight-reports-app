#!/usr/bin/env node
/**
 * Exact `_realtime` platform inventory for Option D freshness/preflight.
 *
 * Provenance (CLI 2.116.0 empty-workdir `supabase start`, blocked run 2026-09-03e):
 *   - Schema `_realtime` is created by the Realtime service on genuine local stacks
 *     (Supabase Realtime DEVELOPERS.md: local compose creates `_realtime` for the
 *     tenant registry; production uses a separate DB).
 *   - Observed relations (kind `r`): extensions, feature_flags, schema_migrations, tenants.
 *   - Authoritative dumps / issues show OWNER supabase_admin for tenants/extensions/
 *     schema_migrations; feature_flags is part of the same Ecto registry on modern images.
 *
 * Fail closed on inventory drift, unknown ownership, extra/missing relations, or
 * Advisacor application sentinels inside `_realtime`. Do not broadly allow `_realtime.*`.
 */

const REALTIME_INTERNAL_SCHEMA = "_realtime";

/** Exact relation inventory bound to observed CLI 2.116.0 platform-only startup. */
const REALTIME_INTERNAL_EXACT_RELATIONS = Object.freeze([
  Object.freeze({
    name: "extensions",
    kind: "r",
    expectedOwner: "supabase_admin",
    expectedRls: false,
    notes: "Realtime tenant extension registry (Ecto)",
  }),
  Object.freeze({
    name: "feature_flags",
    kind: "r",
    expectedOwner: "supabase_admin",
    expectedRls: false,
    notes: "Realtime feature-flag registry; present on CLI 2.116.0 local start",
  }),
  Object.freeze({
    name: "schema_migrations",
    kind: "r",
    expectedOwner: "supabase_admin",
    expectedRls: false,
    notes: "Ecto schema_migrations for Realtime service (not supabase_migrations)",
  }),
  Object.freeze({
    name: "tenants",
    kind: "r",
    expectedOwner: "supabase_admin",
    expectedRls: false,
    notes: "Realtime multi-tenant registry",
  }),
]);

const REALTIME_INTERNAL_SCHEMA_POLICY = Object.freeze({
  mode: "exact_inventory_bound_platform_cli",
  schema: REALTIME_INTERNAL_SCHEMA,
  /** CLI versions for which this exact four-relation inventory was verified. */
  verifiedCliVersions: ["2.116.0"],
  exactRelations: REALTIME_INTERNAL_EXACT_RELATIONS,
  requireExactOwner: true,
  requireExactKind: true,
  requireRlsDisabled: true,
  /**
   * When platform-only provenance is asserted for a verified CLI version, absence of
   * `_realtime` fails closed (incomplete platform). Non-platform option_d_* targets
   * without the schema are unaffected.
   */
  requirePresentOnVerifiedPlatformOnlyCli: true,
  documentation:
    "CLI 2.116.0 genuine empty-workdir supabase start creates _realtime with exactly extensions, feature_flags, schema_migrations, tenants (owner supabase_admin, RLS off). Extra/missing/misowned relations or version inventory drift fail closed. Application objects inside _realtime are rejected. Do not allow _realtime.* broadly.",
});

const APP_SENTINEL_IN_REALTIME = new Set([
  "companies",
  "firms",
  "firm_clients",
  "subscriptions",
  "journal_entry_executions",
  "journal_entry_proposals",
  "accounting_connections",
  "si_historical_snapshots",
  "company_memory_records",
  "client_active_rules",
  "pilot_slots",
]);

function expectedRelationMap(policy = REALTIME_INTERNAL_SCHEMA_POLICY) {
  const map = new Map();
  for (const rel of policy.exactRelations || []) {
    map.set(String(rel.name).toLowerCase(), rel);
  }
  return map;
}

/**
 * Normalize inventory rows for `_realtime` relations.
 * Accepts either inventory.realtimeInternalRelations or filtered platform.relations.
 */
function resolveRealtimeInternalRelations(inventory) {
  if (Array.isArray(inventory?.realtimeInternalRelations)) {
    return inventory.realtimeInternalRelations.map((r) => ({
      name: String(r.name || "").toLowerCase(),
      kind: String(r.kind || ""),
      owner: r.owner != null ? String(r.owner) : null,
      rlsEnabled: r.rlsEnabled === true || r.rls_enabled === true,
      schema: REALTIME_INTERNAL_SCHEMA,
    }));
  }
  const fromPlatform = Array.isArray(inventory?.platform?.relations)
    ? inventory.platform.relations.filter(
        (r) => String(r.schema).toLowerCase() === REALTIME_INTERNAL_SCHEMA,
      )
    : [];
  if (fromPlatform.length) {
    const owners = inventory.platform.relationOwners || {};
    const rls = inventory.platform.relationRls || {};
    return fromPlatform.map((r) => {
      const key = `${REALTIME_INTERNAL_SCHEMA}.${r.name}`.toLowerCase();
      return {
        name: String(r.name).toLowerCase(),
        kind: String(r.kind || ""),
        owner: owners[key] != null ? String(owners[key]) : null,
        rlsEnabled: Boolean(rls[key]),
        schema: REALTIME_INTERNAL_SCHEMA,
      };
    });
  }
  return null;
}

/**
 * @returns {{ ok: boolean, failures: object[] }}
 */
function evaluateRealtimeInternalSchema(inventory, policy = REALTIME_INTERNAL_SCHEMA_POLICY) {
  const failures = [];
  if (!inventory || typeof inventory !== "object") {
    return {
      ok: false,
      failures: [{ rule: "missing_inventory", detail: "inventory required for _realtime policy" }],
    };
  }

  const schemas = Array.isArray(inventory.schemas)
    ? inventory.schemas.map((s) => String(s).toLowerCase())
    : [];
  const hasSchema = schemas.includes(REALTIME_INTERNAL_SCHEMA);
  const platformOnly = inventory.platformOnlyTarget === true;
  const cli = String(
    inventory.supabaseCliVersion ||
      inventory.platform?.supabaseCliVersion ||
      "",
  ).trim();
  const verifiedCli = (policy.verifiedCliVersions || []).includes(cli);
  const expected = expectedRelationMap(policy);
  const observed = resolveRealtimeInternalRelations(inventory);

  if (!hasSchema) {
    if (platformOnly && policy.requirePresentOnVerifiedPlatformOnlyCli && verifiedCli) {
      failures.push({
        rule: "realtime_internal_schema_absent",
        detail:
          "_realtime absent on verified platform-only CLI — incomplete Realtime platform bootstrap",
        cliVersion: cli || null,
        verifiedCliVersions: policy.verifiedCliVersions,
      });
    }
    // Non-platform option_d_* virgin DBs may omit _realtime — no failure.
    return { ok: failures.length === 0, failures };
  }

  // Schema present — exact inventory required (version drift / incomplete probe fail closed).
  if (observed === null) {
    failures.push({
      rule: "realtime_internal_inventory_missing",
      detail:
        "_realtime present but realtimeInternalRelations inventory was not collected — fail closed",
    });
    return { ok: false, failures };
  }

  const observedNames = new Set(observed.map((r) => r.name));
  const expectedNames = new Set(expected.keys());

  for (const name of expectedNames) {
    if (!observedNames.has(name)) {
      failures.push({
        rule: "realtime_internal_relation_missing",
        detail: `Required _realtime.${name} missing`,
        relation: `${REALTIME_INTERNAL_SCHEMA}.${name}`,
      });
    }
  }

  for (const row of observed) {
    if (APP_SENTINEL_IN_REALTIME.has(row.name)) {
      failures.push({
        rule: "realtime_internal_application_object",
        detail: `Application sentinel relation inside _realtime: ${row.name}`,
        relation: `${REALTIME_INTERNAL_SCHEMA}.${row.name}`,
      });
      continue;
    }
    const exp = expected.get(row.name);
    if (!exp) {
      failures.push({
        rule: "realtime_internal_unexpected_relation",
        detail: `Unexpected _realtime relation (inventory drift): ${row.name}`,
        relation: `${REALTIME_INTERNAL_SCHEMA}.${row.name}`,
        kind: row.kind,
      });
      continue;
    }
    if (policy.requireExactKind && String(row.kind) !== String(exp.kind)) {
      failures.push({
        rule: "realtime_internal_kind_mismatch",
        detail: `Expected kind ${exp.kind} for _realtime.${row.name}, got ${row.kind}`,
        relation: `${REALTIME_INTERNAL_SCHEMA}.${row.name}`,
      });
    }
    if (policy.requireExactOwner) {
      if (row.owner == null || row.owner === "") {
        failures.push({
          rule: "realtime_internal_owner_missing",
          detail: `Owner inventory missing for _realtime.${row.name}`,
          relation: `${REALTIME_INTERNAL_SCHEMA}.${row.name}`,
        });
      } else if (row.owner !== exp.expectedOwner) {
        failures.push({
          rule: "realtime_internal_owner_mismatch",
          detail: `Expected owner ${exp.expectedOwner} for _realtime.${row.name}, got ${row.owner}`,
          relation: `${REALTIME_INTERNAL_SCHEMA}.${row.name}`,
          observedOwner: row.owner,
        });
      }
    }
    if (policy.requireRlsDisabled && row.rlsEnabled === true) {
      failures.push({
        rule: "realtime_internal_rls_unexpected",
        detail: `Expected RLS disabled on platform _realtime.${row.name}`,
        relation: `${REALTIME_INTERNAL_SCHEMA}.${row.name}`,
      });
    }
  }

  // Version drift signal: schema present on non-verified CLI with unexpected shape already
  // fails above; when verified CLI list is non-empty and CLI is unknown, still accept exact
  // inventory match but record that drift of relation set fails closed (already handled).
  if (cli && !verifiedCli && failures.length === 0) {
    // Exact match on an unverified CLI is accepted only if inventory matches exactly —
    // already verified. No extra failure; documentation notes verified set is 2.116.0.
  }

  return { ok: failures.length === 0, failures };
}

module.exports = {
  REALTIME_INTERNAL_SCHEMA,
  REALTIME_INTERNAL_EXACT_RELATIONS,
  REALTIME_INTERNAL_SCHEMA_POLICY,
  evaluateRealtimeInternalSchema,
  resolveRealtimeInternalRelations,
  expectedRelationMap,
};
