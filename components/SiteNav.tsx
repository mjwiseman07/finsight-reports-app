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
        className={`absolute top-3 left-3 z-20 md:top-5 md:left-6 ${focusRing("rounded-lg")}`}
        aria-label="Advisacor home"
      >
        <Image
          src={heroLogo}
          alt="Advisacor"
          width={900}
          height={460}
          priority
          className="pointer-events-none h-auto w-[280px] select-none md:w-[380px] lg:w-[440px]"
        />
      </Link>
      <nav className="absolute top-6 right-8 z-30">
        <div className="flex items-center gap-6 rounded-full bg-white/40 px-6 py-3 backdrop-blur-sm">
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
