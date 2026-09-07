'use strict';
/**
 * ESC privilege remediation helpers (candidate authoring / review only).
 * Does not execute SQL. Uses Option D function-identity parsing for overload-safe revokes.
 */
const {
  identityFromNameAndArgs,
  parseRoutineHead,
} = require('./option-d-function-identity');

/** Evidence-backed anonymous RPC allowlist — empty after third-review fail-closed. */
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
    /_(trg|trigger)$/i.test(fn.name) ||
    /prevent_|touch_|immutable|enforce_|guard_|reject_|before_insert|before_update|after_/i.test(fn.name)
  ) {
    return {
      class: 'trigger_only',
      revoke: ['PUBLIC', 'anon', 'authenticated'],
      grant: ['service_role'],
      rationale: 'Trigger/immutability helper — not a browser RPC',
    };
  }
  if (SENSITIVE_NAME_RE.test(fn.name) || fn.securityDefiner) {
    return {
      class: 'internal_service_role_only',
      revoke: ['PUBLIC', 'anon', 'authenticated'],
      grant: ['service_role'],
      rationale:
        'Fail-closed: sensitive/SECURITY DEFINER or internal write path; lib callers use service_role',
    };
  }
  return {
    class: 'migration_admin_or_internal',
    revoke: ['PUBLIC', 'anon', 'authenticated'],
    grant: ['service_role'],
    rationale: 'No evidence-backed browser RPC contract; revoke PUBLIC/anon/authenticated',
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
 * Overlay public.users grants: remove anon ALL; narrow authenticated to SELECT/UPDATE.
 */
function applyUsersAnonGrantOverlay(sql) {
  const marker = '-- [ESC] public.users privilege overlay';
  if (sql.includes(marker)) return sql;
  let out = sql;
  out = out.replace(
    /GRANT\s+ALL\s+ON\s+TABLE\s+public\.users\s+TO\s+anon\s*;/gi,
    `${marker}: removed GRANT ALL TO anon (no anon client path; RLS is not justification for table ALL).\n-- HISTORICAL_TABLE_GRANT_REMOVED ALL ON TABLE public.users TO anon;`
  );
  out = out.replace(
    /GRANT\s+ALL\s+ON\s+TABLE\s+public\.users\s+TO\s+authenticated\s*;/gi,
    `${marker}: narrowed authenticated from ALL to SELECT, UPDATE (own-row policies only).\nGRANT SELECT, UPDATE ON TABLE public.users TO authenticated;`
  );
  if (!/REVOKE\s+ALL\s+ON\s+TABLE\s+public\.users\s+FROM\s+anon/i.test(out)) {
    out += `\n${marker}: explicit deny for PUBLIC/anon table privileges.\n`;
    out += 'REVOKE ALL ON TABLE public.users FROM PUBLIC;\n';
    out += 'REVOKE ALL ON TABLE public.users FROM anon;\n';
  }
  return out;
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
  findCreateFunctionsDetailed,
  findRevokeExecuteDetailed,
  findGrantExecuteDetailed,
  classifyFunction,
  buildDispositionInventory,
  buildFunctionPrivilegeClosureSql,
  injectPrivilegeClosureBeforeCommits,
  applyUsersAnonGrantOverlay,
  assertNoUsersAnonAllGrant,
  sameSlicePublicRevokeGaps,
  engagementPostingPolicyOrder,
  formatRevokeTarget,
};
