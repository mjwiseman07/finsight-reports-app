# PBC-TIEOUT-4.1.3 — Phase 5 Level 1: static verification report

Captured: 7/28/2026, 01:03:28 America/New_York
Local HEAD SHA: b3acb371bfb5296f107cf2b6d6580be920ae4468
Branch: feature/pbc-tieout-413-family2-emitter-decoupling
PR: #213

## 1. tsc --noEmit

```
lib/audit-ready/tie-out/__tests__/bs-recon-notify.test.ts(22,54): error TS2554: Expected 0 arguments, but got 1.
lib/audit-ready/tie-out/__tests__/bs-recon-notify.test.ts(49,34): error TS2345: Argument of type '(bucket: string) => { createSignedUrl: Mock<() => Promise<{ data: null; error: { message: string; }; } | { data: { signedUrl: string | null; }; error: null; }>>; }' is not assignable to parameter of type '() => { createSignedUrl: Mock<Procedure>; }'.
  Target signature provides too few arguments. Expected 1 or more, but got 0.
```

Self-check: Are the ONLY errors the 2 pre-existing bs-recon-notify.test.ts errors from #210? **yes**

## 2. vitest full suite

```
RUN  v4.1.9 C:/Users/mattj/finsight-reports

PASS: 49/49 stage runs. Evidence written to C:\Users\mattj\finsight-reports\architecture-lane\d0-evidence\G7_C7_CASCADE_EVIDENCE.json

 Test Files  366 passed | 6 skipped (372)
      Tests  2809 passed | 14 skipped | 2 todo (2825)
   Start at  00:58:46
   Duration  56.29s (transform 29.55s, setup 0ms, import 117.31s, tests 192.56s, environment 57.16s)
```

Self-check: Total passed = 2809? **yes** (actual: 2809)
Self-check: 0 failed? **yes** (actual: 0 failed; 14 skipped; 2 todo)

## 3. Branch diff stat vs main

```
 docs/audit-ready/PBC-TIEOUT-4-1-3-build-spec.md    | 253 +++++++++++
 docs/audit-ready/PBC-TIEOUT-4-1-3-inventory.md     | 216 ++++++++++
 .../PBC-TIEOUT-4-1-3-pr213-verification.md         |  78 ++++
 lib/audit-ready/kickouts/list-kickouts.test.ts     | 212 ++++++++-
 lib/audit-ready/kickouts/list-kickouts.ts          |  77 +++-
 .../tie-out/__tests__/bs-recon-artifacts.test.ts   | 202 +++++++--
 .../tie-out/__tests__/regenerate-run.test.ts       | 226 ++++++++++
 lib/audit-ready/tie-out/bs-recon-artifacts.ts      |  56 ++-
 lib/audit-ready/tie-out/bs-summary-resolver.ts     |  14 +-
 .../emitters/__tests__/bs-account-emitter.test.ts  | 318 +++++++++++---
 .../emitters/__tests__/bs-summary-emitter.test.ts  | 477 ++++++++++++++++-----
 .../__tests__/fa-rollforward-emitter.test.ts       | 350 ++++++++++-----
 .../tie-out/emitters/bs-account-emitter.ts         | 263 ++++++++++--
 .../tie-out/emitters/bs-summary-emitter.ts         | 445 ++++++++++++++-----
 .../tie-out/emitters/fa-rollforward-emitter.ts     | 255 +++++++++--
 lib/audit-ready/tie-out/fa-rollforward-resolver.ts |  24 +-
 lib/audit-ready/tie-out/regenerate-run.ts          |  83 +++-
 17 files changed, 3011 insertions(+), 538 deletions(-)
```

Self-check: List the categorized file totals (from `git diff --numstat main...HEAD`):
- Emitter source files (bs-account, fa-rollforward, bs-summary): **3 files, +771/-192 lines**
- Emitter test files: **3 files, +885/-260 lines**
- Resolver source files (bs-summary, fa-rollforward — payload extensions only): **2 files, +36/-2 lines**
- Reader source files (list-kickouts, bs-recon-artifacts, regenerate-run): **3 files, +186/-30 lines**
- Reader test files: **3 files, +586/-54 lines**
- Docs (Phase 1 inventory/spec + verification snapshot): **3 files, +547/-0 lines** (this Phase 5 Level 1 report is committed after capture)
- Any other file: **none**

## 4. Commits ahead of main

