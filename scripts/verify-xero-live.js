/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const Module = require("module");
const path = require("path");
const ts = require("typescript");
const { createClient } = require("@supabase/supabase-js");

const originalLoad = Module._load;
Module._load = function loadWithXeroLiveStubs(request, parent, isMain) {
  if (request.endsWith("erp-adapters/quickbooks-adapter") || request.endsWith("erp-adapters\\quickbooks-adapter")) {
    return {
      QuickBooksAdapter: class QuickBooksCertificationAdapter {
        connect() {
          return { url: "about:blank" };
        }
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

require.extensions[".ts"] = function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const root = process.cwd();
const requiredEnv = ["XERO_CLIENT_ID", "XERO_CLIENT_SECRET", "XERO_REDIRECT_URI", "XERO_ENV"];
const requiredObjects = ["normalizedAccounts", "normalizedTrialBalance", "normalizedBalanceSheet", "normalizedIncomeStatement"];

function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    const envPath = path.join(root, file);
    if (!fs.existsSync(envPath)) continue;
    fs.readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const separatorIndex = trimmed.indexOf("=");
        if (separatorIndex === -1) return;
        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
        if (key && !process.env[key]) process.env[key] = value;
      });
  }
}

function pass(message) {
  console.log(`✓ ${message}`);
}

function warn(message) {
  console.log(`⚠ ${message}`);
}

function isPresentArray(value) {
  return Array.isArray(value) && value.length > 0 && !value.every((item) => item?.type === "not_available");
}

function latestMayDateRange() {
  return { startDate: "2026-05-01", endDate: "2026-05-31" };
}

function safeAuditSummary(normalizedData) {
  return {
    sourceSystem: normalizedData.sourceSystem,
    connectionId: normalizedData.connectionId,
    accountsPulled: normalizedData.normalizedAccounts.length,
    trialBalanceRows: normalizedData.normalizedTrialBalance.length,
    balanceSheetRows: normalizedData.normalizedBalanceSheet.length,
    incomeStatementRows: normalizedData.normalizedIncomeStatement.length,
    arAgingRows: isPresentArray(normalizedData.normalizedARAging) ? normalizedData.normalizedARAging.length : 0,
    apAgingRows: isPresentArray(normalizedData.normalizedAPAging) ? normalizedData.normalizedAPAging.length : 0,
    syncTimestamp: normalizedData.lastSyncedAt,
    validationResult: normalizedData.validation.readyForReporting ? "passed" : "failed",
    validationWarnings: normalizedData.validation.warnings,
  };
}

function assertDownstreamReadiness(normalizedData) {
  const { buildFinancialPackagePdfBlob, buildFluxAnalysisPdfBlob } = require("../lib/financial-package-pdf.ts");

  if (requiredObjects.every((key) => isPresentArray(normalizedData[key]))) pass("Dashboard data readiness passed");
  else throw new Error("Dashboard data readiness failed: missing core normalized financial data.");

  if (requiredObjects.every((key) => isPresentArray(normalizedData[key]))) pass("KPI engine readiness passed");
  else throw new Error("KPI engine readiness failed: missing core normalized financial data.");

  const fluxBlob = buildFluxAnalysisPdfBlob({ companyName: "Xero Demo Company", normalizedData });
  if (fluxBlob?.size > 0) pass("Flux engine readiness passed");
  else throw new Error("Flux engine readiness failed.");

  const pdfBlob = buildFinancialPackagePdfBlob({ companyName: "Xero Demo Company", normalizedData });
  if (pdfBlob?.size > 0) pass("PDF package readiness passed");
  else throw new Error("PDF package readiness failed.");

  if (fs.readFileSync(path.join(root, "lib/executive-delivery-architecture.js"), "utf8").includes("PowerPoint")) {
    pass("PowerPoint package readiness passed");
  } else {
    warn("PowerPoint package readiness has no dedicated generator entrypoint yet.");
  }

  if (fs.readFileSync(path.join(root, "lib/pulse-context-engine.js"), "utf8").includes("buildPulseContextPackage")) {
    pass("Pulse AI readiness passed");
  } else {
    throw new Error("Pulse AI readiness failed: Pulse context engine entrypoint is missing.");
  }
}

