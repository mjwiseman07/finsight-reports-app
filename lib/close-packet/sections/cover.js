function periodLabel(periodStart) {
  if (!periodStart) return "";
  const d = new Date(`${periodStart}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return periodStart;
  return d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function build(ctx) {
  const { closePeriod, firmClient, firm, preparer, reviewer } = ctx;
  return {
    client_name: firmClient?.name || "Client",
    period_label: periodLabel(closePeriod?.period_start),
    period_start: closePeriod?.period_start || null,
    period_end: closePeriod?.period_end || null,
    prepared_by: preparer?.name || firm?.advisor_name || "Advisacor Preparer",
    prepared_by_role: preparer?.role || "Bookkeeper",
    reviewed_by: reviewer?.name || null,
    reviewed_by_role: reviewer?.role || null,
    packet_date: new Date().toISOString().slice(0, 10),
    packet_version: ctx.version || 1,
    logo_url: firm?.logo_url || null,
  };
}
