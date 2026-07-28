# PR #213 verification snapshot
Captured: 2026-07-27 23:51:02 -04:00
Local HEAD SHA: c32694433d42e27518544e98b27b450e041ba98e
Main tip SHA: 34bcaf4ac71698e0fdd84283f77666e0b5b540bc
## gh pr view --json
{"baseRefName":"main","commits":[{"authoredDate":"2026-07-28T03:37:58Z","authors":[{"email":"mattjanice07@yahoo.com","id":"U_kgDOERy7Yg","login":"mjwiseman07","name":"Matthew Wiseman"},{"email":"cursoragent@cursor.com","id":"U_kgDOC972lw","login":"cursoragent","name":"Cursor"}],"committedDate":"2026-07-28T03:37:58Z","messageBody":"Phase 1 of PBC-TIEOUT-4.1.3. No code changes. Locks canonical stack\nreferences (loadRunContext, loadVariances, dualWriteWorkpaper, EMITTER_REGISTRY).\nPhase 2 refactor begins on human approval.\n\nCo-authored-by: Cursor <cursoragent@cursor.com>","messageHeadline":"∩╗┐docs(4.1.3): Family 2 emitter table decoupling inventory + build spec","oid":"c32694433d42e27518544e98b27b450e041ba98e"}],"files":[{"path":"docs/audit-ready/PBC-TIEOUT-4-1-3-build-spec.md","additions":253,"deletions":0,"changeType":"ADDED"},{"path":"docs/audit-ready/PBC-TIEOUT-4-1-3-inventory.md","additions":216,"deletions":0,"changeType":"ADDED"}],"headRefName":"feature/pbc-tieout-413-family2-emitter-decoupling","headRefOid":"c32694433d42e27518544e98b27b450e041ba98e","isDraft":true,"mergeStateStatus":"CLEAN","mergeable":"MERGEABLE","number":213,"state":"OPEN","title":"PBC-TIEOUT-4.1.3 ΓÇö Family 2 Emitter Table Decoupling (WIP: docs only)","url":"https://github.com/mjwiseman07/finsight-reports-app/pull/213"}
## gh pr diff (first 40 lines)
From c32694433d42e27518544e98b27b450e041ba98e Mon Sep 17 00:00:00 2001
From: Matthew Wiseman <mattjanice07@yahoo.com>
Date: Mon, 27 Jul 2026 23:37:58 -0400
Subject: [PATCH] =?UTF-8?q?=EF=BB=BFdocs(4.1.3):=20Family=202=20emitter=20?=
 =?UTF-8?q?table=20decoupling=20inventory=20+=20build=20spec?=
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: 8bit

Phase 1 of PBC-TIEOUT-4.1.3. No code changes. Locks canonical stack
references (loadRunContext, loadVariances, dualWriteWorkpaper, EMITTER_REGISTRY).
Phase 2 refactor begins on human approval.

Co-authored-by: Cursor <cursoragent@cursor.com>
---
 .../PBC-TIEOUT-4-1-3-build-spec.md            | 253 ++++++++++++++++++
 .../audit-ready/PBC-TIEOUT-4-1-3-inventory.md | 216 +++++++++++++++
 2 files changed, 469 insertions(+)
 create mode 100644 docs/audit-ready/PBC-TIEOUT-4-1-3-build-spec.md
 create mode 100644 docs/audit-ready/PBC-TIEOUT-4-1-3-inventory.md

diff --git a/docs/audit-ready/PBC-TIEOUT-4-1-3-build-spec.md b/docs/audit-ready/PBC-TIEOUT-4-1-3-build-spec.md
new file mode 100644
index 00000000..d2e742b5
--- /dev/null
+++ b/docs/audit-ready/PBC-TIEOUT-4-1-3-build-spec.md
@@ -0,0 +1,253 @@
+# PBC-TIEOUT-4.1.3 ΓÇö Family 2 Emitter Table Decoupling
+
+**Phase:** PBC-TIEOUT-4.1.3  
+**Prior main tip:** `34bcaf4a`  
+**Branch:** `feature/pbc-tieout-413-family2-emitter-decoupling`  
+**Merge order:** Any time (no external gate; parallelizable with 4.3 Block A)  
+**Retirement follow-up:** PBC-TIEOUT-4.1.3.b (8-day observation window from 4.1.3 merge SHA)  
+**Reference:** `docs/audit-ready/PBC-TIEOUT-4-1-3-inventory.md`
+
+## Goal (one sentence)
+
+Refactor the 3 Family 2 emitters (`bsAccountEmitter`, `faRollforwardEmitter`, `bsSummaryEmitter`) to source their `build(runId)` output from the canonical run stack (`loadRunContext` + `loadVariances` + `ctx.rawQboPayload`), matching the AP/AR/inventory/GRNI emitter pattern, with a tagged legacy fallback for the 8-day observation window before 4.1.3.b removes the fallback.
+
## git log main..HEAD
c3269443 ∩╗┐docs(4.1.3): Family 2 emitter table decoupling inventory + build spec
## git diff --name-status main...HEAD
A	docs/audit-ready/PBC-TIEOUT-4-1-3-build-spec.md
A	docs/audit-ready/PBC-TIEOUT-4-1-3-inventory.md
## git show --stat HEAD
commit c32694433d42e27518544e98b27b450e041ba98e
Author: Matthew Wiseman <mattjanice07@yahoo.com>
Date:   Mon Jul 27 23:37:58 2026 -0400

    ∩╗┐docs(4.1.3): Family 2 emitter table decoupling inventory + build spec
    
    Phase 1 of PBC-TIEOUT-4.1.3. No code changes. Locks canonical stack
    references (loadRunContext, loadVariances, dualWriteWorkpaper, EMITTER_REGISTRY).
    Phase 2 refactor begins on human approval.
    
    Co-authored-by: Cursor <cursoragent@cursor.com>

 docs/audit-ready/PBC-TIEOUT-4-1-3-build-spec.md | 253 ++++++++++++++++++++++++
 docs/audit-ready/PBC-TIEOUT-4-1-3-inventory.md  | 216 ++++++++++++++++++++
 2 files changed, 469 insertions(+)
## Self-check (Cursor answers each, one line per)
- Is PR state OPEN? yes
- Is isDraft true? yes
- Does headRefOid match local HEAD? yes (c32694433d42e27518544e98b27b450e041ba98e)
- Is baseRefName main? yes
- Files changed = exactly 2 (both docs under docs/audit-ready/)? yes (2): docs/audit-ready/PBC-TIEOUT-4-1-3-build-spec.md, docs/audit-ready/PBC-TIEOUT-4-1-3-inventory.md
- Any code files touched? no
- Commits ahead of main = exactly 1 with SHA c3269443? yes (count=1 SHA=c32694433d42e27518544e98b27b450e041ba98e)
- MergeStateStatus? CLEAN
- Mergeable? MERGEABLE
