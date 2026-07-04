/**
 * D6.4c-1 — Engagement resolution (portco -> firm_default) tests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockDb } from "../pre-close/_mock-db";

const mock = makeMockDb();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));

import {
  resolveEngagementForFirmClient,
  AmbiguousEngagementError,
} from "@/lib/engagements/resolve";

beforeEach(() => {
  mock.__reset();
});

describe("engagements/resolve resolveEngagementForFirmClient", () => {
  it("firm_client with portco -> resolves via portco", async () => {
    mock.__seed("portcos", [
      { firm_client_id: "fc1", engagement_id: "eng-p", created_at: "2026-01-01T00:00:00Z" },
    ]);
    const r = await resolveEngagementForFirmClient("fc1");
    expect(r.source).toBe("portco");
    expect(r.engagementId).toBe("eng-p");
  });

  it("firm_client with two portcos -> deterministic earliest created_at", async () => {
    mock.__seed("portcos", [
      { firm_client_id: "fc1", engagement_id: "eng-late", created_at: "2026-03-01T00:00:00Z" },
      { firm_client_id: "fc1", engagement_id: "eng-early", created_at: "2026-01-01T00:00:00Z" },
    ]);
    const r = await resolveEngagementForFirmClient("fc1");
    expect(r.source).toBe("portco");
    expect(r.engagementId).toBe("eng-early");
  });

  it("no portco but one active firm engagement -> resolves via firm_default", async () => {
    mock.__seed("firm_clients", [{ id: "fc2", firm_id: "firm1" }]);
    mock.__seed("engagements", [{ id: "eng-d", firm_id: "firm1", status: "active" }]);
    const r = await resolveEngagementForFirmClient("fc2");
    expect(r.source).toBe("firm_default");
    expect(r.engagementId).toBe("eng-d");
  });

  it("no portco and multiple active firm engagements -> throws AmbiguousEngagementError", async () => {
    mock.__seed("firm_clients", [{ id: "fc3", firm_id: "firm2" }]);
    mock.__seed("engagements", [
      { id: "eng-a", firm_id: "firm2", status: "active" },
      { id: "eng-b", firm_id: "firm2", status: "active" },
    ]);
    await expect(resolveEngagementForFirmClient("fc3")).rejects.toBeInstanceOf(
      AmbiguousEngagementError,
    );
  });
});
