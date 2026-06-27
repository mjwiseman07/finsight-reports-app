export class TestClock {
  private currentMs: number;

  constructor(startMs = Date.UTC(2026, 5, 18, 12, 0, 0)) {
    this.currentMs = startMs;
  }

  nowMs(): number {
    return this.currentMs;
  }

  nowISO(): string {
    return new Date(this.currentMs).toISOString();
  }

  advance(ms: number): void {
    if (ms < 0) {
      throw new Error("TestClock.advance: negative delta forbidden");
    }
    this.currentMs += ms;
  }
}
