import { InMemoryAuditLogWriter } from "../../../lib/intelligence/synthetic/standards/audit/InMemoryAuditLogWriter";
import type { AuditEntryPartial } from "../../../lib/intelligence/synthetic/standards/audit/types";

const MAX_SAMPLES_PER_CHANNEL = 5;

export interface ChannelAuditEvent {
  readonly channelId: string;
  readonly timestampMs: number;
  readonly payload: Readonly<Record<string, unknown>>;
}

export class IntegrationAuditBus {
  private readonly coreWriter: InMemoryAuditLogWriter;
  private readonly channelEvents = new Map<string, ChannelAuditEvent[]>();

  constructor() {
    this.coreWriter = new InMemoryAuditLogWriter();
  }

  get writer(): InMemoryAuditLogWriter {
    return this.coreWriter;
  }

  appendCore(entry: AuditEntryPartial): void {
    this.coreWriter.append(entry);
  }

  appendChannel(channelId: string, payload: Readonly<Record<string, unknown>>): void {
    const events = this.channelEvents.get(channelId) ?? [];
    if (events.length >= MAX_SAMPLES_PER_CHANNEL * 10) {
      return;
    }
    events.push(
      Object.freeze({
        channelId,
        timestampMs: Date.now(),
        payload: Object.freeze({ ...payload }),
      }),
    );
    this.channelEvents.set(channelId, events);
  }

  eventsForChannel(channelId: string): readonly ChannelAuditEvent[] {
    return Object.freeze([...(this.channelEvents.get(channelId) ?? [])]);
  }

  allChannels(): readonly string[] {
    return Object.freeze([...this.channelEvents.keys()].sort());
  }

  sampleEventsPerChannel(): Record<string, readonly Record<string, unknown>[]> {
    const samples: Record<string, readonly Record<string, unknown>[]> = {};
    for (const [channelId, events] of this.channelEvents) {
      samples[channelId] = Object.freeze(
        events.slice(-MAX_SAMPLES_PER_CHANNEL).map((event) => event.payload),
      );
    }
    return Object.freeze(samples);
  }

  totalChannelEvents(): number {
    let total = 0;
    for (const events of this.channelEvents.values()) {
      total += events.length;
    }
    return total;
  }
}
