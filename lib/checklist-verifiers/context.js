import { getQboForFirmClient } from "@/lib/qbo-for-firm-client";

export async function getVerifierQbo(ctx) {
  if (ctx._qbo) return ctx._qbo;
  ctx._qbo = await getQboForFirmClient(ctx.firmClientId);
  return ctx._qbo;
}
