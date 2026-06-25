/**
 * executable: false
 * containsVerticalComplianceLogic: false
 *
 * Shape-only panel contract for Fund Accounting performance surfaces.
 */

import type {
  FundAccountingPanelContext,
  FundAccountingSubSegment,
} from "../../../intelligence/synthetic/industry/contracts/fund-accounting/FABasisContracts";
import type { ReportingBasis } from "../../../intelligence/synthetic/standards/contracts/ReportingBasis";

export interface FundKpiValue {
  amount: number;
  unitOfMeasure: "USD" | "%" | "ratio" | "count";
}

export interface FundKpiField {
  id: string;
  label: string;
  value: FundKpiValue;
  basisOfStandards: string;
  applicableSubSegments: FundAccountingSubSegment[];
}

export interface FundPerformancePanelReadParams {
  companyId: string;
  accountingPeriod: string;
  context: FundAccountingPanelContext;
}

export interface FundPerformancePanelOutput {
  companyId: string;
  accountingPeriod: string;
  context: FundAccountingPanelContext;
  reportingBasis: ReportingBasis;
  navPerShare?: FundKpiField;
  fairValueHierarchy?: FundKpiField;
}

export type { FundAccountingPanelContext, FundAccountingSubSegment };
