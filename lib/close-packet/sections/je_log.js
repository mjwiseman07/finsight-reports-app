import { getQboForFirmClient } from "@/lib/qbo-for-firm-client";
import { findJournalEntries } from "@/lib/qbo-rest";

export async function build(ctx) {
  const { closePeriod, firmClient } = ctx;
  try {
    const { accessToken, realmId } = await getQboForFirmClient(firmClient.id);
    const jes = await findJournalEntries(accessToken, realmId, {
      start_date: closePeriod.period_start,
      end_date: closePeriod.period_end,
    });
    const entries = jes.map((je) => {
      const lines = (je.Line || []).map((l) => {
        const detail = l.JournalEntryLineDetail || {};
        const posting = detail.PostingType;
        return {
          account: detail.AccountRef?.name || detail.AccountRef?.value || "Unknown",
          debit: posting === "Debit" ? parseFloat(l.Amount) || 0 : null,
          credit: posting === "Credit" ? parseFloat(l.Amount) || 0 : null,
          description: l.Description || "",
        };
      });
      const total_debit = lines.reduce((s, l) => s + (l.debit || 0), 0);
      const total_credit = lines.reduce((s, l) => s + (l.credit || 0), 0);
      return {
        je_number: je.DocNumber || `QBO-${je.Id}`,
        date: je.TxnDate,
        memo: je.PrivateNote || "",
        lines,
        total_debit,
        total_credit,
        balanced: Math.abs(total_debit - total_credit) < 0.01,
        created_by: je.MetaData?.CreateTime ? "user" : "system",
      };
    });
    entries.sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : String(a.je_number).localeCompare(String(b.je_number)),
    );
    const warnings = [];
    const unbalanced = entries.filter((e) => !e.balanced);
    if (unbalanced.length > 0) {
      warnings.push(
        `${unbalanced.length} unbalanced journal entries detected: ${unbalanced.map((e) => e.je_number).join(", ")}`,
      );
    }
    let displayed = entries;
    let truncation_note = null;
    if (entries.length > 200) {
      const byMagnitude = [...entries].sort((a, b) => b.total_debit - a.total_debit);
      displayed = byMagnitude.slice(0, 100).sort((a, b) => (a.date < b.date ? -1 : 1));
      truncation_note = `${entries.length - 100} additional entries omitted from display. Full log stored with packet.`;
    }
    return {
      status: "ok",
      entries: displayed,
      total_count: entries.length,
      truncation_note,
      warnings,
      generated_at: new Date().toISOString(),
    };
  } catch (err) {
    return { status: "error", error_message: err.message };
  }
}
