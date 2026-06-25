/**
 * Phase 42.7F — Cross-Phase Wiring Verifier
 * Doctrine:
 *  - builderNeverAuthorsContent: true
 *  - failClosedOnAuditWriteFailure: true (inherited from 42.7E E7)
 *  - complianceClass: SOC1 + SOC2-T2 + HIPAA
 */
import type { AuditEntryPartial, AuditEventKind, AuditLogWriter } from "../../lib/intelligence/synthetic/standards/audit/types";

export class ThrowingAuditLogWriter implements AuditLogWriter {
  constructor(
    private readonly throwOnKind: AuditEventKind,
    private readonly delegate?: AuditLogWriter,
  ) {}

  append(entry: AuditEntryPartial): void {
    if (entry.kind === this.throwOnKind) {
      throw new Error(`fail-closed-simulated:${entry.kind}`);
    }
    if (this.delegate) {
      this.delegate.append(entry);
    }
  }

  flush(): Promise<void> {
    return this.delegate?.flush() ?? Promise.resolve();
  }

  headHash(): string {
    return this.delegate?.headHash() ?? "GENESIS";
  }

  state(): { totalEntries: number; currentFile: string; headHash: string } {
    return this.delegate?.state() ?? { totalEntries: 0, currentFile: "throwing", headHash: "GENESIS" };
  }
}
