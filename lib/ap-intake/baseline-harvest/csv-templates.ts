/**
 * CSV column templates the client-side downloader serves.
 * Users fill these out and upload; Block 6b wires actual CSV parsing.
 */
export const CSV_TEMPLATES = {
  vendors: {
    filename: "advisacor_vendors_template.csv",
    headers: ["external_vendor_id", "display_name", "primary_email", "primary_phone", "active"],
  },
  purchase_orders: {
    filename: "advisacor_purchase_orders_template.csv",
    headers: [
      "external_po_id",
      "po_number",
      "vendor_external_id",
      "status",
      "currency",
      "subtotal_cents",
      "tax_cents",
      "total_cents",
      "ordered_at",
      "line_number",
      "line_description",
      "line_quantity_ordered",
      "line_quantity_received",
      "line_unit_price_cents",
      "line_gl_account_code",
    ],
  },
  bills: {
    filename: "advisacor_bills_template.csv",
    headers: [
      "external_bill_id",
      "vendor_external_id",
      "invoice_number",
      "invoice_date",
      "invoice_amount_cents",
      "purchase_order_external_id",
      "received_at",
    ],
  },
  goods_receipts: {
    filename: "advisacor_goods_receipts_template.csv",
    headers: [
      "external_gr_id",
      "purchase_order_external_id",
      "gr_number",
      "received_at",
      "po_line_number",
      "quantity_received",
    ],
  },
} as const;
export type CsvTemplateKey = keyof typeof CSV_TEMPLATES;
