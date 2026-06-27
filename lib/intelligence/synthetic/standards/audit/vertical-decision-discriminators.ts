/**
 * LOCK-VC C4 — per-vertical decision audit discriminators.
 */
import type { ReportingBasis, ManufacturingCostingMethod } from "../../../../../src/verticals/manufacturing/types";
import type { FiscalCalendar, RetailSubSegment } from "../../../../../src/verticals/retail/types";
import type { NonprofitRestrictionType } from "../../../../../src/verticals/nonprofit/types";

export type VerifierVerticalSlug =
  | "healthcare"
  | "manufacturing"
  | "fund-accounting"
  | "govcon"
  | "construction"
  | "professional-services"
  | "saas"
  | "nonprofit"
  | "retail"
  | "UNKNOWN_LEGACY";

export interface VerticalContext {
  readonly reportingBasis: ReportingBasis;
  readonly vertical: VerifierVerticalSlug;
  readonly subSegment?: RetailSubSegment;
  readonly fiscalCalendar?: FiscalCalendar;
  readonly costingMethod?: ManufacturingCostingMethod;
  readonly restrictionType?: NonprofitRestrictionType;
  readonly provider340BStatus?: boolean;
}

export const LEGACY_VERTICAL_CONTEXT: VerticalContext = Object.freeze({
  reportingBasis: "US_GAAP",
  vertical: "UNKNOWN_LEGACY",
});

export interface PanelDecisionEntrySchemaField {
  readonly required: boolean;
}

export interface PanelDecisionEntrySchema {
  readonly fields: Readonly<Record<string, PanelDecisionEntrySchemaField>>;
}

export const PANEL_DECISION_ENTRY_SCHEMA: PanelDecisionEntrySchema = Object.freeze({
  fields: Object.freeze({
    verticalContext: Object.freeze({ required: true }),
    "verticalContext.reportingBasis": Object.freeze({ required: true }),
    "verticalContext.vertical": Object.freeze({ required: true }),
    "verticalContext.subSegment": Object.freeze({ required: false }),
    "verticalContext.fiscalCalendar": Object.freeze({ required: false }),
    "verticalContext.costingMethod": Object.freeze({ required: false }),
    "verticalContext.restrictionType": Object.freeze({ required: false }),
    "verticalContext.provider340BStatus": Object.freeze({ required: false }),
  }),
});

export function validatePanelDecisionEntrySchema(
  schema: PanelDecisionEntrySchema = PANEL_DECISION_ENTRY_SCHEMA,
): { passed: boolean; missing: readonly string[] } {
  const requiredFields = Object.entries(schema.fields)
    .filter(([, meta]) => meta.required)
    .map(([name]) => name);
  const optionalFields = Object.entries(schema.fields)
    .filter(([, meta]) => !meta.required)
    .map(([name]) => name);

  const missing: string[] = [];
  for (const field of requiredFields) {
    if (!schema.fields[field]) {
      missing.push(field);
    }
  }
  for (const field of optionalFields) {
    if (!schema.fields[field]) {
      missing.push(field);
    }
  }
  return { passed: missing.length === 0, missing };
}

export function mapIndustryHandleToVertical(industryHandle: string): VerifierVerticalSlug {
  const normalized = industryHandle.toLowerCase().replace(/_/g, "-");
  const map: Record<string, VerifierVerticalSlug> = {
    healthcare: "healthcare",
    manufacturing: "manufacturing",
    "fund-accounting": "fund-accounting",
    govcon: "govcon",
    construction: "construction",
    "professional-services": "professional-services",
    saas: "saas",
    nonprofit: "nonprofit",
    retail: "retail",
  };
  return map[normalized] ?? "UNKNOWN_LEGACY";
}

export function buildDefaultVerticalContext(
  industryHandle: string,
  partial?: Partial<VerticalContext>,
): VerticalContext {
  return Object.freeze({
    reportingBasis: partial?.reportingBasis ?? "US_GAAP",
    vertical: partial?.vertical ?? mapIndustryHandleToVertical(industryHandle),
    ...(partial?.subSegment !== undefined ? { subSegment: partial.subSegment } : {}),
    ...(partial?.fiscalCalendar !== undefined ? { fiscalCalendar: partial.fiscalCalendar } : {}),
    ...(partial?.costingMethod !== undefined ? { costingMethod: partial.costingMethod } : {}),
    ...(partial?.restrictionType !== undefined ? { restrictionType: partial.restrictionType } : {}),
    ...(partial?.provider340BStatus !== undefined
      ? { provider340BStatus: partial.provider340BStatus }
      : {}),
  });
}
