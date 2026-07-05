# D-Assertions — Bedrock Activation Runbook

Activation runbook for AWS Bedrock Claude models used by `lib/assertions/gap-reasoner.ts` (Part 5) and D6.5 Universal Intake handlers (upcoming).

Chain of custody:
- D-Assertions LOCK commit: `15f0265`
- Runbook revision: this commit

---

## Section 1 — Overview

- **Purpose**: activate AWS Bedrock Claude Sonnet 4.6 as the `primary` LLM provider, with Claude Sonnet 5 available for `toptier` high-complexity reasoning and Claude Haiku 4.5 for cheap classification/routing.
- **Fallback**: Anthropic direct API via `ANTHROPIC_API_KEY` if Bedrock provisioning is delayed beyond activation window.
- **Feature flag**: `assertions_gap_reasoning_enabled` in `advisacor_flags` — stays `false` during dry-run, flips to `true` at activation.
- **Model tier map (2026)** — all three inference-profile IDs use the `us.` prefix for cross-region routing sourced from `us-east-1`:

  | Tier      | Model              | Bedrock inference-profile ID (mandatory for Sonnet 4.6 + Sonnet 5) |
  |-----------|--------------------|--------------------------------------------------------------------|
  | `primary` | Claude Sonnet 4.6  | `us.anthropic.claude-sonnet-4-6` — **inference profile mandatory**; 1M-token context; knowledge cutoff Aug 2025; released 2026-02-17. On-demand invocation of `anthropic.claude-sonnet-4-6` returns `ValidationException: Invocation of model ID anthropic.claude-sonnet-4-6 with on-demand throughput isn't supported`. |
  | `haiku`   | Claude Haiku 4.5   | `us.anthropic.claude-haiku-4-5-20251001-v1:0` — supports both direct and inference-profile invocation; we standardize on the profile for consistent cross-region behavior. |
  | `toptier` | Claude Sonnet 5    | `us.anthropic.claude-sonnet-5` — **inference profile mandatory**; direct on-demand invocation of the foundation-model ID unsupported. Promo pricing through 2026-08-31. |

---

## Section 2 — AWS account prerequisites (operator already has AWS API key)

Operator confirms AWS access key + secret are already provisioned. Verify only:

- Region is `us-east-1` (default in `lib/llm/anthropic-driver.ts`).
- Amazon Bedrock service is enabled in `us-east-1` (Console → Bedrock → landing page loads without a "not enabled in this region" banner).
- The IAM principal tied to the provided access key has (or will have) the Section 4 policy attached.
- No AWS signup, billing, or root-account work required.

---

## Section 3 — Claude Sonnet 5 / Sonnet 4.6 / Haiku 4.5 model access request

Step-by-step:

1. Sign in to AWS Console → navigate to Amazon Bedrock in `us-east-1`.
2. Left nav → **Model access** → **Manage model access**.
3. Enable checkbox for **Anthropic — Claude Sonnet 4.6** (foundation-model ID `anthropic.claude-sonnet-4-6`; US inference profile `us.anthropic.claude-sonnet-4-6`). Note: with Sonnet 4.6, Anthropic dropped the date/version suffix from the model ID — the raw model ID is no longer date-stamped. **Sonnet 4.6 is only invokable through the inference-profile ARN.**
4. Enable checkbox for **Anthropic — Claude Haiku 4.5** (foundation-model ID `anthropic.claude-haiku-4-5-20251001-v1:0`; US inference profile `us.anthropic.claude-haiku-4-5-20251001-v1:0`) — used for cheap classification/routing in D6.5.
5. Enable checkbox for **Anthropic — Claude Sonnet 5** (foundation-model ID `anthropic.claude-sonnet-5`; US inference profile `us.anthropic.claude-sonnet-5`) — reserved for `toptier` high-complexity gap reasoning. **Sonnet 5 is only invokable through the inference-profile ARN.**
6. Submit the Anthropic access-request form. Paste this usage description: *"Automated audit-assertion gap-cause reasoning and bill-document extraction for a closed-audience SaaS platform serving accounting professionals."*
7. Approval for Sonnet 5, Sonnet 4.6, and Haiku 4.5 is typically instant.
8. Verify approval by running `aws bedrock list-inference-profiles --region us-east-1` — the three `us.*` profile IDs above should all appear with status `ACTIVE`.

**Pricing (2026 as of activation):**