```
b3acb371 test(4.1.3): regenerate-run canonical + fallback + byte-identity
b77b8cc1 test(4.1.3): bs-recon-artifacts canonical + fallback + byte-identity
5c693989 test(4.1.3): list-kickouts canonical + fallback + byte-identity
bf67b936 test(4.1.3): retarget bsSummaryEmitter tests to canonical + fallback + byte-identity + parent-child linkage
86d8e386 test(4.1.3): retarget faRollforwardEmitter tests to canonical + fallback + byte-identity
8282e687 test(4.1.3): retarget bsAccountEmitter tests to canonical + fallback + byte-identity
2ec3eeaf refactor(4.1.3): canonical run_id linkage for kickouts + reader fallbacks
8bc12109 refactor(4.1.3): decouple bsSummaryEmitter from legacy bs_recon_summary tables
c00a281c feat(4.1.3): extend BS summary payload with totals + lines
93199bbe ﻿refactor(4.1.3): decouple faRollforwardEmitter from legacy fa_rollforward tables
d8b13671 ﻿feat(4.1.3): extend FA rollforward payload with totals + lines
30cd2e31 ﻿refactor(4.1.3): decouple bsAccountEmitter from legacy bs_recon tables
a45edb91 ﻿docs(4.1.3): PR #213 verification snapshot
c3269443 ﻿docs(4.1.3): Family 2 emitter table decoupling inventory + build spec
```

Self-check: Total commits ahead = **14**
Self-check: Every commit message follows the (4.1.3) convention? **yes** (note: some early commit subjects include a UTF-8 BOM prefix visible as a leading odd character in `git log --oneline`; subject body still contains `(4.1.3)`)

## 5. Files touched

```
A	docs/audit-ready/PBC-TIEOUT-4-1-3-build-spec.md
A	docs/audit-ready/PBC-TIEOUT-4-1-3-inventory.md
A	docs/audit-ready/PBC-TIEOUT-4-1-3-pr213-verification.md
M	lib/audit-ready/kickouts/list-kickouts.test.ts
M	lib/audit-ready/kickouts/list-kickouts.ts
M	lib/audit-ready/tie-out/__tests__/bs-recon-artifacts.test.ts
A	lib/audit-ready/tie-out/__tests__/regenerate-run.test.ts
M	lib/audit-ready/tie-out/bs-recon-artifacts.ts
M	lib/audit-ready/tie-out/bs-summary-resolver.ts
M	lib/audit-ready/tie-out/emitters/__tests__/bs-account-emitter.test.ts
M	lib/audit-ready/tie-out/emitters/__tests__/bs-summary-emitter.test.ts
M	lib/audit-ready/tie-out/emitters/__tests__/fa-rollforward-emitter.test.ts
M	lib/audit-ready/tie-out/emitters/bs-account-emitter.ts
M	lib/audit-ready/tie-out/emitters/bs-summary-emitter.ts
M	lib/audit-ready/tie-out/emitters/fa-rollforward-emitter.ts
M	lib/audit-ready/tie-out/fa-rollforward-resolver.ts
M	lib/audit-ready/tie-out/regenerate-run.ts
```

Self-check: Every M/A file is expected per the categorization above? **yes**
Self-check: Zero D (deleted) files? **yes**

## 6. TODO/XXX/FIXME scan

```
none
```

Self-check: Zero new TODOs/XXXs/FIXMEs in the diff? **yes**

## 7. PBC-TIEOUT-4.1.3.b tag coverage

