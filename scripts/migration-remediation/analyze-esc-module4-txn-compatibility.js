#!/usr/bin/env node
/**
 * Part A: PostgreSQL-aware transaction-boundary classification for ESC module 4.
 * Read-only analysis — does not modify candidate.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '../..');
const MOD4 = path.join(
  ROOT,
  'supabase/migrations-draft/executable-squash-candidate/modules/20260907010030_esc_application_schema_and_security_atomic.sql'
);
const OUT = path.join(
  ROOT,
  'docs/migration-remediation/evidence/executable-squash-candidate-module4-txn-compatibility.json'
);

/**
 * Lex SQL into segments, stripping comments/strings/dollar-quotes for executable scan,
 * while retaining original offsets for reporting.
 */
function scanExecutableTxnControls(sql) {
  const controls = [];
  let i = 0;
  const n = sql.length;
  let line = 1;
  let lineStart = 0;

  function atLine(idx) {
    // approximate from last known — recompute
    return sql.slice(0, idx).split('\n').length;
  }

  while (i < n) {
    const c = sql[i];
    const c2 = sql[i + 1];

    // line comment
    if (c === '-' && c2 === '-') {
      while (i < n && sql[i] !== '\n') i++;
      continue;
    }
    // block comment
    if (c === '/' && c2 === '*') {
      i += 2;
      while (i < n - 1 && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    // dollar quote
    if (c === '$') {
      const m = sql.slice(i).match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (m) {
        const tag = m[0];
        i += tag.length;
        const end = sql.indexOf(tag, i);
        if (end < 0) {
          i = n;
          break;
        }
        i = end + tag.length;
        continue;
      }
    }
    // single-quoted string
    if (c === "'") {
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
    // double-quoted identifier
    if (c === '"') {
      i++;
      while (i < n) {
        if (sql[i] === '"' && sql[i + 1] === '"') {
          i += 2;
          continue;
        }
        if (sql[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // Match txn keywords at token boundary
    const rest = sql.slice(i);
    const txn =
      /^(BEGIN|START\s+TRANSACTION|COMMIT|END|ROLLBACK|SAVEPOINT|RELEASE\s+SAVEPOINT|ROLLBACK\s+TO(\s+SAVEPOINT)?)\b/i.exec(
        rest
      );
    if (txn) {
      // Ensure start is token boundary
      const prev = i > 0 ? sql[i - 1] : ' ';
      if (/[A-Za-z0-9_]/.test(prev)) {
        i++;
        continue;
      }
      const kind = txn[1].replace(/\s+/g, ' ').toUpperCase();
      // Look ahead for optional ; or whitespace-only then ;
      let j = i + txn[0].length;
      while (j < n && /[ \t\r\n]/.test(sql[j])) j++;
      // WORK / TRANSACTION optional after BEGIN/COMMIT/ROLLBACK
      const opt = /^(WORK|TRANSACTION)\b/i.exec(sql.slice(j));
      if (opt && /^(BEGIN|COMMIT|ROLLBACK)$/i.test(kind.split(' ')[0])) {
        j += opt[0].length;
        while (j < n && /[ \t\r\n]/.test(sql[j])) j++;
      }
      // For ROLLBACK TO SAVEPOINT name
      if (/^ROLLBACK\s+TO/i.test(kind)) {
        const id = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(sql.slice(j));
        if (id) {
          j += id[0].length;
          while (j < n && /[ \t\r\n]/.test(sql[j])) j++;
        }
      }
      const hasSemi = sql[j] === ';';
      // Only count as executable control if it's a statement (semicolon or end of meaningful stmt).
      // In PostgreSQL scripts, BEGIN; COMMIT; are statements. Bare BEGIN inside DO is different —
      // those appear inside dollar quotes which we already skipped.
      if (hasSemi || kind === 'BEGIN' || kind.startsWith('START') || kind === 'COMMIT' || kind === 'END' || kind.startsWith('ROLLBACK') || kind.startsWith('SAVEPOINT') || kind.startsWith('RELEASE')) {
        controls.push({
          kind: kind.split(' ')[0] === 'START' ? 'START TRANSACTION' : kind.replace(/\s+TRANSACTION$/i, '').replace(/\s+WORK$/i, ''),
          raw: txn[0],
          index: i,
          line: atLine(i),
          hasSemicolon: hasSemi,
        });
        i = hasSemi ? j + 1 : i + txn[0].length;
        continue;
      }
    }
    i++;
  }
  return controls;
}

function findIncompatible(sql) {
  // Scan only outside comments/strings/dollar-quotes by using a simplified strip
  const findings = [];
  const patterns = [
    { code: 'CREATE_INDEX_CONCURRENTLY', re: /CREATE\s+(UNIQUE\s+)?INDEX\s+CONCURRENTLY/gi },
    { code: 'DROP_INDEX_CONCURRENTLY', re: /DROP\s+INDEX\s+CONCURRENTLY/gi },
    { code: 'REINDEX', re: /\bREINDEX\b/gi },
    { code: 'VACUUM', re: /\bVACUUM\b/gi },
    { code: 'CREATE_DATABASE', re: /CREATE\s+DATABASE\b/gi },
    { code: 'DROP_DATABASE', re: /DROP\s+DATABASE\b/gi },
    { code: 'CREATE_TABLESPACE', re: /CREATE\s+TABLESPACE\b/gi },
    { code: 'ALTER_SYSTEM', re: /ALTER\s+SYSTEM\b/gi },
    // ALTER TYPE ADD VALUE cannot run inside a transaction block in older PG; PG 12+ allows in some cases
    { code: 'ALTER_TYPE_ADD_VALUE', re: /ALTER\s+TYPE\s+\S+\s+ADD\s+VALUE\b/gi },
    { code: 'CREATE_EXTENSION', re: /CREATE\s+EXTENSION\b/gi },
    { code: 'ALTER_EXTENSION', re: /ALTER\s+EXTENSION\b/gi },
  ];

  // Strip for false-positive reduction
  let stripped = '';
  let i = 0;
  const n = sql.length;
  const map = []; // stripped index -> original
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
    map[stripped.length] = i;
    stripped += sql[i];
    i++;
  }

  for (const p of patterns) {
    let m;
    const re = new RegExp(p.re.source, p.re.flags);
    while ((m = re.exec(stripped))) {
      const origIdx = map[m.index] ?? 0;
      findings.push({
        code: p.code,
        match: m[0],
        index: origIdx,
        line: sql.slice(0, origIdx).split('\n').length,
      });
    }
  }
  return findings;
}

function mapControlsToSources(sql, controls) {
  // Build source ranges from >>> begin / <<< end markers
  const markers = [];
  const beginRe = /-- >>> begin ([^\n]+)\n/g;
  let m;
  while ((m = beginRe.exec(sql))) {
    markers.push({ file: m[1].trim(), start: m.index, type: 'begin' });
  }
  // Also security section / remediation
  const sec = sql.indexOf('-- --- security / RLS / grants / revokes');
  if (sec >= 0) markers.push({ file: '__security_section__', start: sec, type: 'section' });
  const rem = sql.indexOf('-- >>> begin ESC_REMEDIATION_MODULE_BOUNDARY_SECURITY');
  if (rem >= 0) markers.push({ file: 'ESC_REMEDIATION_MODULE_BOUNDARY_SECURITY', start: rem, type: 'patch' });

  markers.sort((a, b) => a.start - b.start);

  function sourceAt(idx) {
    let cur = { file: '__module_header__', type: 'header' };
    for (const mk of markers) {
      if (mk.start <= idx) cur = mk;
      else break;
    }
    return cur;
  }

  return controls.map((c) => ({ ...c, source: sourceAt(c.index) }));
}

function main() {
  const sql = fs.readFileSync(MOD4, 'utf8');
  const controls = scanExecutableTxnControls(sql);
  const mapped = mapControlsToSources(sql, controls);
  const incompatible = findIncompatible(sql);

  const byKind = {};
  for (const c of mapped) {
    byKind[c.kind] = (byKind[c.kind] || 0) + 1;
  }

  // Pair BEGIN/COMMIT roughly
  const pairs = [];
  const stack = [];
  for (const c of mapped) {
    const k = c.kind.toUpperCase();
    if (k === 'BEGIN' || k === 'START TRANSACTION') {
      stack.push(c);
    } else if (k === 'COMMIT' || k === 'END') {
      const open = stack.pop();
      pairs.push({ open, close: c, sourceFile: open?.source?.file || c.source.file });
    } else if (k.startsWith('ROLLBACK')) {
      pairs.push({ open: stack.pop() || null, close: c, rollback: true, sourceFile: c.source.file });
    }
  }

  const bySource = {};
  for (const p of pairs) {
    const f = p.sourceFile || 'unknown';
    bySource[f] = (bySource[f] || 0) + 1;
  }

  // Size / risk assessment
  const bytes = Buffer.byteLength(sql, 'utf8');
  const risk = {
    utf8Bytes: bytes,
    approxStatements: sql.replace(/--.*$/gm, '').split(';').filter((s) => s.trim()).length,
    beginCount: byKind.BEGIN || 0,
    commitCount: byKind.COMMIT || 0,
    incompatibleCount: incompatible.length,
    singleTxnCompatible: incompatible.length === 0,
    sizeRisk:
      bytes > 800000
        ? 'HIGH_PAYLOAD_TIMEOUT_LOCK_RISK'
        : bytes > 400000
          ? 'MEDIUM'
          : 'LOW',
    recommendation:
      incompatible.length === 0 && bytes > 800000
        ? 'OPTION_2_PREFERRED_DUE_TO_SIZE_LOCK_RISK_DESPITE_STATEMENT_COMPATIBILITY'
        : incompatible.length === 0
          ? 'OPTION_1_TRUE_SINGLE_TRANSACTION'
          : 'OPTION_2_SECURE_MULTI_VERSION_SPLIT',
  };

  // Auth asked: choose based on compatibility AND size. ~1MB single txn has credible timeout/lock risk
  // on Supabase dashboard/CLI. Prefer Option 2 if HIGH size risk even if statements are compatible,
  // OR Option 1 if we strip and wrap — auth says "not force a giant transaction blindly".
  // So recommendation = Option 2 when HIGH size risk.

  const report = {
    generatedAt: new Date().toISOString(),
    module: '20260907010030_esc_application_schema_and_security_atomic',
    lexer: 'comment_string_dollarquote_aware',
    controlCountsByKind: byKind,
    controlTotal: controls.length,
    nestedPairsApprox: pairs.length,
    unpairedBegin: stack.length,
    controlsSample: mapped.slice(0, 20),
    pairsBySourceFile: bySource,
    pairSourceCount: Object.keys(bySource).length,
    incompatibleStatements: incompatible,
    risk,
    chosenModelHint: risk.recommendation,
  };

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(
    JSON.stringify(
      {
        byKind,
        pairs: pairs.length,
        incompatible: incompatible.length,
        incompatibleCodes: [...new Set(incompatible.map((x) => x.code))],
        risk,
        out: OUT,
        sourceFilesWithPairs: Object.keys(bySource).length,
      },
      null,
      2
    )
  );
}

main();
