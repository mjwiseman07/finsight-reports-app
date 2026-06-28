export const headingFont = "[font-family:var(--font-geologica)]";

export const primaryCtaClass =
  "bg-[#C9A961] font-semibold text-[#0A1530] shadow-lg shadow-[#C9A961]/30 transition-colors hover:bg-[#B8975A]";

export function focusRing(className = "") {
  return `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A961] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1020] ${className}`;
}
