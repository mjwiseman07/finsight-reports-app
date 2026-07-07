export const dynamic = "force-dynamic";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Purchase Order {id}</h1>
      <p className="text-sm text-gray-500">
        Goods receipt and close actions call /api/purchase-orders/[id]/goods-receipts and /close.
      </p>
    </main>
  );
}
