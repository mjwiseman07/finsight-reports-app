/**
 * Local seed script. Calls the same admin route via HTTP so codepath is identical
 * to what the app does. Requires ADVISACOR_ACCESS_TOKEN or SUPER_ADMIN_BEARER env.
 *
 * Usage (PowerShell):
 *   $env:SEED_TARGET_URL="https://advisacor.com"
 *   $env:SUPER_ADMIN_BEARER="<paste from browser cookie: advisacor_access_token>"
 *   npx tsx scripts/seed-audit-ready-test-engagement.ts
 */

async function main() {
  const baseUrl = process.env.SEED_TARGET_URL || 'https://advisacor.com';
  const bearer = process.env.SUPER_ADMIN_BEARER;
  if (!bearer) {
    console.error('Set SUPER_ADMIN_BEARER env (advisacor_access_token cookie value).');
    process.exit(1);
  }

  const url = `${baseUrl}/api/admin/audit-ready/seed-test-engagement`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Seed failed (${res.status}):`, JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log('Seed complete:');
  console.log(JSON.stringify(body, null, 2));
  console.log('');
  console.log(`Smoke URL:  ${baseUrl}/audit-ready/${body.engagement_id}/pbc-list`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
