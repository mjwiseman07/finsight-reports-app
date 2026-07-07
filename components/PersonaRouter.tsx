import PersonaCarousel, { PersonaCarouselItem } from "./PersonaCarousel";
import { headingFont } from "./site-ui";

const personas: PersonaCarouselItem[] = [
  {
    href: "/for/bookkeeper",
    eyebrow: "Solo bookkeeper",
    title: "Handle 25 clients like you handle 10.",
    body: "AI drafts the close on your QBO clients. You review, adjust, and send. Built for 1–10 client practices.",
    cta: "See the bookkeeper workflow",
    status: "live",
  },
  {
    href: "/for/firm",
    eyebrow: "Bookkeeping or accounting firm",
    title: "Never scramble when a bookkeeper leaves.",
    body: "Multi-client dashboard, review assist, and elastic Full Close capacity when your team is short-staffed.",
    cta: "See the firm workflow",
    status: "live",
  },
  {
    href: "/for/owner",
    eyebrow: "Business owner",
    title: "A CFO's brain without a CFO's salary.",
    body: "Connect QuickBooks, Xero, or upload a trial balance. Get a plain-English readout of what's actually happening in your business.",
    cta: "See the owner workflow",
    status: "live",
  },
  {
    href: "/for/controller/manufacturing",
    eyebrow: "Manufacturing controller",
    title: "Purpose-built for the shop floor.",
    body: "Standard costing variance, WIP, PPV, absorption, and ASC 606 for manufacturers. Joining the private beta this quarter.",
    cta: "Join the waitlist",
    status: "waitlist",
  },
];

export default function PersonaRouter() {
  return (
    <div>
      <div className="mb-8 md:mb-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-[#C9A961] md:text-base">
          Choose your path
        </p>
        <h2
          className={`${headingFont} text-2xl font-semibold leading-[1.15] tracking-tight text-white md:text-3xl lg:text-4xl`}
        >
          Who are you building for?
        </h2>
      </div>
      <PersonaCarousel items={personas} />
    </div>
  );
}
