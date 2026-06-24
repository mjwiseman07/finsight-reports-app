import { fetchTreatmentContext } from "./fetchTreatmentContext";
import { resolveTreatmentPure } from "./resolveTreatmentPure";
import type { ResolveTreatmentInput, TreatmentResolution, TreatmentResolverDeps } from "./types";

export async function resolveTreatment(
  input: ResolveTreatmentInput,
  deps: TreatmentResolverDeps,
): Promise<TreatmentResolution> {
  const context = await fetchTreatmentContext(input, deps);
  const resolution = resolveTreatmentPure(context);

  return {
    ...resolution,
    generatedAt: deps.clock(),
  };
}
