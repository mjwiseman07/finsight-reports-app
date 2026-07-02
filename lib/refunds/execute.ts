import { getSupabaseAdmin } from '../supabase-admin.js';
import { executeRefund } from '../refund-execution.js';

/**
 * Approve a pending Path B request and execute the Stripe refund.
 * Adaptation: Batch B uses status pending_review → approved → executing → completed.
 */
export async function approveAndExecuteRefund(
  refundRequestId: string,
  options: { decidedBy: string; reason: string },
) {
  const supabase = getSupabaseAdmin();

  const { data: row, error: loadErr } = await supabase
    .from('refund_requests')
    .select('id, status')
    .eq('id', refundRequestId)
    .single();
  if (loadErr) throw loadErr;
  if (!row) throw new Error(`Refund request ${refundRequestId} not found`);
  if (row.status !== 'pending_review') {
    throw new Error(`Refund request ${refundRequestId} is in status '${row.status}'; expected pending_review`);
  }

  const { error: approveErr } = await supabase
    .from('refund_requests')
    .update({
      status: 'approved',
      founder_decision_by: options.decidedBy,
      founder_decision_at: new Date().toISOString(),
      founder_decision_notes: options.reason,
    })
    .eq('id', refundRequestId)
    .eq('status', 'pending_review');
  if (approveErr) throw approveErr;

  return executeRefund(refundRequestId);
}

/**
 * Path A auto-execute: transition to approved then run Batch B execution helper.
 */
export async function executePathARefund(refundRequestId: string) {
  const supabase = getSupabaseAdmin();

  const { error: approveErr } = await supabase
    .from('refund_requests')
    .update({ status: 'approved' })
    .eq('id', refundRequestId)
    .in('status', ['submitted', 'approved']);
  if (approveErr) throw approveErr;

  return executeRefund(refundRequestId);
}

export { executeRefund };
