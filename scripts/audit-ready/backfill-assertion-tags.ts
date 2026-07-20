/**
 * One-shot backfill: recompute assertion_tags for all PBC requests
 * on a given engagement where assertion_tags is empty/null.
 *
 * Usage:
 *   npx tsx scripts/audit-ready/backfill-assertion-tags.ts <engagementId> <userId>
 */
import { createClient } from '@supabase/supabase-js';
import { classifyAssertions } from '../../lib/audit-ready/assertion-classifier';
import type { ParsedPbcRequest } from '../../lib/audit-ready/pbc-parser';

async function main() {
  const [, , engagementId, calledByUserId] = process.argv;
  if (!engagementId || !calledByUserId) {
    console.error('Usage: backfill-assertion-tags <engagementId> <userId>');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  const { data: rows, error } = await supabase
    .from('audit_ready_pbc_requests')
    .select('id, request_number, request_description')
    .eq('engagement_id', engagementId)
    .order('request_number', { ascending: true });

  if (error || !rows) {
    console.error('Query failed:', error?.message);
    process.exit(1);
  }

  const empty = rows.filter((r: { id: string }) => true); // we could filter by empty tag array, but it's cheaper to just re-classify all — pipeline is deterministic at temp=0
  console.log(`Classifying ${empty.length} requests…`);

  const asParsed: ParsedPbcRequest[] = empty.map((r) => ({
    request_number: r.request_number,
    request_description: r.request_description,
    assertion_tags: [],
  }));

  const tags = await classifyAssertions(asParsed, engagementId, calledByUserId);

  let updated = 0;
  for (let i = 0; i < empty.length; i++) {
    const { error: upErr } = await supabase
      .from('audit_ready_pbc_requests')
      .update({ assertion_tags: tags[i] ?? [] })
      .eq('id', empty[i].id);
    if (upErr) {
      console.error(`Failed to update ${empty[i].id}:`, upErr.message);
    } else {
      updated++;
    }
  }

  console.log(`Updated ${updated}/${empty.length} rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
