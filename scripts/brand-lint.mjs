#!/usr/bin/env node
// scripts/brand-lint.mjs
// Fails (exit 1) if any banned brand token appears under app/ or components/.
// Source of truth: docs/BRAND.md.
// Wired into: package.json "brand:lint" script and "build" script.

import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components"];
const SCAN_EXTENSIONS = new Set([".tsx", ".ts", ".css", ".jsx", ".js"]);

// Full-file exemptions (all rule tiers). These files MUST mention banned
// tokens by design: globals.css rewrites orange → gold via attribute
// selectors; AdvisacorLogo.tsx is the retired SVG component preserved
// for backcompat (no new imports — see docs/BRAND.md exceptions).
const EXEMPT_FILES = new Set([
  join("app", "globals.css"),
  join("components", "AdvisacorLogo.tsx"),
]);

// Marketing scope — Tier B rules apply ONLY to these files.
// Path matching is prefix-based against the POSIX relative path from repo root.
// Directory-scoped entries end with "/" and match any file under that prefix.
const MARKETING_SCOPE_PATHS = [
  "app/page.tsx",
  "app/pricing/page.tsx",
  "app/industries/page.tsx",
  "app/how-it-works/page.tsx",
  "app/what-it-does/page.tsx",
  "app/about/page.tsx",
  "app/privacy/page.tsx",
  "app/signup/page.tsx",
  "app/signin/page.tsx",
  "app/login/page.tsx",
  "app/free-review/page.tsx",
  "app/coming-soon/page.tsx",
  "app/support/page.tsx",
  "app/landing-preview/page.tsx",
  "app/industry-intelligence/page.tsx",
  "app/healthcare-intelligence/page.tsx",
  "app/for/",
  "components/SiteNav.tsx",
  "components/SiteFooter.tsx",
  "components/PersonaRouter.tsx",
  "components/site-ui.ts",
];

function isMarketingScope(relPosix) {
  for (const p of MARKETING_SCOPE_PATHS) {
    if (p.endsWith("/")) {
      if (relPosix.startsWith(p)) return true;
    } else {
      if (relPosix === p) return true;
    }
  }
  return false;
}

