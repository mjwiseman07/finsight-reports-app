import { autoFileTicket } from "./auto-file";

async function tryResolveUserIdFromRequest(req: Request): Promise<string | null> {
  try {
    // Best-effort resolution via supabase auth cookie is not available here;
    // rely on the wrapped handler having attached user id to a header we can read
    // via req.headers.get('x-advisacor-user-id') if it was set inside the handler
    // before it threw. If not set, return null and skip auto-file.
    const explicit = req.headers.get("x-advisacor-user-id");
    if (explicit && /^[a-f0-9-]{36}$/.test(explicit)) return explicit;
    return null;
  } catch {
    return null;
  }
}

export type WithAutoFileOptions = {
  source: "internal" | "bedrock" | "stripe";
  endpoint?: string;
};

export function withAutoFile<Args extends unknown[], R>(
  handler: (req: Request, ...rest: Args) => Promise<R>,
  opts: WithAutoFileOptions = { source: "internal" },
) {
  return async (req: Request, ...rest: Args): Promise<R> => {
    try {
      return await handler(req, ...rest);
    } catch (err) {
      const userId = await tryResolveUserIdFromRequest(req);
      if (userId) {
        const path = opts.endpoint || (() => {
          try { return new URL(req.url).pathname; } catch { return "unknown"; }
        })();
        void autoFileTicket({
          userId,
          source: opts.source,
          errorMessage: err instanceof Error ? err.message : String(err),
          errorName: err instanceof Error ? err.name : undefined,
          endpoint: path,
          method: req.method,
        }).catch(() => {});
      }
      throw err;
    }
  };
}
