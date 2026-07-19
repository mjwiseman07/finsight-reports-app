import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold text-white">Page not found</h1>
      <p className="mt-3 text-sm text-white/70">
        The page you&apos;re looking for doesn&apos;t exist. If you got here from a link inside Advisacor,
        we&apos;d like to know.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-[#C9A961] px-4 py-2 text-sm font-semibold text-[#111112] hover:bg-[#B8975A]"
        >
          Return home
        </Link>
        <Link
          href="/support?context=not_found"
          className="rounded-xl border border-[#C9A961] px-4 py-2 text-sm font-semibold text-[#C9A961] hover:bg-[#C9A961]/10"
        >
          Report a broken link
        </Link>
      </div>
    </div>
  );
}
