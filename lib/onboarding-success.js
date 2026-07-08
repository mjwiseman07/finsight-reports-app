export const onboardingDesignPrinciple = {
  name: "Time To First Value",
  targetMinutes: 15,
  promise: "A new user should be able to sign up, configure a company, connect data, and generate a first package within 15 minutes or less.",
  evaluationQuestion: "Does this help the customer reach value faster?",
  actionRule: "If not, remove, simplify, automate, or postpone.",
  experience: ["guided", "simple", "intelligent", "non-technical"],
  avoid: ["long forms", "unnecessary configuration", "accounting jargon", "setup fatigue"],
};

export const timeToFirstValueEvents = [
  "onboarding_started",
  "onboarding_completed",
  "first_package_generated",
  "first_ai_interaction",
];

export const onboardingStepTimeSeconds = {
  "Account Type": 30,
  "Practice Account": 60,
  "Advisory Firm Account": 60,
  "Data Acquisition": 180,
  "Company Information": 60,
  "First Client Company": 60,
  "Industry Type": 30,
  "Package Recommendation": 30,
  "Delivery Configuration": 30,
  "Generate First Package": 180,
  "Start pilot": 30,
  "Sign up": 120,
  "Pick flat or per-client": 30,
  "Connect QuickBooks Online": 180,
  "Pick industry vertical": 30,
  "Complete checkout": 120,
  "First Pulse Brief generates": 300,
  "Dashboard loads": 60,
};

export function getStepEstimatedSeconds(stepLabel) {
  return onboardingStepTimeSeconds[stepLabel] || 60;
}

export function getEstimatedRemainingSeconds(steps = [], currentStepIndex = 0) {
  return steps
    .slice(currentStepIndex)
    .reduce((total, stepLabel) => total + getStepEstimatedSeconds(stepLabel), 0);
}

export function formatEstimatedRemaining(seconds = 0) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Approximately ${minutes} minute${minutes === 1 ? "" : "s"} remaining`;
}

export function getTimeToFirstValueStatus(startedAt, completedAt) {
  if (!startedAt || !completedAt) return "pending";
  const elapsedMinutes = (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60_000;
  return elapsedMinutes <= onboardingDesignPrinciple.targetMinutes ? "on_target" : "over_target";
}
