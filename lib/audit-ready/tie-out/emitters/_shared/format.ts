/** Shared formatting for workpaper XLSX + PDF emitters. */

export function centsToUsd(cents: number): string {
  const n = cents / 100;
  const s = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `($${s})` : `$${s}`;
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = iso.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return iso;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[Number(m[2]) - 1] ?? m[2];
  return `${month} ${Number(m[3])}, ${m[1]}`;
}

export function tieStatusFill(status: "ties" | "kickout"): string {
  return status === "ties" ? "C6EFCE" : "FFC7CE";
}

export function mapTotalsToTieStatus(
  totalsStatus: string | null | undefined,
): "ties" | "kickout" {
  if (totalsStatus === "kickout" || totalsStatus === "failed") return "kickout";
  return "ties";
}

export function humanKindLabel(kind: string): string {
  switch (kind) {
    case "bs_account_recon":
      return "Balance Sheet Account Reconciliation";
    case "fixed_asset_rollforward":
      return "Fixed Asset Roll-Forward";
    case "bs_recon_summary":
      return "Balance Sheet Reconciliation Summary";
    default:
      return kind;
  }
}
