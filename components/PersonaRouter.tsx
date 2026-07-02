import PersonaTile from "./PersonaTile";

const personas = [
  {
    href: "/for/bookkeeper",
    eyebrow: "Solo bookkeeper",
    title: "Handle 25 clients like you handle 10.",
    body: "AI drafts the close on your QBO clients. You review, adjust, and send. Built for 1–10 client practices.",
    cta: "See the bookkeeper workflow",
    status: "live" as const,
  },
  {
    href: "/for/firm",
    eyebrow: "Bookkeeping or accounting firm",
    title: "Never scramble when a bookkeeper leaves.",
    body: "Multi-client dashboard, review assist, and elastic Full Close capacity when your team is short-staffed.",
    cta: "See the firm workflow",
    status: "live" as const,
  },
  {
    href: "/for/owner",
    eyebrow: "Business owner",
    title: "A CFO's brain without a CFO's salary.",
    body: "Connect QuickBooks, Xero, or upload a trial balance. Get a plain-English readout of what's actually happening in your business.",
    cta: "See the owner workflow",
    status: "live" as const,
  },
  {
    href: "/for/controller/manufacturing",
    eyebrow: "Manufacturing controller",
    title: "Purpose-built for the shop floor.",
    body: "Standard costing variance, WIP, PPV, absorption, and ASC 606 for manufacturers. Joining the private beta this quarter.",
    cta: "Join the waitlist",
    status: "waitlist" as const,
  },
];

export default function PersonaRouter() {
  return (
    <div>
      <h2 className="mb-6 text-xs uppercase tracking-[0.2em] text-white/50">
        Choose your path
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {personas.map((p) => (
          <PersonaTile key={p.href} {...p} />
        ))}
      </div>
    </div>
  );
}
