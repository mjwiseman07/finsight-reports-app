import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn();

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      insert: (...args: unknown[]) => insert(...args),
    }),
  }),
}));

import { emitMemoryEvent } from "../events";

beforeEach(() => {
  insert.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("emitMemoryEvent", () => {
  it("inserts a happy-path event", async () => {
    insert.mockResolvedValue({ error: null });

    await emitMemoryEvent({
      eventType: "copy_clicked",
      engagementId: "eng-1",
      actorUserId: "user-1",
      payload: { copied_investigation_id: "inv-1" },
    });

    expect(insert).toHaveBeenCalledWith({
      event_type: "copy_clicked",
      engagement_id: "eng-1",
      actor_user_id: "user-1",
      payload: { copied_investigation_id: "inv-1" },
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("logs insert failures and does not throw", async () => {
    insert.mockResolvedValue({ error: { message: "insert failed" } });

    await expect(
      emitMemoryEvent({
        eventType: "suggestions_shown",
        engagementId: "eng-1",
        actorUserId: "user-1",
      }),
    ).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledWith(
      "[memory-events] emit failed",
      "suggestions_shown",
      expect.objectContaining({ message: "insert failed" }),
    );
  });

  it("catches thrown errors and does not throw", async () => {
    insert.mockRejectedValue(new Error("network down"));

    await expect(
      emitMemoryEvent({
        eventType: "resolution_saved",
        engagementId: "eng-1",
        actorUserId: null,
      }),
    ).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledWith(
      "[memory-events] emit failed",
      "resolution_saved",
      expect.any(Error),
    );
  });
});
