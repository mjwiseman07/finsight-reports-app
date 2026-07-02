import { getVerifierQbo } from "./context";
import { extractQueryEntities, qboQuery } from "@/lib/qbo-rest";

export async function recurringAccrualsPosted(ctx) {
  const { accessToken, realmId } = await getVerifierQbo(ctx);
  const periodEnd = new Date(ctx.periodEnd);
  const priorRanges = [1, 2, 3].map((m) => {
    const end = new Date(periodEnd);
    end.setMonth(end.getMonth() - m);
    const start = new Date(end);
    start.setDate(1);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  });

  const jes = [];
  for (const r of priorRanges) {
    const payload = await qboQuery(
      accessToken,
      realmId,
      `select Id, PrivateNote, DocNumber from JournalEntry where TxnDate >= '${r.start}' and TxnDate <= '${r.end}' maxresults 1000`,
    );
    const monthJes = extractQueryEntities(payload, "JournalEntry");
    jes.push(
      monthJes.map((j) => ({
        memo: j.PrivateNote || j.DocNumber || "",
        month: r.start,
      })),
    );
  }

  const memoCount = new Map();
  jes.forEach((month) =>
    month.forEach((j) => {
      if (!j.memo) return;
      memoCount.set(j.memo, (memoCount.get(j.memo) || 0) + 1);
    }),
  );
  const recurringMemos = [...memoCount.entries()]
    .filter(([, c]) => c >= 3)
    .map(([m]) => m);

  const currentPayload = await qboQuery(
    accessToken,
    realmId,
    `select Id, PrivateNote, DocNumber from JournalEntry where TxnDate >= '${ctx.periodStart}' and TxnDate <= '${ctx.periodEnd}' maxresults 1000`,
  );
  const currentJes = extractQueryEntities(currentPayload, "JournalEntry");
  const currentMemos = new Set(
    currentJes.map((j) => j.PrivateNote || j.DocNumber || ""),
  );
  const missing = recurringMemos.filter((m) => !currentMemos.has(m));

  return {
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `All ${recurringMemos.length} recurring accrual pattern(s) posted this period.`
        : `Missing recurring accruals: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "..." : ""}`,
    raw: { recurringMemos, missing },
  };
}
