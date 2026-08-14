import { describe, expect, it, vi } from "vitest";
import {
  ACCOUNTING_CONNECTION_SUPERSEDED_CODE,
  DEMO_CANONICAL_CONNECTION_ID,
  DEMO_SUPERSEDED_CONNECTION_ID,
  SUPERSEDED_RECOVERY_OBSERVABILITY_KEY,
  applySupersededClientContextReplacement,
  buildSupersededRecoveryObservation,
  decideSupersededClientRecovery,
  parseSupersededSuccessorConnectionId,
  recordSupersededRecoveryObservation,
  replaceStaleConnectionIdInClientPayload,
  replaceStaleConnectionIdInUrl,
} from "@/lib/integrations/accounting/client-superseded-connection-recovery";

const STALE = DEMO_SUPERSEDED_CONNECTION_ID;
const LIVE = DEMO_CANONICAL_CONNECTION_ID;

describe("client superseded connection recovery", () => {
  describe("exact 409 detection", () => {
    it("Demo fixture: ce526 → b718 is recoverable once", () => {
      const decision = decideSupersededClientRecovery({
        httpStatus: 409,
        body: {
          error: "Accounting connection has been superseded; use the successor connection.",
          code: ACCOUNTING_CONNECTION_SUPERSEDED_CODE,
          status: "superseded",
          connectionId: STALE,
          successorConnectionId: LIVE,
        },
        requestedConnectionId: STALE,
        alreadyRetried: false,
      });
      expect(decision).toEqual({
        shouldRetry: true,
        successorConnectionId: LIVE,
        reason: "recoverable_superseded",
      });
    });

    it("parses successor only for ACCOUNTING_CONNECTION_SUPERSEDED", () => {
      expect(
        parseSupersededSuccessorConnectionId({
          code: ACCOUNTING_CONNECTION_SUPERSEDED_CODE,
          successorConnectionId: LIVE,
        }),
      ).toBe(LIVE);
      expect(
        parseSupersededSuccessorConnectionId({
          code: "ACCOUNTING_CONNECTION_DISCONNECTED",
          successorConnectionId: LIVE,
        }),
      ).toBeNull();
    });
  });

  describe("one-retry guard + negative cases", () => {
    const recoverableBody = {
      code: ACCOUNTING_CONNECTION_SUPERSEDED_CODE,
      connectionId: STALE,
      successorConnectionId: LIVE,
    };

    it("does not retry after alreadyRetried", () => {
      expect(
        decideSupersededClientRecovery({
          httpStatus: 409,
          body: recoverableBody,
          requestedConnectionId: STALE,
          alreadyRetried: true,
        }).shouldRetry,
      ).toBe(false);
    });

    it("does not retry on 404", () => {
      expect(
        decideSupersededClientRecovery({
          httpStatus: 404,
          body: recoverableBody,
          requestedConnectionId: STALE,
          alreadyRetried: false,
        }).reason,
      ).toBe("wrong_status");
    });

    it("does not retry when successor is missing", () => {
      expect(
        decideSupersededClientRecovery({
          httpStatus: 409,
          body: {
            code: ACCOUNTING_CONNECTION_SUPERSEDED_CODE,
            connectionId: STALE,
          },
          requestedConnectionId: STALE,
          alreadyRetried: false,
        }).reason,
      ).toBe("missing_successor");
    });

    it("does not retry when code mismatches", () => {
      expect(
        decideSupersededClientRecovery({
          httpStatus: 409,
          body: {
            code: "ACCOUNTING_CONNECTION_EXPIRED",
            connectionId: STALE,
            successorConnectionId: LIVE,
          },
          requestedConnectionId: STALE,
          alreadyRetried: false,
        }).reason,
      ).toBe("missing_or_mismatched_code");
    });

    it("does not retry when successor equals requested", () => {
      expect(
        decideSupersededClientRecovery({
          httpStatus: 409,
          body: {
            code: ACCOUNTING_CONNECTION_SUPERSEDED_CODE,
            connectionId: STALE,
            successorConnectionId: STALE,
          },
          requestedConnectionId: STALE,
          alreadyRetried: false,
        }).reason,
      ).toBe("successor_equals_requested");
    });

    it("does not retry when body.connectionId mismatches request", () => {
      expect(
        decideSupersededClientRecovery({
          httpStatus: 409,
          body: {
            code: ACCOUNTING_CONNECTION_SUPERSEDED_CODE,
            connectionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            successorConnectionId: LIVE,
          },
          requestedConnectionId: STALE,
          alreadyRetried: false,
        }).reason,
      ).toBe("body_connection_mismatch");
    });
  });

  describe("URL + storage replacement", () => {
    it("replaces only connectionId query param and preserves others", () => {
      const href =
        `/dashboard?accountingConnected=true&provider=xero&connectionId=${STALE}&xeroOrganizationSelection=required&companyId=02edb6c6-a4f1-4bae-825d-2680136dad24#scorecard`;
      const next = replaceStaleConnectionIdInUrl(href, STALE, LIVE);
      expect(next).toContain(`connectionId=${LIVE}`);
      expect(next).not.toContain(STALE);
      expect(next).toContain("accountingConnected=true");
      expect(next).toContain("provider=xero");
      expect(next).toContain("xeroOrganizationSelection=required");
      expect(next).toContain("companyId=02edb6c6-a4f1-4bae-825d-2680136dad24");
      expect(next.endsWith("#scorecard")).toBe(true);
    });

    it("leaves URL unchanged when connectionId is already canonical", () => {
      const href = `/dashboard?connectionId=${LIVE}&provider=xero`;
      expect(replaceStaleConnectionIdInUrl(href, STALE, LIVE)).toBe(href);
    });

    it("replaces stale ids in client payload / reportDataContext only", () => {
      const payload = {
        connectionId: STALE,
        sourceSystem: "xero",
        unrelated: STALE,
        reportDataContext: {
          connectionId: STALE,
          companyId: "02edb6c6-a4f1-4bae-825d-2680136dad24",
          normalizedData: { connectionId: STALE, sourceSystem: "xero" },
        },
        normalizedData: { connectionId: STALE, sourceSystem: "xero" },
        authoritativePersistence: { connectionId: STALE, ok: true },
      };
      const next = replaceStaleConnectionIdInClientPayload(payload, STALE, LIVE);
      expect(next.connectionId).toBe(LIVE);
      expect(next.reportDataContext.connectionId).toBe(LIVE);
      expect(next.reportDataContext.normalizedData.connectionId).toBe(LIVE);
      expect(next.normalizedData.connectionId).toBe(LIVE);
      expect(next.authoritativePersistence.connectionId).toBe(LIVE);
      // Non-connectionId fields are not rewritten even if equal to the UUID.
      expect(next.unrelated).toBe(STALE);
      expect(next.reportDataContext.companyId).toBe("02edb6c6-a4f1-4bae-825d-2680136dad24");
    });

    it("applySupersededClientContextReplacement updates URL + payload together", () => {
      const applied = applySupersededClientContextReplacement({
        href: `/dashboard?foo=1&connectionId=${STALE}`,
        payload: { connectionId: STALE, reportDataContext: { connectionId: STALE } },
        staleConnectionId: STALE,
        successorConnectionId: LIVE,
      });
      expect(applied.href).toBe(`/dashboard?foo=1&connectionId=${LIVE}`);
      expect(applied.payload?.connectionId).toBe(LIVE);
      expect((applied.payload as { reportDataContext: { connectionId: string } }).reportDataContext.connectionId).toBe(
        LIVE,
      );
    });
  });

  describe("observability", () => {
    it("records recovered + skipped events without throwing", () => {
      const store = new Map<string, string>();
      const storage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      };

      recordSupersededRecoveryObservation(
        buildSupersededRecoveryObservation({
          recovered: true,
          staleConnectionId: STALE,
          successorConnectionId: LIVE,
          reason: "recoverable_superseded",
          path: "/api/accounting/active-context",
        }),
        storage,
      );
      recordSupersededRecoveryObservation(
        buildSupersededRecoveryObservation({
          recovered: false,
          staleConnectionId: STALE,
          successorConnectionId: null,
          reason: "already_retried",
        }),
        storage,
      );

      const events = JSON.parse(store.get(SUPERSEDED_RECOVERY_OBSERVABILITY_KEY) || "[]");
      expect(events).toHaveLength(2);
      expect(events[0].eventType).toBe("accounting_connection_superseded_recovered");
      expect(events[0].metadata.successorConnectionId).toBe(LIVE);
      expect(events[1].eventType).toBe("accounting_connection_superseded_retry_skipped");
    });

    it("swallows storage failures", () => {
      const storage = {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: vi.fn(),
      };
      expect(() =>
        recordSupersededRecoveryObservation(
          buildSupersededRecoveryObservation({
            recovered: true,
            staleConnectionId: STALE,
            successorConnectionId: LIVE,
            reason: "recoverable_superseded",
          }),
          storage,
        ),
      ).not.toThrow();
    });
  });
});
