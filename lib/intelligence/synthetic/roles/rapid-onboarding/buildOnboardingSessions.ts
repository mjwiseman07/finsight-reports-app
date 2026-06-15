import {
  buildOnboardingSession,
  type BuildOnboardingSessionInput,
  type SyntheticOnboardingSession,
} from "./buildOnboardingSession";

export interface BuildOnboardingSessionsInput {
  items: BuildOnboardingSessionInput[];
}

export interface BuildOnboardingSessionsResult {
  onboardingSessions: SyntheticOnboardingSession[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildOnboardingSessions(input: BuildOnboardingSessionsInput): BuildOnboardingSessionsResult {
  const onboardingSessions: SyntheticOnboardingSession[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildOnboardingSession(item);

    if (result.onboardingSession) {
      onboardingSessions.push(result.onboardingSession);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `onboardingSessions[${index}]: ${warning}`));
  });

  return {
    onboardingSessions,
    skippedIndexes,
    warnings,
  };
}
