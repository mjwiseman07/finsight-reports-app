export function QboOnlyBadge({ muted = false }: { muted?: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs ${muted ? "bg-white/5 text-white/40" : "bg-[#C9A961]/10 text-[#C9A961]"}`}
      title="Xero support is in Phase X — launching August 2026"
    >
      <span aria-hidden>●</span>
      <span>Connects with QuickBooks Online. Xero coming soon.</span>
    </div>
  );
}
