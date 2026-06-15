const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const actionsRoot = path.join(root, "lib", "intelligence", "synthetic", "actions");
const expectedHashTarget = path.join(root, "lib", "intelligence", "core", "hash");

const builderModules = [
  { directory: "action-candidate", artifactName: "ActionCandidate" },
  { directory: "workflow-candidate", artifactName: "WorkflowCandidate" },
  { directory: "approval-package", artifactName: "ApprovalPackage", executionReadyOptional: true },
  { directory: "execution-readiness", artifactName: "ExecutionReadinessPackage" },
  { directory: "simulation-package", artifactName: "SimulationPackage" },
  { directory: "action-bundle-package", artifactName: "ActionBundlePackage" },
  { directory: "automation-governance-package", artifactName: "AutomationGovernancePackage" },
  { directory: "erp-action-candidate", artifactName: "ErpActionCandidatePackage" },
  { directory: "accounting-action-candidate", artifactName: "AccountingActionCandidatePackage" },
  { directory: "journal-entry-candidate", artifactName: "JournalEntryCandidatePackage" },
  { directory: "financial-control-action", artifactName: "FinancialControlActionPackage" },
  { directory: "audit-action-candidate", artifactName: "AuditActionCandidatePackage" },
  { directory: "controller-action-candidate", artifactName: "ControllerActionCandidatePackage" },
  { directory: "revenue-cycle-action-candidate", artifactName: "RevenueCycleActionCandidatePackage" },
  { directory: "healthcare-ppd-action-candidate", artifactName: "HealthcarePpdActionCandidatePackage" },
  { directory: "payroll-action-candidate", artifactName: "PayrollActionCandidatePackage" },
  { directory: "action-lineage-package", artifactName: "ActionLineagePackage" },
  { directory: "action-control-package", artifactName: "ActionControlPackage" },
  { directory: "action-handoff-package", artifactName: "ActionHandoffPackage" },
];

const contractFiles = [
  path.join("contracts", "SyntheticActionIntelligenceContracts.ts"),
  path.join("contracts", "index.ts"),
];

const prohibitedImportSources = [
  { rule: "axios import is prohibited", pattern: /(^|[/@])axios($|\/)/i },
  { rule: "node-fetch import is prohibited", pattern: /(^|[/@])node-fetch($|\/)/i },
  { rule: "fetch wrapper import is prohibited", pattern: /fetch/i },
  { rule: "postgres client import is prohibited", pattern: /(pg|postgres|postgresql|postgres-js|slonik)/i },
  { rule: "mysql client import is prohibited", pattern: /(mysql|mysql2)/i },
  { rule: "prisma import is prohibited", pattern: /prisma/i },
  { rule: "sequelize import is prohibited", pattern: /sequelize/i },
  { rule: "knex import is prohibited", pattern: /knex/i },
  { rule: "SAP SDK import is prohibited", pattern: /(sap|@sap)/i },
  { rule: "NetSuite SDK import is prohibited", pattern: /(netsuite|suitetalk)/i },
  { rule: "Oracle SDK import is prohibited", pattern: /(oracle|oracledb)/i },
  { rule: "Dynamics SDK import is prohibited", pattern: /(dynamics|dataverse|powerplatform)/i },
  { rule: "email library import is prohibited", pattern: /(nodemailer|sendgrid|mailgun|postmark|ses|smtp)/i },
  { rule: "SMS library import is prohibited", pattern: /(twilio|sms|sns)/i },
  { rule: "push notification import is prohibited", pattern: /(push|firebase-admin|fcm|apns|web-push)/i },
  { rule: "cron import is prohibited", pattern: /(cron|node-cron)/i },
  { rule: "agenda import is prohibited", pattern: /agenda/i },
  { rule: "node-schedule import is prohibited", pattern: /node-schedule/i },
  { rule: "child_process import is prohibited", pattern: /(child_process|node:child_process)/i },
  { rule: "shell execution library import is prohibited", pattern: /^(execa|shelljs|zx|cross-spawn|cross-spawn-async|spawn-sync|exec-sh)$/i },
];

