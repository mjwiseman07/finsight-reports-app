export const dynamic = "force-dynamic";

export default async function RequisitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Requisition {id}</h1>
      <p className="text-sm text-gray-500">Detail view — submit, approve, reject actions.</p>
      <p className="mt-4 text-sm">
        Server-side hydration deferred to Block 6b. See /api/requisitions/{id}/submit for
        programmatic access.
      </p>
    </main>
  );
}
