import type { FrameworkCode } from "../types";
import type { FrameworkId } from "./types";

const FRAMEWORK_CODE_TO_ID: Partial<Record<FrameworkCode, FrameworkId>> = {
  US_GAAP: "US_GAAP",
  IFRS: "IFRS",
  IFRS_SME: "IFRS_SME",
};

const FRAMEWORK_ID_TO_CODE: Record<FrameworkId, FrameworkCode> = {
  US_GAAP: "US_GAAP",
  IFRS: "IFRS",
  IFRS_SME: "IFRS_SME",
  SEC_REGS_X: "US_GAAP",
  SEC_FORM_20F: "US_GAAP",
};

export function mapFrameworkCodeToFrameworkId(code: FrameworkCode | null): FrameworkId {
  if (code === null) {
    return "US_GAAP";
  }
  const mapped = FRAMEWORK_CODE_TO_ID[code];
  if (!mapped) {
    return "US_GAAP";
  }
  return mapped;
}

export function mapFrameworkIdToFrameworkCode(framework: FrameworkId): FrameworkCode {
  return FRAMEWORK_ID_TO_CODE[framework];
}
