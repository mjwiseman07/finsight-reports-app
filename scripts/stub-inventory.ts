/**
 * Advisacor Stub Inventory Scanner v1.0.0 — LOCK-G2.0
 * AST-based diagnostic inventory; no production code mutation.
 */
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";

const TOOL = "advisacor-stub-inventory";
const VERSION = "1.0.0";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPORTS_DIR = join(ROOT, "reports");

type Vertical =
  | "FA"
  | "HC"
  | "GC"
  | "CON"
  | "PS"
  | "SAAS"
  | "NPO"
  | "MFG"
  | "RTL"
  | "CONTROL"
  | "SHARED";
type Domain = "kpi" | "disclosure" | "audit" | "panel" | "framework" | "compute";
type Complexity = "LOW" | "MEDIUM" | "HIGH";
type SignalKind = "hard" | "soft";
type PatternId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const SCAN_ROOTS = [
  "src",
  "architecture-lane",
  "kpi",
  "industry",
  "industry-profiles",
  "lib",
  "libraries",
] as const;

const VERTICAL_FILTERS = new Set<Vertical>([
  "FA",
  "HC",
  "GC",
  "CON",
  "PS",
  "SAAS",
  "NPO",
  "MFG",
  "RTL",
  "CONTROL",
  "SHARED",
]);

const TRANSFORM_NAME =
  /^(build|compute|evaluate|transform|parse|derive|calculate|convert|normalize|map|process|resolve|load)/i;

interface StubRecord {
  id: string;
  filePath: string;
  line: number;
  column: number;
  functionName: string | null;
  signal: SignalKind;
  pattern: PatternId;
  vertical: Vertical;
  domain: Domain;
  complexity: Complexity;
  signaturePreview: string;
  bodyPreview: string;
}

interface CountMap {
  FA: number;
  HC: number;
  GC: number;
  CON: number;
  PS: number;
  SAAS: number;
  NPO: number;
  MFG: number;
  RTL: number;
  CONTROL: number;
  SHARED: number;
}

interface DomainCountMap {
  kpi: number;
  disclosure: number;
  audit: number;
  panel: number;
  framework: number;
  compute: number;
}

interface ComplexityCountMap {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
}

interface InventoryReport {
  tool: string;
  version: string;
  generatedAt: string;
  gitSha: string;
  gitBranch: string;
  atlasVersion: string;
  scanDurationMs: number;
  totals: {
    all: number;
    hard: number;
    soft: number;
    byVertical: CountMap;
    byVerticalHard: CountMap;
    byVerticalSoft: CountMap;
    byDomain: DomainCountMap;
    byDomainHard: DomainCountMap;
    byDomainSoft: DomainCountMap;
    byComplexity: ComplexityCountMap;
    byComplexityHard: ComplexityCountMap;
    byComplexitySoft: ComplexityCountMap;
  };
  stubs: StubRecord[];
  anomalies: string[];
  diffFromSha: string | null;
  diffDelta: { added: number; removed: number } | null;
}

interface CliOptions {
  vertical: Vertical | null;
  jsonOnly: boolean;
  diffSha: string | null;
}

interface FunctionTarget {
  node: ts.FunctionLikeDeclaration;
  name: string | null;
  line: number;
  column: number;
}

interface ParsedFile {
  relPath: string;
  absPath: string;
  sourceFile: ts.SourceFile;
  content: string;
  interfaceMethodNames: Set<string>;
  exportedSymbols: string[];
  reExportOnly: boolean;
}

function emptyCountMap(): CountMap {
  return {
    FA: 0,
    HC: 0,
    GC: 0,
    CON: 0,
    PS: 0,
    SAAS: 0,
    NPO: 0,
    MFG: 0,
    RTL: 0,
    CONTROL: 0,
    SHARED: 0,
  };
}

function emptyDomainMap(): DomainCountMap {
  return {
    kpi: 0,
    disclosure: 0,
    audit: 0,
    panel: 0,
    framework: 0,
    compute: 0,
  };
}

function emptyComplexityMap(): ComplexityCountMap {
  return { LOW: 0, MEDIUM: 0, HIGH: 0 };
}

function toPosixPath(filePath: string): string {
  return filePath.split(sep).join("/");
}

function runGit(command: string): string {
  return execSync(`git ${command}`, { cwd: ROOT, encoding: "utf8" }).trim();
}

function readAtlasVersion(): string {
  const atlasPath = join(ROOT, "Advisacor_Phase_Atlas_v1.md");
  if (!existsSync(atlasPath)) {
    return "unknown";
  }
  const match = readFileSync(atlasPath, "utf8").match(/Atlas — v([\d.]+)/);
  return match?.[1] ?? "unknown";
}

