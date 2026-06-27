import { spawnSync } from "node:child_process";
import { join } from "node:path";

const repoRoot = process.cwd();

export function spawnPass(command: string, args: string[]): void {
  const resolved = resolveInvocation(command, args);
  const result = spawnSync(resolved.command, resolved.args, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false,
    stdio: "pipe",
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed (exit ${result.status ?? "null"})\n` +
        `${result.stderr}\n${result.stdout}`,
    );
  }
}

function resolveInvocation(command: string, args: string[]): { command: string; args: string[] } {
  const node = process.execPath;

  if (command === "pnpm" && args[0] === "exec" && args[1] === "vitest") {
    return {
      command: node,
      args: [join(repoRoot, "node_modules/vitest/vitest.mjs"), ...args.slice(2)],
    };
  }

  if (command === "node") {
    return { command, args };
  }

  return { command, args };
}

export function executable(command: string): string {
  return command;
}
