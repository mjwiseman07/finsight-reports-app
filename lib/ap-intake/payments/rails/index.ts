/** Phase D6.5 Part 2 — Block 8a — Rail adapter bootstrap. */
import { registerRail } from "../rail-registry";
import { achAdapter } from "./ach";
import { wireAdapter } from "./wire";
import { rtpAdapter } from "./rtp";
import { checkAdapter } from "./check";
import { virtualCardAdapter } from "./virtual-card";

let bootstrapped = false;

export function bootstrapRails(): void {
  if (bootstrapped) return;
  registerRail(achAdapter);
  registerRail(wireAdapter);
  registerRail(rtpAdapter);
  registerRail(checkAdapter);
  registerRail(virtualCardAdapter);
  bootstrapped = true;
}

export function _resetRailBootstrapForTesting(): void {
  bootstrapped = false;
}
