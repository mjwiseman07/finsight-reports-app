# Advisacor Brand — Canonical Tokens (v1.1)

**This document is the single source of truth for visual brand.** Every page under `app/**/page.tsx` and every component under `components/**/*.tsx` MUST conform. Deviations require a documented exception in this file — no ad-hoc overrides.

Standing rule from product owner: *"any pages should follow the formatting and coloring of the main page no matter what."*

The main-page reference implementation is `app/page.tsx` + `components/SiteNav.tsx` + `components/site-ui.ts`. When in doubt, mirror those files.

---

## Reference implementations

The canonical marketing surface (as of 9M.N series, PRs #84–#93) is the full 10-page marketing site. Any brand change requires updating this doc AND ensuring all 10 pages remain in parity.

- `app/page.tsx` (landing home) — 9M.5
- `app/pricing/page.tsx` — 9M.4
- `app/industries/page.tsx` — 9M.6
- `app/how-it-works/page.tsx` — 9M.7
- `app/what-it-does/page.tsx` — 9M.8
- `app/about/page.tsx` — 9M.9 (mixed light + dark editorial)
- `app/privacy/page.tsx` — 9M.10 (light-only editorial)
- `app/for/firm/page.tsx` — 9M.1
- `app/for/bookkeeper/page.tsx` — 9M.2
- `app/for/owner/page.tsx` — 9M.3

Every other public marketing page (see "Marketing scope" below) MUST match these.

---

## Color palette — dark-mode canonical (marketing default)

Applies to all marketing pages except `/about` (mixed) and `/privacy` (light-only) — see "Light-mode canonical" below for those.

### Root shell

```
<main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
```

- **Root background:** `#111112` (canonical charcoal)
- **Root text color:** `#ECEBE7` (primary ivory — sets default inherit for descendants)

### Text 3-tier system

The Nexus dark palette collapses all `text-white/[opacity]` variants into three canonical tokens:

| Legacy variants | Canonical | Semantic role |
|---|---|---|
| `text-white`, `text-white/80` (body), `text-white/85` | `text-[#ECEBE7]` | **Primary ivory** — body emphasis, headings, primary text |
| `text-white/60`, `text-white/70`, `text-white/75`, `text-white/80` (chrome only) | `text-[#A29E93]` | **Muted** — secondary body, subtitles, nav-arrow neutral state |
| `text-white/40`, `text-white/50`, `text-white/55` | `text-[#7A7974]` | **Faint** — eyebrows, timestamps, disabled-state text |

**Body vs. chrome rule for `text-white/80`:**
- Body content (paragraphs, list items, headings) → `text-[#ECEBE7]` (primary ivory)
- Chrome/controls (nav arrows, disabled-state toggles) → `text-[#A29E93]` (muted)

### Surface tokens

| Legacy | Canonical | Semantic role |
|---|---|---|
| `bg-[#0F0F10]` (alt section) | `bg-[#1A1A1C]` | Alt section surface (border-t bands, trust bars) |
| `bg-[#141416]` | `bg-[#1A1A1C]` | Emphasis card fill |
| `bg-[#0F1D3E]` (active tier / pilot CTA) | `bg-[#1A1A1C]` | Active tier card, prominent CTA card |
| `bg-white/[0.03]` | `bg-[#1A1A1C]/40` | Fainter translucent alt section |
| `bg-white/[0.04]` | `bg-[#1A1A1C]/50` | Standard translucent card / nav-control surface |
| `bg-white/[0.02]` | `bg-[#1A1A1C]/60` | Upcoming / disabled tier card |

### Border tokens

| Legacy | Canonical | Semantic role |
|---|---|---|
| `border-white/10` | `border-[#C9A961]/20` | Standard card / alt-section top border |
| `border-white/15` | `border-[#C9A961]/25` | Secondary control (nav arrow) border |
| `border-white/20` | `border-[#C9A961]/30` | Outline-badge / emphasis-tier border |
| `border-white/[0.15]` | `border-[#C9A961]/30` | Featured tier card emphasis border |

### Established compound patterns

Migrate as compounds first, then residual single-token catches (this is how 9M.N achieved 100% predictable per-op counts).

| Legacy compound | Canonical compound |
|---|---|
| `border-t border-white/10 bg-[#0F0F10]` | `border-t border-[#C9A961]/20 bg-[#1A1A1C]` |
| `border-t border-white/10 bg-white/[0.03]` | `border-t border-[#C9A961]/20 bg-[#1A1A1C]/40` |
| `border border-white/10 bg-white/[0.04]` | `border border-[#C9A961]/20 bg-[#1A1A1C]/50` |
| `border border-white/15 bg-white/[0.04]` | `border border-[#C9A961]/25 bg-[#1A1A1C]/50` |
| `bg-[#0A1530] text-white` (root) | `bg-[#111112] text-[#ECEBE7]` (root) |

### CTA "navy-as-ink" normalization

Legacy gold-fill CTA buttons used `text-[#0A1530]` (navy ink on gold pill). Canonical is `text-[#111112]` (canonical dark ink).

| Legacy | Canonical |
|---|---|
| `text-[#0A1530]` (CTA button / toggle-selected ink) | `text-[#111112]` |
| `text-[#0B0B0C]` (CTA ink, mixed-file variant) | `text-[#111112]` |

### CTA hover state

| Legacy | Canonical |
|---|---|
| `hover:bg-[#D4B672]` | `hover:bg-[#DFC084]` |
| `hover:bg-[#D9B972]` | `hover:bg-[#DFC084]` |

### Progress-dot / opacity-based decorative dots

Preserve the opacity semantic by grounding in canonical primary ivory:

| Legacy | Canonical |
|---|---|
| `bg-white/25` | `bg-[#ECEBE7]/25` |
| `bg-white/40` | `bg-[#ECEBE7]/40` |

### Disabled-state hover preservation

| Legacy | Canonical |
|---|---|
| `disabled:hover:border-white/15` | `disabled:hover:border-[#C9A961]/25` |
| `disabled:hover:text-white/80` | `disabled:hover:text-[#A29E93]` |

---

## Color palette — light-mode canonical (`/about`, `/privacy`)

Uses the Nexus warm-ivory light palette. Distinct from cool slate `#F5F7FA` (BANNED — see below).

| Role | Legacy | Canonical |
|---|---|---|
| Primary background | `bg-[#F5F7FA]` (cool slate) | `bg-[#F7F6F2]` (warm ivory) |
| Content surface (elevated card) | `bg-white` (light-mode context) | `bg-[#F9F8F5]` (Nexus surface) |
| Primary text | `text-[#111827]`, `text-slate-900`, `text-slate-700` | `text-[#28251D]` (dark warm) |
| Muted text | `text-slate-600` | `text-[#7A7974]` |
| Border | (no legacy usage in scope) | `border-[#D4D1CA]` if needed |

**Editorial body copy rule:** In light-mode editorial (long-form paragraphs on `/about` + `/privacy`), body text uses `text-[#28251D]` (primary), NOT muted. Muted is reserved for subtitles and metadata (timestamps, founder subtitles).

### Header-gradient depth band

| Legacy | Canonical |
|---|---|
| `bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400` | `bg-gradient-to-br from-[#F7F6F2] via-[#EEEDE7] to-[#D4D1CA]` |

### Mixed light+dark editorial (`/about`)

`/about` alternates dark accent sections with light editorial sections — intentional editorial design.
- Light sections use warm-ivory tokens (above)
- Dark sections use canonical charcoal tokens (marketing default)
- Transitions between sections have no border/divider — the color shift itself is the boundary

---

## Gold accent family (the ONLY chromatic accent)

Gold `#C9A961` remains the ONLY chromatic accent for marketing surfaces. Never introduce a second accent.

| Role | Hex | Usage |
|---|---|---|
| Gold primary | `#C9A961` | Eyebrows, links, primary CTA background, focus ring, input focus |
| Gold hover | `#DFC084` | CTA hover state (canonical) |
| Gold hover (legacy) | `#B8975A` — legacy hover, still permitted in dashboard scope | — |
| Gold light | `#D9B972` | Link hover, secondary emphasis (permitted; legacy CTA-hover variant) |

Gold-opacity variants introduced in 9M.N:

| Opacity | Semantic role |
|---|---|
| `#C9A961]/20` | Standard card border |
| `#C9A961]/25` | Secondary control border |
| `#C9A961]/30` | Outline-badge / emphasis border, active card border, featured tier |
| `#C9A961]/40` | Divider lines |
| `#C9A961]/60` | Hover state |

---

## Marketing card-surface navy (v1.3)

**Scope:** ALL card and pilot-band surfaces on the marketing scope. This is a semantic elevation of the persona-tile navy from v1.2 — navy is now the canonical marketing card-surface token, replacing charcoal (`#111112`) and Nexus surface (`#1A1A1C`) fills on `rounded-* border-[#C9A961]/*` card patterns.

**Rationale:** Every marketing card had gold-tinted borders sitting on the same charcoal as the page background — cards blended into the page. Navy fill (`#0B1A3A`) inherits the framed-logo brand mark, creates real card elevation against `#111112` page bg, and gives the gold borders something meaningful to frame.

| Role | Hex | Usage |
|---|---|---|
| Card-surface navy | `#0B1A3A` | All marketing cards, tier cards, pilot bands, feature grids |
| Card-surface navy (translucent) | `#0B1A3A]/85` | Cards that layered `bg-[#1A1A1C]/50-85` — preserved alpha semantics |
| Card-surface navy (disabled) | `#0B1A3A]/60` | Upcoming/disabled tier cards |
| Card-hover navy | `#12244A` | Interactive cards on hover (currently: `PersonaTile` only) |
| Gradient card start | `#12244A` | Hero-CTA cards on `/for/*` (top-left → bottom-right gradient) |
| Gradient card end | `#0B1A3A` | Hero-CTA cards on `/for/*` gradient end |

### Explicit exclusions (chrome remains charcoal)

The following gold-bordered elements STAY charcoal (`#111112` or `#1A1A1C`):

- **Section alt-bands:** `<section className="border-t border-[#C9A961]/20 bg-[#1A1A1C]">` — page-level rhythm dividers, not cards
- **Nav arrow buttons:** `h-10 w-10 rounded-full border ...` chrome
- **Pill badges / icon wells:** small (`h-8-14 w-8-14`) gold-tinted decorative chrome
- **Form inputs:** `focus:border-[#C9A961]` — input fields keep dark bg for contrast on typed text
- **Form-wrapper cards** on `/free-review` containing form inputs — continuity with input dark bg
- **`.enterprise-card` CSS class** on `/about` founder cards — mixed light+dark editorial per § "Mixed light+dark editorial (`/about`)"
- **Dashboard scope:** all authenticated app surfaces (`/dashboard`, `/admin`, `/onboarding`, `/upload`, `/first-package-results`, `/close-periods`, `/firm`, `/support`, `/client-briefings`, `/owner/ask`, `/industry-intelligence`, `/healthcare-intelligence`, `/auth/confirmed`, `/for/controller/*`)
- **Auth surfaces:** `/signin`, `/signup` — treated as dashboard-adjacent

### Distinction from banned `#0F1D3E`

`#0F1D3E` (legacy pilot-CTA navy, Tier B banned) and `#0B1A3A` (marketing card-surface navy) remain semantically different. `#0F1D3E` was the old orange-era CTA accent; `#0B1A3A` is the framed-logo brand-mark navy scoped to marketing card surfaces. Do NOT swap them.

### Gold remains the ONLY chromatic accent

Navy is a card-SURFACE token, not a chromatic accent. Gold (`#C9A961`) remains the only accent color for links, CTAs, eyebrows, focus rings, and borders. Navy provides depth and containment; gold provides emphasis and interaction.

### Persona tile canonical

```tsx
className={`group flex flex-col justify-between rounded-2xl border border-[#C9A961]/25 bg-[#0B1A3A] p-6 transition-all hover:border-[#C9A961]/60 hover:bg-[#12244A] ${focusRing()}`}
```

---

## Semantic colors (use sparingly)

| Role | Hex | Usage |
|---|---|---|
| Error | `#DC2626` / border `rgba(248, 113, 113, 0.30)` / bg `rgba(239, 68, 68, 0.10)` | Form validation errors only |
| Success | `#3BB273` (var: `--advisacor-success`) | Confirmation states only |

---

## Typography

- **Heading font:** `${headingFont}` from `components/site-ui.ts` — resolves to `[font-family:var(--font-geologica)]`. Use for H1, H2, and card titles. Never inline `font-family`.
- **Body font:** inherit from `<body>` (Inter, wired in `app/layout.tsx`).
- **Weights:** headings `font-semibold`, body `font-normal`, emphasis `font-semibold` or `font-bold`. Never use `font-black`.
- **Tracking:** headings `tracking-tight`, uppercase eyebrows `tracking-[0.22em]`. Never `tracking-[-0.055em]` or tighter.
- **Leading:** headings `leading-[1.05]`, body `leading-relaxed` (`1.625`).

Size hierarchy on marketing pages:

| Role | Class | px range |
|---|---|---|
| Hero H1 | `text-4xl md:text-6xl lg:text-7xl` | 36–72px |
| Page H1 | `text-4xl md:text-5xl` | 36–48px |
| Section H2 | `text-2xl md:text-3xl` | 24–30px |
| Card H2 | `text-4xl` | 36px |
| Body | `text-lg md:text-xl` | 18–20px |
| Small body | `text-sm` (14px) | never below 12px |
| Eyebrow | `text-sm font-semibold uppercase tracking-[0.22em]` | 14px |

---

## Logo assets

| File | Where it goes |
|---|---|
| `/advisacor-logo-framed-navy.png` (1536×902) | Every marketing page nav, signup page nav |
| `/advisacor-logo-email.png` (900×528) | Transactional email header ONLY |
| `/advisacor-logo-full-transparent.png` | Reserved for press kit / PDF exports. Not for in-app use. |

**BANNED logo files (do not import, do not reference, do not link):**

- `/advisacor-logo.svg` — retired orange/blue wordmark
- `/advisacor-logo-light.svg` — retired light variant
- `<AdvisacorLogo />` from `components/AdvisacorLogo.tsx` — points at the banned SVGs (component file preserved for backcompat; no new imports)

---

## Component contract

Marketing pages MUST use shared primitives from `components/site-ui.ts`:

- `headingFont` — heading font-family class
- `primaryCtaClass` — gold-pill CTA (canonical values: `bg-[#C9A961] text-[#111112] hover:bg-[#DFC084]`)
- `focusRing(offsetClass?)` — WCAG-compliant gold focus ring with ring-offset

Every clickable primary action MUST use `primaryCtaClass`. No new `.premium-button`-style local styles.

**Known cleanup completed in brand-rules v1.1 composite:** `primaryCtaClass` is now canonical (`bg-[#C9A961] text-[#111112] hover:bg-[#DFC084]`). Focus ring offset uses `#111112`.

---

## BANNED tokens (hard-fail lint)

Lint enforces two tiers of rules:

### Tier A — Global bans (all `app/`, all `components/`)

These are hard-fail everywhere.

**Colors (orange era):**
- `#FF7A1A` — old primary orange
- `#FFB36F` — old orange eyebrow
- `#D28A4A` — old logo orange
- `#F97316` — Tailwind orange-500 leak
- `#2146CF` — old blue accent
- `#1E6BFF` — old blue variant
- `rgba(255, 122, 26, ...)` — orange radial gradients

**CSS classes (from pre-rebrand `globals.css`; the class definitions themselves are exempted in `app/globals.css`):**
- `.premium-button` — orange gradient CTA, replaced by `primaryCtaClass`
- `.advisacor-dark-grid` — orange-radial dark grid, replaced by canonical `bg-[#111112]`
- `.dark-enterprise-card` — white-bordered dark card, replaced by inline gold-tinted card border

**Logo imports (component itself is exempted):**
- `import { AdvisacorLogo } from ...`
- `src="/advisacor-logo.svg"` / `href="/advisacor-logo.svg"`
- `src="/advisacor-logo-light.svg"` / `href="/advisacor-logo-light.svg"`

### Tier B — Marketing-scope-only bans

Enforced ONLY on files matching Marketing scope paths (see below). Dashboard scope is exempt.

**Legacy marketing navy family:**
- `bg-[#0A1530]` — legacy marketing navy background
- `bg-[#0A1020]` — legacy marketing navy background variant
- `text-[#0A1530]` — legacy CTA/toggle navy ink
- `bg-[#0F1D3E]` — legacy active tier / pilot CTA navy
- `bg-[#0F0F10]` — legacy alt-section fill
- `bg-[#141416]` — legacy emphasis card fill
- `text-[#0B0B0C]` — legacy CTA ink variant
- `hover:bg-[#D4B672]` — legacy CTA hover
- `hover:bg-[#D9B972]` — legacy CTA hover variant

**Legacy light-mode cool-slate family (banned in `/about`, `/privacy`, and any future light-mode marketing page):**
- `bg-[#F5F7FA]` — cool slate-50
- `text-[#111827]` — cool near-black
- `from-slate-200`, `via-slate-300`, `to-slate-400` — cool slate gradient stops

Note on generic slate/white text: `text-slate-*` and `bg-white` are permitted globally because they're used across many dashboard surfaces. The marketing-page-canonical migration for them is enforced by manual review + this document, not by the lint (adding them to Tier B would flag hundreds of legitimate dashboard files).

---

## Marketing scope

The following paths are enforced as MARKETING SURFACES — full brand parity with the reference implementations, subject to Tier B rules.

**Confirmed canonical (9M.N series, PRs #84–#93):**
- `app/page.tsx`
- `app/pricing/page.tsx`
- `app/industries/page.tsx`
- `app/how-it-works/page.tsx`
- `app/what-it-does/page.tsx`
- `app/about/page.tsx`
- `app/privacy/page.tsx`
- `app/for/**/page.tsx`

**Auxiliary marketing pages (must comply on next touch):**
- `app/signup/page.tsx`
- `app/signin/page.tsx`
- `app/login/page.tsx`
- `app/free-review/page.tsx`
- `app/coming-soon/page.tsx`
- `app/support/page.tsx`
- `app/landing-preview/page.tsx`
- `app/industry-intelligence/page.tsx`
- `app/healthcare-intelligence/page.tsx`

**Marketing chrome (must match marketing surface):**
- `components/SiteNav.tsx`
- `components/SiteFooter.tsx`
- `components/PersonaRouter.tsx`
- `components/site-ui.ts`

Marketing scope MUST:
- Use `<SiteNav />` (or the framed-navy logo directly for signup — signup can't use SiteNav due to minimal chrome, but the logo asset MUST match)
- Use **canonical charcoal `#111112`** as root background (or `#F7F6F2` warm-ivory for explicit light-mode editorial pages)
- Use `headingFont` on all H1/H2
- Use `primaryCtaClass` on the primary CTA
- Use gold `#C9A961` family for accents — NEVER any other chromatic color
- Use the 3-tier text token system (dark) or 2-tier (light) as documented above

## Dashboard scope

Paths NOT in the marketing scope above (admin, reviewer, onboarding, client-briefings, developer, budgets, purchase-orders, etc.) are DASHBOARD surfaces. Dashboards MAY use lighter neutral palettes (white/slate/gray) as long as they:

- NEVER import `<AdvisacorLogo>`
- NEVER reference `.premium-button`, `.advisacor-dark-grid`, `.dark-enterprise-card`
- NEVER use banned orange/blue hexes from Tier A
- Use gold `#C9A961` when they need an accent — no other chromatic color

Tier A rules apply everywhere. Tier B (marketing-only rules) does NOT apply to dashboard files.

---

## Exception process

If a page legitimately needs to deviate (a print-friendly PDF preview route, a marketing landing test variant, a customer-branded surface), add an exception here with:

1. Path
2. Reason
3. Which rule is deviated
4. Sunset date or link to follow-up PR that removes the exception

Current exceptions:

1. Path: `app/globals.css`
   Reason: Attribute selectors intentionally match banned orange hex class fragments (`text-[#FF7A1A]`, etc.) and rewrite them to gold at CSS runtime.
   Rule: Tier A orange-era color bans.
   Sunset: none — permanent structural exemption in `scripts/brand-lint.mjs` (`EXEMPT_FILES`).

2. Path: `components/AdvisacorLogo.tsx`
   Reason: Retired SVG component preserved for backcompat; file necessarily contains banned logo hexes + `advisacor-logo.svg` references. No new imports permitted.
   Rule: Tier A color + logo-import bans.
   Sunset: delete component once zero callers remain (see deferred cleanup).

---

## Migration workflow (9M.N pattern-inference pipeline)

The 9M.N series delivered 51 consecutive first-try merges. Documented for future marketing surface additions and re-audits.

**Per-page procedure:**

1. Fetch fresh source from `main` via `gh api repos/{owner}/{repo}/contents/{path}?ref=main`
2. Census the legacy vocabulary using structured `grep -oE`
3. Read surrounding context for any pattern not yet in the vocabulary — establish semantic role
4. Draft compound-first Find/Replace sequence (narrower compounds before residual single-token catches)
5. Predict per-op counts from census + context reading
6. Cursor executes the paste block
7. Full-tree `npx tsc --noEmit` BEFORE push
8. Grep audit for zero legacy remaining
9. Push, PR, Vercel READY — verify preview smoke matches expected rendering
10. Merge with `--match-head-commit`

Deviation from predicted counts indicates a missed compound. Post-mortem the arithmetic and update the vocabulary if a new compound is discovered.

---

## Change log

| Date | Change | PR |
|---|---|---|
| 2026-07-08 | v1.0 drafted: navy `#0A1530` + gold `#C9A961`, orange-era BANNED tokens. Not merged. | Phase TCP1 W1 (not shipped) |
| 2026-07-14 | v1.1 shipped: charcoal `#111112` + Nexus warm-ivory `/about` `/privacy`. 3-tier text tokens, compound surface patterns, Tier A/B lint split. Documented 9M.N migration workflow. | Phase TCP1 W2.5 composite |

### v1.2 (Phase TCP1 post-W2.5 visual polish)

- Added persona-tile navy family (`#0B1A3A` / `#12244A`) as brand-mark tie-in surface scoped to `components/PersonaTile.tsx` only
- Clarified distinction from banned Tier B `#0F1D3E`
- Reinforced: gold `#C9A961` remains the ONLY chromatic accent; navy is a brand-mark surface reference, not an accent color

### v1.3 (Phase TCP1 post-W2.5 navy card universalization)

- Elevated persona-tile navy (`#0B1A3A` / `#12244A`) from PersonaTile-only scope to canonical marketing card-surface token
- Recolored all card patterns (`rounded-* border-[#C9A961]/* bg-[#111112|#1A1A1C]`) across marketing scope to navy
- Explicit exclusions documented: section bands, chrome, form inputs, `.enterprise-card`, dashboard scope, auth surfaces
- Gold `#C9A961` remains the ONLY chromatic accent; navy is a surface token
