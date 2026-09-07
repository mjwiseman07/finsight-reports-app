'use strict';
/**
 * ESC privilege remediation helpers (candidate authoring / review only).
 * Does not execute SQL. Uses Option D function-identity parsing for overload-safe revokes.
 */
const {
  identityFromNameAndArgs,
  parseRoutineHead,
} = require('./option-d-function-identity');

/**
 * Exact-identity service_role EXECUTE allowlist (fail-closed).
 * Bare function names are insufficient — grant only when CREATE identity matches exactly.
 * Ambiguous/wrong overloads classify as migration_admin_or_internal (revoke service_role).
 */
const SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST = new Set([
  'public.publish_ledger_event(text,text,int4,uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,jsonb,uuid,text)',
  'public.increment_share_token_access(uuid)',
  'public.persist_journal_entry_proposal(jsonb,jsonb,text,uuid,uuid,uuid,text,text)',
  'public.persist_journal_entry_approval(jsonb,text,jsonb,text,uuid,uuid,uuid,text,text)',
  'public.persist_journal_entry_execution_reservation(jsonb,jsonb,text,uuid,uuid,uuid,text,text)',
  'public.transition_journal_entry_execution(uuid,text,int4,text,jsonb,text,jsonb,text,uuid,uuid,uuid,text,text)',
  'public.persist_journal_entry_provider_attempt(jsonb,jsonb,text,uuid,uuid,uuid,text,text,bool)',
  'public.patch_journal_entry_provider_attempt(uuid,text,jsonb)',
  'public.apply_journal_entry_verified(uuid,text,int4,uuid,text,text,jsonb,jsonb,jsonb,text,uuid,uuid,uuid,text,text)',
  'public.apply_journal_entry_verification_mismatch(uuid,text,int4,uuid,text,text,jsonb,jsonb,jsonb,text,uuid,uuid,uuid,text,text)',
  'public.apply_journal_entry_provider_commit_discovered(uuid,text,text,text,jsonb,jsonb,text,uuid,uuid,uuid,text,text)',
  'public.apply_journal_entry_provider_not_found_confirmed(uuid,text,jsonb,jsonb,text,uuid,uuid,uuid,text,text)',
  'public.apply_journal_entry_provider_dispatch_started(uuid,text,jsonb,text,uuid,uuid,uuid,text,text)',
  'public.apply_journal_entry_provider_posted(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)',
  'public.apply_journal_entry_provider_post_unknown(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)',
  'public.apply_journal_entry_provider_precommit_failed(uuid,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)',
  'public.gap2_schedule_purge(uuid,uuid,text,text,text,uuid,text,int4)',
  'public.gap2_cancel_purge(uuid,text,uuid)',
  'public.persist_continuous_close_observe_run(jsonb,jsonb,text,uuid,uuid,uuid,text,text)',
  'public.persist_audit_ready_recon_bridge(uuid,jsonb,int8,int8,int4,int4,text,bool,timestamptz)',
  'public.clear_audit_ready_recon_bridge(uuid)',
  'public.increment_pbc_request_count(uuid,int4)',
  'public.get_similar_kickout_resolutions(uuid,text,jsonb)',
  'public.get_similar_kickout_resolution_counts(uuid[])',
  'public.audit_ready_latest_bs_kickout_lines(uuid[])',
  'public.audit_ready_latest_pbc_kickout_runs(uuid[])',
  'public.next_document_number(uuid,text)',
  'public.sp_list_public_columns()',
]);

/** Names derived from exact identities — used only to fail-closed wrong overloads. */
const SERVICE_ROLE_RPC_ALLOWED_NAMES = new Set(
  [...SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST].map((id) =>
    id.replace(/^public\./, '').split('(')[0]
  )
);

