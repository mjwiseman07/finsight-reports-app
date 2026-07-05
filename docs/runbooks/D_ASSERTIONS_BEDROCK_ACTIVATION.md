# D-Assertions — AWS Bedrock Activation Runbook

Versioned activation procedure for Claude 3.5 on AWS Bedrock as the primary LLM provider for assertion gap reasoning. No code changes are required to activate — only environment variables, IAM, model access, and the `assertions_gap_reasoning_enabled` feature flag.

---

## Section 1 — Overview

**Purpose:** activate AWS Bedrock Claude 3.5 Sonnet as the primary LLM provider for `lib/assertions/gap-reasoner.ts` (Part 5) and D6.5 Universal Intake handlers (upcoming).

**Fallback:** Anthropic direct API via `ANTHROPIC_API_KEY` if Bedrock provisioning is delayed.

**Feature flag:** `assertions_gap_reasoning_enabled` in `advisacor_flags` — stays `false` during dry-run, flips to `true` at activation.

The provider abstraction already lives in `lib/llm/anthropic-driver.ts`. Part 7 only documents how to turn it on.

---

## Section 2 — AWS account prerequisites

- AWS root account with billing enabled.
- IAM user or role with programmatic access (AWS access key + secret).
- Region: `us-east-1` (default in `anthropic-driver.ts`) or `us-west-2` (alternate).
- Amazon Bedrock service must be enabled in the region.

---

## Section 3 — Claude 3.5 Sonnet model access request

1. Sign in to AWS Console → navigate to Amazon Bedrock in `us-east-1`.
2. Left nav → "Model access" → "Manage model access".
3. Enable checkbox for **Anthropic — Claude 3.5 Sonnet** (model id `anthropic.claude-3-5-sonnet-20241022-v2:0` on Bedrock).
4. Enable checkbox for **Anthropic — Claude 3.5 Haiku** (model id `anthropic.claude-3-5-haiku-20241022-v1:0`) — used for cheap classification/routing in D6.5.
5. (Optional) Enable **Anthropic — Claude 3 Opus** (model id `anthropic.claude-3-opus-20240229-v1:0`) for `toptier` tier — reserved for high-complexity gap reasoning.
6. Submit the access request form (Anthropic requires a short usage description — paste "Automated audit-assertion gap-cause reasoning and bill-document extraction for a closed-audience SaaS platform serving accounting professionals").
7. Approval is typically instant for Sonnet + Haiku; Opus may take up to 24 hours.
8. Once approved, model IDs appear as "Access granted" in the model-access table.

---

## Section 4 — IAM policy

Attach the following minimal policy to the IAM user/role that will run Advisacor:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockInvokeClaude35",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0",
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-opus-20240229-v1:0"
      ]
    }
  ]
}
```

No `bedrock:ListFoundationModels` — Advisacor pins model IDs via env vars.

---

## Section 5 — Environment variables

Add to `.env.production` (and locally to `.env.local` for dev):

```bash
# Provider selector — true = Bedrock (default), false = Anthropic direct
BEDROCK_ENABLED=true

# Bedrock region + IAM credentials (or use IAM role attached to compute)
BEDROCK_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Bedrock model IDs
BEDROCK_MODEL_SONNET_PRIMARY=anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_MODEL_HAIKU=anthropic.claude-3-5-haiku-20241022-v1:0
BEDROCK_MODEL_SONNET_TOPTIER=anthropic.claude-3-opus-20240229-v1:0

# Anthropic direct fallback (activate ONLY if Bedrock is unavailable)
# BEDROCK_ENABLED=false
# ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_MODEL_SONNET_PRIMARY=claude-3-5-sonnet-20241022
# ANTHROPIC_MODEL_HAIKU=claude-3-5-haiku-20241022
# ANTHROPIC_MODEL_SONNET_TOPTIER=claude-3-opus-20240229
```

**Never commit these values.** Store `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `ANTHROPIC_API_KEY` in the deployment secret manager (Vercel/Fly.io/AWS Secrets Manager). Rotate keys every 90 days per SOC 2 policy.

---

## Section 6 — Anthropic direct fallback

If Bedrock provisioning is delayed beyond 24 hours:

1. Sign up at [console.anthropic.com](https://console.anthropic.com/).
2. Add a payment method (Anthropic direct is per-token billed; Bedrock is same rate + AWS margin ~5%).
3. Generate an API key (`sk-ant-...`).
4. Set `BEDROCK_ENABLED=false` and populate `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL_*` env vars from Section 5.
5. No code change needed — `lib/llm/anthropic-driver.ts` already branches on `BEDROCK_ENABLED`.

---

## Section 7 — Activation sequence

1. Confirm all Section 5 env vars are set in the target environment.
2. Deploy the current commit (any commit ≥ `1ec3abf` has the LLM plumbing).
3. Run `pnpm smoke:d-assertions-e2e-lock -- --allow-live-writes` against staging — assert all 11 steps green.
4. Manually invoke a Bedrock ping: `pnpm tsx -e "import { invokeClaude } from './lib/llm/anthropic-driver'; invokeClaude({ tier: 'haiku', system: 'ping', messages: [{ role: 'user', content: 'reply with the single word: pong' }], maxTokens: 10 }).then(r => console.log(r))"`. Confirm `provider: 'bedrock'` in the response.
5. Flip the flag: `UPDATE advisacor_flags SET flag_value = true WHERE flag_key = 'assertions_gap_reasoning_enabled';` (via Supabase Studio, service-role only).
6. Monitor `ai_actions` table for the first 20 gap-reasoner invocations — assert `provider = 'bedrock'`, `model_id` matches the primary Sonnet ID, `latency_ms < 8000`, and `output` JSON parses cleanly.
7. If any of the first 20 fail: flip the flag back to `false`, review the `error` column, address root cause. Do not force-enable.

---

## Section 8 — Cost controls

- Sonnet 3.5 on Bedrock: ~$3/M input tokens, ~$15/M output tokens.
- Haiku 3.5 on Bedrock: ~$0.80/M input, ~$4/M output.
- Per-gap reasoner call: ~2K input + ~800 output ≈ $0.02/gap. At 100 gaps/close × 20 closes/month = 2K gaps ≈ $40/mo. Well within budget.
- Configure a Bedrock budget alarm at $500/mo via AWS Budgets — alert to `ops@advisacor.com`.
- Every `ai_actions` row already captures `input_tokens`, `output_tokens`, `latency_ms`, and `model_id` (see `lib/ai/action-logger.ts`) — this is the cost audit trail.

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
[ ] Part 7 merged: <this commit sha> (E2E LOCK smoke + Bedrock runbook, ~1600–1625 tests)
[ ] Live E2E smoke green in staging (all 11 steps)
[ ] Bedrock model access approved (Sonnet 3.5, Haiku 3.5)
[ ] IAM policy attached to production role
[ ] Bedrock env vars set in Vercel/Fly.io/prod
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

D6.5 (Postmark Inbound Email + Claude 3.5 Bills handler) reuses the exact same `lib/llm/anthropic-driver.ts` provider abstraction and IAM policy. When D6.5 lands:

- No new IAM changes.
- Add `claude_intake_enabled` flag to `advisacor_flags` (governed the same way).
- Add `POSTMARK_INBOUND_API_TOKEN` env var (unrelated to Bedrock).
- The `ai_actions` audit trail already handles both use cases.
