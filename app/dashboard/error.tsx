"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard-error-boundary]", error);
  }, [error]);

  const contextParam = encodeURIComponent("dashboard_error_boundary");
  const errMsg = encodeURIComponent(error?.message?.slice(0, 240) || "");
  const supportHref = `/support?context=${contextParam}&error_message=${errMsg}`;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold text-white">Something went wrong on this page.</h1>
      <p className="mt-3 text-sm text-white/70">
        Advisacor caught the error. You can try again, or file a ticket — we&apos;ll pre-fill it with what we know.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-[#C9A961] px-4 py-2 text-sm font-semibold text-[#111112] hover:bg-[#B8975A]"
        >
          Try again
        </button>
        <Link
          href={supportHref}
          className="rounded-xl border border-[#C9A961] px-4 py-2 text-sm font-semibold text-[#C9A961] hover:bg-[#C9A961]/10"
        >
          Report an issue
        </Link>
      </div>
    </div>
  );
}