/** Concrete caller evidence for every retained service_role grant identity. */
const SERVICE_ROLE_RPC_CALLER_EVIDENCE = {
  'public.publish_ledger_event(text,text,int4,uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,jsonb,uuid,text)': {
    callers: ['lib/events/publisher.ts'],
    authority: 'getSupabaseAdmin()/service_role',
  },
  'public.increment_share_token_access(uuid)': {
    callers: ['lib/close-packet/share-tokens.js'],
    authority: 'supabaseAdmin/service_role',
  },
  'public.persist_journal_entry_proposal(jsonb,jsonb,text,uuid,uuid,uuid,text,text)': {
    callers: ['lib/journal-entry-governance/repository.ts'],
    authority: 'getSupabaseAdmin()',
  },
  'public.persist_journal_entry_approval(jsonb,text,jsonb,text,uuid,uuid,uuid,text,text)': {
    callers: ['lib/journal-entry-governance/approval-repository.ts'],
    authority: 'getSupabaseAdmin()',
  },
  'public.persist_journal_entry_execution_reservation(jsonb,jsonb,text,uuid,uuid,uuid,text,text)': {
    callers: ['lib/journal-entry-governance/execution-repository.ts'],
    authority: 'getSupabaseAdmin()',
  },
  'public.transition_journal_entry_execution(uuid,text,int4,text,jsonb,text,jsonb,text,uuid,uuid,uuid,text,text)': {
    callers: ['lib/journal-entry-governance/execution-repository.ts'],
    authority: 'getSupabaseAdmin()',
  },
  'public.persist_journal_entry_provider_attempt(jsonb,jsonb,text,uuid,uuid,uuid,text,text,bool)': {
    callers: ['lib/journal-entry-governance/provider-attempt-repository.ts'],
    authority: 'getSupabaseAdmin()',
  },
  'public.patch_journal_entry_provider_attempt(uuid,text,jsonb)': {
    callers: ['lib/journal-entry-governance/provider-attempt-repository.ts'],
    authority: 'getSupabaseAdmin()',
  },
  'public.apply_journal_entry_verified(uuid,text,int4,uuid,text,text,jsonb,jsonb,jsonb,text,uuid,uuid,uuid,text,text)': {
    callers: ['lib/journal-entry-governance/provider-verification-repository.ts'],
    authority: 'getSupabaseAdmin()',
  },
  'public.apply_journal_entry_verification_mismatch(uuid,text,int4,uuid,text,text,jsonb,jsonb,jsonb,text,uuid,uuid,uuid,text,text)': {
    callers: ['lib/journal-entry-governance/provider-verification-repository.ts'],
    authority: 'getSupabaseAdmin()',
  },
  'public.apply_journal_entry_provider_commit_discovered(uuid,text,text,text,jsonb,jsonb,text,uuid,uuid,uuid,text,text)': {
    callers: ['lib/journal-entry-governance/provider-attempt-repository.ts'],
    authority: 'getSupabaseAdmin()',
  },
  'public.apply_journal_entry_provider_not_found_confirmed(uuid,text,jsonb,jsonb,text,uuid,uuid,uuid,text,text)': {
    callers: ['lib/journal-entry-governance/provider-attempt-repository.ts'],
    authority: 'getSupabaseAdmin()',
  },
  'public.apply_journal_entry_provider_dispatch_started(uuid,text,jsonb,text,uuid,uuid,uuid,text,text)': {
    callers: ['lib/journal-entry-governance/provider-dispatch-repository.ts:81'],
    authority: 'getSupabaseAdmin()',
    note: 'DB EXECUTE alone does not activate dispatch; app kill-switch/capability gates remain required',
  },
  'public.apply_journal_entry_provider_posted(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)': {
    callers: ['lib/journal-entry-governance/provider-dispatch-repository.ts:123'],
    authority: 'getSupabaseAdmin()',
    note: 'DB EXECUTE alone does not activate dispatch; app kill-switch/capability gates remain required',
  },
  'public.apply_journal_entry_provider_post_unknown(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)': {
    callers: ['lib/journal-entry-governance/provider-dispatch-repository.ts:168'],
    authority: 'getSupabaseAdmin()',
    note: 'DB EXECUTE alone does not activate dispatch; app kill-switch/capability gates remain required',
  },
  'public.apply_journal_entry_provider_precommit_failed(uuid,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)': {
    callers: ['lib/journal-entry-governance/provider-dispatch-repository.ts:212'],
    authority: 'getSupabaseAdmin()',
    note: 'DB EXECUTE alone does not activate dispatch; app kill-switch/capability gates remain required',
  },
  'public.gap2_schedule_purge(uuid,uuid,text,text,text,uuid,text,int4)': {
    callers: ['lib/gap2/stripe-integration.ts'],
    authority: 'service_role',
  },
  'public.gap2_cancel_purge(uuid,text,uuid)': {
    callers: ['lib/gap2/stripe-integration.ts'],
    authority: 'service_role',
  },
  'public.persist_continuous_close_observe_run(jsonb,jsonb,text,uuid,uuid,uuid,text,text)': {
    callers: ['lib/continuous-close/persistence/repository.ts'],
    authority: 'service_role',
  },
  'public.persist_audit_ready_recon_bridge(uuid,jsonb,int8,int8,int4,int4,text,bool,timestamptz)': {
    callers: ['lib/audit-ready/tie-out/reconciling-items-persistence.ts'],
    authority: 'service_role',
  },
  'public.clear_audit_ready_recon_bridge(uuid)': {
    callers: ['lib/audit-ready/tie-out/reconciling-items-persistence.ts'],
    authority: 'service_role',
  },
  'public.increment_pbc_request_count(uuid,int4)': {
    callers: ['lib/audit-ready/pbc-parser.ts'],
    authority: 'service_role',
  },
  'public.get_similar_kickout_resolutions(uuid,text,jsonb)': {
    callers: ['lib/audit-ready/memory/similar-resolutions.ts'],
    authority: 'service_role',
  },
  'public.get_similar_kickout_resolution_counts(uuid[])': {
    callers: ['lib/audit-ready/kickouts/list-kickouts.ts'],
    authority: 'service_role',
  },
  'public.audit_ready_latest_bs_kickout_lines(uuid[])': {
    callers: ['lib/audit-ready/kickouts/list-kickouts.ts'],
    authority: 'service_role',
  },
  'public.audit_ready_latest_pbc_kickout_runs(uuid[])': {
    callers: ['lib/audit-ready/kickouts/list-kickouts.ts'],
    authority: 'service_role',
  },
  'public.next_document_number(uuid,text)': {
    callers: [
      'lib/ap-intake/requisitions/service.ts via numbering.ts + createServiceClient()',
      'lib/ap-intake/purchase-orders/service.ts via numbering.ts + createServiceClient()',
    ],
    authority: 'createServiceClient() → getSupabaseAdmin()',
  },
  'public.sp_list_public_columns()': {
    callers: ['lib/schema-drift/repo-scanner.ts'],
    authority: 'service_role',
  },
};

