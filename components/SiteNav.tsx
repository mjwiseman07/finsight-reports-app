import Image from "next/image";
import Link from "next/link";
import heroLogo from "../public/advisacor-logo-full-transparent.png";
import { focusRing, primaryCtaClass } from "./site-ui";

export function SiteNav() {
  const navLinkClass = `${focusRing("ring-offset-slate-300")} text-sm font-bold text-slate-900 transition hover:text-[#C9A961]`;

  return (
    <header className="relative z-20">
      <Link
        href="/"
        className={`absolute top-4 left-6 z-20 md:top-6 md:left-8 ${focusRing("rounded-lg")}`}
        aria-label="Advisacor home"
      >
        <Image
          src={heroLogo}
          alt="Advisacor"
          priority
          className="h-auto w-[220px] md:w-[300px] lg:w-[320px]"
        />
      </Link>
      <nav className="relative mx-auto flex max-w-7xl justify-end px-0 pt-4 md:pt-6">
        <div className="ml-auto flex items-center gap-4 rounded-full bg-white/40 px-4 py-2 backdrop-blur-sm md:gap-8 md:px-6 md:py-3">
          <div className="hidden items-center gap-8 md:flex">
            <Link href="/#what-it-does" className={navLinkClass}>
              What It Does
            </Link>
            <Link href="/#how-it-works" className={navLinkClass}>
              How It Works
            </Link>
            <Link href="/#industries" className={navLinkClass}>
              Industries
            </Link>
            <Link href="/about" className={navLinkClass}>
              About
            </Link>
            <Link
              href="/#early-access"
              className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm ${primaryCtaClass} ${focusRing()}`}
            >
              Request Early Access
            </Link>
          </div>
          <Link
            href="/#early-access"
            className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs md:hidden ${primaryCtaClass} ${focusRing()}`}
          >
            Early Access
          </Link>
        </div>
      </nav>
    </header>
  );
}