const prohibitedUsageRules = [
  { rule: "global fetch usage is prohibited", pattern: /\bfetch\s*\(/ },
  { rule: "XMLHttpRequest usage is prohibited", pattern: /\bXMLHttpRequest\b/ },
  { rule: "postgres client usage is prohibited", pattern: /\b(pg|Pool|Client|postgres)\s*\(/ },
  { rule: "mysql client usage is prohibited", pattern: /\b(mysql|mysql2)\b/ },
  { rule: "prisma usage is prohibited", pattern: /\b(prisma|PrismaClient)\b/ },
  { rule: "sequelize usage is prohibited", pattern: /\b(sequelize|Sequelize)\b/ },
  { rule: "knex usage is prohibited", pattern: /\bknex\s*\(/ },
  { rule: "email send usage is prohibited", pattern: /\b(sendMail|smtp|emailClient|mailClient)\b/i },
  { rule: "SMS send usage is prohibited", pattern: /\b(sendSms|smsClient|twilio)\b/i },
  { rule: "push notification usage is prohibited", pattern: /\b(pushNotification|notificationClient|webPush)\b/i },
  { rule: "cron usage is prohibited", pattern: /\b(cron|scheduleJob)\b/i },
  { rule: "agenda usage is prohibited", pattern: /\bagenda\b/i },
  { rule: "node-schedule usage is prohibited", pattern: /\bnodeSchedule\b/i },
  { rule: "child_process usage is prohibited", pattern: /\b(child_process|exec|execFile|spawn|fork)\b/ },
  { rule: "writeFile usage is prohibited", pattern: /\b(writeFile|writeFileSync)\s*\(/ },
  { rule: "appendFile usage is prohibited", pattern: /\b(appendFile|appendFileSync)\s*\(/ },
  { rule: "createWriteStream usage is prohibited", pattern: /\bcreateWriteStream\s*\(/ },
];

const liveActionVerbs = ["post", "submit", "send", "execute", "run", "trigger", "dispatch", "commit", "sync", "apply", "fire"];
const allowedLiveActionContext = /(Candidate|Package|Handoff|Prepare|Prepared|Build|Builder|Metadata|Reference|Readiness|Contract|Category|Phase39RequiredForExecution|phase39RequiredForExecution)/;

const violations = [];

function toRepoPath(filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function addViolation(filePath, rule, detail) {
  const location = filePath ? toRepoPath(filePath) : "repository";
  violations.push(`${location} :: ${rule}${detail ? ` :: ${detail}` : ""}`);
}

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function walkTypeScriptFiles(directory) {
  if (!exists(directory)) return [];

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkTypeScriptFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(entryPath);
    }
  }

  return files;
}

function stripCommentsAndStrings(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n\r]*/g, " ")
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, " ")
    .replace(/"(?:\\.|[^"\\])*"/g, " ")
    .replace(/'(?:\\.|[^'\\])*'/g, " ");
}

function getImportSources(source) {
  const imports = [];
  const importRegex = /\bimport\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;
  const exportRegex = /\bexport\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;
  const requireRegex = /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;

  for (const regex of [importRegex, exportRegex, requireRegex]) {
    let match;
    while ((match = regex.exec(source)) !== null) {
      imports.push(match[1]);
    }
  }

  return imports;
}

function resolveImportTarget(filePath, importSource) {
  if (!importSource.startsWith(".")) return importSource;

  const resolved = path.resolve(path.dirname(filePath), importSource);
  const candidates = [resolved, `${resolved}.ts`, path.join(resolved, "index.ts")];
  const existing = candidates.find((candidate) => exists(candidate));
  return existing ?? resolved;
}

function normalizedPathWithoutExtension(filePath) {
  return filePath.replace(/\.ts$/, "");
}

