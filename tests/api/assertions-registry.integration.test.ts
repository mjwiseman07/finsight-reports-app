import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeReviewerMockDb, seedFirmUser } from "../reviewer/_mock-service";
import { parseAssertionCatalogSeeds, parseRelevanceMatrixSeeds, readMigrationSql } from "../assertions/_migration-fixture";
import { ASSERTION_IDS } from "@/lib/pre-close/assertions-types";

const mock = makeReviewerMockDb();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => Object.assign(mock, { auth: mock.auth, storage: mock.storage }),
}));

import { GET } from "@/app/api/reviewer/assertions/route";

function seedCatalog() {
  const sql = readMigrationSql();
  const assertionIds = parseAssertionCatalogSeeds(sql);
  mock.__seed(
    "assertions_catalog",
    assertionIds.map((id) => ({
      assertion_id: id,
      display_name: id,
      isa_315_label: id,
      pcaob_legacy_category: "existence_occurrence",
      applies_transaction: true,
      applies_balance: true,
      description: "d",
      authoritative_citation: "c",
    })),
  );
  const matrix = parseRelevanceMatrixSeeds(sql);
  mock.__seed(
    "assertion_relevance_matrix",
    matrix.map((r) => ({
      account_category: r.account,
      assertion_id: r.assertion,
      relevance: "relevant",
      rationale: "r",
      citation: "c",
    })),
  );
}

beforeEach(() => {
  mock.__reset();
});

describe("GET /api/reviewer/assertions", () => {
  it("returns 200 with assertions and relevance for firm user", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedCatalog();
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/assertions", {
        headers: { authorization: "Bearer tok" },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.assertions)).toBe(true);
    expect(body.assertions).toHaveLength(8);
    expect(Array.isArray(body.relevance)).toBe(true);
    expect(body.relevance).toHaveLength(144);
  });

  it("returns 401 without bearer token", async () => {
    const res = await GET(new NextRequest("http://localhost/api/reviewer/assertions"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("missing_bearer_token");
  });

  it("rejects client-only user (no firm membership)", async () => {
    mock.auth.getUser.mockResolvedValue({ data: { user: { id: "c1" } }, error: null });
    mock.__seed("firm_client_users", [{ firm_client_id: "fc1", user_id: "c1", status: "active" }]);
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/assertions", {
        headers: { authorization: "Bearer tok" },
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("no_firm_membership");
  });

  it("returns assertion shape fields on catalog rows", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedCatalog();
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/assertions", {
        headers: { authorization: "Bearer tok" },
      }),
    );
    const body = await res.json();
    const first = body.assertions[0];
    expect(first).toHaveProperty("assertion_id");
    expect(first).toHaveProperty("isa_315_label");
    expect(first).toHaveProperty("authoritative_citation");
    expect(ASSERTION_IDS).toContain(first.assertion_id);
  });
});
