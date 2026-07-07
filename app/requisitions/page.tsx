export const dynamic = "force-dynamic";

async function loadRequisitions() {
  // Server component uses service client; for MVP the page renders empty and defers to client hydration.
  return { items: [] as Array<{ id: string; requisition_number: string; status: string; total_cents: number }> };
}

export default async function RequisitionsPage() {
  const { items } = await loadRequisitions();

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Requisitions</h1>
      <p className="text-sm text-gray-600 mb-4">
        Draft, submit, approve, and convert requisitions to purchase orders.
      </p>
      <a href="/requisitions/new" className="inline-block bg-blue-600 text-white rounded px-4 py-2 text-sm">
        New Requisition
      </a>
      <div className="mt-6">
        {items.length === 0 ? (
          <p className="text-gray-500 text-sm">No requisitions yet.</p>
        ) : (
          <ul className="divide-y">
            {items.map((r) => (
              <li key={r.id} className="py-2 flex justify-between">
                <span>{r.requisition_number}</span>
                <span className="text-sm text-gray-600">
                  {r.status} — ${(r.total_cents / 100).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