function parseCli(argv: string[]): CliOptions {
  const options: CliOptions = {
    vertical: null,
    jsonOnly: false,
    diffSha: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json-only") {
      options.jsonOnly = true;
      continue;
    }
    if (arg === "--vertical") {
      const value = argv[i + 1]?.toUpperCase() as Vertical | undefined;
      if (!value || !VERTICAL_FILTERS.has(value)) {
        throw new Error(`Invalid --vertical value: ${argv[i + 1] ?? ""}`);
      }
      options.vertical = value;
      i += 1;
      continue;
    }
    if (arg === "--diff") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--diff requires a git SHA");
      }
      options.diffSha = value;
      i += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp(): void {
  process.stdout.write(`Usage: pnpm stub:inventory [options]

Options:
  --vertical <VERTICAL>  Filter to FA|HC|GC|CON|PS|SAAS|NPO|MFG|RTL|CONTROL|SHARED
  --json-only            Write JSON only (skip markdown)
  --diff <sha>           Compare totals against prior inventory at SHA
`);
}

function shouldExclude(relPath: string): boolean {
  const normalized = toPosixPath(relPath).toLowerCase();

  if (normalized.includes("/node_modules/")) {
    return true;
  }
  if (normalized.startsWith("tests/") || normalized.includes("/tests/")) {
    return true;
  }
  if (normalized.startsWith("scripts/") || normalized.includes("/scripts/")) {
    return true;
  }
  if (normalized.includes("/architecture-lane/k-v-cases/")) {
    return true;
  }
  if (normalized.includes("/architecture-lane/verifier-42-7f/")) {
    return true;
  }
  if (/\.(test|spec)\.(ts|tsx)$/.test(normalized)) {
    return true;
  }

  return false;
}

function isTypeScriptFile(fileName: string): boolean {
  return fileName.endsWith(".ts") || fileName.endsWith(".tsx");
}

function collectFilesFromRoot(rootRel: string, out: string[]): void {
  const absRoot = join(ROOT, rootRel);
  if (!existsSync(absRoot)) {
    return;
  }

  const walk = (currentAbs: string): void => {
    const entries = readdirSync(currentAbs, { withFileTypes: true });
    for (const entry of entries) {
      const absPath = join(currentAbs, entry.name);
      const relPath = toPosixPath(relative(ROOT, absPath));
      if (entry.isDirectory()) {
        if (shouldExclude(`${relPath}/`)) {
          continue;
        }
        walk(absPath);
        continue;
      }
      if (!entry.isFile() || !isTypeScriptFile(entry.name)) {
        continue;
      }
      if (shouldExclude(relPath)) {
        continue;
      }
      out.push(relPath);
    }
  };

  walk(absRoot);
}

function collectScanFiles(): string[] {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) {
    collectFilesFromRoot(root, files);
  }
  return [...new Set(files)].sort();
}

function getLineAndColumn(sourceFile: ts.SourceFile, pos: number): { line: number; column: number } {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
  return { line: line + 1, column: character + 1 };
}

function previewText(sourceFile: ts.SourceFile, node: ts.Node, maxLen = 160): string {
  const text = sourceFile.text.slice(node.getStart(sourceFile), node.getEnd()).replace(/\s+/g, " ").trim();
  return text.length <= maxLen ? text : `${text.slice(0, maxLen - 3)}...`;
}

function getParameterName(param: ts.ParameterDeclaration): string | null {
  if (ts.isIdentifier(param.name)) {
    return param.name.text;
  }
  return null;
}

function getFunctionBody(node: ts.FunctionLikeDeclaration): ts.ConciseBody | undefined {
  return node.body;
}

function countBodyLines(sourceFile: ts.SourceFile, body: ts.ConciseBody): number {
  const text = sourceFile.text.slice(body.getStart(sourceFile), body.getEnd());
  return text.split(/\r?\n/).length;
}

function hasGenericTypeParameters(node: ts.FunctionLikeDeclaration): boolean {
  return (node.typeParameters?.length ?? 0) > 0;
}

function computeComplexity(
  sourceFile: ts.SourceFile,
  node: ts.FunctionLikeDeclaration,
): Complexity {
  const body = getFunctionBody(node);
  const paramCount = node.parameters.length;
  const generic = hasGenericTypeParameters(node);

  let bodyLines = 1;
  if (body) {
    bodyLines = countBodyLines(sourceFile, body);
  }

  if (generic || bodyLines > 20 || paramCount > 4) {
    return "HIGH";
  }
  if (bodyLines >= 6 || (paramCount >= 2 && paramCount <= 4)) {
    return "MEDIUM";
  }
  if (bodyLines <= 5 && paramCount <= 1) {
    return "LOW";
  }
  return "MEDIUM";
}