```
> lib/audit-ready/tie-out/emitters/bs-account-emitter.ts:294:// PBC-TIEOUT-4.1.3.b removes this function entirely
  lib/audit-ready/tie-out/emitters/bs-account-emitter.ts:295:async function readLegacyBsReconArtifact(

> lib/audit-ready/tie-out/emitters/bs-account-emitter.ts:339:  // PBC-TIEOUT-4.1.3.b removes this fallback
  lib/audit-ready/tie-out/emitters/bs-account-emitter.ts:340:  if (

> lib/audit-ready/tie-out/emitters/bs-account-emitter.ts:356:  // PBC-TIEOUT-4.1.3.b removes this fallback
  lib/audit-ready/tie-out/emitters/bs-account-emitter.ts:357:  if (!face || !backupTabs) {

> lib/audit-ready/tie-out/emitters/fa-rollforward-emitter.ts:304:// PBC-TIEOUT-4.1.3.b removes this function entirely
  lib/audit-ready/tie-out/emitters/fa-rollforward-emitter.ts:305:async function readLegacyFaRollforwardArtifact(

> lib/audit-ready/tie-out/emitters/fa-rollforward-emitter.ts:357:  // Primary — PBC-TIEOUT-4.1.3.b removes this fallback
  lib/audit-ready/tie-out/emitters/fa-rollforward-emitter.ts:358:  if (

> lib/audit-ready/tie-out/emitters/fa-rollforward-emitter.ts:372:  // PBC-TIEOUT-4.1.3.b removes this fallback
  lib/audit-ready/tie-out/emitters/fa-rollforward-emitter.ts:373:  if (!face || !backupTabs) {

> lib/audit-ready/tie-out/emitters/bs-summary-emitter.ts:184:  // PBC-TIEOUT-4.1.3.b removes this fallback
  lib/audit-ready/tie-out/emitters/bs-summary-emitter.ts:185:  const supabase = getSupabaseAdmin();

> lib/audit-ready/tie-out/emitters/bs-summary-emitter.ts:360:// PBC-TIEOUT-4.1.3.b removes this function entirely
  lib/audit-ready/tie-out/emitters/bs-summary-emitter.ts:361:async function readLegacyBsReconSummaryArtifact(

> lib/audit-ready/tie-out/emitters/bs-summary-emitter.ts:408:  // Primary — PBC-TIEOUT-4.1.3.b removes this fallback
  lib/audit-ready/tie-out/emitters/bs-summary-emitter.ts:409:  if (

> lib/audit-ready/tie-out/emitters/bs-summary-emitter.ts:428:  // PBC-TIEOUT-4.1.3.b removes this fallback
  lib/audit-ready/tie-out/emitters/bs-summary-emitter.ts:429:  if (!face || !backupTabs) {

> lib/audit-ready/kickouts/list-kickouts.ts:381:  // PBC-TIEOUT-4.1.3.b removes this fallback
  lib/audit-ready/kickouts/list-kickouts.ts:382:  if (missingArtifactIds.length > 0) {

> lib/audit-ready/kickouts/list-kickouts.ts:394:// PBC-TIEOUT-4.1.3.b removes this function entirely
  lib/audit-ready/kickouts/list-kickouts.ts:395:async function assembleParentRunViaLegacyArtifactJoin(

> lib/audit-ready/tie-out/bs-recon-artifacts.ts:70:  // PBC-TIEOUT-4.1.3.b removes this fallback
  lib/audit-ready/tie-out/bs-recon-artifacts.ts:71:  return getBsSummaryArtifactByPeriodEndLegacy(params);

> lib/audit-ready/tie-out/bs-recon-artifacts.ts:105:// PBC-TIEOUT-4.1.3.b removes this function entirely
  lib/audit-ready/tie-out/bs-recon-artifacts.ts:106:async function getBsSummaryArtifactByPeriodEndLegacy(params: {

> lib/audit-ready/tie-out/regenerate-run.ts:238:  // PBC-TIEOUT-4.1.3.b removes this fallback
  lib/audit-ready/tie-out/regenerate-run.ts:239:  return resolveBsAccountMetaFromLegacyArtifact(runId);

> lib/audit-ready/tie-out/regenerate-run.ts:242:// PBC-TIEOUT-4.1.3.b removes this function entirely
  lib/audit-ready/tie-out/regenerate-run.ts:243:async function resolveBsAccountMetaFromLegacyArtifact(
```

Self-check: Every emitter has at least one 4.1.3.b tag? **yes** (bs-account-emitter, fa-rollforward-emitter, bs-summary-emitter)
Self-check: list-kickouts.ts, bs-recon-artifacts.ts, regenerate-run.ts each have 4.1.3.b tags? **yes** (all three)

## 8. readLegacy* helper coverage