/**
 * sp_write_anchor_batch — no proven runtime .rpc() caller in this repository
 * (commented anchor-batcher.ts path is absent). Owner/admin only until separately authorized.
 */
const SP_WRITE_ANCHOR_BATCH_DISPOSITION = {
  identity: 'public.sp_write_anchor_batch(int8,int8,int4,text,jsonb,jsonb)',
  serviceRoleExecute: 'REVOKED',
  finalPrivilege: 'owner_admin_only',
  rationale:
    'No repository .rpc() caller found. Historical comment referenced block9_shipped/anchor-batcher.ts (absent). Retain DEFINER/search_path hardening; do not weaken anchoring/custody. Separate authorization required before service_role re-grant.',
};

/** @deprecated Prefer SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST — kept as name set for transition. */
const SERVICE_ROLE_RPC_NAME_ALLOWLIST = SERVICE_ROLE_RPC_ALLOWED_NAMES;

/**
 * public.users column privilege contract (ESC overlay).
 * Evidence: all app writes use supabaseAdmin/service_role; no browser .from('users').update.
 * Self-service profile PATCH (app/api/account) uses service_role for business_name only.
 * Therefore authenticated UPDATE is fully revoked (not column-granted).
 */
const PUBLIC_USERS_COLUMN_CONTRACT = {
  table: 'public.users',
  authenticatedTablePrivileges: ['SELECT'],
  authenticatedUpdateAllowlist: [],
  authenticatedUpdateFullyRevoked: true,
  rationale:
    'No browser Supabase client updates public.users. Signup/onboarding/billing/trial/account writes use service_role (supabaseAdmin). Fail-closed: revoke authenticated UPDATE entirely.',
  columns: {
    id: { class: 'server_managed_identity', userEditable: false },
    email: { class: 'server_managed_identity', userEditable: false },
    first_name: {
      class: 'server_managed_profile_at_signup',
      userEditable: false,
      evidence: 'Set via auth.users raw_user_meta_data → handle_new_auth_user; no browser UPDATE path',
    },
    last_name: {
      class: 'server_managed_profile_at_signup',
      userEditable: false,
      evidence: 'Set via auth.users raw_user_meta_data → handle_new_auth_user; no browser UPDATE path',
    },
    business_name: {
      class: 'server_path_profile',
      userEditable: false,
      evidence: 'app/api/account/route.js PATCH uses supabaseAdmin (service_role), not browser role',
    },
    ip_address_signup: {
      class: 'immutable_audit_system',
      userEditable: false,
      evidence: 'app/api/signup/route.js writes via supabaseAdmin only',
    },
    trial_used: {
      class: 'billing_subscription',
      userEditable: false,
      evidence: 'app/api/mark-trial-used uses supabaseAdmin',
    },
    reports_generated: {
      class: 'usage_quota',
      userEditable: false,
      evidence: 'app/api/mark-trial-used uses supabaseAdmin',
    },
    subscription_status: {
      class: 'billing_subscription',
      userEditable: false,
      evidence: 'lib/subscription-sync.js service-role webhook path',
    },
    stripe_customer_id: {
      class: 'billing_subscription',
      userEditable: false,
      evidence: 'lib/stripe-customer.ts ensureStripeCustomerForUser (admin client)',
    },
    created_at: { class: 'immutable_audit_system', userEditable: false },
  },
};