function matchVertical(relPath: string): Vertical {
  const path = toPosixPath(relPath).toLowerCase();
  const matches = new Set<Vertical>();

  const add = (vertical: Vertical): void => {
    matches.add(vertical);
  };

  if (path.includes("fund-accounting") || /(^|\/)(fa|fa-)/.test(path)) {
    add("FA");
  }
  if (path.includes("healthcare") || /(^|\/)(hc|hc-)/.test(path)) {
    add("HC");
  }
  if (path.includes("govcon") || /(^|\/)(gc|gc-)/.test(path)) {
    add("GC");
  }
  if (path.includes("construction") || /(^|\/)(con-1|con-)/.test(path) || /\/con\//.test(path)) {
    add("CON");
  }
  if (path.includes("prof-services") || /(^|\/)(ps|ps-)/.test(path)) {
    add("PS");
  }
  if (path.includes("saas")) {
    add("SAAS");
  }
  if (path.includes("nonprofit") || path.includes("npo")) {
    add("NPO");
  }
  if (path.includes("manufacturing") || path.includes("mfg")) {
    add("MFG");
  }
  if (path.includes("retail") || path.includes("rtl")) {
    add("RTL");
  }

  if (matches.size === 0) {
    return "CONTROL";
  }
  if (matches.size > 1) {
    return "SHARED";
  }
  return [...matches][0] ?? "CONTROL";
}

function matchDomain(relPath: string): Domain {
  const normalized = toPosixPath(relPath).toLowerCase();
  const fileName = normalized.split("/").pop() ?? normalized;

  if (normalized.startsWith("kpi/") || normalized.includes("/kpi/")) {
    return "kpi";
  }
  if (fileName.includes("disclosure")) {
    return "disclosure";
  }
  if (fileName.includes("audit")) {
    return "audit";
  }
  if (fileName.includes("panel-decision")) {
    return "panel";
  }
  if (fileName.includes("framework") || fileName.includes("binding")) {
    return "framework";
  }
  return "compute";
}

function extractStringLiteralValue(
  node: ts.Expression | undefined,
  sourceFile: ts.SourceFile,
): string | null {
  if (!node) {
    return null;
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isTemplateExpression(node)) {
    const head = node.head.text;
    const spans = node.templateSpans.map((span) => span.literal.text).join("");
    return `${head}${spans}`;
  }
  if (ts.isParenthesizedExpression(node)) {
    return extractStringLiteralValue(node.expression, sourceFile);
  }
  return null;
}

function isStubThrowStatement(stmt: ts.ThrowStatement, sourceFile: ts.SourceFile): boolean {
  const expr = stmt.expression;
  if (!ts.isNewExpression(expr)) {
    return false;
  }
  const ctor = expr.expression;
  if (!ts.isIdentifier(ctor) || ctor.text !== "Error") {
    return false;
  }
  const message = extractStringLiteralValue(expr.arguments?.[0], sourceFile);
  if (!message) {
    return false;
  }
  const lower = message.toLowerCase();
  return (
    lower.includes("not implemented") ||
    lower === "todo" ||
    lower === "stub" ||
    lower.includes("todo:") ||
    lower.includes("fixme")
  );
}

function isSentinelReturn(expr: ts.Expression): boolean {
  if (expr.kind === ts.SyntaxKind.NullKeyword) {
    return true;
  }
  if (expr.kind === ts.SyntaxKind.UndefinedKeyword) {
    return true;
  }
  if (ts.isNumericLiteral(expr) && expr.text === "0") {
    return true;
  }
  if (ts.isArrayLiteralExpression(expr) && expr.elements.length === 0) {
    return true;
  }
  if (ts.isObjectLiteralExpression(expr) && expr.properties.length === 0) {
    return true;
  }
  return false;
}

function hasTrailingStubComment(sourceFile: ts.SourceFile, returnPos: number): boolean {
  const { line } = sourceFile.getLineAndCharacterOfPosition(returnPos);
  const lines = sourceFile.text.split(/\r?\n/);
  const end = Math.min(lines.length - 1, line + 3);
  for (let i = line; i <= end; i += 1) {
    const text = lines[i]?.toLowerCase() ?? "";
    if (
      text.includes("// todo") ||
      text.includes("// stub") ||
      text.includes("// fixme")
    ) {
      return true;
    }
  }
  return false;
}

function bodyContainsStubCommentMarker(sourceFile: ts.SourceFile, body: ts.ConciseBody): boolean {
  const text = sourceFile.text.slice(body.getStart(sourceFile), body.getEnd());
  const lower = text.toLowerCase();
  return (
    lower.includes("// stub") ||
    lower.includes("// todo: implement") ||
    lower.includes("// fixme: stub") ||
    lower.includes("@stub")
  );
}

