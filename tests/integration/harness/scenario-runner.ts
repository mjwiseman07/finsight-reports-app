import { IntegrationAuditBus } from "./audit-bus";
import { TestClock } from "./clock";
import { scenarioDependsOn } from "./dependencies";
import { ParticipationTracker } from "./participation-tracker";
import { createIsolatedRegistry } from "./registry-snapshot";
import { createMockEntityFactory } from "../mocks";
import type {
  AssertionResult,
  IntegrationScenario,
  ScenarioContext,
  ScenarioRunReport,
} from "../types";

const SCENARIO_TIMEOUT_MS = 30_000;

export function createScenarioContext(): ScenarioContext {
  return Object.freeze({
    registry: createIsolatedRegistry(),
    auditBus: new IntegrationAuditBus(),
    participation: new ParticipationTracker(),
    mocks: createMockEntityFactory(),
    clock: new TestClock(),
    state: {},
  });
}

async function runAssertions(
  ctx: ScenarioContext,
  scenario: IntegrationScenario,
): Promise<{ results: AssertionResult[]; failed: string[]; hints: string[] }> {
  const results: AssertionResult[] = [];
  const failed: string[] = [];
  const hints: string[] = [];

  for (const assertion of scenario.assertions) {
    try {
      await assertion.check(ctx);
      results.push({
        id: assertion.id,
        description: assertion.description,
        passed: true,
        message: "ok",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        id: assertion.id,
        description: assertion.description,
        passed: false,
        message,
      });
      failed.push(assertion.id);
      hints.push(`${assertion.id}: ${message}`);
    }
  }

  return { results, failed, hints };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label}: timed out after ${ms}ms`));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function runScenario(
  scenario: IntegrationScenario,
  failedStages: ReadonlySet<string>,
  intentionalSkip: boolean,
): Promise<ScenarioRunReport> {
  const startedAt = new Date();
  const ctx = createScenarioContext();

  ctx.participation.recordControlLayer("integration-harness");

  if (intentionalSkip) {
    return {
      id: scenario.id,
      category: scenario.category,
      title: scenario.title,
      result: "SKIPPED-INTENTIONAL",
      startedAt: startedAt.toISOString(),
      durationMs: 0,
      participatingVerticals: ctx.participation.verticalsList(),
      participatingFrameworks: ctx.participation.frameworksList(),
      participatingControlLayers: ctx.participation.controlLayersList(),
      participatingChannels: ctx.participation.channelsList(),
      assertionResults: [],
      failedAssertions: [],
      diagnosticHints: [],
      dependencyFailureSource: null,
      auditEventSamples: null,
    };
  }

  const dependencySource = scenarioDependsOn(scenario.id, failedStages);
  if (dependencySource) {
    return {
      id: scenario.id,
      category: scenario.category,
      title: scenario.title,
      result: "NOT-RUN-DEPENDENCY-FAILED",
      startedAt: startedAt.toISOString(),
      durationMs: 0,
      participatingVerticals: ctx.participation.verticalsList(),
      participatingFrameworks: ctx.participation.frameworksList(),
      participatingControlLayers: ctx.participation.controlLayersList(),
      participatingChannels: ctx.participation.channelsList(),
      assertionResults: [],
      failedAssertions: [],
      diagnosticHints: [`Upstream dependency failed: ${dependencySource}`],
      dependencyFailureSource: dependencySource,
      auditEventSamples: null,
    };
  }

  try {
    await withTimeout(
      (async () => {
        if (scenario.setup) {
          await scenario.setup(ctx);
        }
        await scenario.execute(ctx);
      })(),
      SCENARIO_TIMEOUT_MS,
      scenario.id,
    );
  } catch (error) {
    const completedAt = Date.now();
    const message = error instanceof Error ? error.message : String(error);
    return {
      id: scenario.id,
      category: scenario.category,
      title: scenario.title,
      result: "FAIL",
      startedAt: startedAt.toISOString(),
      durationMs: completedAt - startedAt.getTime(),
      participatingVerticals: ctx.participation.verticalsList(),
      participatingFrameworks: ctx.participation.frameworksList(),
      participatingControlLayers: ctx.participation.controlLayersList(),
      participatingChannels: ctx.participation.channelsList(),
      assertionResults: [],
      failedAssertions: ["execute"],
      diagnosticHints: [message],
      dependencyFailureSource: null,
      auditEventSamples: ctx.auditBus.sampleEventsPerChannel(),
    };
  }

  const { results, failed, hints } = await runAssertions(ctx, scenario);

  if (scenario.teardown) {
    await scenario.teardown(ctx);
  }

  const completedAt = Date.now();
  const passed = failed.length === 0;

  return {
    id: scenario.id,
    category: scenario.category,
    title: scenario.title,
    result: passed ? "PASS" : "FAIL",
    startedAt: startedAt.toISOString(),
    durationMs: completedAt - startedAt.getTime(),
    participatingVerticals: ctx.participation.verticalsList(),
    participatingFrameworks: ctx.participation.frameworksList(),
    participatingControlLayers: ctx.participation.controlLayersList(),
    participatingChannels: ctx.participation.channelsList(),
    assertionResults: results,
    failedAssertions: failed,
    diagnosticHints: hints,
    dependencyFailureSource: null,
    auditEventSamples: passed ? null : ctx.auditBus.sampleEventsPerChannel(),
  };
}