/** Evidence-backed anonymous RPC allowlist — empty (fail-closed). */
const ANON_RPC_ALLOWLIST = new Set();

/**
 * Authenticated EXECUTE allowed only for RLS/policy helper predicates with
 * documented least-privilege grants in Q8 / security slice provenance.
 * Browser table RPCs are NOT included.
 */
const AUTHENTICATED_HELPER_ALLOWLIST = new Set([
  'public.is_active_company_member(uuid)',
  'public.has_active_company_role(uuid,text[])',
  'public.is_company_admin(uuid)',
  'public.is_active_firm_member(uuid)',
  'public.has_active_firm_role(uuid,text[])',
]);

const SENSITIVE_NAME_RE =
  /(memory|custody|ledger|provider_attempt|journal_entry|purge|share_token|publish_ledger|pilot_lifecycle|gap2|gap3|si_|uncategorized_proposal|execution|approval|webhook|webauthn|mfa_|auth_user|handle_new|sp_write|patent)/i;

function lineAt(sql, index) {
  let line = 1;
  for (let i = 0; i < index && i < sql.length; i++) if (sql[i] === '\n') line++;
  return line;
}

function stripCommentsForScan(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
}

/**
 * Locate CREATE [OR REPLACE] FUNCTION heads with identity args (not nested in comments).
 */
function findCreateFunctionsDetailed(sql) {
  const out = [];
  let i = 0;
  const n = sql.length;
  while (i < n) {
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < n && sql[i] !== '\n') i++;
      continue;
    }
    if (sql[i] === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < n - 1 && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (sql[i] === '$') {
      const m = sql.slice(i).match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (m) {
        const tag = m[0];
        i += tag.length;
        const end = sql.indexOf(tag, i);
        i = end < 0 ? n : end + tag.length;
        continue;
      }
    }
    if (sql[i] === "'") {
      i++;
      while (i < n) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    const prev = i > 0 ? sql[i - 1] : ' ';
    if (!/[A-Za-z0-9_]/.test(prev)) {
      const head = /^(CREATE\s+(OR\s+REPLACE\s+)?FUNCTION)\b/i.exec(sql.slice(i));
      if (head) {
        const start = i;
        const parsed = parseRoutineHead(sql.slice(i));
        if (parsed) {
          const window = sql.slice(i, Math.min(n, i + 2500));
          const returnsTrigger = /RETURNS\s+trigger\b/i.test(window);
          const securityDefiner = /SECURITY\s+DEFINER/i.test(window);
          const searchPath = /SET\s+search_path\s*=\s*([^;\n]+)/i.exec(window);
          out.push({
            index: start,
            line: lineAt(sql, start),
            identity: parsed.identity,
            schema: parsed.schema,
            name: parsed.name,
            argsRaw: parsed.args,
            returnsTrigger,
            securityDefiner,
            searchPath: searchPath ? searchPath[1].trim() : null,
          });
        }
        i += head[0].length;
        continue;
      }
    }
    i++;
  }
  return out;
}

function findRevokeExecuteDetailed(sql) {
  const cleaned = stripCommentsForScan(sql);
  const out = [];
  const re =
    /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+((?:[A-Za-z_][\w]*\.)?[A-Za-z_][\w]*)\s*\(([^)]*)\)\s+FROM\s+(PUBLIC|anon|authenticated|service_role)/gi;
  let m;
  while ((m = re.exec(cleaned))) {
    const id = identityFromNameAndArgs(m[1], m[2]);
    out.push({
      identity: id,
      role: m[3].toUpperCase() === 'PUBLIC' ? 'PUBLIC' : m[3].toLowerCase(),
      line: lineAt(cleaned, m.index),
    });
  }
  return out;
}

function findGrantExecuteDetailed(sql) {
  const cleaned = stripCommentsForScan(sql);
  const out = [];
  const re =
    /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+((?:[A-Za-z_][\w]*\.)?[A-Za-z_][\w]*)\s*\(([^)]*)\)\s+TO\s+([A-Za-z_][\w,\s]*)/gi;
  let m;
  while ((m = re.exec(cleaned))) {
    const id = identityFromNameAndArgs(m[1], m[2]);
    const roles = m[3]
      .split(',')
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean);
    for (const role of roles) {
      out.push({ identity: id, role, line: lineAt(cleaned, m.index) });
    }
  }
  return out;
}

