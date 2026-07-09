// Review Assist severity surface adapter.
//
// Maps the internal severity enums (used by close-period assertions,
// pulse alerts, uncategorized proposals, etc.) onto the 3-level Review
// Assist surface: `blocker | warning | note`.
//
// This adapter is applied ONLY at the Review Assist findings-composer
// boundary. Internal enums are untouched.
//
// Reference: Track_C_Phase_1_Tier_Spec_v1_2_Review_Assist_Addendum, Block 4.
export type ReviewAssistSeverity = 'blocker' | 'warning' | 'note';

export function toReviewAssistSeverity(
  input:
    | 'critical'
    | 'error'
    | 'high'
    | 'warning'
    | 'medium'
    | 'info'
    | 'low'
    | 'note',
): ReviewAssistSeverity {
  if (input === 'critical' || input === 'error' || input === 'high') {
    return 'blocker';
  }
  if (input === 'warning' || input === 'medium') {
    return 'warning';
  }
  // info | low | note
  return 'note';
}
