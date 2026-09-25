/**
 * GitHub PR lookup helpers for reviewer preconditions.
 * Public repo metadata only. No secrets. Injectable for tests.
 */

"use strict";

const config = require("./config");
const { parseGithubPrNumber, normalizePrUrl } = require("./reviewer-result");

function repoSlugFromUrl(repositoryUrl = config.REPOSITORY_URL) {
  const m = String(repositoryUrl).match(/github\.com[/:]([^/]+)\/([^/.]+)/i);
  if (!m) throw new Error(`Cannot parse GitHub repo from ${repositoryUrl}`);
  return `${m[1]}/${m[2]}`;
}

/**
 * @returns {Promise<{ number, url, state, baseRef, headRef, headSha, merged, draft }>}
 */
async function fetchPullRequest(prUrl, { fetchImpl = globalThis.fetch } = {}) {
  const number = parseGithubPrNumber(prUrl);
  if (!number) {
    throw new Error(`Invalid GitHub PR URL: ${prUrl}`);
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch is not available");
  }
  const slug = repoSlugFromUrl();
  const apiUrl = `https://api.github.com/repos/${slug}/pulls/${number}`;
  const res = await fetchImpl(apiUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "advisacor-orchestrator",
    },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`GitHub PR lookup returned non-JSON (HTTP ${res.status})`);
  }
  if (!res.ok) {
    throw new Error(
      `GitHub PR lookup failed HTTP ${res.status}: ${body.message || res.statusText}`,
    );
  }

  const url = body.html_url || prUrl;
  if (normalizePrUrl(url) !== normalizePrUrl(prUrl) && body.number !== number) {
    throw new Error("GitHub PR lookup returned mismatched PR");
  }

  return {
    number: body.number,
    url,
    state: String(body.state || "").toUpperCase(), // OPEN / CLOSED
    baseRef: body.base?.ref || null,
    headRef: body.head?.ref || null,
    headSha: body.head?.sha || null,
    merged: Boolean(body.merged),
    draft: Boolean(body.draft),
  };
}

function assertBuilderPrEligible(pr, { expectedUrl }) {
  if (!pr) throw new Error("Builder PR metadata required");
  if (expectedUrl && normalizePrUrl(pr.url) !== normalizePrUrl(expectedUrl)) {
    throw new Error(`Builder PR URL mismatch: ${pr.url} != ${expectedUrl}`);
  }
  if (pr.merged) {
    throw new Error("Builder PR is already merged; cannot launch reviewer");
  }
  if (pr.state !== "OPEN") {
    throw new Error(`Builder PR is not OPEN (state=${pr.state})`);
  }
  if (pr.baseRef !== "main") {
    throw new Error(
      `Builder PR must target main (base=${pr.baseRef || "missing"})`,
    );
  }
  if (!pr.headSha) {
    throw new Error("Builder PR missing head SHA");
  }
  return pr;
}

module.exports = {
  repoSlugFromUrl,
  fetchPullRequest,
  assertBuilderPrEligible,
};
