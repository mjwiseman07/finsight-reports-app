/** Phase D6.5 Part 2 — Block 8a — RTP rail adapter (stub, no money movement). */
import type { RailAdapter, RailAttemptInput, RailAttemptResult } from "../rail-registry";

const VERSION = "rtp-adapter-v1.0.0";

export const rtpAdapter: RailAdapter = {
  rail: "rtp",
  version: VERSION,
  async attempt(input: RailAttemptInput): Promise<RailAttemptResult> {
    return {
      outcome: "pending",
      external_reference: null,
      adapter_version: VERSION,
      raw_adapter_payload: {
        note: "rtp adapter stub — no money movement in D6.5 Part 2",
        batch_line_id: input.batch_line_id,
        amount_cents: input.amount_cents,
      },
    };
  },
  async record(input): Promise<RailAttemptResult> {
    return {
      outcome: input.outcome,
      external_reference: input.external_reference,
      adapter_version: VERSION,
      raw_adapter_payload: {
        note: "rtp adapter stub — external outcome recorded",
        batch_line_id: input.batch_line_id,
      },
    };
  },
};