- Sonnet 4.6: $3/M input, $15/M output (same as Sonnet 4.5 per Anthropic's Feb 2026 announcement).
- Haiku 4.5: ~$1/M input, ~$5/M output.
- Sonnet 5: **$2/M input, $10/M output** promotional rate through **2026-08-31** — during the promo window, Sonnet 5 is actually cheaper per token than Sonnet 4.6. Regular post-promo pricing TBD by AWS; re-verify before the promo lapses and update this runbook.

---

## Section 4 — IAM policy

Attach the following minimal policy to the IAM user or role that runs Advisacor. Both foundation-model ARNs and inference-profile ARNs are required — Bedrock authorizes the profile ARN at invoke time and each underlying foundation-model ARN it may route to. The `us.` cross-region inference profiles route source `us-east-1` calls to `us-east-1`, `us-east-2`, or `us-west-2` at Bedrock's discretion, so foundation-model ARNs must be granted in all three destination regions for Sonnet 4.6 and Sonnet 5.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockInvokeClaude2026",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:GetInferenceProfile",
        "bedrock:ListInferenceProfiles"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-6",
        "arn:aws:bedrock:us-east-2::foundation-model/anthropic.claude-sonnet-4-6",
        "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-sonnet-4-6",
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0",
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-5",
        "arn:aws:bedrock:us-east-2::foundation-model/anthropic.claude-sonnet-5",
        "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-sonnet-5",
        "arn:aws:bedrock:us-east-1:*:inference-profile/us.anthropic.claude-sonnet-4-6",
        "arn:aws:bedrock:us-east-1:*:inference-profile/us.anthropic.claude-haiku-4-5-20251001-v1:0",
        "arn:aws:bedrock:us-east-1:*:inference-profile/us.anthropic.claude-sonnet-5"
      ]
    }
  ]
}
```

Notes:

- `bedrock:GetInferenceProfile` + `bedrock:ListInferenceProfiles` are required so `anthropic-driver.ts` can resolve profile availability at boot.
- No `bedrock:ListFoundationModels` — Advisacor pins model IDs via env vars.
- No wildcard resources — every ARN is explicit and audit-reviewable.

---

## Section 5 — Environment variables

Add to `.env.production` (and locally to `.env.local` for dev). Never commit values. Store AWS keys and `ANTHROPIC_API_KEY` in the deployment secret manager (Vercel / Fly.io / AWS Secrets Manager). Rotate every 90 days per SOC 2 policy.

```bash
# Provider selector — true = Bedrock (default), false = Anthropic direct fallback
BEDROCK_ENABLED=true

# Bedrock region + IAM credentials (or use IAM role attached to compute)
BEDROCK_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Bedrock model IDs — MUST use us.* inference-profile IDs, not raw foundation-model IDs.
# Sonnet 4.6 and Sonnet 5 REQUIRE inference-profile invocation; Haiku 4.5 supports both, we standardize on the profile.
BEDROCK_MODEL_SONNET_PRIMARY=us.anthropic.claude-sonnet-4-6
BEDROCK_MODEL_HAIKU=us.anthropic.claude-haiku-4-5-20251001-v1:0
BEDROCK_MODEL_SONNET_TOPTIER=us.anthropic.claude-sonnet-5

