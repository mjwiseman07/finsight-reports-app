import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { completeJson } from "@/lib/close-packet/llm";

async function resolveVarianceConfig(firmClientId, firmId) {
  const supabase = getSupabaseAdmin();
  const { data: clientCfg } = await supabase
    .from("close_packet_variance_config")
    .select("*")
    .eq("firm_client_id", firmClientId)
    .maybeSingle();
  if (clientCfg) return { source: "firm_client", ...clientCfg };
  if (firmId) {
    const { data: firmCfg } = await supabase
      .from("close_packet_variance_config")
      .select("*")
      .eq("firm_id", firmId)
      .maybeSingle();
    if (firmCfg) return { source: "firm", ...firmCfg };
  }
  return { source: "system_default", pct_threshold: 10, abs_threshold_usd: 1000, min_baseline_usd: 100 };
}

export async function build(ctx) {
  const { closePeriod, firmClient, firm, priorSections } = ctx;
  try {
    const pnl = priorSections?.pnl;
    if (!pnl || pnl.status !== "ok") {
      return {
        status: "error",
        error_message: "Variance analysis requires P&L section to be rendered first",
      };
    }
    const config = await resolveVarianceConfig(firmClient.id, firm?.id || null);
    const flagged = [];
    for (const row of pnl.rows) {
      if (row.is_subtotal) continue;
      const prior = row.prior;
      const current = row.current;
      if (Math.abs(prior) < config.min_baseline_usd) continue;
      const absChange = Math.abs(current - prior);
      const pctChg = typeof row.pct_change === "number" ? Math.abs(row.pct_change) : Infinity;
      if (pctChg >= config.pct_threshold || absChange >= config.abs_threshold_usd) {
        flagged.push({
          account: row.account_name,
          current: row.current,
          prior: row.prior,
          abs_change: current - prior,
          pct_change: row.pct_change,
          direction: current >= prior ? "increase" : "decrease",
        });
      }
    }

    const commentaries = {};
    if (flagged.length > 0) {
      const result = await completeJson({
        system:
          'You are a bookkeeping assistant explaining budget-to-actual variances to a small business owner. Given a list of P&L accounts with current period, prior period, and percent change, write ONE plain-English sentence per account explaining the most likely business reason. Do not speculate about causes you cannot infer from the data. If the change is small or expected, say "expected variation." Never use jargon (no "bps", "YoY", "EBITDA"). Respond as JSON: {"commentaries": [{"account": string, "commentary": string}]}',
        user: JSON.stringify({
          period_label: `${closePeriod.period_start} to ${closePeriod.period_end}`,
          business_name: firmClient.name,
          flagged_items: flagged.map((f) => ({
            account: f.account,
            current: f.current,
            prior: f.prior,
            pct_change: f.pct_change,
            direction: f.direction,
          })),
        }),
        temperature: 0.2,
        fallback: { commentaries: [] },
      });
      (result.data.commentaries || []).forEach((c) => {
        commentaries[c.account] = { text: c.commentary, source: result.source };
      });
    }

    const flagged_items = flagged.map((f) => ({
      ...f,
      commentary: commentaries[f.account]?.text || "Requires review — no automated commentary available.",
      commentary_source: commentaries[f.account]?.source || "fallback",
    }));

    return {
      status: "ok",
      config_used: {
        source: config.source,
        pct_threshold: config.pct_threshold,
        abs_threshold_usd: config.abs_threshold_usd,
        min_baseline_usd: config.min_baseline_usd,
      },
      flagged_items,
      generated_at: new Date().toISOString(),
    };
  } catch (err) {
    return { status: "error", error_message: err.message };
  }
}
