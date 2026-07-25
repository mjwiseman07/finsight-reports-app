-- Phase PBC-TIEOUT-4.2 Block A pilot-week retro
-- Run weekly. Feeds Block B threshold design.
-- Usage: psql -f scripts/audit-ready/memory-retro.sql <db>

\echo '=== Event volume by day ==='
SELECT date_trunc('day', event_at) AS day, event_type, COUNT(*) AS n
FROM audit_ready_memory_events
WHERE event_at >= NOW() - INTERVAL '14 days'
GROUP BY day, event_type
ORDER BY day DESC, event_type;

\echo ''
\echo '=== Suggest surface visibility rate ==='
SELECT
  COUNT(*) FILTER (WHERE event_type = 'suggestions_shown') AS shown,
  COUNT(*) FILTER (WHERE event_type = 'suggestions_none') AS empty,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_type = 'suggestions_shown')
    / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('suggestions_shown', 'suggestions_none')), 0),
    1
  ) AS pct_with_suggestions
FROM audit_ready_memory_events
WHERE event_at >= NOW() - INTERVAL '14 days';

\echo ''
\echo '=== Copy adoption rate (of shown, how many copied) ==='
SELECT
  COUNT(*) FILTER (WHERE event_type = 'suggestions_shown') AS shown,
  COUNT(*) FILTER (WHERE event_type = 'copy_clicked') AS copied,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_type = 'copy_clicked')
    / NULLIF(COUNT(*) FILTER (WHERE event_type = 'suggestions_shown'), 0),
    1
  ) AS pct_copied
FROM audit_ready_memory_events
WHERE event_at >= NOW() - INTERVAL '14 days';

\echo ''
\echo '=== Code trust rate (of copied, matched code kept) ==='
SELECT
  COUNT(*) FILTER (WHERE event_type = 'resolution_saved' AND (payload->>'was_copied')::boolean = true) AS copied_saves,
  COUNT(*) FILTER (WHERE event_type = 'resolution_saved' AND (payload->>'was_copied')::boolean = true AND (payload->>'matched_copied_code')::boolean = true) AS code_kept,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_type = 'resolution_saved' AND (payload->>'was_copied')::boolean = true AND (payload->>'matched_copied_code')::boolean = true)
    / NULLIF(COUNT(*) FILTER (WHERE event_type = 'resolution_saved' AND (payload->>'was_copied')::boolean = true), 0),
    1
  ) AS pct_code_kept
FROM audit_ready_memory_events
WHERE event_at >= NOW() - INTERVAL '14 days';

\echo ''
\echo '=== resolution_code distribution on saves ==='
SELECT payload->>'resolution_code' AS code, COUNT(*) AS n
FROM audit_ready_memory_events
WHERE event_type = 'resolution_saved'
  AND event_at >= NOW() - INTERVAL '14 days'
  AND payload->>'resolution_code' IS NOT NULL
GROUP BY code
ORDER BY n DESC;

\echo ''
\echo '=== Top engagements by activity ==='
SELECT engagement_id, COUNT(*) AS events
FROM audit_ready_memory_events
WHERE event_at >= NOW() - INTERVAL '14 days'
GROUP BY engagement_id
ORDER BY events DESC
LIMIT 10;

\echo ''
\echo '=== Per-user copy behavior (identifies "always trusts" vs "always overrides" users) ==='
SELECT
  actor_user_id,
  COUNT(*) FILTER (WHERE event_type = 'suggestions_shown') AS shown,
  COUNT(*) FILTER (WHERE event_type = 'copy_clicked') AS copied,
  COUNT(*) FILTER (WHERE event_type = 'resolution_saved' AND (payload->>'was_copied')::boolean = true AND (payload->>'matched_copied_code')::boolean = true) AS trusted_code
FROM audit_ready_memory_events
WHERE event_at >= NOW() - INTERVAL '14 days'
GROUP BY actor_user_id
HAVING COUNT(*) FILTER (WHERE event_type = 'suggestions_shown') >= 3
ORDER BY trusted_code DESC;
