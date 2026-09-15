import { describe, expect, it } from "vitest";
import { assertPbcStoragePathForEngagement } from "@/lib/audit-ready/pbc-storage-path";

const ENG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SHA = "a".repeat(64);

describe("assertPbcStoragePathForEngagement", () => {
  it("accepts canonical engagement-prefixed object keys", () => {
    const path = `${ENG}/${SHA}-report.pdf`;
    expect(assertPbcStoragePathForEngagement({ engagementId: ENG, storagePath: path })).toEqual({
      ok: true,
      storagePath: path,
    });
  });

  it("rejects cross-engagement prefix substitution", () => {
    const path = `${OTHER}/${SHA}-report.pdf`;
    expect(assertPbcStoragePathForEngagement({ engagementId: ENG, storagePath: path })).toEqual({
      ok: false,
    });
  });

  it("rejects traversal and malformed keys without revealing path", () => {
    const cases = [
      `${ENG}/../${OTHER}/${SHA}-x.pdf`,
      `${ENG}/${SHA}-..pdf`,
      `/${ENG}/${SHA}-x.pdf`,
      `${ENG}\\${SHA}-x.pdf`,
      `${ENG}/${SHA}%2e%2e-x.pdf`,
      `${ENG}//${SHA}-x.pdf`,
      `C:${ENG}/${SHA}-x.pdf`,
      `${ENG}/${SHA.slice(0, 32)}-short.pdf`,
      `${ENG}/not-a-sha-file.pdf`,
      `${ENG}/${SHA}-bad name.pdf`,
    ];
    for (const storagePath of cases) {
      const result = assertPbcStoragePathForEngagement({ engagementId: ENG, storagePath });
      expect(result).toEqual({ ok: false });
      expect(JSON.stringify(result)).not.toContain(storagePath);
    }
  });
});