```
  lib\audit-ready\tie-out\emitters\bs-account-emitter.ts:294:// PBC-TIEOUT-4.1.3.b removes this function entirely
> lib\audit-ready\tie-out\emitters\bs-account-emitter.ts:295:async function readLegacyBsReconArtifact(

  lib\audit-ready\tie-out\emitters\bs-account-emitter.ts:349:  ) {
> lib\audit-ready\tie-out\emitters\bs-account-emitter.ts:350:    return readLegacyBsReconArtifact(runId);

  lib\audit-ready\tie-out\emitters\bs-account-emitter.ts:357:  if (!face || !backupTabs) {
> lib\audit-ready\tie-out\emitters\bs-account-emitter.ts:358:    return readLegacyBsReconArtifact(runId);

  lib\audit-ready\tie-out\emitters\bs-summary-emitter.ts:360:// PBC-TIEOUT-4.1.3.b removes this function entirely
> lib\audit-ready\tie-out\emitters\bs-summary-emitter.ts:361:async function readLegacyBsReconSummaryArtifact(

  lib\audit-ready\tie-out\emitters\bs-summary-emitter.ts:416:  ) {
> lib\audit-ready\tie-out\emitters\bs-summary-emitter.ts:417:    return readLegacyBsReconSummaryArtifact(runId);

  lib\audit-ready\tie-out\emitters\bs-summary-emitter.ts:429:  if (!face || !backupTabs) {
> lib\audit-ready\tie-out\emitters\bs-summary-emitter.ts:430:    return readLegacyBsReconSummaryArtifact(runId);

  lib\audit-ready\tie-out\emitters\fa-rollforward-emitter.ts:304:// PBC-TIEOUT-4.1.3.b removes this function entirely
> lib\audit-ready\tie-out\emitters\fa-rollforward-emitter.ts:305:async function readLegacyFaRollforwardArtifact(

  lib\audit-ready\tie-out\emitters\fa-rollforward-emitter.ts:365:  ) {
> lib\audit-ready\tie-out\emitters\fa-rollforward-emitter.ts:366:    return readLegacyFaRollforwardArtifact(runId);

  lib\audit-ready\tie-out\emitters\fa-rollforward-emitter.ts:373:  if (!face || !backupTabs) {
> lib\audit-ready\tie-out\emitters\fa-rollforward-emitter.ts:374:    return readLegacyFaRollforwardArtifact(runId);
```

Self-check: readLegacyBsReconArtifact, readLegacyFaRollforwardArtifact, readLegacyBsReconSummaryArtifact all present? **yes** (all three)

## 9. Legacy resolver writes still present

```
> lib\audit-ready\tie-out\ap-resolver.ts:68:    .insert({
  lib\audit-ready\tie-out\ap-resolver.ts:69:      engagement_id: input.engagementId,

> lib\audit-ready\tie-out\ap-resolver.ts:202:        .insert(chunk);
  lib\audit-ready\tie-out\ap-resolver.ts:203:      if (varErr) {

> lib\audit-ready\tie-out\ar-resolver.ts:69:    .insert({
  lib\audit-ready\tie-out\ar-resolver.ts:70:      engagement_id: input.engagementId,

> lib\audit-ready\tie-out\ar-resolver.ts:209:        .insert(chunk);
  lib\audit-ready\tie-out\ar-resolver.ts:210:      if (varErr) {

> lib\audit-ready\tie-out\bs-account-resolver.ts:74:    .insert({
  lib\audit-ready\tie-out\bs-account-resolver.ts:75:      engagement_id: input.engagementId,

> lib\audit-ready\tie-out\bs-account-resolver.ts:163:        .insert(batch);
  lib\audit-ready\tie-out\bs-account-resolver.ts:164:      if (batchErr) throw new Error(`txn_insert_failed: ${batchErr.message}`);

> lib\audit-ready\tie-out\bs-account-resolver.ts:193:          .insert(batch);
  lib\audit-ready\tie-out\bs-account-resolver.ts:194:        if (vErr) throw new Error(`variance_insert_failed: ${vErr.message}`);

> lib\audit-ready\tie-out\bs-account-resolver.ts:204:    await supabase.from("audit_ready_tie_out_variances").insert({
  lib\audit-ready\tie-out\bs-account-resolver.ts:205:      run_id: runId,

> lib\audit-ready\tie-out\bs-account-resolver.ts:246:      .insert({
  lib\audit-ready\tie-out\bs-account-resolver.ts:247:        engagement_id: input.engagementId,

> lib\audit-ready\tie-out\bs-summary-resolver.ts:133:    .insert({
  lib\audit-ready\tie-out\bs-summary-resolver.ts:134:      engagement_id: engagementId,

> lib\audit-ready\tie-out\bs-summary-resolver.ts:193:    .insert({
  lib\audit-ready\tie-out\bs-summary-resolver.ts:194:      engagement_id: input.engagementId,

> lib\audit-ready\tie-out\bs-summary-resolver.ts:486:      .insert({
  lib\audit-ready\tie-out\bs-summary-resolver.ts:487:        engagement_id: input.engagementId,

> lib\audit-ready\tie-out\bs-summary-resolver.ts:526:        .insert(
  lib\audit-ready\tie-out\bs-summary-resolver.ts:527:          summaryLineInserts.map((row) => ({

> lib\audit-ready\tie-out\fa-rollforward-resolver.ts:118:    .insert({
  lib\audit-ready\tie-out\fa-rollforward-resolver.ts:119:      engagement_id: input.engagementId,

> lib\audit-ready\tie-out\fa-rollforward-resolver.ts:311:      .insert({
  lib\audit-ready\tie-out\fa-rollforward-resolver.ts:312:        engagement_id: input.engagementId,

> lib\audit-ready\tie-out\fa-rollforward-resolver.ts:375:        .insert(batch);
  lib\audit-ready\tie-out\fa-rollforward-resolver.ts:376:      if (batchErr) throw new Error(`line_insert_failed: ${batchErr.message}`);

> lib\audit-ready\tie-out\grni-resolver.ts:86:    .insert({
  lib\audit-ready\tie-out\grni-resolver.ts:87:      engagement_id: input.engagementId,

> lib\audit-ready\tie-out\grni-resolver.ts:261:      .insert(chunk)
  lib\audit-ready\tie-out\grni-resolver.ts:262:      .select("id");

> lib\audit-ready\tie-out\grni-resolver.ts:355:      .insert(chunk);
  lib\audit-ready\tie-out\grni-resolver.ts:356:    if (eErr) {

> lib\audit-ready\tie-out\inventory-resolver.ts:68:    .insert({
  lib\audit-ready\tie-out\inventory-resolver.ts:69:      engagement_id: input.engagementId,

> lib\audit-ready\tie-out\inventory-resolver.ts:204:        .insert(chunk);
  lib\audit-ready\tie-out\inventory-resolver.ts:205:      if (varErr) {
```