function checkRequiredStructure() {
  if (!exists(actionsRoot)) {
    addViolation(actionsRoot, "Phase 38 actions root directory is missing");
    return;
  }

  const contractsDirectory = path.join(actionsRoot, "contracts");
  if (!exists(contractsDirectory)) {
    addViolation(contractsDirectory, "required Phase 38 directory is missing");
  }

  for (const contractFile of contractFiles) {
    const filePath = path.join(actionsRoot, contractFile);
    if (!exists(filePath)) {
      addViolation(filePath, "required contracts file is missing");
    }
  }

  for (const module of builderModules) {
    const directoryPath = path.join(actionsRoot, module.directory);
    if (!exists(directoryPath)) {
      addViolation(directoryPath, "required Phase 38 directory is missing");
      continue;
    }

    for (const fileName of [`build${module.artifactName}.ts`, `build${module.artifactName}s.ts`, "index.ts"]) {
      const filePath = path.join(directoryPath, fileName);
      if (!exists(filePath)) {
        addViolation(filePath, "required Phase 38 module file is missing");
      }
    }
  }
}

function checkProhibitedImportsAndUsage(files) {
  for (const filePath of files) {
    const source = readFile(filePath);
    const codeOnly = stripCommentsAndStrings(source);
    const importSources = getImportSources(source);

    for (const importSource of importSources) {
      for (const prohibited of prohibitedImportSources) {
        if (prohibited.pattern.test(importSource)) {
          addViolation(filePath, prohibited.rule, `import source "${importSource}"`);
        }
      }
    }

    for (const prohibited of prohibitedUsageRules) {
      if (prohibited.pattern.test(codeOnly)) {
        addViolation(filePath, prohibited.rule);
      }
    }
  }
}

function checkLiveActionVerbs(files) {
  for (const filePath of files) {
    const codeOnly = stripCommentsAndStrings(readFile(filePath));
    const identifiers = codeOnly.match(/\b[A-Za-z_$][A-Za-z0-9_$]*\b/g) ?? [];

    for (const identifier of identifiers) {
      if (allowedLiveActionContext.test(identifier)) continue;

      for (const verb of liveActionVerbs) {
        const startsWithVerb = new RegExp(`^${verb}[A-Z_$]`);
        if (identifier === verb || startsWithVerb.test(identifier)) {
          addViolation(filePath, "live-action verb outside allowed metadata-only naming context", identifier);
        }
      }
    }
  }
}

function checkStableSnapshotHashImports(files) {
  for (const filePath of files) {
    const source = readFile(filePath);
    if (!source.includes("stableSnapshotHash")) continue;

    const stableImportRegex = /import\s+\{\s*stableSnapshotHash\s*\}\s+from\s+["']([^"']+)["']/g;
    const importSources = [];
    let match;

    while ((match = stableImportRegex.exec(source)) !== null) {
      importSources.push(match[1]);
    }

    if (source.includes("stableSnapshotHash(") && importSources.length === 0) {
      addViolation(filePath, "stableSnapshotHash call must have an explicit import");
    }

    for (const importSource of importSources) {
      const resolvedTarget = resolveImportTarget(filePath, importSource);
      const normalizedTarget = typeof resolvedTarget === "string" && resolvedTarget.startsWith(root)
        ? normalizedPathWithoutExtension(resolvedTarget)
        : resolvedTarget;

      if (normalizedTarget !== expectedHashTarget) {
        addViolation(filePath, "stableSnapshotHash must be imported only from lib/intelligence/core/hash", importSource);
      }
    }
  }
}

function checkPrimaryBuilderMarkers() {
  for (const module of builderModules) {
    const filePath = path.join(actionsRoot, module.directory, `build${module.artifactName}.ts`);
    if (!exists(filePath)) continue;

    const source = readFile(filePath);
    const requiredMarkers = [
      { rule: "executable must be literal false", pattern: /executable:\s*false\b/ },
      { rule: "boundPhase37SnapshotHash must be present", pattern: /\bboundPhase37SnapshotHash\b/ },
      { rule: "phase38StaleMarker must be present", pattern: /\bphase38StaleMarker\b/ },
      { rule: "customerIsolation must be a separate field", pattern: /\bcustomerIsolation\b/ },
      { rule: "firmIsolation must be a separate field", pattern: /\bfirmIsolation\b/ },
      { rule: "clientIsolation must be a separate field", pattern: /\bclientIsolation\b/ },
      { rule: "warnings must be collected", pattern: /\bwarnings\b/ },
      { rule: "skippedIndexes must be collected", pattern: /\bskippedIndexes\b/ },
      { rule: "fail-closed skipped result must be present", pattern: /skipped:\s*true\b/ },
    ];

    if (!module.executionReadyOptional) {
      requiredMarkers.push({ rule: "executionReady metadata field must be present", pattern: /\bexecutionReady\b/ });
    }

    for (const marker of requiredMarkers) {
      if (!marker.pattern.test(source)) {
        addViolation(filePath, marker.rule);
      }
    }
  }
}

