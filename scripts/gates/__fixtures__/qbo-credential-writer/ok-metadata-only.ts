/** Positive control: metadata-only update must not be classified as credential writer. */
export async function metadataOnly(admin) {
  await admin
    .from("accounting_connections")
    .update({
      status: "disconnected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", "conn-1");
}
