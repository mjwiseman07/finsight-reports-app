/**
 * Pure probe helpers for SEO drift monitor (Block 8).
 * Extracted so unit tests can cover regex / redirect logic without hitting the network.
 */

export const CANONICAL_TAG_RE =
  /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i;

export const CANONICAL_PROBES: Array<{
  url: string;
  expectedCanonical: string;
}> = [
  {
    url: "https://advisacor.com/",
    expectedCanonical: "https://advisacor.com/",
  },
  {
    url: "https://advisacor.com/what-it-does",
    expectedCanonical: "https://advisacor.com/what-it-does",
  },
  {
    url: "https://advisacor.com/how-it-works",
    expectedCanonical: "https://advisacor.com/how-it-works",
  },
  {
    url: "https://advisacor.com/industries",
    expectedCanonical: "https://advisacor.com/industries",
  },
  {
    url: "https://advisacor.com/pricing",
    expectedCanonical: "https://advisacor.com/pricing",
  },
  {
    url: "https://advisacor.com/for/owner",
    expectedCanonical: "https://advisacor.com/for/owner",
  },
  {
    url: "https://advisacor.com/for/bookkeeper",
    expectedCanonical: "https://advisacor.com/for/bookkeeper",
  },
  {
    url: "https://advisacor.com/for/firm",
    expectedCanonical: "https://advisacor.com/for/firm",
  },
  {
    url: "https://advisacor.com/free-review",
    expectedCanonical: "https://advisacor.com/free-review",
  },
  {
    url: "https://advisacor.com/about",
    expectedCanonical: "https://advisacor.com/about",
  },
];

export async function probeCanonical(target: {
  url: string;
  expectedCanonical: string;
}): Promise<{
  ok: boolean;
  reason?: string;
  status?: number;
  found?: string;
}> {
  try {
    const res = await fetch(target.url, {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": "Advisacor-SEO-Drift-Monitor/1.0" },
    });
    if (res.status !== 200) {
      return { ok: false, reason: "non-200", status: res.status };
    }
    const html = await res.text();
    const match = html.match(CANONICAL_TAG_RE);
    if (!match) {
      return { ok: false, reason: "no-canonical-tag", status: 200 };
    }
    const found = match[1];
    if (found !== target.expectedCanonical) {
      return {
        ok: false,
        reason: "canonical-mismatch",
        status: 200,
        found,
      };
    }
    return { ok: true, status: 200, found };
  } catch (err) {
    return {
      ok: false,
      reason: `fetch-error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function probeApexRedirect(): Promise<{
  ok: boolean;
  reason?: string;
  status?: number;
  location?: string;
}> {
  try {
    const res = await fetch("https://www.advisacor.com/", {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": "Advisacor-SEO-Drift-Monitor/1.0" },
    });
    if (res.status !== 308 && res.status !== 301) {
      return {
        ok: false,
        reason: "www-not-redirecting",
        status: res.status,
      };
    }
    const location = res.headers.get("location");
    if (!location || !location.startsWith("https://advisacor.com")) {
      return {
        ok: false,
        reason: "wrong-redirect-target",
        status: res.status,
        location: location ?? undefined,
      };
    }
    return { ok: true, status: res.status, location };
  } catch (err) {
    return {
      ok: false,
      reason: `fetch-error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