function classifyFunction(fn) {
  const identity = fn.identity;
  const name = fn.name || (identity ? identity.replace(/^public\./, '').split('(')[0] : '');
  if (ANON_RPC_ALLOWLIST.has(identity)) {
    return {
      class: 'anonymous_public_rpc',
      revoke: ['PUBLIC'],
      grant: ['anon', 'service_role'],
      rationale: 'Evidence-backed anonymous RPC allowlist',
    };
  }
  if (AUTHENTICATED_HELPER_ALLOWLIST.has(identity)) {
    return {
      class: 'authenticated_rls_helper',
      revoke: ['PUBLIC', 'anon'],
      grant: ['authenticated', 'service_role'],
      rationale: 'Q8 RLS predicate helper; authenticated EXECUTE required for policy evaluation',
    };
  }
  if (
    fn.returnsTrigger ||
    /_(trg|trigger)$/i.test(name) ||
    /prevent_|touch_|immutable|enforce_|guard_|reject_|before_insert|before_update|after_/i.test(name)
  ) {
    return {
      class: 'trigger_only',
      revoke: ['PUBLIC', 'anon', 'authenticated', 'service_role'],
      grant: [],
      rationale:
        'Trigger/immutability helper — binding/owner semantics; no direct EXECUTE for browser or service_role',
    };
  }
  if (SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST.has(identity)) {
    return {
      class: 'internal_service_role_only',
      revoke: ['PUBLIC', 'anon', 'authenticated'],
      grant: ['service_role'],
      rationale: 'Exact-identity proven server-side RPC/caller; service_role EXECUTE only',
    };
  }
  if (SERVICE_ROLE_RPC_ALLOWED_NAMES.has(name)) {
    return {
      class: 'migration_admin_or_internal',
      revoke: ['PUBLIC', 'anon', 'authenticated', 'service_role'],
      grant: [],
      rationale:
        'Function name is allowlisted but CREATE identity is not an exact signature match — fail closed',
    };
  }
  if (SENSITIVE_NAME_RE.test(name) || fn.securityDefiner) {
    return {
      class: 'migration_admin_or_internal',
      revoke: ['PUBLIC', 'anon', 'authenticated', 'service_role'],
      grant: [],
      rationale:
        'SECURITY DEFINER/sensitive name without proven exact-identity RPC caller — owner/admin only',
    };
  }
  return {
    class: 'migration_admin_or_internal',
    revoke: ['PUBLIC', 'anon', 'authenticated', 'service_role'],
    grant: [],
    rationale: 'No evidence-backed browser or service_role RPC contract',
  };
}

function formatRevokeTarget(fn) {
  const types = fn.identity.slice(fn.identity.indexOf('(') + 1, -1);
  return `public.${fn.name}(${types})`;
}

function buildDispositionInventory(sql, sliceVersion) {
  const creates = findCreateFunctionsDetailed(sql);
  const byIdentity = new Map();
  for (const fn of creates) {
    const disposition = classifyFunction(fn);
    byIdentity.set(fn.identity, {
      ...fn,
      sliceVersion: sliceVersion || null,
      disposition,
      classified: true,
    });
  }
  return [...byIdentity.values()];
}

function buildFunctionPrivilegeClosureSql(sql, opts = {}) {
  const inventory = buildDispositionInventory(sql, opts.sliceVersion);
  if (!inventory.length) {
    return {
      sql: '-- [ESC] Function privilege closure: no CREATE FUNCTION in this slice.\n',
      inventory: [],
      revokeCount: 0,
      grantCount: 0,
    };
  }
  const lines = [
    '-- [ESC] Function privilege closure before COMMIT',
    '-- Default PUBLIC EXECUTE removed for every application function created/replaced in this slice.',
    '-- Regrant only per disposition (service_role always; authenticated only for allowlisted RLS helpers).',
  ];
  let revokeCount = 0;
  let grantCount = 0;
  for (const fn of inventory) {
    const target = formatRevokeTarget(fn);
    const d = fn.disposition;
    lines.push(`-- disposition ${fn.identity} => ${d.class}`);
    for (const role of d.revoke) {
      lines.push(`REVOKE EXECUTE ON FUNCTION ${target} FROM ${role};`);
      revokeCount++;
    }
    for (const role of d.grant) {
      lines.push(`GRANT EXECUTE ON FUNCTION ${target} TO ${role};`);
      grantCount++;
    }
  }
  return {
    sql: lines.join('\n') + '\n',
    inventory,
    revokeCount,
    grantCount,
  };
}

