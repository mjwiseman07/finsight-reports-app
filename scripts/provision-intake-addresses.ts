import { createServiceClient } from "@/lib/supabase/service";
import {
  deriveToken,
  buildFullAddress,
  type HandlerKey,
} from "@/lib/intake/address";
import { resolveSlug } from "@/lib/intake/resolve-slug";

async function main() {
  const supabase = createServiceClient();
  const { data: clients, error } = await supabase
    .from("firm_clients")
    .select("id, firm_id, company_id, name, slug")
    .not("company_id", "is", null);

  if (error || !clients) {
    console.error("Failed to load firm_clients:", error);
    process.exit(1);
  }

  const handlers: HandlerKey[] = ["cash_app_remit", "bills", "docs"];
  let provisioned = 0;
  let skipped = 0;

  for (const c of clients) {
    const slug = resolveSlug({ slug: c.slug, name: c.name, company_id: c.company_id });
    if (!slug) {
      console.warn(
        `skip ${c.company_id}: could not derive valid slug from name (${c.name}) or slug column (${c.slug})`,
      );
      skipped++;
      continue;
    }

    for (const handler of handlers) {
      const token = deriveToken(handler, slug, c.company_id);
      const fullAddress = buildFullAddress(handler, slug, token);
      const { error: insErr } = await supabase.from("firm_intake_addresses").upsert(
        {
          firm_id: c.firm_id,
          company_id: c.company_id,
          handler_key: handler,
          firm_slug: slug,
          token,
          full_address: fullAddress,
          enabled: true,
        },
        { onConflict: "handler_key,firm_slug,token" },
      );
      if (insErr) {
        console.error(`insert failed ${c.company_id}/${handler}:`, insErr.message);
        continue;
      }
      provisioned++;
    }
  }

  console.log(`Provisioned ${provisioned} addresses, skipped ${skipped} clients.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
