import Image from "next/image";
import Link from "next/link";
import { focusRing } from "./site-ui";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0A1530] px-6 py-14 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Image src="/advisacor-logo-full.png" alt="Advisacor" width={680} height={340} className="h-16 w-auto" />
            <p className="mt-4 text-sm text-white/80">A product of Wiseman Financial Technologies LLC.</p>
            <p className="mt-2 text-sm text-white/60">2023 South Stewart Avenue · Covington, VA 24426</p>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wider text-[#C9A961]">CONTACT</p>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>
                <a href="mailto:sales@advisacor.com" className={`hover:text-[#C9A961] ${focusRing("rounded")}`}>
                  sales@advisacor.com
                </a>
              </li>
              <li>
                <a href="mailto:contact@advisacor.com" className={`hover:text-[#C9A961] ${focusRing("rounded")}`}>
                  contact@advisacor.com
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wider text-[#C9A961]">COMPANY</p>
            <ul className="mt-3 space-y-2 text-sm font-semibold text-white/80">
              <li>
                <Link href="/about" className={`hover:text-[#C9A961] ${focusRing("rounded")}`}>
                  About
                </Link>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/matthew-wiseman-807bb155"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`hover:text-[#C9A961] ${focusRing("rounded")}`}
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <Link href="/privacy" className={`hover:text-[#C9A961] ${focusRing("rounded")}`}>
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wider text-[#C9A961]">LEGAL</p>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-white/60">
              <p>
                Advisacor™ is a trademark of Wiseman Financial Technologies LLC. Trademark application pending.
              </p>
              <p>Patent Pending. Three U.S. provisional patent applications filed June 2026.</p>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-sm text-white/60">
          <p>© 2026 Wiseman Financial Technologies LLC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
