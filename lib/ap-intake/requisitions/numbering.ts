/**
 * Wraps the SQL RPC next_document_number(company_id, doc_type).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
export type DocType = "purchase_order" | "requisition" | "goods_receipt";
export async function nextDocumentNumber(
  supabase: SupabaseClient,
  companyId: string,
  docType: DocType,
): Promise<string> {
  const { data, error } = await supabase.rpc("next_document_number", {
    p_company_id: companyId,
    p_doc_type: docType,
  });
  if (error) throw new Error(`nextDocumentNumber failed: ${error.message}`);
  if (typeof data !== "string" || data.length === 0) {
    throw new Error("nextDocumentNumber returned empty");
  }
  return data;
}
