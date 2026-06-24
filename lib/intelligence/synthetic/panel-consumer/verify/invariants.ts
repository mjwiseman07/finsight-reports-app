import fs from "fs";
import path from "path";

const PANEL_CONSUMER_ROOT = path.join(
  __dirname,
  "..",
);

const PHASE39_WHITELIST = [
  "phase39/module-12/types",
  "phase39/module-12",
  "phase39/module-10/types",
  "phase39/module-10",
];

const FORBIDDEN_IO_PATTERNS = [
  /\bfetch\s*\(/,
  /\bhttp\.request\b/,
  /\bhttps\.request\b/,
  /\bnodemailer\b/,
  /\bsmtp\b/,
  /\bfs\.readFile\b/,
  /\bfs\.writeFile\b/,
];

function walkFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, acc);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      acc.push(fullPath);
    }
  }
  return acc;
}

export function assertPhase39LockImports(): string[] {
  const violations: string[] = [];
  const files = walkFiles(PANEL_CONSUMER_ROOT);
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const importMatches = content.matchAll(/from\s+["']([^"']*phase39[^"']*)["']/g);
    for (const match of importMatches) {
      const importPath = match[1].replace(/\\/g, "/");
      const allowed = PHASE39_WHITELIST.some((entry) => importPath.endsWith(entry));
      if (!allowed) {
        violations.push(`${path.relative(PANEL_CONSUMER_ROOT, file)} imports ${importPath}`);
      }
    }
  }
  return violations;
}

export function assertPhase38OnlyExternalIO(): string[] {
  const violations: string[] = [];
  const files = walkFiles(PANEL_CONSUMER_ROOT);
  for (const file of files) {
    const relative = path.relative(PANEL_CONSUMER_ROOT, file).replace(/\\/g, "/");
    if (relative.startsWith("verify/")) {
      continue;
    }
    const content = fs.readFileSync(file, "utf8");
    for (const pattern of FORBIDDEN_IO_PATTERNS) {
      if (pattern.test(content)) {
        const inExecution = relative.startsWith("execution/");
        const usesPhase38Transport = content.includes("phase38/transports");
        if (!inExecution || !usesPhase38Transport) {
          violations.push(`${relative} matches forbidden I/O pattern ${pattern}`);
        }
      }
    }
  }
  return violations;
}

export function assertRoleAdapterBridgeSingleton(): string[] {
  const violations: string[] = [];
  const files = walkFiles(PANEL_CONSUMER_ROOT);
  for (const file of files) {
    const relative = path.relative(PANEL_CONSUMER_ROOT, file).replace(/\\/g, "/");
    if (relative === "routing/escalation-bridge.ts") {
      continue;
    }
    const content = fs.readFileSync(file, "utf8");
    if (/from\s+["'][^"']*role-adapter[^"']*["']/.test(content)) {
      violations.push(`${relative} imports role-adapter outside escalation-bridge`);
    }
  }
  return violations;
}

export function assertLockedPathsUntouched(repoRoot: string): string[] {
  const lockedPaths = [
    "lib/intelligence/synthetic/roles",
    "lib/intelligence/synthetic/standards/resolver",
    "lib/intelligence/synthetic/role-adapter",
  ];
  const violations: string[] = [];
  for (const locked of lockedPaths) {
    const full = path.join(repoRoot, locked);
    if (!fs.existsSync(full)) {
      violations.push(`expected locked path missing: ${locked}`);
    }
  }
  return violations;
}
