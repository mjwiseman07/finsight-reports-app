export interface SyntheticFormulaDefinition {
  formulaKey: string;
  version: string;
  label: string;
  description?: string;
  inputKeys: string[];
  outputKey: string;
  outputUnit?: "currency" | "percent" | "days" | "count" | "ratio" | "text";
}

export interface SyntheticFormulaRegistryEntry {
  definition: SyntheticFormulaDefinition;
  evidenceRequirements?: string[];
  traceTemplateKey?: string;
}