/**
 * Inject privilege-closure SQL immediately before each executable COMMIT,
 * limited to functions whose CREATE appears before that COMMIT.
 */
function injectPrivilegeClosureBeforeCommits(sql, opts = {}) {
  const creates = findCreateFunctionsDetailed(sql);
  const inventory = buildDispositionInventory(sql, opts.sliceVersion);
  if (!creates.length) {
    return { sql, inventory: [], injections: 0, revokeCount: 0, grantCount: 0 };
  }

  const commits = [];
  let i = 0;
  const n = sql.length;
  while (i < n) {
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < n && sql[i] !== '\n') i++;
      continue;
    }
    if (sql[i] === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < n - 1 && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (sql[i] === '$') {
      const m = sql.slice(i).match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (m) {
        const tag = m[0];
        i += tag.length;
        const end = sql.indexOf(tag, i);
        i = end < 0 ? n : end + tag.length;
        continue;
      }
    }
    if (sql[i] === "'") {
      i++;
      while (i < n) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    const prev = i > 0 ? sql[i - 1] : ' ';
    if (!/[A-Za-z0-9_]/.test(prev)) {
      const m = /^(COMMIT(\s+(WORK|TRANSACTION))?)\s*;/i.exec(sql.slice(i));
      if (m) {
        commits.push({ index: i, length: m[0].length });
        i += m[0].length;
        continue;
      }
    }
    i++;
  }

  if (!commits.length) {
    const closure = buildFunctionPrivilegeClosureSql(sql, opts);
    return {
      sql: sql.trimEnd() + '\n\n' + closure.sql,
      inventory: closure.inventory,
      injections: 1,
      revokeCount: closure.revokeCount,
      grantCount: closure.grantCount,
    };
  }

  let out = sql;
  let injections = 0;
  let revokeCount = 0;
  let grantCount = 0;
  for (let c = commits.length - 1; c >= 0; c--) {
    const commit = commits[c];
    const due = inventory.filter((fn) => fn.index < commit.index);
    if (!due.length) continue;
    const bodyLines = [
      '-- [ESC] Function privilege closure before COMMIT',
      '-- Same-slice revoke of default PUBLIC EXECUTE (+ anon/authenticated per disposition).',
    ];
    for (const fn of due) {
      const target = formatRevokeTarget(fn);
      const d = fn.disposition;
      bodyLines.push(`-- disposition ${fn.identity} => ${d.class}`);
      for (const role of d.revoke) {
        bodyLines.push(`REVOKE EXECUTE ON FUNCTION ${target} FROM ${role};`);
        revokeCount++;
      }
      for (const role of d.grant) {
        bodyLines.push(`GRANT EXECUTE ON FUNCTION ${target} TO ${role};`);
        grantCount++;
      }
    }
    const block = bodyLines.join('\n') + '\n';
    out = out.slice(0, commit.index) + block + out.slice(commit.index);
    injections++;
  }
  return { sql: out, inventory, injections, revokeCount, grantCount };
}

/**
 * Overlay public.users grants: remove anon ALL; authenticated SELECT only (UPDATE fully revoked).
 * Also drops the stale FOR UPDATE own-row RLS policy so policy intent matches table privileges.
 */