function checkCollectionBuilders() {
  for (const module of builderModules) {
    const filePath = path.join(actionsRoot, module.directory, `build${module.artifactName}s.ts`);
    if (!exists(filePath)) continue;

    const source = readFile(filePath);
    const requiredMarkers = [
      { rule: "collection builder must collect skippedIndexes", pattern: /\bskippedIndexes\b/ },
      { rule: "collection builder must collect warnings", pattern: /\bwarnings\b/ },
      { rule: "collection builder must preserve input order by iterating items", pattern: /\.forEach\s*\(|\.map\s*\(/ },
    ];

    for (const marker of requiredMarkers) {
      if (!marker.pattern.test(source)) {
        addViolation(filePath, marker.rule);
      }
    }
  }
}

function checkPhase37HandoffConsumption(files) {
  const combinedSource = files.map(readFile).join("\n");
  const requiredReferences = [
    "boundPhase37SnapshotHash",
    "boundPhase37KnowledgeGraphSnapshotHash",
    "boundPhase37MethodologySnapshotHash",
  ];

  for (const reference of requiredReferences) {
    if (!combinedSource.includes(reference)) {
      addViolation(actionsRoot, "Phase 37 handoff consumption reference is missing", reference);
    }
  }
}

function checkPhase39HandoffProduction(files) {
  const contractsPath = path.join(actionsRoot, "contracts", "SyntheticActionIntelligenceContracts.ts");
  const contractsSource = exists(contractsPath) ? readFile(contractsPath) : "";
  const combinedSource = files.map(readFile).join("\n");

  if (!/\binterface\s+Phase39ExecutionHandoff\b/.test(contractsSource)) {
    addViolation(contractsPath, "Phase39ExecutionHandoff type must exist in contracts");
  }

  for (const reference of ["actionHandoffHandle", "executionHandoffHandle"]) {
    if (!combinedSource.includes(reference)) {
      addViolation(actionsRoot, "Phase 39 handoff production reference is missing", reference);
    }
  }
}

function checkGlobalMarkerCoverage(files) {
  const combinedSource = files.map(readFile).join("\n");
  const markerChecks = [
    { rule: "executionReady must be present as metadata field", pattern: /\bexecutionReady\b/ },
    { rule: "warnings must be collected", pattern: /\bwarnings\b/ },
    { rule: "skippedIndexes must be collected", pattern: /\bskippedIndexes\b/ },
  ];

  for (const marker of markerChecks) {
    if (!marker.pattern.test(combinedSource)) {
      addViolation(actionsRoot, marker.rule);
    }
  }
}

function printResult() {
  if (violations.length > 0) {
    console.error("FAIL");
    for (const violation of violations) {
      console.error(violation);
    }
    process.exit(1);
  }

  console.log("PASS");
  process.exit(0);
}

checkRequiredStructure();

const phase38TypeScriptFiles = walkTypeScriptFiles(actionsRoot);

checkProhibitedImportsAndUsage(phase38TypeScriptFiles);
checkLiveActionVerbs(phase38TypeScriptFiles);
checkStableSnapshotHashImports(phase38TypeScriptFiles);
checkPrimaryBuilderMarkers();
checkCollectionBuilders();
checkPhase37HandoffConsumption(phase38TypeScriptFiles);
checkPhase39HandoffProduction(phase38TypeScriptFiles);
checkGlobalMarkerCoverage(phase38TypeScriptFiles);
printResult();