function isPassThroughExpression(
  expr: ts.Expression,
  node: ts.FunctionLikeDeclaration,
): boolean {
  const paramNames = node.parameters
    .map((param) => getParameterName(param))
    .filter((name): name is string => Boolean(name));

  if (ts.isIdentifier(expr) && paramNames.includes(expr.text)) {
    return signatureImpliesTransformation(getFunctionName(node), node.parameters);
  }

  if (ts.isPropertyAccessExpression(expr) && expr.name.text === "input") {
    const base = expr.expression;
    if (ts.isIdentifier(base) && (base.text === "ctx" || paramNames.includes(base.text))) {
      return signatureImpliesTransformation(getFunctionName(node), node.parameters);
    }
  }

  return false;
}

function isPassThroughReturn(
  body: ts.Block,
  node: ts.FunctionLikeDeclaration,
  _sourceFile: ts.SourceFile,
): boolean {
  if (body.statements.length !== 1) {
    return false;
  }
  const only = body.statements[0];
  if (!ts.isReturnStatement(only) || !only.expression) {
    return false;
  }

  return isPassThroughExpression(only.expression, node);
}

function signatureImpliesTransformation(
  name: string | null,
  params: readonly ts.ParameterDeclaration[],
): boolean {
  if (name && TRANSFORM_NAME.test(name)) {
    return true;
  }
  return params.length >= 2;
}

function hasStubJSDoc(node: ts.Node): boolean {
  for (const tag of ts.getJSDocTags(node)) {
    const tagName = tag.tagName.text.toLowerCase();
    if (tagName === "stub" || tagName === "todo" || tagName === "notimplemented") {
      return true;
    }
  }
  return false;
}

function isPlaceholderFunctionName(name: string | null): boolean {
  if (!name) {
    return false;
  }
  const lower = name.toLowerCase();
  return lower.startsWith("noop") || lower.includes("placeholder");
}

function isFunctionLikeDeclaration(node: ts.Node): node is ts.FunctionLikeDeclaration {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node)
  );
}

function getFunctionName(node: ts.FunctionLikeDeclaration): string | null {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
    if (node.name && ts.isIdentifier(node.name)) {
      return node.name.text;
    }
  }
  if (ts.isConstructorDeclaration(node)) {
    return "constructor";
  }
  return null;
}

function collectFunctionTargets(sourceFile: ts.SourceFile): FunctionTarget[] {
  const targets: FunctionTarget[] = [];

  const addTarget = (node: ts.FunctionLikeDeclaration, name: string | null): void => {
    const pos = getLineAndColumn(sourceFile, node.getStart(sourceFile));
    targets.push({ node, name, line: pos.line, column: pos.column });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node)) {
      addTarget(node, getFunctionName(node));
    } else if (ts.isMethodDeclaration(node) && node.body) {
      addTarget(node, getFunctionName(node));
    } else if (ts.isConstructorDeclaration(node) && node.body) {
      addTarget(node, "constructor");
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        const init = decl.initializer;
        if (init && isFunctionLikeDeclaration(init)) {
          const name = ts.isIdentifier(decl.name) ? decl.name.text : null;
          addTarget(init, name);
        }
      }
    } else if (ts.isPropertyAssignment(node)) {
      const init = node.initializer;
      if (init && isFunctionLikeDeclaration(init)) {
        const name = ts.isIdentifier(node.name) ? node.name.text : null;
        addTarget(init, name);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return targets;
}

function collectInterfaceMethodNames(sourceFile: ts.SourceFile): Set<string> {
  const names = new Set<string>();

  const visit = (node: ts.Node): void => {
    if (ts.isInterfaceDeclaration(node)) {
      for (const member of node.members) {
        if (ts.isMethodSignature(member) && ts.isIdentifier(member.name)) {
          names.add(member.name.text);
        }
        if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) {
          names.add(member.name.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return names;
}

function collectExportedSymbols(sourceFile: ts.SourceFile): string[] {
  const symbols: string[] = [];

  for (const stmt of sourceFile.statements) {
    if (ts.isExportDeclaration(stmt) && stmt.exportClause) {
      if (ts.isNamedExports(stmt.exportClause)) {
        for (const element of stmt.exportClause.elements) {
          const exported = element.name.text;
          symbols.push(exported);
        }
      }
    }
    if (ts.isFunctionDeclaration(stmt) && stmt.name && hasExportModifier(stmt)) {
      symbols.push(stmt.name.text);
    }
    if (ts.isVariableStatement(stmt) && hasExportModifier(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          symbols.push(decl.name.text);
        }
      }
    }
  }

  return symbols;
}

function hasExportModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node)?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword) ?? false)
  );
}