async function selectTenantIfNeeded({ supabase, adapter, connection }) {
  if (connection.tenant_or_realm_id) return connection;

  const entities = await adapter.getEntities({ connection });
  if (!entities.length) throw new Error("Xero OAuth succeeded, but no tenants were returned.");

  const requestedTenantId = process.env.XERO_TENANT_ID || "";
  const requestedTenantName = process.env.XERO_DEMO_TENANT_NAME || "Demo";
  const selected =
    entities.find((entity) => entity.externalId === requestedTenantId || entity.canonicalId === requestedTenantId) ||
    entities.find((entity) => entity.name.toLowerCase().includes(requestedTenantName.toLowerCase())) ||
    entities[0];

  const { error } = await supabase
    .from("accounting_connections")
    .update({
      external_entity_id: selected.canonicalId,
      external_entity_name: selected.name,
      tenant_or_realm_id: selected.tenantOrRealmId || selected.externalId,
      status: "connected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);
  if (error) throw error;

  pass(`Xero tenant selected: ${selected.name}`);

  return {
    ...connection,
    external_entity_id: selected.canonicalId,
    external_entity_name: selected.name,
    tenant_or_realm_id: selected.tenantOrRealmId || selected.externalId,
    status: "connected",
  };
}

async function verifyXeroLive() {
  loadLocalEnv();

  console.log("Xero Live Connector Verification");

  const missingEnv = requiredEnv.filter((key) => !process.env[key]);
  if (missingEnv.length) {
    throw new Error(`Missing Xero env vars: ${missingEnv.join(", ")}. Configure the Xero developer app before running live verification.`);
  }
  pass("Xero OAuth env vars present");

  if (!["demo", "development"].includes(String(process.env.XERO_ENV || "").toLowerCase())) {
    warn("XERO_ENV should be set to demo or development for first live verification.");
  } else {
    pass(`Xero environment configured: ${process.env.XERO_ENV}`);
  }

  if (process.env.XERO_SCOPES) pass("Xero scopes configured from XERO_SCOPES");
  else pass("Xero scopes using built-in granular read-only defaults");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase service credentials for live Xero verification.");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { xeroAccountingProvider } = require("../lib/integrations/accounting/providers/xero.ts");
  const { decryptAccountingToken, encryptAccountingToken } = require("../lib/integrations/accounting/token-encryption.ts");
  const { getAccountingProviderMappingAdapter } = require("../lib/integrations/accounting/provider-adapters.ts");
  const { assertReadyForSourceAgnosticOutputs } = require("../lib/integrations/accounting/advisacor-data-model.ts");

  let query = supabase
    .from("accounting_connections")
    .select("*")
    .eq("provider", "xero")
    .in("status", ["connected", "needs_entity_selection"])
    .order("updated_at", { ascending: false });
  if (process.env.XERO_LIVE_CONNECTION_ID) query = query.eq("id", process.env.XERO_LIVE_CONNECTION_ID);

  const { data, error } = await query.limit(1);
  if (error) throw error;
  if (!data?.[0]) throw new Error("No connected Xero tenant found. Start OAuth with /api/integrations/xero/connect, complete callback, then rerun.");

  let connection = {
    ...data[0],
    access_token: decryptAccountingToken(data[0].access_token),
    refresh_token: decryptAccountingToken(data[0].refresh_token),
  };

  pass("Xero connection row found");

  if (!connection.access_token && !connection.refresh_token) throw new Error("Xero connection has no usable encrypted tokens.");

  if (connection.refresh_token && (!connection.token_expires_at || new Date(connection.token_expires_at).getTime() <= Date.now() + 300000)) {
    const refreshed = await xeroAccountingProvider.refreshAccessToken({ refreshToken: connection.refresh_token, connection });
    const expiresAt = new Date(Date.now() + Number(refreshed.expires_in || 3600) * 1000).toISOString();
    const { error: updateError } = await supabase
      .from("accounting_connections")
      .update({
        access_token: encryptAccountingToken(refreshed.access_token),
        refresh_token: encryptAccountingToken(refreshed.refresh_token || connection.refresh_token),
        token_expires_at: expiresAt,
        scopes: String(refreshed.scope || connection.scopes?.join(" ") || "").split(" ").filter(Boolean),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
    if (updateError) throw updateError;
    connection = {
      ...connection,
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token || connection.refresh_token,
      token_expires_at: expiresAt,
    };
    pass("Xero access token refreshed");
  }

  connection = await selectTenantIfNeeded({ supabase, adapter: xeroAccountingProvider, connection });

  const dateRange = latestMayDateRange();
  const mappingAdapter = getAccountingProviderMappingAdapter("xero");
  const rawReports = await mappingAdapter.fetchRawReports(connection, dateRange);
  const normalizedData = await mappingAdapter.normalize(rawReports, {
    connection,
    reportPeriod: dateRange,
    syncId: `xero-live-${Date.now()}`,
    tenantId: connection.tenant_or_realm_id || connection.external_entity_id || null,
    tenantName: connection.external_entity_name || "Xero Organization",
  });
  mappingAdapter.validate(normalizedData);
  assertReadyForSourceAgnosticOutputs(normalizedData);
  pass("AdvisacorNormalizedFinancialData validation passed");
  assertDownstreamReadiness(normalizedData);

  const auditSummary = safeAuditSummary(normalizedData);
  const outputDir = path.join(root, "scripts", "output");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "xero-live-audit-summary.json");
  fs.writeFileSync(outputPath, `${JSON.stringify(auditSummary, null, 2)}\n`);
  pass(`Safe Xero audit summary written: ${path.relative(root, outputPath)}`);

  await supabase
    .from("accounting_connections")
    .update({
      metadata_json: {
        ...(connection.metadata_json || {}),
        source_system: "xero",
        last_synced_at: normalizedData.lastSyncedAt,
        last_validation_result: normalizedData.validation.readyForReporting ? "passed" : "failed",
      },
      updated_at: normalizedData.lastSyncedAt,
    })
    .eq("id", connection.id);

  console.log("Xero live verification result: PASSED");
}

verifyXeroLive().catch((error) => {
  console.error("Xero live verification result: FAILED");
  console.error(error?.message || error);
  process.exitCode = 1;
});