Self-check: bs-summary-resolver.ts and fa-rollforward-resolver.ts still contain .insert() calls to legacy tables? **yes** (bs-summary-resolver: artifact + lines inserts; fa-rollforward-resolver: artifact + lines inserts)

## 10. Bucket .upload() check

```
> lib\audit-ready\tie-out\bs-account-resolver.ts:237:      .upload(objectKey, xlsxBuf, {

> lib\audit-ready\tie-out\bs-summary-resolver.ts:476:      .upload(objectKey, pdfBuf, {

> lib\audit-ready\tie-out\fa-rollforward-resolver.ts:301:      .upload(objectKey, pdfBuf, {

> lib\audit-ready\tie-out\upload-artifact.ts:29:    .upload(storagePath, fileBytes, {
```

Self-check: Zero .upload() calls in emitters, kickouts, or non-resolver tie-out files? **no** — emitters/kickouts: zero; non-resolver `upload-artifact.ts` has `.upload()` (canonical dual-write helper, pre-existing / not introduced by this PR)
Self-check: If any .upload() shows up, is it in a resolver file (expected — Block F Part 2 territory)? **yes** for the three resolver hits (bs-account / bs-summary / fa-rollforward). Plus `upload-artifact.ts` as noted above.

## 11. PR #213 GitHub state

