/**
 * Edge-safe sandbox JE production boundary path matcher.
 * Shared by middleware and static/unit tests (no Node-only imports).
 */
export function isSandboxJeProductionBoundaryPath(pathname: string): boolean {
  if (
    pathname === "/admin/sandbox-je" ||
    pathname.startsWith("/admin/sandbox-je/")
  ) {
    return true;
  }
  if (pathname.startsWith("/api/governed/journal-entries/sandbox")) {
    return true;
  }
  if (
    /^\/api\/governed\/journal-entries\/executions\/[^/]+\/(inspection|checklist)\/?$/.test(
      pathname,
    )
  ) {
    return true;
  }
  return false;
}
