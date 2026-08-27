const fs = require("node:fs");
const path = require("node:path");

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260826043000_journal_entry_provider_attempt_reuse_posting_started.sql",
  ),
  "utf8",
);

const query = [
  "BEGIN;",
  migration,
  "SELECT proname, prosecdef",
  "  FROM pg_proc",
  " WHERE proname IN (",
  "   'je_publish_posting_started_from_ready',",
  "   'persist_journal_entry_provider_attempt'",
  " )",
  " ORDER BY proname;",
  "ROLLBACK;",
].join("\n");

if (process.argv.includes("--write")) {
  require("node:fs").writeFileSync(".tmp-compile-out.sql", query, "utf8");
  process.stderr.write(`wrote ${query.length} bytes\n`);
} else {
  process.stdout.write(query);
}
