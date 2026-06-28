#!/usr/bin/env node
/**
 * Diff gap register triage counts between two git refs.
 * Usage: node scripts/gap-register-diff.js HEAD~1 HEAD
 */
const { execSync } = require("node:child_process");
const { readFileSync } = require("node:fs");

const [fromRef = "HEAD~1", toRef = "HEAD"] = process.argv.slice(2);

function load(ref) {
  const raw = execSync(`git show ${ref}:reports/g7-gap-register.json`, { encoding: "utf8" });
  return JSON.parse(raw);
}

function tally(register) {
  const counts = { "fix-now": 0, "document-limitation": 0, "defer-to-future": 0, satisfied: 0, null: 0 };
  for (const gap of register.gaps) {
    const key = gap.triage ?? "null";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

const before = load(fromRef);
const after = load(toRef);
const beforeCounts = tally(before);
const afterCounts = tally(after);

const moved = [];
for (const gap of after.gaps) {
  const prev = before.gaps.find((entry) => entry.id === gap.id);
  if (prev && prev.triage !== gap.triage) {
    moved.push({ id: gap.id, from: prev.triage, to: gap.triage, closed_in: gap.closed_in });
  }
}

console.log("before", beforeCounts);
console.log("after", afterCounts);
console.log("moved", moved.length);
for (const row of moved) {
  console.log(`${row.id}: ${row.from} -> ${row.to}${row.closed_in ? ` (${row.closed_in})` : ""}`);
}
