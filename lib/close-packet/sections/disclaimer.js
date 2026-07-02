export async function build(ctx) {
  const { firmClient, firm, preparer, reviewer } = ctx;
  const clientName = firmClient?.name || "the client";
  const preparerName = preparer?.name || firm?.advisor_name || "the preparer";

  const disclaimerText =
    firm?.footer_disclaimer ||
    `This close packet has been prepared from books maintained by ${clientName} and reviewed for reasonableness by ${preparerName}. It does not constitute an audit, review, or compilation as those terms are defined by the AICPA. No opinion is expressed on the fairness of presentation.`;

  return {
    disclaimer_text: disclaimerText,
    preparer_signature: {
      name: preparer?.name || firm?.advisor_name || "Advisacor Preparer",
      title: preparer?.role || "Bookkeeper",
      signed_at: null,
    },
    reviewer_signature: reviewer
      ? { name: reviewer.name, title: reviewer.role || "Reviewer", signed_at: null }
      : null,
  };
}
