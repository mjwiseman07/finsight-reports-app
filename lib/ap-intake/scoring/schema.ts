export type ScoreLayer = "L3" | "L4" | "L5" | "L6";
export type ScoreSeverity = "HIGH" | "MEDIUM" | "LOW";

export interface ContributingSignal {
  layer: ScoreLayer;
  code: string;
  severity: ScoreSeverity;
  evidence: Record<string, unknown>;
}

export interface AggregatedContribution extends ContributingSignal {
  contribution: number;
}

export interface AggregatedScore {
  bill_id: string;
  score: number;
  contributions: AggregatedContribution[];
  quarantine_recommended: boolean;
}
