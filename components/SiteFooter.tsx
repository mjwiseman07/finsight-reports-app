import Image from "next/image";
import { focusRing } from "./site-ui";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-14">
      <div className="mx-auto max-w-7xl">
        <Image src="/advisacor-logo-full.png" alt="Advisacor" width={680} height={340} className="h-20 w-auto" />
        <p className="mt-4 text-sm font-semibold text-slate-600">A product of Wiseman Financial Technologies LLC.</p>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 md:max-w-xl">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Contact</p>
            <ul className="mt-3 space-y-2 text-sm font-semibold">
              <li>
                <a href="mailto:sales@advisacor.com" className={`text-[#0A1020] hover:text-[#C9A961] ${focusRing("rounded")}`}>
                  sales@advisacor.com
                </a>
              </li>
              <li>
                <a
                  href="mailto:contact@advisacor.com"
                  className={`text-[#0A1020] hover:text-[#C9A961] ${focusRing("rounded")}`}
                >
                  contact@advisacor.com
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Company</p>
            <ul className="mt-3 space-y-2 text-sm font-semibold">
              <li>
                <a href="#" className={`text-[#0A1020] hover:text-[#C9A961] ${focusRing("rounded")}`}>
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/matthew-wiseman-807bb155"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-[#0A1020] hover:text-[#C9A961] ${focusRing("rounded")}`}
                >
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 space-y-2 border-t border-slate-200 pt-8 text-xs leading-6 text-slate-500">
          <p>
            Advisacor™ is a trademark of Wiseman Financial Technologies LLC.{" "}
            <span className="text-[#C9A961]">Trademark application pending.</span>
          </p>
          <p className="text-[#C9A961]">Patent Pending. Three U.S. provisional patent applications filed June 2026.</p>
          <p>© 2026 Wiseman Financial Technologies LLC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
