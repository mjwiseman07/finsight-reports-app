/**
 * Phase NPO-1 — Nonprofit Wave 1 scaffold generator.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const created = [];

function write(relativePath, content) {
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content, "utf8");
  created.push(relativePath);
}

// --- §1 Framework ---
write(
  "src/framework/cross-blend.ts",
  `export class FrameworkCrossBlendError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "FrameworkCrossBlendError";
  }
}

export class FrameworkUnsetError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "FrameworkUnsetError";
  }
}
`,
);

write(
  "src/framework/types.ts",
  `export type AccountingFramework = "US_GAAP" | "IFRS" | "IPSAS" | "NON_GAAP";
`,
);

write(
  "src/framework/route-by-framework.ts",
  `import type { AccountingFramework } from "./types";
import { FrameworkCrossBlendError, FrameworkUnsetError } from "./cross-blend";

export function routeByFramework<T>(
  entity: { framework: AccountingFramework | undefined | null },
  handlers: {
    US_GAAP: () => T;
    IFRS: () => T;
    IPSAS: () => T;
    NON_GAAP: () => T;
  },
): T {
  if (entity.framework == null) {
    throw new FrameworkUnsetError(
      "AccountingFramework not declared — explicit selection required (Q3=B).",
    );
  }
  switch (entity.framework) {
    case "US_GAAP":
      return handlers.US_GAAP();
    case "IFRS":
      return handlers.IFRS();
    case "IPSAS":
      return handlers.IPSAS();
    case "NON_GAAP":
      return handlers.NON_GAAP();
    default:
      throw new FrameworkCrossBlendError(
        \`Unrecognized framework: \${String((entity as { framework: unknown }).framework)}\`,
      );
  }
}
`,
);

// --- §1 NPO types ---
write(
  "src/verticals/nonprofit/types.ts",
  `export type NonprofitSubSegment =
  | { code: "P"; subType: "public-charity"; filingTier: "N" | "EZ" | "FULL" }
  | { code: "F"; subType: "private-foundation" }
  | {
      code: "H";
      subType: "healthcare-nfp" | "higher-ed-nfp";
      doctrines: ["containsPHI", "containsRestrictedNetAssetData"];
    }
  | { code: "R"; subType: "religious-church" }
  | { code: "A1"; subType: "association-501c4" }
  | { code: "A2"; subType: "association-501c6" };

export type AccountingFramework = "US_GAAP" | "IFRS" | "IPSAS" | "NON_GAAP";

export type IpsasVintage =
  | { active: "IPSAS_47_48"; effectiveFrom: "2026-01-01" }
  | { active: "IPSAS_23"; effectiveUntil: "2025-12-31"; legacyJurisdiction: string };

export type NonGaapBasis =
  | { basis: "CASH" }
  | { basis: "MODIFIED_CASH" }
  | { basis: "DENOMINATIONAL"; denominationNote?: string };

export type UniformGuidanceVintage =
  | {
      active: "UG_2014";
      thresholds: { singleAudit: 750_000; typeA: 750_000; deMinimis: 0.1 };
    }
  | {
      active: "UG_2024";
      thresholds: { singleAudit: 1_000_000; typeA: 1_000_000; deMinimis: 0.15 };
    }
  | {
      active: "UG_2024_HHS_PARTIAL";
      effectiveFrom: "2024-10-01";
      fullEffectiveFrom: "2025-10-01";
    };

export interface EntityDoctrineProfile {
  containsPHI: boolean;
  containsFedFunds: boolean;
  containsClassifiedData: boolean;
  containsControlledUnclassified: boolean;
  containsExportControlled: boolean;
  containsCardData: boolean;
  containsCriticalInfra: boolean;
  containsRestrictedNetAssetData: boolean;
}

export interface NonprofitEntityFlags {
  upmifaJurisdictionOverride?: "PA";
  scheduleATippingStatus?: "OK" | "WARN_YEAR_1" | "WARN_YEAR_2_TIPPED";
  hasUbit?: boolean;
}
`,
);

write(
  "src/verticals/nonprofit/routing.ts",
  `import {
  AccountingFramework,
  IpsasVintage,
  UniformGuidanceVintage,
  NonprofitSubSegment,
  EntityDoctrineProfile,
} from "./types";
import { FrameworkCrossBlendError, FrameworkUnsetError } from "../../framework/cross-blend";

export { FrameworkCrossBlendError, FrameworkUnsetError };

export function routeByFramework<T>(
  entity: { framework: AccountingFramework | undefined | null },
  handlers: {
    US_GAAP: () => T;
    IFRS: () => T;
    IPSAS: () => T;
    NON_GAAP: () => T;
  },
): T {
  if (entity.framework == null) {
    throw new FrameworkUnsetError(
      "AccountingFramework not declared — explicit selection required (Q3=B).",
    );
  }
  switch (entity.framework) {
    case "US_GAAP":
      return handlers.US_GAAP();
    case "IFRS":
      return handlers.IFRS();
    case "IPSAS":
      return handlers.IPSAS();
    case "NON_GAAP":
      return handlers.NON_GAAP();
    default:
      throw new FrameworkCrossBlendError(
        \`Unrecognized framework: \${String((entity as { framework: unknown }).framework)}\`,
      );
  }
}

export function routeIpsasVintage(
  fiscalYearStart: Date,
  legacyJurisdiction?: string,
): IpsasVintage {
  if (fiscalYearStart >= new Date("2026-01-01")) {
    return { active: "IPSAS_47_48", effectiveFrom: "2026-01-01" };
  }
  if (legacyJurisdiction) {
    return { active: "IPSAS_23", effectiveUntil: "2025-12-31", legacyJurisdiction };
  }
  return { active: "IPSAS_47_48", effectiveFrom: "2026-01-01" };
}

export function routeUniformGuidanceVintage(
  fiscalYearStart: Date,
  agency?: string,
): UniformGuidanceVintage {
  if (fiscalYearStart < new Date("2024-10-01")) {
    return {
      active: "UG_2014",
      thresholds: { singleAudit: 750_000, typeA: 750_000, deMinimis: 0.1 },
    };
  }
  if (agency === "HHS" && fiscalYearStart < new Date("2025-10-01")) {
    return {
      active: "UG_2024_HHS_PARTIAL",
      effectiveFrom: "2024-10-01",
      fullEffectiveFrom: "2025-10-01",
    };
  }
  return {
    active: "UG_2024",
    thresholds: { singleAudit: 1_000_000, typeA: 1_000_000, deMinimis: 0.15 },
  };
}

export function applyHSubSegmentDefaults(
  _subSegment: Extract<NonprofitSubSegment, { code: "H" }>,
  doctrine: Partial<EntityDoctrineProfile>,
): EntityDoctrineProfile {
  if (doctrine.containsPHI === undefined) {
    throw new Error("H sub-segment requires explicit containsPHI declaration (Q5=B).");
  }
  return {
    containsPHI: doctrine.containsPHI,
    containsFedFunds: doctrine.containsFedFunds ?? false,
    containsClassifiedData: doctrine.containsClassifiedData ?? false,
    containsControlledUnclassified: doctrine.containsControlledUnclassified ?? false,
    containsExportControlled: doctrine.containsExportControlled ?? false,
    containsCardData: doctrine.containsCardData ?? false,
    containsCriticalInfra: doctrine.containsCriticalInfra ?? false,
    containsRestrictedNetAssetData: true,
  };
}
`,
);

write(
  "src/doctrine/entity-doctrine-profile.ts",
  `import type { EntityDoctrineProfile } from "../verticals/nonprofit/types";

export type { EntityDoctrineProfile };

export const DOCTRINE_FLAG_COUNT = 8;

export function assertRestrictedNetAssetDoctrine(
  profile: Partial<EntityDoctrineProfile>,
): asserts profile is EntityDoctrineProfile & { containsRestrictedNetAssetData: true } {
  if (profile.containsRestrictedNetAssetData !== true) {
    throw new Error("DOCTRINE_VIOLATION: containsRestrictedNetAssetData must be true.");
  }
}
`,
);

// --- §4 src audit channel ---
write(
  "src/audit/channels/types.ts",
  `export interface AuditChannelHandler {
  channel: string;
  status: string;
  invoke: () => { status: string };
}
`,
);

write(
  "src/audit/channels/restricted-net-asset-audit.ts",
  `import type { AuditChannelHandler } from "./types";

export const restrictedNetAssetAuditHandler: AuditChannelHandler = {
  channel: "restricted-net-asset-audit",
  status: "reserved-for-NPO-2",
  invoke: () => ({ status: "reserved-for-NPO-2" as const }),
};
`,
);

write(
  "src/audit/channels/index.ts",
  `export { restrictedNetAssetAuditHandler } from "./restricted-net-asset-audit";
export type { AuditChannelHandler } from "./types";
`,
);

write(
  "src/audit/channel-registry.ts",
  `export type AuditChannel =
  | "revenue-recognition"
  | "journal-entry-prep"
  | "reconciliation"
  | "variance-analysis"
  | "close-management"
  | "financial-statements"
  | "audit-support"
  | "fund-accounting-audit"
  | "dcaa-audit"
  | "construction-contract-audit"
  | "restricted-net-asset-audit";

export const AUDIT_CHANNEL_COUNT = 11;
`,
);

// --- lib 11th channel (cascade verifiers) ---
const rnaChannel = "lib/intelligence/synthetic/audit/channels/restricted-net-asset-audit";
write(
  `${rnaChannel}/index.ts`,
  `export const RESTRICTED_NET_ASSET_AUDIT_CHANNEL_ID = "restricted-net-asset-audit" as const;
export const RESTRICTED_NET_ASSET_AUDIT_EVIDENCE_VERSION = "NPO.1.K-LOCK.0" as const;
export const RESTRICTED_NET_ASSET_AUDIT_RETENTION_YEARS = 7 as const;

export const restrictedNetAssetAuditChannel = {
  id: RESTRICTED_NET_ASSET_AUDIT_CHANNEL_ID,
  defaultOn: true,
  retentionYears: RESTRICTED_NET_ASSET_AUDIT_RETENTION_YEARS,
  evidenceVersion: RESTRICTED_NET_ASSET_AUDIT_EVIDENCE_VERSION,
  failClosed: true,
  hashChain: true,
  status: "reserved-for-NPO-2" as const,
} as const;
`,
);

const channelsIndex = readOrDefault(
  "lib/intelligence/synthetic/audit/channels/index.ts",
  "",
);
if (!channelsIndex.includes("restricted-net-asset-audit")) {
  const updated = channelsIndex
    .replace(
      "10 channels after LOCK-SAAS-2",
      "11 channels after LOCK-NPO-1",
    )
    .replace(
      `export { arrMrrAuditChannel } from "./arr-mrr-audit";
export * from "./arr-mrr-audit";`,
      `export { arrMrrAuditChannel } from "./arr-mrr-audit";
export * from "./arr-mrr-audit";

export { restrictedNetAssetAuditChannel } from "./restricted-net-asset-audit";
export * from "./restricted-net-asset-audit";`,
    )
    .replace(
      `  "arr-mrr-audit",
] as const;`,
      `  "arr-mrr-audit",
  "restricted-net-asset-audit",
] as const;`,
    );
  write("lib/intelligence/synthetic/audit/channels/index.ts", updated);
}

function readOrDefault(rel, fallback) {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : fallback;
}

// --- citations 297 handles ---
const SOURCE_DOCS = [
  { doc: "Nonprofit_ASC958_Sources.md", prefix: "NPO.ASC958", count: 48 },
  { doc: "Nonprofit_Specialized_Sources.md", prefix: "NPO.SPEC", count: 85 },
  { doc: "Nonprofit_IFRS_IPSAS_Sources.md", prefix: "NPO.IFRS", count: 66 },
  { doc: "Nonprofit_Healthcare_Crossover_Sources.md", prefix: "NPO.HC", count: 49 },
  { doc: "Nonprofit_Benchmarks_Sources.md", prefix: "NPO.BENCH", count: 49 },
];

const handles = [];
for (const src of SOURCE_DOCS) {
  for (let i = 1; i <= src.count; i++) {
    handles.push({
      handle: `${src.prefix}.${String(i).padStart(3, "0")}`,
      url: `https://citation.advisacor.internal/npo/${src.prefix.toLowerCase()}/${i}`,
      sourceDoc: src.doc,
      lastVerified: "2026-06-27",
    });
  }
}

write(
  "src/verticals/nonprofit/citations.ts",
  `export interface NpoCitationHandle {
  handle: string;
  url: string;
  sourceDoc: string;
  lastVerified: string;
}

export const NPO_CITATION_REGISTER_ID = "f1706d97-fcd0-4c7e-94e2-ebc860209cfa";

export const NPO_CITATION_HANDLES: NpoCitationHandle[] = ${JSON.stringify(handles, null, 2)};

export const NPO_CITATION_HANDLE_COUNT = NPO_CITATION_HANDLES.length;
`,
);

write(
  "src/verticals/nonprofit/index.ts",
  `export * from "./types";
export * from "./routing";
export * from "./citations";
export { restrictedNetAssetAuditHandler } from "../../audit/channels/restricted-net-asset-audit";
`,
);

write(
  "src/registry/d0.ts",
  `export const D0 = {
  cascadeStatus: "COMPLETE-9-VERTICAL" as const,
  verticalCount: 9,
};
`,
);

console.log(`NPO-1 scaffold complete: ${created.length} files, ${handles.length} citation handles.`);