```json
{"commits":[{"authoredDate":"2026-07-28T03:37:58Z","authors":[{"email":"mattjanice07@yahoo.com","id":"U_kgDOERy7Yg","login":"mjwiseman07","name":"Matthew Wiseman"},{"email":"cursoragent@cursor.com","id":"U_kgDOC972lw","login":"cursoragent","name":"Cursor"}],"committedDate":"2026-07-28T03:37:58Z","messageBody":"Phase 1 of PBC-TIEOUT-4.1.3. No code changes. Locks canonical stack\nreferences (loadRunContext, loadVariances, dualWriteWorkpaper, EMITTER_REGISTRY).\nPhase 2 refactor begins on human approval.\n\nCo-authored-by: Cursor <cursoragent@cursor.com>","messageHeadline":"﻿docs(4.1.3): Family 2 emitter table decoupling inventory + build spec","oid":"c32694433d42e27518544e98b27b450e041ba98e"},{"authoredDate":"2026-07-28T03:51:21Z","authors":[{"email":"mattjanice07@yahoo.com","id":"U_kgDOERy7Yg","login":"mjwiseman07","name":"Matthew Wiseman"},{"email":"cursoragent@cursor.com","id":"U_kgDOC972lw","login":"cursoragent","name":"Cursor"}],"committedDate":"2026-07-28T03:51:21Z","messageBody":"Co-authored-by: Cursor <cursoragent@cursor.com>","messageHeadline":"﻿docs(4.1.3): PR #213 verification snapshot","oid":"a45edb91b9935c2509add1a6af12f170f2712fcc"},{"authoredDate":"2026-07-28T04:07:24Z","authors":[{"email":"mattjanice07@yahoo.com","id":"U_kgDOERy7Yg","login":"mjwiseman07","name":"Matthew Wiseman"},{"email":"cursoragent@cursor.com","id":"U_kgDOC972lw","login":"cursoragent","name":"Cursor"}],"committedDate":"2026-07-28T04:07:24Z","messageBody":"Sources face + backup from canonical run stack (loadRunContext + loadVariances\n+ rawQboPayload). Legacy artifact + transactions table reads preserved as\nfallback tagged for PBC-TIEOUT-4.1.3.b removal.\n\nCo-authored-by: Cursor <cursoragent@cursor.com>","messageHeadline":"﻿refactor(4.1.3): decouple bsAccountEmitter from legacy bs_recon tables","oid":"30cd2e316e10427f70b9c0395f779b404eae091b"},{"authoredDate":"2026-07-28T04:19:00Z","authors":[{"email":"mattjanice07@yahoo.com","id":"U_kgDOERy7Yg","login":"mjwiseman07","name":"Matthew Wiseman"},{"email":"cursoragent@cursor.com","id":"U_kgDOC972lw","login":"cursoragent","name":"Cursor"}],"committedDate":"2026-07-28T04:19:00Z","messageBody":"Additive extension of fa-rollforward-resolver.ts raw_qbo_payload_jsonb to\ncarry rollforward_totals and lines already computed in-memory for legacy\ninserts. No behavior change to existing legacy writes. Bumps payload\nversion 1 -> 2. Consumed by faRollforwardEmitter in the next commit.\n\nCo-authored-by: Cursor <cursoragent@cursor.com>","messageHeadline":"﻿feat(4.1.3): extend FA rollforward payload with totals + lines","oid":"d8b13671477a852005eb84ce4c6479e8b970e431"},{"authoredDate":"2026-07-28T04:20:15Z","authors":[{"email":"mattjanice07@yahoo.com","id":"U_kgDOERy7Yg","login":"mjwiseman07","name":"Matthew Wiseman"},{"email":"cursoragent@cursor.com","id":"U_kgDOC972lw","login":"cursoragent","name":"Cursor"}],"committedDate":"2026-07-28T04:20:15Z","messageBody":"…rward tables\n\nSources face + backup from canonical run stack (loadRunContext + loadVariances\n+ rawQboPayload.rollforward_totals + rawQboPayload.lines added in prior\ncommit). Legacy artifact + lines table reads preserved as fallback tagged for\nPBC-TIEOUT-4.1.3.b removal.\n\nCo-authored-by: Cursor <cursoragent@cursor.com>","messageHeadline":"﻿refactor(4.1.3): decouple faRollforwardEmitter from legacy fa_rollfo…","oid":"93199bbef8e689ea87c533cefba3835fb701ebb0"},{"authoredDate":"2026-07-28T04:28:58Z","authors":[{"email":"mattjanice07@yahoo.com","id":"U_kgDOERy7Yg","login":"mjwiseman07","name":"Matthew Wiseman"},{"email":"cursoragent@cursor.com","id":"U_kgDOC972lw","login":"cursoragent","name":"Cursor"}],"committedDate":"2026-07-28T04:28:58Z","messageBody":"Co-authored-by: Cursor <cursoragent@cursor.com>","messageHeadline":"feat(4.1.3): extend BS summary payload with totals + lines","oid":"c00a281cfdb6d16fa716f7a1814aa6ae3da179cd"},{"authoredDate":"2026-07-28T04:29:06Z","authors":[{"email":"mattjanice07@yahoo.com","id":"U_kgDOERy7Yg","login":"mjwiseman07","name":"Matthew Wiseman"},{"email":"cursoragent@cursor.com","id":"U_kgDOC972lw","login":"cursoragent","name":"Cursor"}],"committedDate":"2026-07-28T04:29:06Z","messageBody":"…ry tables\n\nCo-authored-by: Cursor <cursoragent@cursor.com>","messageHeadline":"refactor(4.1.3): decouple bsSummaryEmitter from legacy bs_recon_summa…","oid":"8bc121097b22b33baa399230101cc5994a2d2ee2"},{"authoredDate":"2026-07-28T04:29:13Z","authors":[{"email":"mattjanice07@yahoo.com","id":"U_kgDOERy7Yg","login":"mjwiseman07","name":"Matthew Wiseman"},{"email":"cursoragent@cursor.com","id":"U_kgDOC972lw","login":"cursoragent","name":"Cursor"}],"committedDate":"2026-07-28T04:29:13Z","messageBody":"…acks\n\nCo-authored-by: Cursor <cursoragent@cursor.com>","messageHeadline":"refactor(4.1.3): canonical run_id linkage for kickouts + reader fallb…","oid":"2ec3eeaf7387de31a8781dceacfd2b1757d380d0"},{"authoredDate":"2026-07-28T04:40:40Z","authors":[{"email":"mattjanice07@yahoo.com","id":"U_kgDOERy7Yg","login":"mjwiseman07","name":"Matthew Wiseman"},{"email":"cursoragent@cursor.com","id":"U_kgDOC972lw","login":"cursoragent","name":"Cursor"}],"committedDate":"2026-07-28T04:40:40Z","messageBody":"…+ byte-identity\n\nCo-authored-by: Cursor <cursoragent@cursor.com>","messageHeadline":"test(4.1.3): retarget bsAccountEmitter tests to canonical + fallback …","oid":"8282e687c0c4e7492646ccfc0af42354dad0122c"},{"authoredDate":"2026-07-28T04:41:32Z","authors":[{"email":"mattjanice07@yahoo.com","id":"U_kgDOERy7Yg","login":"mjwiseman07","name":"Matthew Wiseman"},{"email":"cursoragent@cursor.com","id":"U_kgDOC972lw","login":"cursoragent","name":"Cursor"}],"committedDate":"2026-07-28T04:41:32Z","messageBody":"…ack + byte-identity\n\nCo-authored-by: Cursor <cursoragent@cursor.com>","messageHeadline":"test(4.1.3): retarget faRollforwardEmitter tests to canonical + fallb…","oid":"86d8e386fb34732517dadd6ca49afc8c691e9678"},{"authoredDate":"2026-07-28T04:41:59Z","authors":[{"email":"mattjanice07@yahoo.com","id":"U_kgDOERy7Yg","login":"mjwiseman07","name":"Matthew Wiseman"},{"email":"cursoragent@cursor.com","id":"U_kgDOC972lw","login":"cursoragent","name":"Cursor"}],"committedDate":"2026-07-28T04:41:59Z","messageBody":"…+ byte-identity + parent-child linkage\n\nCo-authored-by: Cursor <cursoragent@cursor.com>","messageHeadline":"test(4.1.3): retarget bsSummaryEmitter tests to canonical + fallback …","oid":"bf67b936414ccc53eedf6b65ef0402696be5afcf"},{"authoredDate":"2026-07-28T04:49:12Z","authors":[{"email":"mattjanice07@yahoo.com","id":"U_kgDOERy7Yg","login":"mjwiseman07","name":"Matthew Wiseman"},{"email":"cursoragent@cursor.com","id":"U_kgDOC972lw","login":"cursoragent","name":"Cursor"}],"committedDate":"2026-07-28T04:49:12Z","messageBody":"Co-authored-by: Cursor <cursoragent@cursor.com>","messageHeadline":"test(4.1.3): list-kickouts canonical + fallback + byte-identity","oid":"5c693989524f314dc75d4adb5bb90daf5bd72323"},{"authoredDate":"2026-07-28T04:49:12Z","authors":[{"email":"mattjanice07@yahoo.com","id":"U_kgDOERy7Yg","login":"mjwiseman07","name":"Matthew Wiseman"},{"email":"cursoragent@cursor.com","id":"U_kgDOC972lw","login":"cursoragent","name":"Cursor"}],"committedDate":"2026-07-28T04:49:12Z","messageBody":"Co-authored-by: Cursor <cursoragent@cursor.com>","messageHeadline":"test(4.1.3): bs-recon-artifacts canonical + fallback + byte-identity","oid":"b77b8cc134fd0b52bb36a96c3d477e60706de1d3"},{"authoredDate":"2026-07-28T04:49:13Z","authors":[{"email":"mattjanice07@yahoo.com","id":"U_kgDOERy7Yg","login":"mjwiseman07","name":"Matthew Wiseman"},{"email":"cursoragent@cursor.com","id":"U_kgDOC972lw","login":"cursoragent","name":"Cursor"}],"committedDate":"2026-07-28T04:49:13Z","messageBody":"Co-authored-by: Cursor <cursoragent@cursor.com>","messageHeadline":"test(4.1.3): regenerate-run canonical + fallback + byte-identity","oid":"b3acb371bfb5296f107cf2b6d6580be920ae4468"}],"files":[{"path":"docs/audit-ready/PBC-TIEOUT-4-1-3-build-spec.md","additions":253,"deletions":0,"changeType":"ADDED"},{"path":"docs/audit-ready/PBC-TIEOUT-4-1-3-inventory.md","additions":216,"deletions":0,"changeType":"ADDED"},{"path":"docs/audit-ready/PBC-TIEOUT-4-1-3-pr213-verification.md","additions":78,"deletions":0,"changeType":"ADDED"},{"path":"lib/audit-ready/kickouts/list-kickouts.test.ts","additions":198,"deletions":14,"changeType":"MODIFIED"},{"path":"lib/audit-ready/kickouts/list-kickouts.ts","additions":64,"deletions":13,"changeType":"MODIFIED"},{"path":"lib/audit-ready/tie-out/__tests__/bs-recon-artifacts.test.ts","additions":162,"deletions":40,"changeType":"MODIFIED"},{"path":"lib/audit-ready/tie-out/__tests__/regenerate-run.test.ts","additions":226,"deletions":0,"changeType":"ADDED"},{"path":"lib/audit-ready/tie-out/bs-recon-artifacts.ts","additions":55,"deletions":1,"changeType":"MODIFIED"},{"path":"lib/audit-ready/tie-out/bs-summary-resolver.ts","additions":13,"deletions":1,"changeType":"MODIFIED"},{"path":"lib/audit-ready/tie-out/emitters/__tests__/bs-account-emitter.test.ts","additions":257,"deletions":61,"changeType":"MODIFIED"},{"path":"lib/audit-ready/tie-out/emitters/__tests__/bs-summary-emitter.test.ts","additions":377,"deletions":100,"changeType":"MODIFIED"},{"path":"lib/audit-ready/tie-out/emitters/__tests__/fa-rollforward-emitter.test.ts","additions":251,"deletions":99,"changeType":"MODIFIED"},{"path":"lib/audit-ready/tie-out/emitters/bs-account-emitter.ts","additions":233,"deletions":30,"changeType":"MODIFIED"},{"path":"lib/audit-ready/tie-out/emitters/bs-summary-emitter.ts","additions":328,"deletions":117,"changeType":"MODIFIED"},{"path":"lib/audit-ready/tie-out/emitters/fa-rollforward-emitter.ts","additions":210,"deletions":45,"changeType":"MODIFIED"},{"path":"lib/audit-ready/tie-out/fa-rollforward-resolver.ts","additions":23,"deletions":1,"changeType":"MODIFIED"},{"path":"lib/audit-ready/tie-out/regenerate-run.ts","additions":67,"deletions":16,"changeType":"MODIFIED"}],"headRefOid":"b3acb371bfb5296f107cf2b6d6580be920ae4468","isDraft":true,"mergeStateStatus":"CLEAN","mergeable":"MERGEABLE","number":213,"state":"OPEN","title":"PBC-TIEOUT-4.1.3 — Family 2 Emitter Table Decoupling (WIP: docs only)","url":"https://github.com/mjwiseman07/finsight-reports-app/pull/213"}
```

