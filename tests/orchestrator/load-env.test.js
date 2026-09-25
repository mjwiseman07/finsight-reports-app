import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { parseEnvFile, loadOrchestratorEnv } = require(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../scripts/orchestrator/load-env.js",
  ),
);

describe("orchestrator load-env", () => {
  it("parses KEY=value and ignores comments", () => {
    const parsed = parseEnvFile(
      "# comment\nCURSOR_API_KEY=abc123\nEMPTY=\nFOO=bar\n",
    );
    expect(parsed.CURSOR_API_KEY).toBe("abc123");
    expect(parsed.FOO).toBe("bar");
    expect(parsed.EMPTY).toBe("");
  });

  it("does not override existing process.env", () => {
    const prev = process.env.ORCH_LOAD_ENV_TEST;
    process.env.ORCH_LOAD_ENV_TEST = "keep-me";
    const tmpParent = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "_tmp",
    );
    fs.mkdirSync(tmpParent, { recursive: true });
    const root = fs.mkdtempSync(path.join(tmpParent, "env-"));
    fs.writeFileSync(
      path.join(root, ".env.local"),
      "ORCH_LOAD_ENV_TEST=from-file\n",
      "utf8",
    );
    loadOrchestratorEnv({ root });
    expect(process.env.ORCH_LOAD_ENV_TEST).toBe("keep-me");
    if (prev === undefined) delete process.env.ORCH_LOAD_ENV_TEST;
    else process.env.ORCH_LOAD_ENV_TEST = prev;
    fs.rmSync(root, { recursive: true, force: true });
  });
});
