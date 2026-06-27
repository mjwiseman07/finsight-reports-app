import type { FrameworkId } from "../../lib/intelligence/synthetic/standards/resolver/org-edge/types";
import type { IntegrationAuditBus } from "./harness/audit-bus";
import type { TestClock } from "./harness/clock";
import type { ParticipationTracker } from "./harness/participation-tracker";
import type { IsolatedRegistrySnapshot } from "./harness/registry-snapshot";
import type { MockEntityFactory } from "./mocks";

export type ScenarioCategory =
  | "consolidation-non-comingled"
  | "audit-channel-routing"
  | "disclosure-handoff"
  | "panel-decision"
  | "memory-framework"
  | "org-standards"
  | "registry-change-mgmt";

export type ScenarioResultKind =
  | "PASS"
  | "FAIL"
  | "NOT-RUN-DEPENDENCY-FAILED"
  | "SKIPPED-INTENTIONAL";

export interface ScenarioAssertion {
  readonly id: string;
  readonly description: string;
  readonly check: (ctx: ScenarioContext) => void | Promise<void>;
}

export interface AssertionResult {
  readonly id: string;
  readonly description: string;
  readonly passed: boolean;
  readonly message: string;
}

export interface ScenarioContext {
  readonly registry: IsolatedRegistrySnapshot;
  readonly auditBus: IntegrationAuditBus;
  readonly participation: ParticipationTracker;
  readonly mocks: MockEntityFactory;
  readonly clock: TestClock;
  readonly state: Record<string, unknown>;
}

export interface IntegrationScenario {
  readonly id: string;
  readonly category: ScenarioCategory;
  readonly title: string;
  readonly dependencies: readonly string[];
  readonly setup?: (ctx: ScenarioContext) => void | Promise<void>;
  readonly execute: (ctx: ScenarioContext) => void | Promise<void>;
  readonly assertions: readonly ScenarioAssertion[];
  readonly teardown?: (ctx: ScenarioContext) => void | Promise<void>;
}

export interface ScenarioRunReport {
  readonly id: string;
  readonly category: ScenarioCategory;
  readonly title: string;
  readonly result: ScenarioResultKind;
  readonly startedAt: string;
  readonly durationMs: number;
  readonly participatingVerticals: readonly string[];
  readonly participatingFrameworks: readonly FrameworkId[];
  readonly participatingControlLayers: readonly string[];
  readonly participatingChannels: readonly string[];
  readonly assertionResults: readonly AssertionResult[];
  readonly failedAssertions: readonly string[];
  readonly diagnosticHints: readonly string[];
  readonly dependencyFailureSource: string | null;
  readonly auditEventSamples: Record<string, readonly Record<string, unknown>[]> | null;
}

export interface IntegrationHarnessReport {
  readonly harnessVersion: "1.0.0";
  readonly category: ScenarioCategory | "all";
  readonly startedAt: string;
  readonly completedAt: string;
  readonly totalDurationMs: number;
  readonly budgetMs: number;
  readonly budgetUtilizationPct: number;
  readonly totalScenarios: number;
  readonly passed: number;
  readonly failed: number;
  readonly notRunDependencyFailed: number;
  readonly skippedIntentional: number;
  readonly scenarios: readonly ScenarioRunReport[];
  readonly result: "PASS" | "FAIL";
}