// Rules: { name, pattern (RegExp), category, tier }
// tier: "A" = global, "B" = marketing-scope only
const RULES = [
  // === Tier A — global bans ===

  // Colors (orange era)
  { name: "orange #FF7A1A", pattern: /#FF7A1A/i, category: "color", tier: "A" },
  { name: "orange #FFB36F", pattern: /#FFB36F/i, category: "color", tier: "A" },
  { name: "logo orange #D28A4A", pattern: /#D28A4A/i, category: "color", tier: "A" },
  { name: "tailwind orange #F97316", pattern: /#F97316/i, category: "color", tier: "A" },
  { name: "old blue #2146CF", pattern: /#2146CF/i, category: "color", tier: "A" },
  { name: "old blue #1E6BFF", pattern: /#1E6BFF/i, category: "color", tier: "A" },
  { name: "orange rgba", pattern: /rgba\(\s*255\s*,\s*122\s*,\s*26/i, category: "color", tier: "A" },

  // CSS classes
  { name: ".premium-button class", pattern: /\bpremium-button\b/, category: "css-class", tier: "A" },
  { name: ".advisacor-dark-grid class", pattern: /\badvisacor-dark-grid\b/, category: "css-class", tier: "A" },
  { name: ".dark-enterprise-card class", pattern: /\bdark-enterprise-card\b/, category: "css-class", tier: "A" },

  // Logo imports
  { name: "AdvisacorLogo import", pattern: /\bAdvisacorLogo\b/, category: "logo-import", tier: "A" },
  { name: "advisacor-logo.svg reference", pattern: /advisacor-logo\.svg/, category: "logo-import", tier: "A" },
  { name: "advisacor-logo-light.svg reference", pattern: /advisacor-logo-light\.svg/, category: "logo-import", tier: "A" },

  // === Tier B — marketing-scope only ===

  // Legacy marketing navy family
  { name: "legacy navy bg #0A1530", pattern: /#0A1530/i, category: "legacy-marketing", tier: "B" },
  { name: "legacy navy bg #0A1020", pattern: /#0A1020/i, category: "legacy-marketing", tier: "B" },
  { name: "legacy tier navy #0F1D3E", pattern: /#0F1D3E/i, category: "legacy-marketing", tier: "B" },
  { name: "legacy alt-section #0F0F10", pattern: /#0F0F10/i, category: "legacy-marketing", tier: "B" },
  { name: "legacy emphasis card #141416", pattern: /#141416/i, category: "legacy-marketing", tier: "B" },
  { name: "legacy CTA ink #0B0B0C", pattern: /#0B0B0C/i, category: "legacy-marketing", tier: "B" },
  { name: "legacy CTA hover #D4B672", pattern: /#D4B672/i, category: "legacy-marketing", tier: "B" },
  { name: "legacy CTA hover #D9B972", pattern: /#D9B972/i, category: "legacy-marketing", tier: "B" },

  // Legacy light-mode cool-slate family
  { name: "legacy cool slate bg #F5F7FA", pattern: /#F5F7FA/i, category: "legacy-marketing", tier: "B" },
  { name: "legacy cool near-black #111827", pattern: /#111827/i, category: "legacy-marketing", tier: "B" },
  { name: "legacy slate gradient from-slate-200", pattern: /\bfrom-slate-200\b/, category: "legacy-marketing", tier: "B" },
  { name: "legacy slate gradient via-slate-300", pattern: /\bvia-slate-300\b/, category: "legacy-marketing", tier: "B" },
  { name: "legacy slate gradient to-slate-400", pattern: /\bto-slate-400\b/, category: "legacy-marketing", tier: "B" },
];

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const entry of entries) {
    const p = join(dir, entry);
    let s;
    try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      walk(p, out);
    } else if (s.isFile()) {
      const dot = entry.lastIndexOf(".");
      const ext = dot >= 0 ? entry.slice(dot) : "";
      if (SCAN_EXTENSIONS.has(ext)) out.push(p);
    }
  }
  return out;
}

const files = [];
for (const d of SCAN_DIRS) files.push(...walk(join(ROOT, d)));

const offenders = [];
for (const abs of files) {
  const relOs = relative(ROOT, abs);
  const relPosix = relOs.split(sep).join("/");
  const inMarketing = isMarketingScope(relPosix);
  const content = readFileSync(abs, "utf8");
  const lines = content.split("\n");
  for (const rule of RULES) {
    if (EXEMPT_FILES.has(relOs)) continue;
    if (rule.tier === "B" && !inMarketing) continue;
    for (let i = 0; i < lines.length; i++) {
      if (rule.pattern.test(lines[i])) {
        offenders.push({
          file: relPosix,
          line: i + 1,
          rule: rule.name,
          tier: rule.tier,
          snippet: lines[i].trim().slice(0, 140),
        });
      }
    }
  }
}

if (offenders.length === 0) {
  console.log(`brand-lint: PASS — no banned tokens found in ${files.length} scanned files.`);
  process.exit(0);
}

console.error("brand-lint: FAIL — banned brand tokens found. See docs/BRAND.md for canonical replacements.\n");
const byFile = new Map();
for (const o of offenders) {
  if (!byFile.has(o.file)) byFile.set(o.file, []);
  byFile.get(o.file).push(o);
}
for (const [file, list] of byFile) {
  console.error(`  ${file}`);
  for (const o of list) {
    console.error(`    L${o.line}  [tier ${o.tier}] [${o.rule}]  ${o.snippet}`);
  }
}
const tierA = offenders.filter(o => o.tier === "A").length;
const tierB = offenders.filter(o => o.tier === "B").length;
console.error(`\nTotal offenders: ${offenders.length} (Tier A: ${tierA}, Tier B: ${tierB}) across ${byFile.size} file(s).`);
console.error("Fix them or reference docs/BRAND.md for the canonical token to use.");
process.exit(1);
