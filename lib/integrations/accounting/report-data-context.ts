import type { AccountingProvider, AccountingDateRange, AdvisacorNormalizedFinancialData, AccountingMappingAdapterName } from "./types";

export interface ReportDataContext {
  companyId: string | null;
  connectionId: string;
  sourceSystem: AccountingProvider;
  adapterName: AccountingMappingAdapterName;
  tenantId: string | null;
  tenantName: string;
  reportPeriod: AccountingDateRange & { label?: string };
  normalizedData: AdvisacorNormalizedFinancialData;
  validationResult: AdvisacorNormalizedFinancialData["validation"];
  syncId: string;
  generatedAt: string;
  diagnostics?: {
    sourceSystem: AccountingProvider;
    tenantName: string;
    accountsCount: number;
    trialBalanceCount: number;
    balanceSheetCount: number;
    incomeStatementCount: number;
  };
}

export type ProviderIdentityInput = {
  sourceSystem?: string | null;
  connectionId?: string | null;
  tenantId?: string | null;
  tenantName?: string | null;
};

function normalizeIdentityPart(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^lead:[^:]+:/, "")
    .replace(/^xero:/, "")
    .replace(/\s+/g, " ");
}

export function normalizeProviderIdentity(identity: ProviderIdentityInput) {
  const sourceSystem = normalizeIdentityPart(identity.sourceSystem);
  const connectionId = normalizeIdentityPart(identity.connectionId);
  const tenantId = normalizeIdentityPart(identity.tenantId);
  const tenantName = normalizeIdentityPart(identity.tenantName);
  const providerKey = [sourceSystem, tenantId || tenantName || connectionId].filter(Boolean).join(":");
  return {
    sourceSystem,
    connectionId,
    tenantId,
    tenantName,
    providerKey,
  };
}

export function providerIdentitiesMatch(expected: ProviderIdentityInput, actual: ProviderIdentityInput) {
  const expectedIdentity = normalizeProviderIdentity(expected);
  const actualIdentity = normalizeProviderIdentity(actual);
  if (!expectedIdentity.sourceSystem || expectedIdentity.sourceSystem !== actualIdentity.sourceSystem) {
    return { matches: false, expectedIdentity, actualIdentity };
  }
  if (expectedIdentity.tenantId && actualIdentity.tenantId) {
    return { matches: expectedIdentity.tenantId === actualIdentity.tenantId, expectedIdentity, actualIdentity };
  }
  if (expectedIdentity.tenantName && actualIdentity.tenantName) {
    return { matches: expectedIdentity.tenantName === actualIdentity.tenantName, expectedIdentity, actualIdentity };
  }
  if (expectedIdentity.connectionId && actualIdentity.connectionId) {
    return { matches: expectedIdentity.connectionId === actualIdentity.connectionId, expectedIdentity, actualIdentity };
  }
  return { matches: expectedIdentity.providerKey !== "" && expectedIdentity.providerKey === actualIdentity.providerKey, expectedIdentity, actualIdentity };
}

export function assertReportDataContext(context: ReportDataContext | null | undefined) {
  if (!context?.connectionId) throw new Error("Missing accounting connectionId");
  if (!context.sourceSystem) throw new Error("Missing sourceSystem");
  if (!context.normalizedData) throw new Error("Missing normalized financial data");
  if (!context.adapterName || !context.normalizedData.adapterName || context.adapterName !== context.normalizedData.adapterName) {
    throw new Error("Mapping adapter mismatch");
  }
  const identityCheck = providerIdentitiesMatch(
    {
      sourceSystem: context.sourceSystem,
      connectionId: context.connectionId,
      tenantId: context.tenantId,
      tenantName: context.tenantName,
    },
    {
      sourceSystem: context.normalizedData.sourceSystem,
      connectionId: context.normalizedData.connectionId,
      tenantId: context.normalizedData.tenantId,
      tenantName: context.normalizedData.tenantName,
    },
  );
  if (!identityCheck.matches) {
    throw new Error(`Provider mismatch: context ${identityCheck.expectedIdentity.providerKey || "missing"} but normalized ${identityCheck.actualIdentity.providerKey || "missing"}`);
  }
  return context;
}

export function assertFallbackMatchesContext(
  context: ReportDataContext,
  fallback: { sourceSystem?: string | null; connectionId?: string | null } | null | undefined,
) {
  if (!fallback) return null;
  if (fallback.sourceSystem !== context.sourceSystem || fallback.connectionId !== context.connectionId) {
    throw new Error(`Unsafe fallback source: context ${context.sourceSystem}/${context.connectionId} but fallback ${fallback.sourceSystem || "missing"}/${fallback.connectionId || "missing"}`);
  }
  return fallback;
}

export function assertScheduleSource(scheduleName: string, context: ReportDataContext, scheduleData?: unknown) {
  assertReportDataContext(context);
  const mismatches: string[] = [];
  let sourceCount = 0;
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const record = value as Record<string, unknown>;
    if (typeof record.sourceSystem === "string") {
      sourceCount += 1;
      if (record.sourceSystem !== context.sourceSystem) mismatches.push(record.sourceSystem);
    }
    if (record.source && typeof record.source === "object") {
      const source = record.source as Record<string, unknown>;
      if (typeof source.provider === "string") {
        sourceCount += 1;
        if (source.provider !== context.sourceSystem) mismatches.push(source.provider);
      }
    }
    Object.values(record).forEach(visit);
  };
  visit(scheduleData || context.normalizedData);
  if (!sourceCount) throw new Error(`Missing sourceSystem for schedule ${scheduleName}`);
  if (mismatches.length) {
    throw new Error(`Provider mismatch in ${scheduleName}: context source ${context.sourceSystem} but schedule source ${mismatches[0]}`);
  }
  return true;
}

export function buildReportDataContext({
  companyId = null,
  connectionId,
  sourceSystem,
  adapterName,
  tenantId = null,
  tenantName = "",
  reportPeriod,
  normalizedData,
  syncId,
  generatedAt = new Date().toISOString(),
  diagnostics,
}: {
  companyId?: string | null;
  connectionId: string;
  sourceSystem: AccountingProvider;
  adapterName?: AccountingMappingAdapterName;
  tenantId?: string | null;
  tenantName?: string;
  reportPeriod: ReportDataContext["reportPeriod"];
  normalizedData: AdvisacorNormalizedFinancialData;
  syncId: string;
  generatedAt?: string;
  diagnostics?: ReportDataContext["diagnostics"];
}) {
  return assertReportDataContext({
    companyId,
    connectionId,
    sourceSystem,
    adapterName: adapterName || normalizedData.adapterName,
    tenantId,
    tenantName,
    reportPeriod,
    normalizedData,
    validationResult: normalizedData.validation,
    syncId,
    generatedAt,
    diagnostics,
  });
}