Self-check: state = OPEN? **yes** (OPEN)
Self-check: isDraft = true? **yes** (true)
Self-check: mergeable = MERGEABLE? **yes** (MERGEABLE)
Self-check: mergeStateStatus = CLEAN? **yes** (CLEAN)
Self-check: headRefOid matches local HEAD SHA? **yes** (headRefOid=b3acb371bfb5296f107cf2b6d6580be920ae4468; local=b3acb371bfb5296f107cf2b6d6580be920ae4468)

## 12. Overall verdict

Any red flags across sections 1-11? **no blocking red flags**. Non-blocking notes:
1. PR title still says "(WIP: docs only)" — stale relative to landed code/tests; cosmetic for Level 2/6.
2. Section 10: `upload-artifact.ts` `.upload()` appears in the broad scan (expected canonical helper).
3. Early commit subjects carry a UTF-8 BOM prefix (cosmetic in `git log`).
4. `tsc` still reports the 2 pre-existing `bs-recon-notify.test.ts` errors from #210 (unchanged).

Ready for Phase 5 Level 2 (live smoke tomorrow)? **yes** — static gates match expected baseline (tsc: 2 known; vitest 2809/0; mergeable CLEAN draft; Family 2 scope files only; 4.1.3.b tags + readLegacy helpers + legacy resolver inserts intact; no new TODOs).
