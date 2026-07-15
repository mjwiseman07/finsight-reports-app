/**
 * Next.js instrumentation hook — runs once at Node.js runtime boot.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initQuotaGuardGlobalDispatcher } = await import(
      "@/lib/network/init-global-dispatcher"
    );
    initQuotaGuardGlobalDispatcher();
  }
}