function applyUsersAnonGrantOverlay(sql) {
  const marker = '-- [ESC] public.users privilege overlay';
  // Always re-apply from a clean grant shape so rebuilds are deterministic.
  let out = sql;
  out = out.replace(
    /GRANT\s+ALL\s+ON\s+TABLE\s+public\.users\s+TO\s+anon\s*;/gi,
    `${marker}: removed GRANT ALL TO anon (no anon client path; RLS is not justification for table ALL).\n-- HISTORICAL_TABLE_GRANT_REMOVED ALL ON TABLE public.users TO anon;`
  );
  out = out.replace(
    /GRANT\s+(?:ALL|SELECT\s*,\s*UPDATE|UPDATE\s*,\s*SELECT|SELECT|UPDATE)\s+ON\s+TABLE\s+public\.users\s+TO\s+authenticated\s*;/gi,
    `${marker}: authenticated SELECT only — UPDATE fully revoked (no browser UPDATE path; account/billing use service_role).\nGRANT SELECT ON TABLE public.users TO authenticated;\nREVOKE UPDATE ON TABLE public.users FROM authenticated;`
  );
  // Drop stale FOR UPDATE policy (privileges no longer allow authenticated UPDATE).
  out = out.replace(
    /DROP\s+POLICY\s+IF\s+EXISTS\s+"Users can update own record"\s+ON\s+public\.users\s*;\s*CREATE\s+POLICY\s+"Users can update own record"\s+ON\s+public\.users\s+FOR\s+UPDATE\s+USING\s*\(\s*auth\.uid\(\)\s*=\s*id\s*\)\s*;/gi,
    `DROP POLICY IF EXISTS "Users can update own record" ON public.users;\n${marker}: removed FOR UPDATE own-row policy (authenticated UPDATE fully revoked; SELECT policy retained).`
  );
  out = out.replace(
    /CREATE\s+POLICY\s+"Users can update own record"\s+ON\s+public\.users\s+FOR\s+UPDATE\s+USING\s*\(\s*auth\.uid\(\)\s*=\s*id\s*\)\s*;/gi,
    `${marker}: removed CREATE POLICY FOR UPDATE (stale after UPDATE revoke).\nDROP POLICY IF EXISTS "Users can update own record" ON public.users;`
  );
  if (!/DROP\s+POLICY\s+IF\s+EXISTS\s+"Users can update own record"\s+ON\s+public\.users/i.test(out)) {
    out += `\n${marker}: ensure stale UPDATE policy is absent.\n`;
    out += 'DROP POLICY IF EXISTS "Users can update own record" ON public.users;\n';
  }
  if (!/REVOKE\s+ALL\s+ON\s+TABLE\s+public\.users\s+FROM\s+anon/i.test(out)) {
    out += `\n${marker}: explicit deny for PUBLIC/anon table privileges.\n`;
    out += 'REVOKE ALL ON TABLE public.users FROM PUBLIC;\n';
    out += 'REVOKE ALL ON TABLE public.users FROM anon;\n';
  }
  if (!/REVOKE\s+UPDATE\s+ON\s+TABLE\s+public\.users\s+FROM\s+authenticated/i.test(out)) {
    out += `\n${marker}: ensure authenticated cannot UPDATE any column.\n`;
    out += 'REVOKE UPDATE ON TABLE public.users FROM authenticated;\n';
  }
  // Strip any column-level UPDATE grants to authenticated (fail-closed; allowlist empty)
  out = out.replace(
    /GRANT\s+UPDATE\s*\([^)]*\)\s+ON\s+TABLE\s+public\.users\s+TO\s+authenticated\s*;/gi,
    `${marker}: removed column-level UPDATE grant — authenticatedUpdateAllowlist is empty.\n-- HISTORICAL_COLUMN_UPDATE_GRANT_REMOVED ON public.users TO authenticated;`
  );
  return out;
}

/**
 * Ensure sp_write_anchor_batch remains owner/admin-only (no service_role EXECUTE)
 * when no proven runtime caller exists. Neutralizes source GRANT in major_1 lockdown.
 */
function applySpWriteAnchorBatchOwnerOnlyOverlay(sql) {
  const marker = '-- [ESC] sp_write_anchor_batch owner/admin-only';
  let out = sql.replace(
    /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.sp_write_anchor_batch\s*\([^)]*\)\s+TO\s+service_role\s*;/gi,
    `${marker}: no proven runtime .rpc() caller — REVOKE service_role (separate auth required before re-grant).\nREVOKE EXECUTE ON FUNCTION public.sp_write_anchor_batch(bigint,bigint,integer,text,jsonb,jsonb) FROM service_role;\nREVOKE EXECUTE ON FUNCTION public.sp_write_anchor_batch(int8,int8,int4,text,jsonb,jsonb) FROM service_role;`
  );
  if (!/REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.sp_write_anchor_batch[\s\S]{0,120}?FROM\s+service_role/i.test(out)) {
    out += `\n${marker}: fail-closed revoke.\n`;
    out +=
      'REVOKE EXECUTE ON FUNCTION public.sp_write_anchor_batch(bigint,bigint,integer,text,jsonb,jsonb) FROM service_role;\n';
    out +=
      'REVOKE EXECUTE ON FUNCTION public.sp_write_anchor_batch(int8,int8,int4,text,jsonb,jsonb) FROM service_role;\n';
  }
  return out;
}

/** True when no FOR UPDATE policy remains on public.users (contract: updateFullyRevoked). */
function assertNoUsersUpdatePolicy(sql) {
  if (!PUBLIC_USERS_COLUMN_CONTRACT.authenticatedUpdateFullyRevoked) return true;
  const cleaned = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
  return !/CREATE\s+POLICY\s+[\s\S]{0,120}?ON\s+public\.users\s+FOR\s+UPDATE\b/i.test(cleaned);
}

/**
 * Ensure publish_ledger_event CREATE includes locked search_path (create-time, not later ALTER-only).
 */
