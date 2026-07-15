import Image from "next/image";
import Link from "next/link";
import heroLogo from "../public/advisacor-logo-framed-navy.png";
import { focusRing } from "./site-ui";

export function SiteNav() {
  const navLinkClass = `${focusRing("ring-offset-[#C9A961]")} text-sm font-bold text-[#111112] transition hover:text-[#0B1A3A]`;

  return (
    <header className="relative z-20 w-full bg-white min-h-[144px] md:min-h-[184px] lg:min-h-[216px]">
      <Link
        href="/"
        aria-label="Advisacor home"
        className={`absolute top-3 left-3 z-20 md:top-5 md:left-6 ${focusRing("rounded-lg")}`}
      >
        <Image
          src={heroLogo}
          alt="Advisacor"
          width={360}
          height={280}
          priority
          className="pointer-events-none h-auto w-[140px] select-none md:w-[180px] lg:w-[220px]"
        />
      </Link>
      <nav className="absolute top-6 right-8 z-30 md:top-10">
        <div className="flex items-center gap-6 rounded-full bg-[#C9A961] px-6 py-3 shadow-sm">
          <div className="hidden items-center gap-8 md:flex">
            <Link href="/what-it-does" className={navLinkClass}>
              What It Does
            </Link>
            <Link href="/how-it-works" className={navLinkClass}>
              How It Works
            </Link>
            <Link href="/industries" className={navLinkClass}>
              Industries
            </Link>
            <Link href="/pricing" className={navLinkClass}>
              Pricing
            </Link>
            <Link href="/about" className={navLinkClass}>
              About
            </Link>
            <Link href="/signin" className={navLinkClass}>
              Sign In
            </Link>
            <Link
              href="/free-review"
              className={`inline-flex items-center justify-center rounded-full bg-[#0B1A3A] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0B1A3A]/40 transition-colors hover:bg-[#12244A] ${focusRing()}`}
            >
              Request Early Access
            </Link>
          </div>
          <Link
            href="/free-review"
            className={`inline-flex items-center justify-center rounded-full bg-[#0B1A3A] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-[#0B1A3A]/40 transition-colors hover:bg-[#12244A] md:hidden ${focusRing()}`}
          >
            Early Access
          </Link>
        </div>
      </nav>
    </header>
  );
}
