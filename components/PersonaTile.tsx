import Link from "next/link";
import { headingFont, focusRing } from "./site-ui";

type Props = {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  status: "live" | "waitlist";
};

export default function PersonaTile({
  href,
  eyebrow,
  title,
  body,
  cta,
  status,
}: Props) {
  return (
    <Link
      href={href}
      className={`group flex flex-col justify-between rounded-2xl border border-white/10 bg-[#111112] p-6 transition-all hover:border-[#C9A961]/60 hover:bg-[#1A1A1C] ${focusRing()}`}
    >
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.15em] text-[#C9A961]">
            {eyebrow}
          </p>
          {status === "waitlist" && (
            <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/60">
              Waitlist
            </span>
          )}
        </div>
        <h3
          className={`${headingFont} mb-3 text-xl font-semibold leading-[1.15] tracking-tight md:text-2xl`}
        >
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-white/65">{body}</p>
      </div>
      <div className="mt-6 flex items-center gap-2 text-sm text-white/80 transition-colors group-hover:text-[#C9A961]">
        <span>{cta}</span>
        <span aria-hidden>→</span>
      </div>
    </Link>
  );
}
