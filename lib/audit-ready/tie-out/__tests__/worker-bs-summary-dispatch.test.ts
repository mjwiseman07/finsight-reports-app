import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

describe("worker bs_recon_summary dispatch", () => {
  const src = readFileSync(join(__dirname, "../worker.ts"), "utf8");

  it("imports and calls runBsSummaryResolver for bs_recon_summary", () => {
    expect(src).toMatch(/import\s+\{\s*runBsSummaryResolver\s*\}/);
    expect(src).toMatch(/case\s+"bs_recon_summary"\s*:/);
    expect(src).toMatch(/runBsSummaryResolver\s*\(/);
  });

  it("does not leave bs_recon_summary in resolver_pending", () => {
    const pendingBlock = src.match(
      /case\s+"bank_recon":[\s\S]*?code:\s*"resolver_pending"/,
    );
    expect(pendingBlock).not.toBeNull();
    expect(pendingBlock![0]).not.toContain("bs_recon_summary");
  });
});