function isReExportOnlyFile(sourceFile: ts.SourceFile): boolean {
  let sawReExport = false;

  for (const stmt of sourceFile.statements) {
    if (ts.isImportDeclaration(stmt)) {
      continue;
    }
    if (ts.isExportDeclaration(stmt) && stmt.moduleSpecifier) {
      sawReExport = true;
      continue;
    }
    if (ts.isEmptyStatement(stmt)) {
      continue;
    }
    return false;
  }

  return sawReExport;
}

function analyzeFunctionPatterns(
  target: FunctionTarget,
  parsed: ParsedFile,
): Array<{ pattern: PatternId; signal: SignalKind; anchor: ts.Node }> {
  const { node, sourceFile } = { node: target.node, sourceFile: parsed.sourceFile };
  const findings: Array<{ pattern: PatternId; signal: SignalKind; anchor: ts.Node }> = [];
  const body = getFunctionBody(node);

  if (body && ts.isBlock(body)) {
    for (const stmt of body.statements) {
      if (ts.isThrowStatement(stmt) && isStubThrowStatement(stmt, sourceFile)) {
        findings.push({ pattern: 1, signal: "hard", anchor: stmt });
      }
      if (ts.isReturnStatement(stmt) && stmt.expression && isSentinelReturn(stmt.expression)) {
        if (hasTrailingStubComment(sourceFile, stmt.getStart(sourceFile))) {
          findings.push({ pattern: 2, signal: "hard", anchor: stmt });
        }
      }
    }
    if (bodyContainsStubCommentMarker(sourceFile, body)) {
      findings.push({ pattern: 3, signal: "hard", anchor: body });
    }
    if (isPassThroughReturn(body, node, sourceFile)) {
      findings.push({ pattern: 4, signal: "soft", anchor: body });
    }
  } else if (body && ts.isExpression(body) && isPassThroughExpression(body, node)) {
    findings.push({ pattern: 4, signal: "soft", anchor: body });
  }

  if (hasStubJSDoc(node)) {
    findings.push({ pattern: 6, signal: "soft", anchor: node });
  }
  if (isPlaceholderFunctionName(target.name)) {
    findings.push({ pattern: 7, signal: "soft", anchor: node });
  }

  return findings;
}

function buildStubId(pattern: PatternId, relPath: string, line: number, column: number): string {
  return `G2-P${pattern}-${relPath.replace(/[^a-zA-Z0-9]+/g, "_")}-${line}-${column}`;
}

