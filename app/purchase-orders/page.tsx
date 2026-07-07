export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Purchase Orders</h1>
      <p className="text-sm text-gray-500">
        Detail views hydrate from /api/purchase-orders. Block 6b wires the full table UI.
      </p>
    </main>
  );
}
