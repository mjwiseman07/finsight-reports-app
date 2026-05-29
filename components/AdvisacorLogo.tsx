import Image from "next/image";

export function AdvisacorLogo({
  className = "",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/advisacor-logo.svg"
      alt="Advisacor Financial Intelligence"
      width={520}
      height={110}
      priority={priority}
      className={`block h-auto w-[190px] object-contain ${className}`}
    />
  );
}

export function AdvisacorLogoMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 ${className}`}>
      <svg width="26" height="26" viewBox="0 0 96 96" fill="none" aria-hidden="true">
        <path d="M48 8L88 84H73L48 35L23 84H8L48 8Z" fill="#0A1020" />
        <path d="M48 8L33 38L41 52L48 38L72 84H88L48 8Z" fill="#D78342" />
        <path d="M33 63H46V84H33V63Z" fill="#0A1020" />
        <path d="M52 50H65V84H52V50Z" fill="#0A1020" />
        <path d="M16 84H88" stroke="#C8A46A" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
