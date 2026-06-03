import { buildSignalCandidate } from "./buildSignalCandidate";
import type { SyntheticSignalCandidateInput } from "./types";

type DomainSignalInput = Omit<SyntheticSignalCandidateInput, "signalType" | "direction">;

export function buildCustomerConcentrationSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "customer_concentration", direction: "increase" });
}

export function buildVendorConcentrationSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "vendor_concentration", direction: "increase" });
}