function parseFile(relPath: string): ParsedFile | null {
  const absPath = join(ROOT, relPath);
  const content = readFileSync(absPath, "utf8");
  const sourceFile = ts.createSourceFile(
    relPath,
    content,
    ts.ScriptTarget.Latest,
    true,
    relPath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  return {
    relPath,
    absPath,
    sourceFile,
    content,
    interfaceMethodNames: collectInterfaceMethodNames(sourceFile),
    exportedSymbols: collectExportedSymbols(sourceFile),
    reExportOnly: isReExportOnlyFile(sourceFile),
  };
}

function incrementVertical(map: CountMap, key: Vertical): void {
  map[key] += 1;
}

function incrementDomain(map: DomainCountMap, key: Domain): void {
  map[key] += 1;
}

function incrementComplexity(map: ComplexityCountMap, key: Complexity): void {
  map[key] += 1;
}

function buildTotals(stubs: StubRecord[]): InventoryReport["totals"] {
  const totals: InventoryReport["totals"] = {
    all: 0,
    hard: 0,
    soft: 0,
    byVertical: emptyCountMap(),
    byVerticalHard: emptyCountMap(),
    byVerticalSoft: emptyCountMap(),
    byDomain: emptyDomainMap(),
    byDomainHard: emptyDomainMap(),
    byDomainSoft: emptyDomainMap(),
    byComplexity: emptyComplexityMap(),
    byComplexityHard: emptyComplexityMap(),
    byComplexitySoft: emptyComplexityMap(),
  };

  for (const stub of stubs) {
    if (stub.signal === "hard") {
      totals.hard += 1;
      totals.all += 1;
      incrementVertical(totals.byVerticalHard, stub.vertical);
      incrementDomain(totals.byDomainHard, stub.domain);
      incrementComplexity(totals.byComplexityHard, stub.complexity);
      incrementVertical(totals.byVertical, stub.vertical);
      incrementDomain(totals.byDomain, stub.domain);
      incrementComplexity(totals.byComplexity, stub.complexity);
    } else {
      totals.soft += 1;
      incrementVertical(totals.byVerticalSoft, stub.vertical);
      incrementDomain(totals.byDomainSoft, stub.domain);
      incrementComplexity(totals.byComplexitySoft, stub.complexity);
    }
  }

  return totals;
}

function estimateSessions(stubs: StubRecord[]): number {
  const weights: Record<Complexity, number> = { LOW: 0.05, MEDIUM: 0.15, HIGH: 0.35 };
  let total = 0;
  for (const stub of stubs) {
    if (stub.signal === "hard") {
      total += weights[stub.complexity];
    }
  }
  return Math.round(total * 100) / 100;
}

function topFilesByStubCount(stubs: StubRecord[], limit = 10): Array<{ filePath: string; count: number }> {
  const counts = new Map<string, number>();
  for (const stub of stubs) {
    counts.set(stub.filePath, (counts.get(stub.filePath) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([filePath, count]) => ({ filePath, count }))
    .sort((a, b) => b.count - a.count || a.filePath.localeCompare(b.filePath))
    .slice(0, limit);
}

function renderMarkdown(report: InventoryReport): string {
  const hard = report.stubs.filter((stub) => stub.signal === "hard");
  const soft = report.stubs.filter((stub) => stub.signal === "soft");
  const topFiles = topFilesByStubCount(report.stubs);

  const verticalRow = (map: CountMap): string =>
    `| FA | HC | GC | CON | PS | SAAS | NPO | MFG | RTL | CONTROL | SHARED |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ${map.FA} | ${map.HC} | ${map.GC} | ${map.CON} | ${map.PS} | ${map.SAAS} | ${map.NPO} | ${map.MFG} | ${map.RTL} | ${map.CONTROL} | ${map.SHARED} |`;

  const domainRow = (map: DomainCountMap): string =>
    `| kpi | disclosure | audit | panel | framework | compute |
| ---: | ---: | ---: | ---: | ---: | ---: |
| ${map.kpi} | ${map.disclosure} | ${map.audit} | ${map.panel} | ${map.framework} | ${map.compute} |`;

  const complexityRow = (map: ComplexityCountMap): string =>
    `| LOW | MEDIUM | HIGH |
| ---: | ---: | ---: |
| ${map.LOW} | ${map.MEDIUM} | ${map.HIGH} |`;

  const topFilesTable = topFiles.length
    ? topFiles.map((entry) => `| ${entry.filePath} | ${entry.count} |`).join("\n")
    : "| _(none)_ | 0 |";

  const anomalies = report.anomalies.length
    ? report.anomalies.map((item) => `- ${item}`).join("\n")
    : "- _(none)_";

  return `# Stub Inventory — ${report.generatedAt}

- Tool: \`${report.tool}\` v${report.version}
- Git: \`${report.gitSha}\` on \`${report.gitBranch}\`
- Atlas: v${report.atlasVersion}
- Scan duration: ${(report.scanDurationMs / 1000).toFixed(2)}s

## Totals (main = hard only)

- **Hard stubs (main total):** ${report.totals.hard}
- **Soft signals (review queue):** ${report.totals.soft}
- **All signals captured:** ${report.stubs.length}

## By Vertical (hard)

${verticalRow(report.totals.byVerticalHard)}

## By Vertical (soft review queue)

${verticalRow(report.totals.byVerticalSoft)}

## By Domain (hard)

${domainRow(report.totals.byDomainHard)}

## By Domain (soft)

${domainRow(report.totals.byDomainSoft)}

## By Complexity (hard)

${complexityRow(report.totals.byComplexityHard)}

## By Complexity (soft)

${complexityRow(report.totals.byComplexitySoft)}

## Top 10 Files by Stub Count

| File | Count |
| --- | ---: |
${topFilesTable}

## Anomalies / Founder Review

${anomalies}

## Pattern Coverage

- Hard patterns scanned: 1 (throw), 2 (sentinel+comment), 3 (body comment markers)
- Soft patterns scanned: 4 (pass-through), 5 (re-export-only), 6 (JSDoc), 7 (noop/placeholder names)
- Hard findings: ${hard.length}
- Soft findings: ${soft.length}
`;
}

function renderFounderResults(report: InventoryReport): string {
  const sessions = estimateSessions(report.stubs.filter((stub) => stub.signal === "hard"));
  const topFiles = topFilesByStubCount(report.stubs, 3);

  const verticalHard = report.totals.byVerticalHard;
  const complexityHard = report.totals.byComplexityHard;

  const cascadeOrder = (Object.keys(verticalHard) as Vertical[])
    .filter((key) => verticalHard[key] > 0)
    .sort((a, b) => verticalHard[b] - verticalHard[a]);

  const complexityWeighted = [...report.stubs.filter((stub) => stub.signal === "hard")].sort((a, b) => {
    const weight = { LOW: 1, MEDIUM: 2, HIGH: 3 };
    const delta = weight[b.complexity] - weight[a.complexity];
    return delta !== 0 ? delta : a.vertical.localeCompare(b.vertical);
  });

  const byCountVerticals = cascadeOrder.join(" → ") || "(none)";
  const byComplexityVerticals = [
    ...new Set(complexityWeighted.map((stub) => stub.vertical)),
  ].join(" → ") || "(none)";

  const topFilesLine = topFiles.length
    ? topFiles.map((entry) => `${entry.filePath}=${entry.count}`).join(", ")
    : "(none)";

  const founderAnomalies = [...report.anomalies];
  if (report.totals.hard === 0) {
    founderAnomalies.push(
      "Q-G2.0-E — Zero hard stubs: AST scan found 0 hard signals (patterns 1–3). Main G2 vertical stub-removal scope may be empty; only soft review-queue signals remain.",
    );
  }

  return `# Phase G2.0 Inventory Results

Generated: ${report.generatedAt}
Scanner: \`${report.tool}\` v${report.version} @ \`${report.gitSha}\`

## Top-line Totals

| Metric | Value |
| --- | ---: |
| Hard stubs (main total) | ${report.totals.hard} |
| Soft signals (review queue) | ${report.totals.soft} |
| All captured signals | ${report.stubs.length} |

## Per-vertical Breakdown (hard)

| Vertical | Hard | Soft |
| --- | ---: | ---: |
| FA | ${verticalHard.FA} | ${report.totals.byVerticalSoft.FA} |
| HC | ${verticalHard.HC} | ${report.totals.byVerticalSoft.HC} |
| GC | ${verticalHard.GC} | ${report.totals.byVerticalSoft.GC} |
| CON | ${verticalHard.CON} | ${report.totals.byVerticalSoft.CON} |
| PS | ${verticalHard.PS} | ${report.totals.byVerticalSoft.PS} |
| SAAS | ${verticalHard.SAAS} | ${report.totals.byVerticalSoft.SAAS} |
| NPO | ${verticalHard.NPO} | ${report.totals.byVerticalSoft.NPO} |
| MFG | ${verticalHard.MFG} | ${report.totals.byVerticalSoft.MFG} |
| RTL | ${verticalHard.RTL} | ${report.totals.byVerticalSoft.RTL} |
| CONTROL | ${verticalHard.CONTROL} | ${report.totals.byVerticalSoft.CONTROL} |
| SHARED | ${verticalHard.SHARED} | ${report.totals.byVerticalSoft.SHARED} |

## Complexity Distribution (hard)

| LOW | MEDIUM | HIGH |
| ---: | ---: | ---: |
| ${complexityHard.LOW} | ${complexityHard.MEDIUM} | ${complexityHard.HIGH} |

## Suggested G2 Vertical Ordering Options

1. **Cascade order (existing W2 sequence):** FA → HC → GC → CON → PS → SAAS → NPO → MFG → RTL (filter to verticals with hard stubs)
2. **By hard-stub count (desc):** ${byCountVerticals}
3. **By complexity-weighted hotspots:** ${byComplexityVerticals}

## Estimated G2 Sessions (heuristic)

Formula: \`(LOW × 0.05) + (MEDIUM × 0.15) + (HIGH × 0.35)\` on **hard** stubs only.

- **Estimated sessions:** ${sessions}

## Top Files

${topFilesLine}

## Anomalies Requiring Founder Attention

${founderAnomalies.length ? founderAnomalies.map((item) => `- ${item}`).join("\n") : "- None"}

## Artifacts

- \`reports/stub-inventory.json\`
- \`reports/stub-inventory.md\`
`;
}

function loadDiffBaseline(sha: string): { added: number; removed: number } | null {
  try {
    const raw = runGit(`show ${sha}:reports/stub-inventory.json`);
    const prior = JSON.parse(raw) as { stubs?: StubRecord[] };
    return {
      added: 0,
      removed: prior.stubs?.length ?? 0,
    };
  } catch {
    return null;
  }
}

function scanInventory(options: CliOptions): InventoryReport {
  const started = Date.now();
  const anomalies: string[] = [];
  const files = collectScanFiles();

  const parsedFiles: ParsedFile[] = [];
  for (const relPath of files) {
    try {
      const parsed = parseFile(relPath);
      if (parsed) {
        parsedFiles.push(parsed);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      anomalies.push(`Parse error in ${relPath}: ${message}`);
    }
  }

  const globalInterfaceMethods = new Set<string>();
  for (const parsed of parsedFiles) {
    for (const name of parsed.interfaceMethodNames) {
      globalInterfaceMethods.add(name);
    }
  }

  const stubs: StubRecord[] = [];

  for (const parsed of parsedFiles) {
    const targets = collectFunctionTargets(parsed.sourceFile);

    for (const target of targets) {
      const patterns = analyzeFunctionPatterns(target, parsed);
      for (const finding of patterns) {
        const vertical = matchVertical(parsed.relPath);
        const domain = matchDomain(parsed.relPath);
        const complexity = computeComplexity(parsed.sourceFile, target.node);
        const signaturePreview = previewText(parsed.sourceFile, target.node);
        const body = getFunctionBody(target.node);
        const bodyPreview = body ? previewText(parsed.sourceFile, body) : "(no body)";

        const pos = getLineAndColumn(parsed.sourceFile, finding.anchor.getStart(parsed.sourceFile));

        stubs.push({
          id: buildStubId(finding.pattern, parsed.relPath, pos.line, pos.column),
          filePath: parsed.relPath,
          line: pos.line,
          column: pos.column,
          functionName: target.name,
          signal: finding.signal,
          pattern: finding.pattern,
          vertical,
          domain,
          complexity,
          signaturePreview,
          bodyPreview,
        });
      }
    }

    if (parsed.reExportOnly) {
      for (const symbol of parsed.exportedSymbols) {
        if (!globalInterfaceMethods.has(symbol)) {
          continue;
        }
        const stmt = parsed.sourceFile.statements.find((statement) => ts.isExportDeclaration(statement));
        const anchorPos = stmt
          ? getLineAndColumn(parsed.sourceFile, stmt.getStart(parsed.sourceFile))
          : { line: 1, column: 1 };

        stubs.push({
          id: buildStubId(5, parsed.relPath, anchorPos.line, anchorPos.column),
          filePath: parsed.relPath,
          line: anchorPos.line,
          column: anchorPos.column,
          functionName: symbol,
          signal: "soft",
          pattern: 5,
          vertical: matchVertical(parsed.relPath),
          domain: matchDomain(parsed.relPath),
          complexity: "LOW",
          signaturePreview: `export { ${symbol} } (re-export only)`,
          bodyPreview: "(re-export only file)",
        });
      }
    }
  }

  const deduped = new Map<string, StubRecord>();
  for (const stub of stubs) {
    const key = `${stub.filePath}:${stub.line}:${stub.column}:${stub.pattern}:${stub.functionName ?? ""}`;
    if (!deduped.has(key)) {
      deduped.set(key, stub);
    }
  }

  let finalStubs = [...deduped.values()].sort((a, b) =>
    a.filePath.localeCompare(b.filePath) || a.line - b.line || a.pattern - b.pattern,
  );

  if (options.vertical) {
    finalStubs = finalStubs.filter((stub) => stub.vertical === options.vertical);
  }

  const durationMs = Date.now() - started;
  if (durationMs > 30_000) {
    anomalies.push(`Scan exceeded 30s budget: ${(durationMs / 1000).toFixed(2)}s`);
  }

  const diffDelta = options.diffSha ? loadDiffBaseline(options.diffSha) : null;
  if (options.diffSha && diffDelta) {
    diffDelta.added = finalStubs.length;
    diffDelta.removed = diffDelta.removed;
  }

  return {
    tool: TOOL,
    version: VERSION,
    generatedAt: new Date().toISOString(),
    gitSha: runGit("rev-parse HEAD"),
    gitBranch: runGit("rev-parse --abbrev-ref HEAD"),
    atlasVersion: readAtlasVersion(),
    scanDurationMs: durationMs,
    totals: buildTotals(finalStubs),
    stubs: finalStubs,
    anomalies,
    diffFromSha: options.diffSha,
    diffDelta,
  };
}

function main(): void {
  const options = parseCli(process.argv.slice(2));
  const report = scanInventory(options);

  mkdirSync(REPORTS_DIR, { recursive: true });
  const jsonPath = join(REPORTS_DIR, "stub-inventory.json");
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (!options.jsonOnly) {
    writeFileSync(join(REPORTS_DIR, "stub-inventory.md"), `${renderMarkdown(report)}\n`, "utf8");
    writeFileSync(join(ROOT, "Phase_G2_0_Inventory_Results.md"), `${renderFounderResults(report)}\n`, "utf8");
  }

  process.stdout.write(
    `stub-inventory: hard=${report.totals.hard} soft=${report.totals.soft} files=${collectScanFiles().length} duration=${(report.scanDurationMs / 1000).toFixed(2)}s\n`,
  );

  const exitCode = report.anomalies.some((item) => item.startsWith("Parse error")) ? 2 : 0;
  process.exit(exitCode);
}

main();
