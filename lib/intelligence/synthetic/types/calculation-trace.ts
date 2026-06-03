export interface SyntheticFormulaInput {
  key: string;
  value: number | string | boolean | null;
  evidenceId?: string;
}

export interface SyntheticFormulaOutput {
  key: string;
  value: number | string | boolean | null;
  unit?: "currency" | "percent" | "days" | "count" | "ratio" | "text";
}

export interface SyntheticTraceWarning {
  code: string;
  message: string;
  severity?: "info" | "warning" | "error";
}

export interface SyntheticCalculationStep {
  stepId: string;
  label: string;
  formulaRef?: string;
  inputs: SyntheticFormulaInput[];
  outputs: SyntheticFormulaOutput[];
  warnings?: SyntheticTraceWarning[];
}

export interface SyntheticCalculationTrace {
  id: string;
  moduleKey: string;
  metricKey?: string;
  period?: string;
  steps: SyntheticCalculationStep[];
  evidenceIds: string[];
  createdAt: string;
}
