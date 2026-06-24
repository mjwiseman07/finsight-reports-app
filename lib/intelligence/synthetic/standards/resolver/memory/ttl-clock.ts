export interface Clock {
  nowMs(): number;
}

export const realClock: Clock = { nowMs: () => Date.now() };
