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
      width={765}
      height={185}
      priority={priority}
      className={`block h-auto w-[min(525px,46.5vw)] object-contain ${className}`}
    />
  );
}

export function AdvisacorLogoMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-10 w-10 items-center justify-center ${className}`}>
      <svg width="26" height="26" viewBox="0 0 104 89" fill="none" aria-hidden="true">
        <path d="M50 0L104 89H88L50 24L16 89H0L50 0Z" fill="#070D20" />
        <path d="M50 0L31 37L42 51L50 35L88 89H104L50 0Z" fill="#D28A4A" />
        <path d="M30 65H44V89H30V65Z" fill="#070D20" />
        <path d="M53 49H68V89H53V49Z" fill="#070D20" />
        <path d="M8 89H104" stroke="#C29A62" strokeWidth="3" strokeLinecap="round" />
        <path d="M11 76L31 40" stroke="#2146CF" strokeWidth="4" strokeLinecap="round" />
        <path d="M50 24L42 51L31 37L50 0L69 31H56L50 24Z" fill="#D28A4A" />
      </svg>
    </div>
  );
}
