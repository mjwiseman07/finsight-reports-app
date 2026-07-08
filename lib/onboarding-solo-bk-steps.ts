export const SOLO_BK_STEPS = [
  {
    key: "start_pilot",
    label: "Start pilot",
    estimatedSeconds: 30,
    description:
      "Click Start pilot to begin. We'll walk you through connecting your first QBO client and generating your first Pulse Brief.",
  },
  {
    key: "signup",
    label: "Sign up",
    estimatedSeconds: 120,
    description: "Create your Advisacor account with email + password.",
  },
  {
    key: "pick_plan",
    label: "Pick flat or per-client",
    estimatedSeconds: 30,
    description:
      "Flat: $399/mo (or $279 pilot) — up to 10 clients. Per-client: $99/mo/client (or $69 pilot) — pay as you grow.",
  },
  {
    key: "connect_qbo",
    label: "Connect QuickBooks Online",
    estimatedSeconds: 180,
    description:
      "Grant Advisacor read + write access to your first QBO client. Xero coming later this year.",
  },
  {
    key: "pick_vertical",
    label: "Pick industry vertical",
    estimatedSeconds: 30,
    description:
      "Choose the vertical for this client (Manufacturing, Retail, Healthcare, Professional Services, and 11 more). Determines KPI + disclosure library.",
  },
  {
    key: "stripe_checkout",
    label: "Complete checkout",
    estimatedSeconds: 120,
    description: "Enter payment details. Pilot pricing locks for 90 days from today.",
  },
  {
    key: "first_pulse_brief",
    label: "First Pulse Brief generates",
    estimatedSeconds: 300,
    description:
      "We pull last month's close from QBO, run the vertical rules, and generate your first Pulse Brief. Sit back — this takes about 5 minutes.",
  },
  {
    key: "dashboard_load",
    label: "Dashboard loads",
    estimatedSeconds: 60,
    description:
      "Your bookkeeper dashboard opens with your first client's Pulse Brief ready to review.",
  },
] as const;

export function soloBkStepsEstimatedTotal(): number {
  return SOLO_BK_STEPS.reduce((s, step) => s + step.estimatedSeconds, 0);
}
