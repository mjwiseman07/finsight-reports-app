import { isValidFirmSlug } from "./address";

export interface FirmClientSlugRow {
  slug: string | null;
  name: string | null;
  company_id: string;
}

/**
 * Derive a URL-safe firm slug from firm_clients.name.
 * Used only when firm_clients.slug is NULL. Recipe matches the SQL slugify in
 * supabase/migrations/20260716_00_d6_5_part1_1_firm_clients_slug.sql.
 */
export function slugFromClientName(name: string, companyId: string): string | null {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  if (isValidFirmSlug(base)) return base;
  const fallback = `co-${companyId.replace(/-/g, "").slice(0, 8)}`;
  return isValidFirmSlug(fallback) ? fallback : null;
}

/**
 * Prefer the persisted slug on firm_clients. Only fall back to derivation
 * when the row was inserted before the D6.5 Part 1.1 migration or the
 * application layer forgot to set a slug.
 */
export function resolveSlug(row: FirmClientSlugRow): string | null {
  if (row.slug && isValidFirmSlug(row.slug)) return row.slug;
  return slugFromClientName(row.name ?? "", row.company_id);
}
