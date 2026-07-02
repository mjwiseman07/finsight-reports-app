import { completeJson } from "@/lib/close-packet/llm";

function periodLabel(closePeriod) {
  if (closePeriod?.period_label) return closePeriod.period_label;
  if (!closePeriod?.period_start) return "";
  const d = new Date(`${closePeriod.period_start}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return closePeriod.period_start;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export async function build(ctx) {
  const { firmClient, closePeriod, priorSections = {} } = ctx;
  try {
    const label = periodLabel(closePeriod);
    const pnl = priorSections.pnl ?? {};
    const bs = priorSections.bs ?? {};
    const cf = priorSections.cf ?? {};
    const varianceFlags = priorSections.variance?.flagged_items ?? [];
    const anomalyFlags = priorSections.anomalies?.flags ?? [];

    const system =
      "You are a bookkeeper writing a one-paragraph month-end summary for a small business owner. " +
      "Write ~150 words in plain English. Cite 3-5 specific dollar amounts pulled ONLY from the data provided. " +
      "Cover: what revenue and net income did vs. prior month; the cash position change; any notable variances or " +
      "anomalies the owner should know about. End with one forward-looking sentence about next month. " +
      "Do NOT invent numbers. Only cite figures present in the data. " +
      'Respond as JSON: {"narrative_md": string, "sources": string[]} where sources lists which sections you drew from.';

    const user = JSON.stringify({
      client: firmClient?.name ?? "the client",
      period: `${label} (${closePeriod?.period_start} to ${closePeriod?.period_end})`,
      pnl,
      balance_sheet: bs,
      cash_flow: cf,
      variance_flags: varianceFlags,
      anomalies_flagged: anomalyFlags,
    });

    const result = await completeJson({
      system,
      user,
      temperature: 0.3,
      fallback: {
        narrative_md:
          "An automated executive summary could not be generated for this period. Review the financial statements and variance analysis below.",
        sources: [],
      },
    });

    return {
      status: "ok",
      narrative_md: result.data?.narrative_md || "",
      sources: Array.isArray(result.data?.sources) ? result.data.sources : [],
      generated_by: result.source,
      generated_at: new Date().toISOString(),
    };
  } catch (err) {
    return { status: "error", error_message: err.message };
  }
}