# Anthropic direct fallback (activate ONLY if Bedrock is unavailable)
# BEDROCK_ENABLED=false
# ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_MODEL_SONNET_PRIMARY=claude-sonnet-4-6
# ANTHROPIC_MODEL_HAIKU=claude-haiku-4-5-20251001
# ANTHROPIC_MODEL_SONNET_TOPTIER=claude-sonnet-5
```

---

## Section 6 — Anthropic direct fallback

If Bedrock provisioning is delayed or unavailable:

1. Sign up at [console.anthropic.com](https://console.anthropic.com/).
2. Add a payment method. Anthropic direct is per-token billed at approximately the same rate as Bedrock (Bedrock adds ~5% AWS margin).
3. Generate an API key (`sk-ant-...`).
4. Set `BEDROCK_ENABLED=false` and populate `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL_*` env vars from Section 5.
5. No code change needed — `lib/llm/anthropic-driver.ts` already branches on `BEDROCK_ENABLED`.

---

## Section 7 — Activation sequence

1. Confirm all Section 5 env vars are set in the target environment.
2. Deploy the current commit (any commit ≥ `1ec3abf` has the LLM plumbing; `15f0265` has the runbook).
3. Run `pnpm smoke:d-assertions-e2e-lock -- --allow-live-writes` against staging — assert all 11 steps green.
4. Manually ping Bedrock through the driver:
   ```bash
   pnpm tsx -e "import { invokeClaude } from './lib/llm/anthropic-driver'; invokeClaude({ tier: 'haiku', system: 'ping', messages: [{ role: 'user', content: 'reply with the single word: pong' }], maxTokens: 10 }).then(r => console.log(r))"
   ```
   Confirm `provider: 'bedrock'` and `model_id` matches `us.anthropic.claude-haiku-4-5-20251001-v1:0` in the response.
5. Flip the flag: `UPDATE advisacor_flags SET flag_value = true WHERE flag_key = 'assertions_gap_reasoning_enabled';` (via Supabase Studio, service-role only).
6. Monitor `ai_actions` table for the first 20 gap-reasoner invocations — assert `provider = 'bedrock'`, `model_id` matches the primary Sonnet 4.6 profile, `latency_ms < 8000`, and `output` JSON parses cleanly.
7. If any of the first 20 fail: flip the flag back to `false`, review the `error` column, address root cause. Do not force-enable.

---

## Section 8 — Cost controls

- Sonnet 4.6 on Bedrock (`primary` tier): $3/M input tokens, $15/M output tokens.
- Haiku 4.5 on Bedrock (`haiku` tier): ~$1/M input, ~$5/M output.
- Sonnet 5 on Bedrock (`toptier` tier): **$2/M input, $10/M output** during promotional window through **2026-08-31**. During the promo window Sonnet 5 is cheaper per token than Sonnet 4.6. Regular post-promo pricing TBD by AWS.
- Per-gap reasoner call at `primary` tier (Sonnet 4.6): ~2K input + ~800 output ≈ **$0.018/gap**. At ~100 gaps/close × 20 closes/month = ~2K gaps ≈ **$37/mo**. Well within budget.
- Configure a Bedrock budget alarm at $500/mo via AWS Budgets — alert to `ops@advisacor.com`.
- Every `ai_actions` row already captures `input_tokens`, `output_tokens`, `latency_ms`, `provider`, and `model_id` (see `lib/ai/action-logger.ts`) — this is the cost audit trail.

---

## Section 9 — Rollback procedure

If Bedrock is down or Anthropic changes model availability:

1. Set `BEDROCK_ENABLED=false` in the environment.
2. Ensure `ANTHROPIC_API_KEY` is populated (Section 6).
3. Redeploy (no code change).
4. Verify next gap-reasoner call logs `provider: 'anthropic_direct'` in `ai_actions`.

If both providers are down:

1. `UPDATE advisacor_flags SET flag_value = false WHERE flag_key = 'assertions_gap_reasoning_enabled';`
2. Deterministic gap root-cause detection continues to work — only the LLM enrichment layer is disabled. Coverage projection, gap detection, gap → review-item sync, manual test attachment, PDF render all remain fully functional (they do not depend on the LLM).

---

## Section 10 — D-Assertions LOCK sign-off checklist

Copy-paste this to the LOCK issue when closing D-Assertions:

```
[ ] Part 1 merged: 2707407 (32-rule backfill, 1361 tests)
[ ] Part 2 merged: c9df10d (coverage projections + gap detection, 1422 tests)
[ ] Part 3 merged: b37a19f (Coverage Statement PDF, 1470 tests)
[ ] Part 4 merged: d77847b (JE post-time propagation, 1509 tests)
[ ] Part 5 merged: a0cf507 (gap → review item pipeline, 1554 tests)
[ ] Part 6 merged: 1ec3abf (evidence strength + manual test attachment, 1591 tests)
[ ] Hygiene merged: 09938ec (gitignore + leaked PDF removal)
[ ] Part 7 merged: 15f0265 (E2E LOCK smoke + Bedrock runbook, 1593 tests)
[ ] Part 7.1 merged: <this commit sha> (Bedrock runbook correction — Sonnet 4.6 + Sonnet 5 + Haiku 4.5 IDs)
[ ] Live E2E smoke green in staging (all 11 steps)
[ ] Bedrock model access approved (Sonnet 5, Sonnet 4.6, Haiku 4.5)
[ ] IAM policy attached to production role (foundation-model + inference-profile ARNs)
[ ] Bedrock env vars set in Vercel/Fly.io/prod (us.* inference profile IDs)
[ ] Anthropic direct fallback env vars set (commented, ready to enable)
[ ] Bedrock cost budget alarm configured ($500/mo)
[ ] Bedrock ping test passes in production (provider='bedrock')
[ ] assertions_gap_reasoning_enabled flag flipped to true in prod
[ ] First 20 gap-reasoner invocations verified in ai_actions table
[ ] docs/runbooks/D_ASSERTIONS_BEDROCK_ACTIVATION.md merged to main
[ ] No open assertion-gap actions from LOCK smoke run (or all have documented deviations)
```

---

## Section 11 — Handoff to D6.5 (Universal Intake)

D6.5 (Postmark Inbound Email + Claude Sonnet 4.6 Bills handler) reuses the exact same `lib/llm/anthropic-driver.ts` provider abstraction and IAM policy. When D6.5 lands:

- No new IAM changes required (foundation-model + inference-profile ARNs from Section 4 already cover Bills handler use case).
- Add `claude_intake_enabled` flag to `advisacor_flags` (governed the same way as `assertions_gap_reasoning_enabled`).
- Add `POSTMARK_INBOUND_API_TOKEN` env var (unrelated to Bedrock).
- The `ai_actions` audit trail already handles both use cases (assertion gap reasoning and bill extraction).
