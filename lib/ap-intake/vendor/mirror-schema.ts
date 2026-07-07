export interface VendorMirrorRow {
  id: string;
  firm_id: string;
  firm_client_id: string;
  erp_platform: string;
  external_vendor_id: string;
  display_name: string;
  normalized_name: string;
  metaphone_code: string;
  active: boolean;
  sync_token: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  first_synced_at: string;
  last_synced_at: string;
  last_snapshot_hash: string;
}

export interface ErpVendorSyncPayload {
  vendors: Array<{
    external_id: string;
    display_name: string;
    active: boolean;
    sync_token: string | null;
    primary_email: string | null;
    primary_phone: string | null;
  }>;
  synced_at: string;
}