function hardenPublishLedgerEventCreate(sql) {
  return sql.replace(
    /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+public\.publish_ledger_event\s*\([\s\S]*?\)\s*RETURNS\s+TABLE\s*\([\s\S]*?\)\s*LANGUAGE\s+plpgsql\s*SECURITY\s+DEFINER(\s*SET\s+search_path\s*=\s*[^;\n]+)?\s*AS\s+/gi,
    (full) => {
      if (/SECURITY\s+DEFINER\s+SET\s+search_path\s*=\s*public,\s*pg_temp/i.test(full)) {
        return full;
      }
      return full.replace(
        /SECURITY\s+DEFINER(?:\s+SET\s+search_path\s*=\s*[^;\n]+)?\s*AS\s+/i,
        'SECURITY DEFINER\nSET search_path = public, pg_temp\nAS '
      );
    }
  );
}

function assertNoUsersAuthenticatedTableUpdate(sql) {
  const cleaned = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
  if (/GRANT\s+(ALL|UPDATE)\b[\s\S]{0,80}?ON\s+(TABLE\s+)?public\.users\s+TO\s+authenticated/i.test(cleaned)) {
    return false;
  }
  if (/GRANT\s+SELECT\s*,\s*UPDATE\s+ON\s+(TABLE\s+)?public\.users\s+TO\s+authenticated/i.test(cleaned)) {
    return false;
  }
  if (/GRANT\s+UPDATE\s*\([^)]*\)\s+ON\s+(TABLE\s+)?public\.users\s+TO\s+authenticated/i.test(cleaned)) {
    return false;
  }
  return true;
}

function assertNoUsersAnonAllGrant(sql) {
  const cleaned = stripCommentsForScan(sql);
  return !/GRANT\s+ALL\s+ON\s+(TABLE\s+)?public\.users\s+TO\s+anon\b/i.test(cleaned);
}

function sameSlicePublicRevokeGaps(sql) {
  const creates = findCreateFunctionsDetailed(sql);
  const revokes = findRevokeExecuteDetailed(sql);
  const gaps = [];
  for (const fn of creates) {
    const hasPublicAny = revokes.some((r) => r.identity === fn.identity && r.role === 'PUBLIC');
    if (!hasPublicAny) gaps.push(fn);
  }
  return gaps;
}

function engagementPostingPolicyOrder(modulesSqlByVersion) {
  let createVer = null;
  let enableVer = null;
  let createLine = null;
  let enableLine = null;
  for (const [version, sql] of Object.entries(modulesSqlByVersion)) {
    const cleaned = stripCommentsForScan(sql);
    const c = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?engagement_posting_policy\b/i.exec(
      cleaned
    );
    if (c && !createVer) {
      createVer = version;
      createLine = lineAt(cleaned, c.index);
    }
    const e =
      /ALTER\s+TABLE(?:\s+IF\s+EXISTS)?\s+(?:public\.)?engagement_posting_policy\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.exec(
        cleaned
      );
    if (e && !enableVer) {
      enableVer = version;
      enableLine = lineAt(cleaned, e.index);
    }
  }
  const okOrder =
    createVer &&
    enableVer &&
    createVer <= enableVer &&
    !(createVer === enableVer && enableLine != null && createLine != null && enableLine < createLine);
  return {
    createVer,
    enableVer,
    createLine,
    enableLine,
    okOrder,
    sameModule: createVer === enableVer,
  };
}

module.exports = {
  ANON_RPC_ALLOWLIST,
  AUTHENTICATED_HELPER_ALLOWLIST,
  SERVICE_ROLE_RPC_NAME_ALLOWLIST,
  SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST,
  SERVICE_ROLE_RPC_ALLOWED_NAMES,
  SERVICE_ROLE_RPC_CALLER_EVIDENCE,
  SP_WRITE_ANCHOR_BATCH_DISPOSITION,
  PUBLIC_USERS_COLUMN_CONTRACT,
  findCreateFunctionsDetailed,
  findRevokeExecuteDetailed,
  findGrantExecuteDetailed,
  classifyFunction,
  buildDispositionInventory,
  buildFunctionPrivilegeClosureSql,
  injectPrivilegeClosureBeforeCommits,
  applyUsersAnonGrantOverlay,
  applySpWriteAnchorBatchOwnerOnlyOverlay,
  hardenPublishLedgerEventCreate,
  assertNoUsersAnonAllGrant,
  assertNoUsersAuthenticatedTableUpdate,
  assertNoUsersUpdatePolicy,
  sameSlicePublicRevokeGaps,
  engagementPostingPolicyOrder,
  formatRevokeTarget,
};
