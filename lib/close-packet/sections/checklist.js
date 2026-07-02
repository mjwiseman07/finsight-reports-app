// Pre-Close Checklist Appendix (Doc A5b, delivered here).
// Reads the checklist run + run items for the close period. No computation.
export async function build(ctx) {
  const { checklistRun } = ctx;

  if (!checklistRun) {
    return {
      status: "no_checklist",
      run_status: null,
      run_mode: null,
      items: [],
    };
  }

  const runItems = (checklistRun.close_checklist_run_items || [])
    .slice()
    .sort(
      (a, b) =>
        (a.close_checklist_items?.sort_order || 0) -
        (b.close_checklist_items?.sort_order || 0),
    );

  return {
    status: "rendered",
    run_status: checklistRun.status,
    run_mode: checklistRun.run_mode,
    started_at: checklistRun.started_at || null,
    completed_at: checklistRun.completed_at || null,
    items: runItems.map((ri) => ({
      label: ri.close_checklist_items?.label || ri.checklist_item_id,
      category: ri.close_checklist_items?.category || null,
      code: ri.close_checklist_items?.code || null,
      status: ri.status,
      verified_by: ri.verified_by || null,
      verified_at: ri.verified_at || null,
      ai_verifier: ri.close_checklist_items?.ai_verifier || null,
      note: ri.note || null,
      evidence_url: ri.evidence_url || null,
    })),
  };
}
