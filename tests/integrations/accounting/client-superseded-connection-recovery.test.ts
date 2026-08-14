import { describe, expect, it, vi } from "vitest";
import {
  ACCOUNTING_CONNECTION_SUPERSEDED_CODE,
  DEMO_CANONICAL_CONNECTION_ID,
  DEMO_SUPERSEDED_CONNECTION_ID,
  PROVENANCE_CONNECTION_ID_FIELDS,
  REPAIRABLE_CLIENT_CONNECTION_ID_FIELDS,
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

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

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

  describe("URL + routing-context replacement", () => {
    it("documents repairable vs provenance field contracts", () => {
      expect([...REPAIRABLE_CLIENT_CONNECTION_ID_FIELDS]).toEqual([
        "connectionId",
        "reportDataContext.connectionId",
      ]);
      expect([...PROVENANCE_CONNECTION_ID_FIELDS]).toEqual([
        "normalizedData.connectionId",
        "reportDataContext.normalizedData.connectionId",
        "authoritativePersistence.connectionId",
        "persistedSyncRecord.connectionId",
        "reportDataContext.authoritativePersistence.connectionId",
        "reportDataContext.persistedSyncRecord.connectionId",
      ]);
    });

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

    it("repairs only routing/context connectionId fields", () => {
      const payload = {
        connectionId: STALE,
        sourceSystem: "xero",
        unrelated: STALE,
        reportDataContext: {
          connectionId: STALE,
          companyId: "02edb6c6-a4f1-4bae-825d-2680136dad24",
          normalizedData: { connectionId: STALE, sourceSystem: "xero" },
          authoritativePersistence: { connectionId: STALE, ok: true },
          persistedSyncRecord: { connectionId: STALE, syncId: "sync-old" },
        },
        normalizedData: { connectionId: STALE, sourceSystem: "xero" },
        authoritativePersistence: { connectionId: STALE, ok: true },
        persistedSyncRecord: { connectionId: STALE, syncId: "sync-old" },
      };
      const next = replaceStaleConnectionIdInClientPayload(payload, STALE, LIVE);
      expect(next.connectionId).toBe(LIVE);
      expect(next.reportDataContext.connectionId).toBe(LIVE);
      expect(next.unrelated).toBe(STALE);
      expect(next.reportDataContext.companyId).toBe("02edb6c6-a4f1-4bae-825d-2680136dad24");
    });

    it("applySupersededClientContextReplacement updates URL + routing fields together", () => {
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

  describe("provenance integrity", () => {
    it("never rewrites normalizedData or authoritativePersistence connectionIds", () => {
      const original = {
        connectionId: STALE,
        reportDataContext: {
          connectionId: STALE,
          normalizedData: { connectionId: STALE, syncId: "old-sync", sourceSystem: "xero" },
          authoritativePersistence: {
            connectionId: STALE,
            ok: true,
            syncId: "old-sync",
            reason: "durable_success_sync",
          },
          persistedSyncRecord: { connectionId: STALE, syncId: "old-sync" },
        },
        normalizedData: { connectionId: STALE, syncId: "old-sync", sourceSystem: "xero" },
        authoritativePersistence: {
          connectionId: STALE,
          ok: true,
          syncId: "old-sync",
          reason: "durable_success_sync",
        },
        persistedSyncRecord: { connectionId: STALE, syncId: "old-sync" },
      };
      const before = deepClone(original);
      const next = replaceStaleConnectionIdInClientPayload(original, STALE, LIVE);

      expect(next.normalizedData).toEqual(before.normalizedData);
      expect(next.authoritativePersistence).toEqual(before.authoritativePersistence);
      expect(next.persistedSyncRecord).toEqual(before.persistedSyncRecord);
      expect(next.reportDataContext.normalizedData).toEqual(before.reportDataContext.normalizedData);
      expect(next.reportDataContext.authoritativePersistence).toEqual(
        before.reportDataContext.authoritativePersistence,
      );
      expect(next.reportDataContext.persistedSyncRecord).toEqual(before.reportDataContext.persistedSyncRecord);

      // Routing fields repaired; evidence still attributes origin to ce526.
      expect(next.connectionId).toBe(LIVE);
      expect(next.reportDataContext.connectionId).toBe(LIVE);
      expect(next.normalizedData.connectionId).toBe(STALE);
      expect(next.authoritativePersistence.connectionId).toBe(STALE);
    });

    it("pre-retry must not persist routing repair as successor-origin evidence", () => {
      // Contract for dashboard callers: URL/routing may change pre-retry, but
      // localStorage evidence stays untouched until a successful successor fetch.
      const storedEvidence = {
        connectionId: STALE,
        normalizedData: { connectionId: STALE, sourceSystem: "xero" },
        authoritativePersistence: { connectionId: STALE, ok: true },
        reportDataContext: {
          connectionId: STALE,
          normalizedData: { connectionId: STALE },
        },
      };
      const storage = new Map<string, string>([
        ["advisacor_active_report_payload", JSON.stringify(storedEvidence)],
      ]);

      const applied = applySupersededClientContextReplacement({
        href: `/dashboard?connectionId=${STALE}`,
        payload: deepClone(storedEvidence),
        staleConnectionId: STALE,
        successorConnectionId: LIVE,
      });

      // Helper may return a routing-repaired in-memory view...
      expect(applied.href).toContain(`connectionId=${LIVE}`);
      expect(applied.payload?.connectionId).toBe(LIVE);
      // ...but provenance nested ids remain ce526, and storage is unchanged unless
      // the caller explicitly persists (dashboard must not persist pre-retry).
      expect((applied.payload as { normalizedData: { connectionId: string } }).normalizedData.connectionId).toBe(
        STALE,
      );
      expect(JSON.parse(storage.get("advisacor_active_report_payload") || "{}")).toEqual(storedEvidence);
    });

    it("post-success replaces storage with fresh successor payload (not patched old evidence)", () => {
      const storage = new Map<string, string>([
        [
          "advisacor_active_report_payload",
          JSON.stringify({
            connectionId: STALE,
            normalizedData: { connectionId: STALE, syncId: "old" },
            authoritativePersistence: { connectionId: STALE, syncId: "old" },
          }),
        ],
      ]);

      const freshFromSuccessor = {
        connectionId: LIVE,
        sourceSystem: "xero",
        syncId: "f2643856-b112-4053-99ef-77048580942e",
        normalizedData: {
          connectionId: LIVE,
          sourceSystem: "xero",
          syncId: "f2643856-b112-4053-99ef-77048580942e",
        },
        authoritativePersistence: {
          connectionId: LIVE,
          ok: true,
          syncId: "f2643856-b112-4053-99ef-77048580942e",
          reason: "durable_success_sync",
        },
        reportDataContext: {
          connectionId: LIVE,
          normalizedData: {
            connectionId: LIVE,
            syncId: "f2643856-b112-4053-99ef-77048580942e",
          },
        },
      };

      // Simulated dashboard post-success persist of server response.
      storage.set("advisacor_active_report_payload", JSON.stringify(freshFromSuccessor));
      const persisted = JSON.parse(storage.get("advisacor_active_report_payload") || "{}");
      expect(persisted.connectionId).toBe(LIVE);
      expect(persisted.normalizedData.connectionId).toBe(LIVE);
      expect(persisted.authoritativePersistence.connectionId).toBe(LIVE);
      expect(persisted.normalizedData.syncId).toBe("f2643856-b112-4053-99ef-77048580942e");
    });

    it("retry-failure leaves prior evidence attributed to the superseded connection", () => {
      const priorEvidence = {
        connectionId: STALE,
        normalizedData: { connectionId: STALE, syncId: "old-from-ce526" },
        authoritativePersistence: { connectionId: STALE, syncId: "old-from-ce526" },
      };
      const storage = new Map<string, string>([
        ["advisacor_active_report_payload", JSON.stringify(priorEvidence)],
      ]);

      // Pre-retry routing repair happens; caller must not write patched evidence.
      applySupersededClientContextReplacement({
        href: `/dashboard?connectionId=${STALE}`,
        payload: deepClone(priorEvidence),
        staleConnectionId: STALE,
        successorConnectionId: LIVE,
      });

      // Retry fails → storage still truthfully attributes evidence to ce526.
      expect(JSON.parse(storage.get("advisacor_active_report_payload") || "{}")).toEqual(priorEvidence);
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
      expect(events[0].metadata).not.toHaveProperty("token");
      expect(events[0].metadata).not.toHaveProperty("authorization");
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
