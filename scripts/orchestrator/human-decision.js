/**
 * Human decision packet — one precise question when automation cannot proceed.
 * Fail-closed. No secrets. Used for morning reports and HUMAN_DECISION_REQUIRED.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { resolveSafeRepoPath, getRepoRoot } = require("./lib");
const { redactValue, truncateString } = require("./blocker-packet");

function getHumanDecisionPath(planPath) {
  const absolute = path.isAbsolute(planPath)
    ? planPath
    : resolveSafeRepoPath(planPath);
  const parsed = path.parse(absolute);
  return path.join(parsed.dir, `${parsed.name}.human-decision.json`);
}

/**
 * @param {object} args
 * @param {string} args.planId
 * @param {string} args.state
 * @param {string} args.question - one precise decision question
 * @param {string} args.why - why automation cannot decide
 * @param {Array<{id?:string,label?:string,behavior?:string,impact?:string}>} [args.options]
 * @param {string|null} [args.recommended] - safer technical default if any
 * @param {string[]} [args.completed]
 * @param {string[]} [args.waiting]
 */
function buildHumanDecisionPacket({
  planId,
  state,
  question,
  why,
  options = [],
  recommended = null,
  completed = [],
  waiting = [],
} = {}) {
  if (!planId || String(planId).trim() === "") {
    throw new Error("Human decision packet requires planId");
  }
  if (!question || String(question).trim().length < 8) {
    throw new Error("Human decision packet requires a precise question");
  }
  if (!why || String(why).trim().length < 8) {
    throw new Error("Human decision packet requires why automation cannot decide");
  }

  const normalizedOptions = (Array.isArray(options) ? options : [])
    .slice(0, 8)
    .map((opt, index) => {
      if (typeof opt === "string") {
        return {
          id: String.fromCharCode(65 + index),
          label: truncateString(opt, 200),
          behavior: truncateString(opt, 400),
          impact: null,
        };
      }
      if (!opt || typeof opt !== "object") {
        throw new Error("Malformed human decision option");
      }
      return {
        id: opt.id || String.fromCharCode(65 + index),
        label: opt.label ? truncateString(opt.label, 200) : null,
        behavior: opt.behavior ? truncateString(opt.behavior, 400) : null,
        impact: opt.impact ? truncateString(opt.impact, 400) : null,
      };
    });

  return redactValue({
    schema: "advisacor.human_decision.v1",
    plan_id: String(planId).trim(),
    current_state: state || "HUMAN_DECISION_REQUIRED",
    decision_needed: truncateString(String(question).trim(), 600),
    why_automation_cannot_decide: truncateString(String(why).trim(), 800),
    options: normalizedOptions,
    recommended_technical_default: recommended
      ? truncateString(String(recommended).trim(), 600)
      : null,
    work_already_completed: (Array.isArray(completed) ? completed : [])
      .slice(0, 20)
      .map((item) => truncateString(String(item), 300)),
    work_waiting_on_decision: (Array.isArray(waiting) ? waiting : [])
      .slice(0, 20)
      .map((item) => truncateString(String(item), 300)),
    created_at: new Date().toISOString(),
    merge: false,
    deploy: false,
    assumed_answer: null,
  });
}

function writeHumanDecisionPacket(planPath, packet) {
  const decisionPath = getHumanDecisionPath(planPath);
  const root = getRepoRoot();
  const rel = path.relative(root, decisionPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(
      `Human decision path escapes repository root: ${decisionPath}`,
    );
  }
  if (!packet || typeof packet !== "object" || Array.isArray(packet)) {
    throw new Error("Human decision packet must be a JSON object");
  }
  if (packet.merge === true || packet.deploy === true) {
    throw new Error("Human decision packet must not grant merge or deploy authority");
  }
  if (packet.assumed_answer != null && packet.assumed_answer !== "") {
    throw new Error(
      "Human decision packet must not assume an answer (assumed_answer forbidden)",
    );
  }
  const payload = redactValue({
    ...packet,
    merge: false,
    deploy: false,
    assumed_answer: null,
    updated_at: new Date().toISOString(),
  });
  fs.writeFileSync(decisionPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return decisionPath;
}

function readHumanDecisionPacket(planPath) {
  const decisionPath = getHumanDecisionPath(planPath);
  if (!fs.existsSync(decisionPath)) {
    return null;
  }
  let raw;
  try {
    raw = fs.readFileSync(decisionPath, "utf8");
  } catch {
    throw new Error(`Unreadable human decision packet: ${decisionPath}`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Malformed human decision packet JSON: ${decisionPath}`);
  }
}

/**
 * Plain-text morning-report block for a human decision packet.
 */
function formatHumanDecisionText(packet) {
  if (!packet || typeof packet !== "object") {
    return "HUMAN DECISION REQUIRED\n(no packet)";
  }
  const lines = [
    "HUMAN DECISION REQUIRED",
    `PLAN: ${packet.plan_id || "(unknown)"}`,
    `CURRENT STATE: ${packet.current_state || "HUMAN_DECISION_REQUIRED"}`,
    "",
    "DECISION NEEDED:",
    packet.decision_needed || "(missing)",
    "",
    "WHY AUTOMATION CANNOT DECIDE:",
    packet.why_automation_cannot_decide || "(missing)",
    "",
  ];

  const options = Array.isArray(packet.options) ? packet.options : [];
  if (options.length === 0) {
    lines.push("OPTIONS: (none provided)");
  } else {
    for (const opt of options) {
      const id = opt.id || "?";
      lines.push(`OPTION ${id}:`);
      if (opt.label) lines.push(`  label: ${opt.label}`);
      if (opt.behavior) lines.push(`  behavior: ${opt.behavior}`);
      if (opt.impact) lines.push(`  impact: ${opt.impact}`);
    }
  }

  lines.push("");
  lines.push("RECOMMENDED TECHNICAL DEFAULT:");
  lines.push(packet.recommended_technical_default || "(none — human must choose)");
  lines.push("");
  lines.push("WORK ALREADY COMPLETED:");
  const completed = packet.work_already_completed || [];
  if (!completed.length) {
    lines.push("- (none listed)");
  } else {
    for (const item of completed) lines.push(`- ${item}`);
  }
  lines.push("");
  lines.push("WORK WAITING ON DECISION:");
  const waiting = packet.work_waiting_on_decision || [];
  if (!waiting.length) {
    lines.push("- (none listed)");
  } else {
    for (const item of waiting) lines.push(`- ${item}`);
  }

  return lines.join("\n");
}

module.exports = {
  getHumanDecisionPath,
  buildHumanDecisionPacket,
  writeHumanDecisionPacket,
  readHumanDecisionPacket,
  formatHumanDecisionText,
};
